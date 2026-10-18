import { test } from 'node:test';
import { DatabaseSync, backup } from 'node:sqlite';
import { openDatabase, writeClinic } from '../server/database.ts';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createApplication } from '../server/application.ts';
import { seedDemo } from '../server/fixtureSeed.ts';
import { seedApprovedTestClinics } from './helpers/approvedFixtures.ts';
import { readConfig, type ServerConfig } from '../server/config.ts';
import { estimate } from '../server/estimator.ts';
import { runJobs } from '../server/jobs.ts';
import { initialDraft } from '../src/utils/report.ts';
import type { SearchFilters } from '../src/types.ts';
import { clinics } from '../src/data/mockData.ts';
import { searchDirectory } from '../src/services/search.ts';

function harness(){
 const root=mkdtempSync(`${tmpdir()}/mediq-test-`);
 const config:ServerConfig={...readConfig(),environment:'test',database:`${root}/db.sqlite`,mailDirectory:`${root}/mail`,origin:'http://localhost:4173',mailMode:'file',adminEnabled:true};
 const app=createApplication(config);seedApprovedTestClinics(app.db,config);
 function client(ip='test'){
  const cookies=new Map<string,string>();
  return {cookies,async call(path:string,method='GET',body?:unknown,extra:Record<string,string>={}){
   const response=await app.handle(new Request(config.origin+path,{method,headers:{origin:config.origin,'Content-Type':'application/json',cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; '),...extra},...(method==='GET'?{}:{body:JSON.stringify(body||{})})}),ip);
   for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0];const i=pair.indexOf('=');cookies.set(pair.slice(0,i),pair.slice(i+1));}
   return {status:response.status,data:await response.json() as any};
  }};
 }
 function code(email:string,type='email-verification'){const messages=readdirSync(config.mailDirectory).map(n=>JSON.parse(readFileSync(`${config.mailDirectory}/${n}`,'utf8'))).filter(m=>m.to===email&&m.type===type).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));assert(messages.length,'email queued to local mail transport');return messages[0].otp as string;}
 function resetLimits(){app.db.exec('DELETE FROM rate_limits');}
 async function signup(c:ReturnType<typeof client>,email:string,verify=true){let r=await c.call('/api/auth/sign-up/email','POST',{firstName:'Test',lastName:'Person',email,password:'A-long-password-123'});assert.equal(r.status,200,JSON.stringify(r));if(verify){r=await c.call('/api/auth/email-otp/verify-email','POST',{email:email.trim().toLowerCase(),otp:code(email.trim().toLowerCase())});assert.equal(r.status,200,JSON.stringify(r));r=await c.call('/api/auth/sign-in/email','POST',{email,password:'A-long-password-123'});assert.equal(r.status,200,JSON.stringify(r));assert(!r.data.token);}}
 return {app,config,client,code,resetLimits,signup,close(){app.close();rmSync(root,{recursive:true,force:true});}};
}
test('real auth lifecycle, private ownership, atomic deletion and durable reopening',async()=>{
 const h=harness();try{
  const a=h.client('a'),b=h.client('b'),guest=h.client('guest');
  await h.signup(a,' A@example.test ',false);
  assert.equal((await a.call('/api/me')).data.user,null);
  assert.equal((await a.call('/api/profile','PUT',{})).status,401);
  assert.equal(h.app.db.prepare('SELECT count(*) n FROM account_metadata').get()?.n,0);
  assert.notEqual((await a.call('/api/auth/sign-in/email','POST',{email:'a@example.test',password:'A-long-password-123'})).status,200);
  assert.notEqual((await a.call('/api/auth/email-otp/verify-email','POST',{email:'a@example.test',otp:'000000'})).status,200);
  assert.equal((await a.call('/api/auth/email-otp/verify-email','POST',{email:'a@example.test',otp:h.code('a@example.test')})).status,200);
  assert.equal((await a.call('/api/auth/sign-in/email','POST',{email:'a@example.test',password:'A-long-password-123'})).status,200);
  const me=(await a.call('/api/me')).data;assert(me.user.id);assert.equal(me.profile.sex,null);
  h.resetLimits();await h.signup(b,'b@example.test');
  const plan={id:'plan-12345678',clinicId:clinics[0].id,appointmentTime:new Date(Date.now()+86400000).toISOString(),visitMode:'walk-in',travelMinutes:15,bufferMinutes:10};
  assert.equal((await a.call('/api/plans','PUT',plan)).status,200);
  assert.equal((await a.call('/api/plans','PUT',{...plan,user_id:(await b.call('/api/me')).data.user.id})).status,400);
  assert.equal((await a.call(`/api/saved-clinics/${clinics[0].id}`,'PUT')).status,200);
  assert.equal((await b.call(`/api/plans/${plan.id}`)).status,404);
  assert.equal((await guest.call(`/api/plans/${plan.id}`)).status,401);
  assert.equal((await a.call('/api/profile','PUT',{firstName:'Alice',lastName:'Example',sex:null,gender:null,weightKg:65,heightCm:null,age:null,language:'pl',notifications:false})).status,200);
  assert.equal((await a.call('/api/me')).data.profile.weightKg,65);
  assert.equal((await a.call('/api/preferences','PUT',{language:'hi'},{'x-mediq-account':'other'})).status,409);
  await a.call('/api/auth/sign-out','POST');assert.equal((await a.call('/api/me')).data.user,null);
  await a.call('/api/auth/sign-in/email','POST',{email:'a@example.test',password:'A-long-password-123'});
  const otherDevice=h.client('otherDevice');await otherDevice.call('/api/auth/sign-in/email','POST',{email:'a@example.test',password:'A-long-password-123'});
  assert.equal((await otherDevice.call('/api/me')).data.savedAppointments.length,1);
  const reopened=createApplication(h.config);assert.equal(reopened.db.prepare('SELECT count(*) n FROM visit_plans').get()?.n,1);await (await reopened.auth.$context).checkSchema?.();reopened.close();
  assert.equal((await guest.call('/api/admin/accounts')).status,401);assert.equal((await b.call('/api/admin/accounts')).status,403);
  h.app.db.prepare('INSERT INTO administrators VALUES (?,?)').run(me.user.id,Date.now());
  assert.equal((await a.call('/api/admin/accounts')).data.total,2);
  assert.equal((await a.call('/api/account','DELETE',{confirmation:'DELETE',password:'wrong'})).status,400);
  h.app.db.prepare('INSERT INTO verification VALUES (?,?,?,?,?,?)').run('other-email-code','email-verification-otp:a@example.test.other','hashed-test-value',Date.now()+60000,Date.now(),Date.now());
  assert.equal((await a.call('/api/account','DELETE',{confirmation:'DELETE',password:'A-long-password-123'})).status,200);
  assert(h.app.db.prepare('SELECT id FROM verification WHERE id=?').get('other-email-code'),'Deletion must not remove a code for an email sharing a prefix');
  assert.equal((await otherDevice.call('/api/me')).data.user,null);
  assert.equal(h.app.db.prepare('SELECT count(*) n FROM visit_plans').get()?.n,0);
  assert.equal(h.app.db.prepare('SELECT count(*) n FROM user').get()?.n,1);
  assert.equal(h.app.db.prepare("SELECT value FROM daily_metrics WHERE metric='saved_plans'").get()?.value,1);
 }finally{h.close();}
});
test('verification expiry, bounded attempts, resend cooldown, uniqueness and recovery',async()=>{
 const h=harness();try{
  const c=h.client();await h.signup(c,'codes@example.test',false);
  const otp=h.code('codes@example.test');
  assert.equal((await c.call('/api/auth/email-otp/send-verification-otp','POST',{email:'codes@example.test',type:'email-verification'})).status,429);
  for(let i=0;i<6;i++)assert.notEqual((await c.call('/api/auth/email-otp/verify-email','POST',{email:'codes@example.test',otp:'bad-code'})).status,200);
  assert.notEqual((await c.call('/api/auth/email-otp/verify-email','POST',{email:'codes@example.test',otp})).status,200);
  h.resetLimits();await c.call('/api/auth/email-otp/send-verification-otp','POST',{email:'codes@example.test',type:'email-verification'});
  h.app.db.prepare('UPDATE verification SET expiresAt=?').run(Date.now()-1000);
  assert.notEqual((await c.call('/api/auth/email-otp/verify-email','POST',{email:'codes@example.test',otp:h.code('codes@example.test')})).status,200);
  h.resetLimits();await c.call('/api/auth/email-otp/send-verification-otp','POST',{email:'codes@example.test',type:'email-verification'});
  const good=h.code('codes@example.test');assert.equal((await c.call('/api/auth/email-otp/verify-email','POST',{email:'codes@example.test',otp:good})).status,200);
  assert.notEqual((await c.call('/api/auth/email-otp/verify-email','POST',{email:'codes@example.test',otp:good})).status,200);
  h.resetLimits();await h.signup(c,'CODES@example.test',false);assert.equal(h.app.db.prepare('SELECT count(*) n FROM user').get()?.n,1);
  h.resetLimits();assert.equal((await c.call('/api/auth/email-otp/request-password-reset','POST',{email:'codes@example.test'})).status,200);
  assert.equal((await c.call('/api/auth/email-otp/reset-password','POST',{email:'codes@example.test',otp:h.code('codes@example.test','forget-password'),password:'A-new-password-123'})).status,200);
  assert.notEqual((await c.call('/api/auth/sign-in/email','POST',{email:'codes@example.test',password:'A-long-password-123'})).status,200);
  assert.equal((await c.call('/api/auth/sign-in/email','POST',{email:'codes@example.test',password:'A-new-password-123'})).status,200);
  assert.equal((await c.call('/api/auth/change-password','POST',{currentPassword:'A-new-password-123',newPassword:'Yet-another-password-123'})).status,200);
 }finally{h.close();}
});
test('reports validate, deduplicate, rate limit, separate ongoing, moderate and persist metrics/checklist',async()=>{
 const h=harness();try{
  const c=h.client();await h.signup(c,'admin@example.test');const uid=(await c.call('/api/me')).data.user.id;
  h.app.db.prepare('INSERT INTO administrators VALUES (?,?)').run(uid,Date.now());
  const g=h.client('guest-report');const draft={...initialDraft(clinics[0].id),visitMode:'walk-in',reportKind:'current-wait',elapsedMinutes:23};
  const r=await g.call('/api/reports','POST',draft,{'idempotency-key':'report-0000001'});assert.equal(r.status,201,JSON.stringify(r));assert.equal(r.data.elapsedMinutes,23);
  assert.equal((await g.call('/api/reports','POST',draft,{'idempotency-key':'report-0000001'})).data.id,r.data.id);
  assert.equal((await g.call('/api/reports','POST',draft,{'idempotency-key':'report-0000002'})).data.id,r.data.id);
  assert.equal(h.app.db.prepare('SELECT total_minutes FROM reports').get()?.total_minutes,null);
  assert.equal((await g.call('/api/reports','POST',{...draft,elapsedMinutes:-1},{'idempotency-key':'report-0000003'})).status,400);
  assert.equal((await g.call('/api/reports','POST',{...draft,clinicId:'missing'},{'idempotency-key':'report-0000004'})).status,400);
  h.resetLimits();const review=await g.call('/api/reports','POST',{...draft,elapsedMinutes:600},{'idempotency-key':'report-0000005'});assert.equal(review.data.moderationStatus,'review');
  assert.equal((await g.call(`/api/clinics/${clinics[0].id}`)).data.recentReports.length,1);
  assert.equal((await c.call(`/api/admin/reports/${review.data.id}`,'PUT',{status:'accepted',reason:'Reviewed test timing'})).status,200);
  assert.equal((await c.call(`/api/admin/reports/${review.data.id}`,'PUT',{status:'accepted',reason:'Duplicate review'})).status,409);
  assert.equal((await c.call('/api/admin/checklist/email','PUT',{status:'doing',notes:'Sandbox test'})).status,200);
  assert.equal((await c.call('/api/admin/checklist')).data.find((t:any)=>t.id==='email').notes,'Sandbox test');
  assert.equal((await c.call(`/api/admin/clinics/${clinics[0].id}`,'PATCH',{languages:['English','Polish']})).status,200);
  assert.equal((await c.call('/api/admin/audit')).data.length,3);
  const metrics=(await c.call('/api/admin/metrics')).data;assert.equal(metrics.metrics.find((m:any)=>m.metric==='reports_ongoing').allTime,2);
  for(let i=0;i<6;i++)await g.call('/api/reports','POST',{...draft,elapsedMinutes:30+i},{'idempotency-key':`spam-report-${i}`});
  assert.equal((await g.call('/api/reports','POST',draft,{'idempotency-key':'spam-report-999'})).status,429);
  await runJobs(h.app.db,h.config);assert(h.app.db.prepare("SELECT count(*) n FROM job_runs WHERE status='success'").get()!.n as number>=2);
 }finally{h.close();}
});
test('estimator handles sparse, stale, outlier and ongoing evidence per mode',()=>{
 const now=Date.now();const row=(total:number,age=0)=>({kind:'completed-visit',total_minutes:total,elapsed_minutes:null,submitted_at:now-age,status:'accepted'});
 assert.equal(estimate([row(30)],now).state,'insufficient');
 assert.equal(estimate([row(30,8*86400000)],now).state,'stale');
 assert.equal(estimate([row(30,2*86400000),row(35,2*86400000),row(40,2*86400000)],now).state,'stale');
 const result=estimate([row(30),row(35),row(40),row(1300),{...row(0),kind:'current-wait',total_minutes:null,elapsed_minutes:80}],now);
 assert.equal(result.totalMinutes,35);assert.equal(result.excludedOutliers,1);assert.equal(result.ongoingCount,1);assert.equal(result.confidence,'low');
});
test('meaning-aware search preserves strict filters and unsupported empty state',()=>{
 const f:SearchFilters={query:'',insurance:'',specialty:'',language:'',minimumRating:0,visitMode:'all',timing:'all',maxDistance:10};
 assert.equal(searchDirectory(clinics,{...f,query:'Brightwel urgent car'})[0].id,clinics[0].id);
 assert.equal(searchDirectory(clinics,{...f,query:clinics[0].name})[0].id,clinics[0].id);
 assert(searchDirectory(clinics,{...f,query:'head pain'}).length>0);
 assert(searchDirectory(clinics,{...f,query:'head pain'}).every(c=>c.symptoms.includes('headache')));
 assert.equal(searchDirectory(clinics,{...f,query:'zzquux unsupported cardiology'}).length,0);
 assert.equal(searchDirectory(clinics,{...f,query:'Brightwel urgent car',insurance:'Not an insurer'}).length,0);
});

