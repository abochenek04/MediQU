import { randomUUID } from 'node:crypto';
import { readdirSync, statSync, unlinkSync } from 'node:fs';
import { estimate, type Evidence } from './estimator.ts';
import { adapters, type ExternalAdapters } from './integrations.ts';
import { countEvent, transaction, writeClinic, type DB } from './database.ts';
import type { Clinic } from '../src/types.ts';
import type { ServerConfig } from './config.ts';
export function recalculate(db:DB,now=Date.now()) {
 for(const row of db.prepare('SELECT c.document FROM clinics c JOIN source_metadata s ON s.clinic_id=c.id WHERE s.fictional=0').all()){
  const clinic=JSON.parse(row.document as string) as Clinic;
  for(const mode of clinic.visitModes){
   const evidence=db.prepare('SELECT kind,total_minutes,elapsed_minutes,submitted_at,status FROM reports WHERE clinic_id=? AND mode=?').all(clinic.id,mode) as unknown as Evidence[];
   const result=JSON.stringify(estimate(evidence,now));
   db.prepare('INSERT INTO estimates VALUES (?,?,?,?) ON CONFLICT(clinic_id,mode) DO UPDATE SET document=excluded.document,calculated_at=excluded.calculated_at').run(clinic.id,mode,result,now);
   db.prepare('INSERT INTO estimate_history VALUES (?,?,?,?) ON CONFLICT(clinic_id,mode,hour) DO UPDATE SET document=excluded.document').run(clinic.id,mode,Math.floor(now/3600000),result);
  }
 }
}
export async function runJobs(db:DB,config:ServerConfig,registry:ExternalAdapters=adapters) {
 const run=async(job:string,action:()=>void|Promise<void>)=>{
  const id=randomUUID();db.prepare('INSERT INTO job_runs(id,job,started_at,status) VALUES (?,?,?,?)').run(id,job,Date.now(),'running');
  for(let attempt=1;attempt<=3;attempt++)try{
   await action();db.prepare('UPDATE job_runs SET finished_at=?,status=?,attempts=? WHERE id=?').run(Date.now(),'success',attempt,id);return;
  }catch{
   if(attempt===3){db.prepare('UPDATE job_runs SET finished_at=?,status=?,attempts=?,error_code=? WHERE id=?').run(Date.now(),'failed',attempt,'JOB_FAILED',id);countEvent(db,'job_failures');throw new Error(`Job failed: ${job}`);}
   await new Promise(resolve=>setTimeout(resolve,attempt*250));
  }
 };
 await run('estimates',()=>transaction(db,()=>recalculate(db)));
 await run('retention',()=>transaction(db,()=>{
  const now=Date.now();
  db.prepare('DELETE FROM verification WHERE expiresAt<?').run(now);
  db.prepare('DELETE FROM session WHERE expiresAt<?').run(now);
  db.prepare('DELETE FROM user WHERE emailVerified=0 AND createdAt<?').run(now-48*3600000);
  db.prepare('DELETE FROM rate_limits WHERE resets_at<?').run(now-86400000);
  db.prepare('DELETE FROM presence WHERE last_seen<?').run(now-15*60000);
  db.prepare('UPDATE reports SET actor_hash=NULL,fingerprint=? WHERE submitted_at<?').run('',now-7*86400000);
  db.prepare('DELETE FROM estimate_history WHERE hour<?').run(Math.floor((now-90*86400000)/3600000));
  db.prepare('DELETE FROM job_runs WHERE started_at<?').run(now-30*86400000);
 }));
 if(config.mailMode==='file')try{for(const name of readdirSync(config.mailDirectory)){const path=`${config.mailDirectory}/${name}`;if(statSync(path).mtimeMs<Date.now()-3600000)unlinkSync(path);}}catch{/* An empty local mailbox needs no cleanup. */}
 if (!registry.directory) { db.prepare('INSERT INTO job_runs(id,job,started_at,finished_at,status,attempts) VALUES (?,?,?,?,?,0)').run(randomUUID(),'external-refresh',Date.now(),Date.now(),'unconfigured'); return; }
 await run('external-refresh',async()=>{
  if(!registry.directory)return; // Explicitly unconfigured; surfaced in health/integration API.
  const result=await registry.directory.refresh();
  if(result.status==='unavailable')throw new Error('DIRECTORY_UNAVAILABLE');
  transaction(db,()=>{for(const clinic of result.data)writeClinic(db,clinic,false);});
 });
}

export function startJobSchedule(db:DB,config:ServerConfig) {
 let stopped=false; let running:Promise<void>|undefined;
 const tick=()=>{if(stopped||running)return;running=runJobs(db,config).catch(()=>{console.error('Scheduled jobs failed; inspect job_runs.');}).finally(()=>{running=undefined;});};
 tick();const timer=setInterval(tick,5*60000);timer.unref();
 return async()=>{stopped=true;clearInterval(timer);await running;};
}
