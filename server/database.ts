import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ServerConfig } from './config.ts';
import type { Clinic } from '../src/types.ts';
export type DB = DatabaseSync;
export function openDatabase(config: ServerConfig) {
 mkdirSync(dirname(config.database), { recursive: true, mode: 0o700 });
 process.umask(0o077);
 const db = new DatabaseSync(config.database);
 // Reject the wrong environment before applying any schema changes.
 if(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='environment'").get()){
  const existing=db.prepare('SELECT name FROM environment WHERE id=1').get();
  if(existing&&existing.name!==config.environment){db.close();throw new Error('Database environment mismatch; never share staging and production databases');}
 }
 db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
 db.exec('CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)');
 for (const name of readdirSync(new URL('./migrations/', import.meta.url)).filter(n => n.endsWith('.sql')).sort()) {
  if (db.prepare('SELECT name FROM migrations WHERE name=?').get(name)) continue;
  transaction(db, () => { db.exec(readFileSync(new URL(`./migrations/${name}`, import.meta.url), 'utf8')); db.prepare('INSERT INTO migrations VALUES (?,?)').run(name, Date.now()); });
 }
 const env = db.prepare('SELECT name FROM environment WHERE id=1').get() as {name:string}|undefined;
 if (env && env.name !== config.environment) { db.close(); throw new Error('Database environment mismatch; never share staging and production databases'); }
 db.prepare('INSERT OR IGNORE INTO environment VALUES (1,?)').run(config.environment);
 return db;
}
export function transaction<T>(db: DB, fn: () => T): T {
 db.exec('BEGIN IMMEDIATE');
 try { const result = fn(); db.exec('COMMIT'); return result; } catch (error) { db.exec('ROLLBACK'); throw error; }
}
export function countEvent(db: DB, metric: string, now = Date.now()) {
 db.prepare('INSERT INTO daily_metrics VALUES (?,?,1) ON CONFLICT(day,metric) DO UPDATE SET value=value+1').run(new Date(now).toISOString().slice(0,10),metric);
}
export function writeClinic(db: DB, clinic: Clinic, fictional = true) {
 db.prepare('INSERT INTO clinics VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET document=excluded.document, updated_at=excluded.updated_at').run(clinic.id, JSON.stringify(clinic),Date.now());
 for (const table of ['providers','clinic_languages','clinic_insurance']) db.prepare(`DELETE FROM ${table} WHERE clinic_id=?`).run(clinic.id);
 for (const provider of clinic.providers) db.prepare('INSERT INTO providers VALUES (?,?,?)').run(provider.id,clinic.id,JSON.stringify(provider));
 for (const language of clinic.languages) db.prepare('INSERT INTO clinic_languages VALUES (?,?)').run(clinic.id,language);
 for (const insurance of clinic.insurance) db.prepare('INSERT INTO clinic_insurance VALUES (?,?)').run(clinic.id,insurance);
 db.prepare('INSERT INTO source_metadata VALUES (?,?,?,?) ON CONFLICT(clinic_id) DO UPDATE SET source=excluded.source,fictional=excluded.fictional,refreshed_at=excluded.refreshed_at').run(clinic.id,fictional?'MediQU fictional fixtures':'Authorized directory adapter',Number(fictional),Date.now());
}