test('origin and production boundaries, session expiry, retention, job retries and backup restore',async()=>{
 const h=harness();try{
  const c=h.client();await h.signup(c,'boundaries@example.test');const uid=(await c.call('/api/me')).data.user.id;
  assert.equal((await c.call('/api/preferences','PUT',{language:'pl'},{origin:'https://untrusted.example'})).status,403);
  assert.equal((await c.call('/api/preferences','PUT',{language:'pl'},{'Content-Type':'text/plain'})).status,415);
  h.app.db.prepare('INSERT INTO administrators VALUES (?,?)').run(uid,Date.now());
  const publicApp=createApplication({...h.config,adminEnabled:false});
  const response=await publicApp.handle(new Request(h.config.origin+'/api/admin/accounts',{headers:{cookie:[...c.cookies].map(([k,v])=>`${k}=${v}`).join('; ')}}),'public');
  assert.equal(response.status,403);await (await publicApp.auth.$context).checkSchema?.();publicApp.close();
  assert.throws(()=>openDatabase({...h.config,environment:'production'}),/environment mismatch/);
  await c.call('/api/presence','POST');const guest=h.client('presence-guest');await guest.call('/api/presence','POST');
  const metrics=(await c.call('/api/admin/metrics')).data;assert.equal(metrics.activeAccounts,1);assert.equal(metrics.accountSessions,1);assert.equal(metrics.guestSessions,1);assert.equal(metrics.confirmedBookings,null);
  const backupPath=h.config.database+'.backup';await backup(h.app.db,backupPath);const restored=new DatabaseSync(backupPath);assert.equal(restored.prepare('SELECT count(*) n FROM user WHERE emailVerified=1').get()?.n,1);assert.equal(restored.prepare('PRAGMA integrity_check').get()?.integrity_check,'ok');restored.close();
  h.resetLimits();await h.signup(h.client('pending'),'pending@example.test',false);
  h.app.db.prepare('UPDATE user SET createdAt=? WHERE emailVerified=0').run(Date.now()-49*3600000);
  h.app.db.prepare('UPDATE session SET expiresAt=?').run(Date.now()-1000);
  assert.equal((await c.call('/api/me')).data.user,null);
  let attempts=0;await runJobs(h.app.db,h.config,{directory:{async refresh(){if(++attempts<3)throw new Error('temporary upstream failure');return {status:'available',source:'test',data:[]};}}});
  assert.equal(attempts,3);assert.equal(h.app.db.prepare('SELECT count(*) n FROM user WHERE emailVerified=0').get()?.n,0);assert.equal(h.app.db.prepare('SELECT count(*) n FROM presence WHERE user_id IS NOT NULL').get()?.n,0);
  await assert.rejects(runJobs(h.app.db,h.config,{directory:{async refresh(){throw new Error('unavailable');}}}),/Job failed/);
  assert.equal(h.app.db.prepare("SELECT attempts FROM job_runs WHERE status='failed'").get()?.attempts,3);
  assert.equal(h.app.db.prepare("SELECT value FROM daily_metrics WHERE metric='job_failures'").get()?.value,1);
 }finally{h.close();}
});


