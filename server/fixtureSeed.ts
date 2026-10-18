// Archived fixture seed for isolated tests/reference only; not part of normal setup.
import { clinics } from '../src/data/mockData.ts';
import { transaction, writeClinic, type DB } from './database.ts';
import type { ServerConfig } from './config.ts';
import { seedTasks } from './seed.ts';
export function seedDemo(db: DB, config: ServerConfig) {
 if (!['development','test','staging'].includes(config.environment)) throw new Error('Fictional seed is forbidden in production');
 transaction(db,()=> { for (const clinic of clinics) if (!db.prepare('SELECT id FROM clinics WHERE id=?').get(clinic.id)) writeClinic(db,clinic); seedTasks(db); });
}