test('3.1.1 excludes archived and unverified clinics without deleting records or exposing generated timing',async()=>{
 const h=harness();try{
  const client=h.client('release-v3');await h.signup(client,`release-${Date.now()}@example.test`);
  const plan={id:'v3-plan-123456',clinicId:clinics[0].id,appointmentTime:new Date(Date.now()+86400000).toISOString(),visitMode:'walk-in',travelMinutes:0,bufferMinutes:0};
  assert.equal((await client.call(`/api/saved-clinics/${clinics[0].id}`,'PUT')).status,200);
  assert.equal((await client.call('/api/plans','PUT',plan)).status,200);
  h.app.db.exec('UPDATE source_metadata SET fictional=1');
  h.app.db.prepare('DELETE FROM source_metadata WHERE clinic_id=?').run(clinics[1].id);
  assert.deepEqual((await client.call('/api/clinics')).data,[]);
  for(const clinic of clinics)assert.equal((await client.call(`/api/clinics/${clinic.id}`)).status,404);
  const account=(await client.call('/api/me')).data;assert.deepEqual(account.savedClinicIds,[]);assert.deepEqual(account.savedAppointments,[]);
  assert.equal((await client.call(`/api/plans/${plan.id}`)).status,404);
  assert.equal(h.app.db.prepare('SELECT count(*) n FROM clinics').get()!.n,6);
  assert.equal(h.app.db.prepare('SELECT count(*) n FROM visit_plans').get()!.n,1);
  // The old seed remains archival and cannot publish clinics in the UI.
  seedDemo(h.app.db,h.config);assert.deepEqual((await client.call('/api/clinics')).data,[]);
  const real={...structuredClone(clinics[0]),id:'approved-clinic',name:'Approved clinic',providers:[],reviews:[],historicalWaits:[],takeaway:''};
  writeClinic(h.app.db,real,false);
  const result=await client.call('/api/clinics/approved-clinic');assert.equal(result.status,200);
  assert.equal(result.data.directorySource,'approved');
  assert(result.data.estimates.every((e:any)=>e.totalMinutes===0&&e.evidenceState==='insufficient'&&e.stages.length===0));
  assert.equal((await client.call('/api/clinics')).data.length,1);
 }finally{h.close();}
});
