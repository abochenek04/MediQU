import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { makeAuth } from './auth.ts';
import { openDatabase, transaction, countEvent, writeClinic } from './database.ts';
import { seedTasks } from './seed.ts';
import { anonymousIdentity, hash, HttpError, limit } from './security.ts';
import { clinicCorrectionSchema, planSchema, preferenceSchema, profileSchema, signupSchema, validateDraft } from './validation.ts';
import { recalculate } from './jobs.ts';
import { adapters, unavailable } from './integrations.ts';
import { searchDirectory } from '../src/services/search.ts';
import type { Clinic, PatientReport, SearchFilters, ReliabilityScore } from '../src/types.ts';
import type { EstimateResult } from './estimator.ts';
import type { ServerConfig } from './config.ts';

const filtersSchema=z.object({query:z.string().max(300).default(''),insurance:z.string().max(100).default(''),specialty:z.string().max(100).default(''),language:z.string().max(100).default(''),minimumRating:z.number().min(0).max(5).default(0),visitMode:z.enum(['all','scheduled','walk-in','urgent']).default('all'),timing:z.enum(['all','open-now','morning','afternoon']).default('all'),maxDistance:z.number().min(0).max(1000).default(10),origin:z.object({latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180)}).optional()}).strict();
const authPaths=new Set(['/sign-up/email','/sign-in/email','/sign-out','/get-session','/email-otp/send-verification-otp','/email-otp/verify-email','/email-otp/request-password-reset','/email-otp/reset-password','/change-password']);
export function createApplication(config:ServerConfig) {
 const db=openDatabase(config); const auth=makeAuth(db,config); if(config.adminEnabled)seedTasks(db);
 const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 const baseClinic=(id:string):Clinic|undefined=>{const r=db.prepare('SELECT c.document FROM clinics c JOIN source_metadata s ON s.clinic_id=c.id WHERE c.id=? AND s.fictional=0').get(id);return r?JSON.parse(r.document as string):undefined;};
 const clinicView=(id:string)=>{
  const clinic=baseClinic(id); if(!clinic)return;
  const reports=db.prepare("SELECT public_document FROM reports WHERE clinic_id=? AND status='accepted' ORDER BY submitted_at DESC LIMIT 20").all(id).map(r=>JSON.parse(r.public_document as string));
  const evidence=Object.fromEntries(db.prepare('SELECT mode,document FROM estimates WHERE clinic_id=?').all(id).map(r=>[r.mode,JSON.parse(r.document as string)])) as Record<string,EstimateResult>;
  if(clinic.rating?.source==='demo')delete clinic.rating;
  clinic.recentReports=reports; // Fixture reports are not stored user submissions or metrics.
  clinic.estimates=clinic.visitModes.map(mode=>{
   const e={mode,totalMinutes:0,range:[0,0] as [number,number],stages:[] as import('../src/types.ts').VisitStage[],updatedMinutesAgo:0,contributingReports:0};
   const result=evidence[e.mode];
   const level=result?.state==='ready'?result.confidence:'low';
   const reliability:ReliabilityScore={score:result?.state==='ready'?({low:35,medium:65,high:85}[level]):0,level,
    summary:result?.state==='ready'?'Confidence reflects recent completed reports, sample size and spread.':'Not enough recent reports for an estimate.',
    factors:[{label:'Completed sample size',score:Math.min(100,(result?.eligibleSamples||0)*5),explanation:'Only accepted completed visits contribute to the total.'},{label:'Fresh evidence',score:result?.state==='ready'?100:0,explanation:'At least one completed report must be less than 24 hours old.'}]};
   if(!result||result.state!=='ready')return {...e,reliability,evidenceState:result?.state||'insufficient',contributingReports:result?.eligibleSamples||0};
   const total=result.totalMinutes!;const stages:import('../src/types.ts').VisitStage[]=[];
   return {...e,reliability,totalMinutes:total,range:result.range!,stages,evidenceState:'ready',contributingReports:result.eligibleSamples,updatedMinutesAgo:Math.floor((Date.now()-Date.parse(result.calculatedAt))/60000)};
  });
  return {...clinic,directorySource:'approved' as const,reliability:clinic.estimates[0]?.reliability||{score:0,level:'low',factors:[],summary:'Not enough recent reports for an estimate.'},currentEvidence:evidence};
 };
 async function handle(request:Request,ip='local'):Promise<Response> {
  const url=new URL(request.url);const path=url.pathname;const method=request.method;
  try {
   if(!path.startsWith('/api/'))throw new HttpError(404,'NOT_FOUND');
   if(!['GET','HEAD'].includes(method)&&request.headers.get('origin')!==config.origin)throw new HttpError(403,'ORIGIN_DENIED');
   if(method!=='GET'&&method!=='HEAD'&&!request.headers.get('content-type')?.startsWith('application/json'))throw new HttpError(415,'JSON_REQUIRED');
   const ipHash=hash(config.secret,`ip:${ip}`);
   limit(db,`api:${ipHash}`,600,60000);
   if(path==='/api/health')return json({status:'ok',environment:config.environment,database:'ok',schema:db.prepare('SELECT count(*) n FROM migrations').get()?.n,email:config.mailMode==='file'?'local-file':'configured',integrations:'unconfigured',latestJob:db.prepare('SELECT job,status,finished_at FROM job_runs ORDER BY started_at DESC LIMIT 1').get()||null});
   if(path.startsWith('/api/auth/')) {
    const endpoint=path.slice('/api/auth'.length);if(!authPaths.has(endpoint))throw new HttpError(404,'NOT_FOUND');
    if(method==='GET'&&endpoint!=='/get-session')throw new HttpError(405,'METHOD_NOT_ALLOWED');
    if(method==='POST') {
     limit(db,`auth:${ipHash}`,60,15*60000);
     const body=await request.json() as Record<string,unknown>;
     if(typeof body.email==='string')body.email=body.email.trim().toLowerCase();
     const email=typeof body.email==='string'?body.email:'';
     if(email)limit(db,`auth-email:${hash(config.secret,email)}`,45,15*60000);
     if(endpoint==='/sign-up/email') {
      const data=signupSchema.parse(body);
      limit(db,`signup:${ipHash}`,12,3600000);
      limit(db,`send:${hash(config.secret,email)}`,1,60000);
      request=new Request(request.url,{method,headers:request.headers,body:JSON.stringify({...data,name:`${data.firstName} ${data.lastName}`})});
     } else {
      if(endpoint==='/email-otp/send-verification-otp'&&body.type!=='email-verification')throw new HttpError(400,'INVALID_INPUT');
      if(['/email-otp/send-verification-otp','/email-otp/request-password-reset'].includes(endpoint))limit(db,`send:${hash(config.secret,email)}`,1,60000);
      if(endpoint==='/change-password')body.revokeOtherSessions=true;
      request=new Request(request.url,{method,headers:request.headers,body:JSON.stringify(body)});
     }
    }
    const response=await auth.handler(request);
    // Session cookies are sufficient; never expose bearer session tokens to application JS.
    const body=await response.json().catch(()=>({}));
    if(body&&typeof body==='object') {delete body.token;if(body.session)delete body.session.token;}
    return new Response(JSON.stringify(body),{status:response.status,headers:response.headers});
   }
   const session=await auth.api.getSession({headers:request.headers});
   const user=session?.user.emailVerified?session.user:null;
   const requireUser=()=> {if(!user)throw new HttpError(401,'SIGN_IN_REQUIRED');const expected=request.headers.get('x-mediq-account');if(expected&&expected!==user.id)throw new HttpError(409,'ACCOUNT_CHANGED');return user;};
   const admin=!!user&&config.adminEnabled&&!!db.prepare('SELECT user_id FROM administrators WHERE user_id=?').get(user.id);
   const identity=anonymousIdentity(request.headers.get('cookie')||'',config.secret);
   const actor=hash(config.secret,user?`user:${user.id}`:`guest:${identity.id}`);
   if(path==='/api/me'&&method==='GET') {
    if(!user)return json({user:null,admin:false});
    db.prepare('INSERT OR IGNORE INTO profiles(user_id) VALUES (?)').run(user.id);
    const profile=db.prepare('SELECT sex,weight_lb AS weightLb,height_inches AS heightInches,age,language,notifications FROM profiles WHERE user_id=?').get(user.id)!;
    return json({user:{id:user.id,email:user.email,firstName:user.firstName,lastName:user.lastName,createdAt:user.createdAt},admin,profile:{...profile,notifications:!!profile.notifications},savedClinicIds:db.prepare('SELECT clinic_id FROM saved_clinics WHERE user_id=?').all(user.id).map(r=>r.clinic_id).filter(id=>!!baseClinic(String(id))),savedAppointments:db.prepare('SELECT document FROM visit_plans WHERE user_id=? ORDER BY created_at DESC').all(user.id).map(r=>JSON.parse(r.document as string)).filter(plan=>!plan.isSample&&!!baseClinic(plan.clinicId))});
   }
   if(path==='/api/profile'&&method==='PUT') {
    const owner=requireUser();const data=profileSchema.parse(await request.json());
    transaction(db,()=>{db.prepare('UPDATE user SET firstName=?,lastName=?,name=?,updatedAt=? WHERE id=?').run(data.firstName,data.lastName,`${data.firstName} ${data.lastName}`,Date.now(),owner.id);db.prepare('INSERT INTO profiles(user_id,sex,weight_lb,height_inches,age,language,notifications) VALUES (?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET sex=excluded.sex,weight_lb=excluded.weight_lb,height_inches=excluded.height_inches,age=excluded.age,language=excluded.language,notifications=excluded.notifications').run(owner.id,data.sex,data.weightLb,data.heightInches,data.age,data.language,Number(data.notifications));});
    return json({ok:true});
   }
   if(path==='/api/preferences'&&method==='PUT'){const owner=requireUser();const data=preferenceSchema.parse(await request.json());db.prepare('INSERT INTO profiles(user_id,language) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET language=excluded.language').run(owner.id,data.language);return json({ok:true});}
   if(path==='/api/account'&&method==='DELETE'){
    const owner=requireUser();const body=z.object({password:z.string().min(1).max(128),confirmation:z.literal('DELETE')}).strict().parse(await request.json());
    limit(db,`delete:${owner.id}`,5,15*60000);
    await auth.api.verifyPassword({headers:request.headers,body:{password:body.password}});
    transaction(db,()=>{
     const suffix=`:${owner.email}`;
     db.prepare('DELETE FROM verification WHERE identifier=? OR substr(identifier,-length(?))=?').run(owner.email,suffix,suffix);
     db.prepare('DELETE FROM user WHERE id=?').run(owner.id); // Cascades identity, sessions, private data and owned reports atomically.
     countEvent(db,'deleted_accounts');recalculate(db);
    });
    return json({ok:true});
   }
   const saved=path.match(/^\/api\/saved-clinics\/([^/]+)$/);
   if(saved&&['PUT','DELETE'].includes(method)){
    const owner=requireUser();const id=decodeURIComponent(saved[1]);if(!baseClinic(id))throw new HttpError(404,'NOT_FOUND');
    if(method==='PUT')db.prepare('INSERT OR IGNORE INTO saved_clinics VALUES (?,?)').run(owner.id,id);else db.prepare('DELETE FROM saved_clinics WHERE user_id=? AND clinic_id=?').run(owner.id,id);
    return json({ok:true});
   }
   if(path==='/api/plans'&&method==='PUT'){
    const owner=requireUser();const plan=planSchema.parse(await request.json());const clinic=baseClinic(plan.clinicId);
    if(!clinic||!clinic.visitModes.includes(plan.visitMode))throw new HttpError(400,'INVALID_PLAN');
    transaction(db,()=>{const existing=db.prepare('SELECT id FROM visit_plans WHERE user_id=? AND id=?').get(owner.id,plan.id);db.prepare('INSERT INTO visit_plans VALUES (?,?,?,?,?) ON CONFLICT(user_id,id) DO UPDATE SET clinic_id=excluded.clinic_id,document=excluded.document').run(plan.id,owner.id,plan.clinicId,JSON.stringify(plan),Date.now());if(!existing)countEvent(db,'saved_plans');});return json(plan);
   }
   const planPath=path.match(/^\/api\/plans\/([^/]+)$/);
   if(planPath){const owner=requireUser();const id=decodeURIComponent(planPath[1]);const row=db.prepare('SELECT document FROM visit_plans WHERE user_id=? AND id=?').get(owner.id,id);if(!row)throw new HttpError(404,'NOT_FOUND');if(method==='DELETE'){db.prepare('DELETE FROM visit_plans WHERE user_id=? AND id=?').run(owner.id,id);return json({ok:true});}if(method==='GET'){const plan=JSON.parse(row.document as string);if(plan.isSample||!baseClinic(plan.clinicId))throw new HttpError(404,'NOT_FOUND');return json(plan);}}
   if(path==='/api/clinics'&&method==='GET'){
    const filters=filtersSchema.parse(JSON.parse(url.searchParams.get('filters')||'{}')) as SearchFilters;
    const clinics=db.prepare('SELECT c.id FROM clinics c JOIN source_metadata s ON s.clinic_id=c.id WHERE s.fictional=0').all().map(r=>clinicView(r.id as string)!);return json(searchDirectory(clinics,filters));
   }
   const clinicPath=path.match(/^\/api\/clinics\/([^/]+)$/);
   if(clinicPath&&method==='GET'){const clinic=clinicView(decodeURIComponent(clinicPath[1]));if(!clinic)throw new HttpError(404,'NOT_FOUND');return json(clinic);}
   if(path==='/api/reports'&&method==='POST'){
    if(user)requireUser();const requestKey=request.headers.get('idempotency-key');if(!requestKey||!/^[a-zA-Z0-9_-]{8,100}$/.test(requestKey))throw new HttpError(400,'IDEMPOTENCY_REQUIRED');
    const existing=db.prepare('SELECT public_document FROM reports WHERE actor_hash=? AND request_key=?').get(actor,requestKey);if(existing)return json(JSON.parse(existing.public_document as string));
    limit(db,`reports:${actor}`,5,3600000);limit(db,`reports-ip:${ipHash}`,20,3600000);
    const input=await request.json() as {clinicId?:string};let validated;
    try{validated=validateDraft(input,baseClinic(String(input.clinicId||'')));}catch{countEvent(db,'report_rejections');throw new HttpError(400,'INVALID_REPORT');}
    const {draft,total,kind}=validated;
    const fingerprint=hash(config.secret,JSON.stringify([actor,draft.clinicId,draft.visitMode,draft.visitDate,kind,total,draft.elapsedMinutes??null]));
    const duplicate=db.prepare('SELECT public_document FROM reports WHERE fingerprint=? AND submitted_at>?').get(fingerprint,Date.now()-86400000);if(duplicate)return json(JSON.parse(duplicate.public_document as string));
    const suspicious=(total??draft.elapsedMinutes??0)>480;
    const id=randomUUID();const report:PatientReport={id,clinicId:draft.clinicId,submittedAt:new Date().toISOString(),visitMode:draft.visitMode,totalMinutes:total??0,elapsedMinutes:kind==='current-wait'?draft.elapsedMinutes:undefined,reportKind:kind,source:'patient report',anonymous:true,accuracy:draft.accuracy||undefined,communication:draft.communication||undefined,rushed:draft.rushed?draft.rushed==='yes':undefined,moderationStatus:suspicious?'review':'accepted'};
    transaction(db,()=>{db.prepare('INSERT INTO reports VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,draft.clinicId,user?.id??null,actor,requestKey,fingerprint,kind,draft.visitMode,total,kind==='current-wait'?draft.elapsedMinutes!:null,Date.now(),draft.visitDate,suspicious?'review':'accepted',JSON.stringify(report));countEvent(db,suspicious?'reports_review':kind==='current-wait'?'reports_ongoing':'reports_completed');recalculate(db);});
    const response=json(report,201);if(identity.cookie)response.headers.append('Set-Cookie',identity.cookie+(config.origin.startsWith('https:')?'; Secure':''));return response;
   }
   if(path==='/api/presence'&&method==='POST'){
    const key=user?hash(config.secret,`session:${session!.session.id}`):actor;
    db.prepare('INSERT INTO presence VALUES (?,?,?,?) ON CONFLICT(key) DO UPDATE SET last_seen=excluded.last_seen').run(key,user?.id??null,user?session!.session.id:null,Date.now());const response=json({ok:true});if(identity.cookie)response.headers.append('Set-Cookie',identity.cookie+(config.origin.startsWith('https:')?'; Secure':''));return response;
   }
   const integration=path.match(/^\/api\/integrations\/(ratings|travel|booking)\/([^/]+)$/);
   if(integration&&method==='GET'){if(!baseClinic(integration[2]))throw new HttpError(404,'NOT_FOUND');const provider=adapters[integration[1] as 'ratings'|'travel'|'booking'];return json(provider?await ('get'in provider?provider.get(integration[2]):provider.availability(integration[2])):unavailable());}
   if(path.startsWith('/api/admin/')){
    requireUser();if(!admin)throw new HttpError(403,'ADMIN_REQUIRED');
    const audit=(action:string,target:string,changes:unknown)=>db.prepare('INSERT INTO audit_log VALUES (?,?,?,?,?,?)').run(randomUUID(),user!.id,action,target,JSON.stringify(changes),Date.now());
    if(path==='/api/admin/guide'&&method==='GET')return new Response(readFileSync(new URL('../docs/runbook.md',import.meta.url),'utf8'),{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
    if(path==='/api/admin/accounts'&&method==='GET'){
     const query=(url.searchParams.get('q')||'').slice(0,100);const page=Math.max(0,Math.min(100000,Number(url.searchParams.get('page'))||0));const pattern=`%${query.replace(/[\\%_]/g,'\\$&')}%`;
     const where="emailVerified=1 AND (email LIKE ? ESCAPE '\\' OR name LIKE ? ESCAPE '\\')";
     return json({accounts:db.prepare(`SELECT u.id,u.firstName,u.lastName,u.email,u.createdAt,m.verified_at AS verifiedAt,'verified' AS status FROM user u JOIN account_metadata m ON m.user_id=u.id WHERE ${where} ORDER BY u.createdAt DESC,u.id LIMIT 20 OFFSET ?`).all(pattern,pattern,page*20),total:db.prepare(`SELECT count(*) n FROM user WHERE ${where}`).get(pattern,pattern)?.n,page,pageSize:20});
    }
    if(path==='/api/admin/metrics'&&method==='GET'){
     const now=Date.now();return json({asOf:new Date(now).toISOString(),timezone:'UTC',activeWindowMinutes:5,recentWindow:'7 UTC calendar days including today',verifiedAccounts:db.prepare('SELECT count(*) n FROM user WHERE emailVerified=1').get()?.n,activeAccounts:db.prepare('SELECT count(DISTINCT user_id) n FROM presence WHERE last_seen>? AND user_id IS NOT NULL').get(now-5*60000)?.n,accountSessions:db.prepare('SELECT count(*) n FROM presence WHERE last_seen>? AND user_id IS NOT NULL').get(now-5*60000)?.n,guestSessions:db.prepare('SELECT count(*) n FROM presence WHERE last_seen>? AND user_id IS NULL').get(now-5*60000)?.n,metrics:db.prepare("SELECT metric,SUM(value) AS allTime,SUM(CASE WHEN day>=? THEN value ELSE 0 END) AS recent FROM daily_metrics GROUP BY metric").all(new Date(now-6*86400000).toISOString().slice(0,10)),confirmedBookings:null,jobs:db.prepare('SELECT job,status,finished_at,error_code FROM job_runs ORDER BY started_at DESC LIMIT 12').all()});
    }
    if(path==='/api/admin/checklist'&&method==='GET')return json(db.prepare('SELECT * FROM launch_tasks ORDER BY id').all());
    const task=path.match(/^\/api\/admin\/checklist\/([^/]+)$/);
    if(task&&method==='PUT'){const data=z.object({status:z.enum(['todo','doing','done']),notes:z.string().max(2000)}).strict().parse(await request.json());if(!db.prepare('SELECT id FROM launch_tasks WHERE id=?').get(task[1]))throw new HttpError(404,'NOT_FOUND');transaction(db,()=>{db.prepare('UPDATE launch_tasks SET status=?,notes=? WHERE id=?').run(data.status,data.notes,task[1]);audit('checklist.update',task[1],data);});return json({ok:true});}
    if(path==='/api/admin/reports'&&method==='GET')return json(db.prepare("SELECT id,clinic_id,kind,mode,total_minutes,elapsed_minutes,submitted_at,status FROM reports WHERE status='review' ORDER BY submitted_at DESC LIMIT 100").all());
    const review=path.match(/^\/api\/admin\/reports\/([^/]+)$/);
    if(review&&method==='PUT'){const data=z.object({status:z.enum(['accepted','rejected']),reason:z.string().min(3).max(500)}).strict().parse(await request.json());const row=db.prepare('SELECT status,kind FROM reports WHERE id=?').get(review[1]);if(!row)throw new HttpError(404,'NOT_FOUND');if(row.status!=='review')throw new HttpError(409,'ALREADY_REVIEWED');transaction(db,()=>{db.prepare("UPDATE reports SET status=?,public_document=json_set(public_document,'$.moderationStatus',?) WHERE id=?").run(data.status,data.status,review[1]);audit('report.review',review[1],data);countEvent(db,data.status==='accepted'?row.kind==='current-wait'?'reports_ongoing':'reports_completed':'report_rejections');recalculate(db);});return json({ok:true});}
    const correction=path.match(/^\/api\/admin\/clinics\/([^/]+)$/);
    if(correction&&method==='PATCH'){const before=baseClinic(correction[1]);if(!before)throw new HttpError(404,'NOT_FOUND');const data=clinicCorrectionSchema.parse(await request.json());transaction(db,()=>{writeClinic(db,{...before,...data},!!db.prepare('SELECT fictional FROM source_metadata WHERE clinic_id=?').get(before.id)?.fictional);audit('clinic.correct',before.id,{before:Object.fromEntries(Object.keys(data).map(k=>[k,before[k as keyof Clinic]])),after:data});});return json(clinicView(before.id));}
    if(path==='/api/admin/audit'&&method==='GET')return json(db.prepare('SELECT action,target,changes,created_at FROM audit_log ORDER BY created_at DESC LIMIT 100').all());
   }
   throw new HttpError(404,'NOT_FOUND');
  }catch(error){
   if(error instanceof HttpError)return json({code:error.code},error.status);
   if(error instanceof z.ZodError||error instanceof SyntaxError)return json({code:'INVALID_INPUT'},400);
   if(error&&typeof error==='object'&&'statusCode'in error)return json({code:'AUTHENTICATION_FAILED'},Number(error.statusCode)||400);
   countEvent(db,'service_failures');console.error('Request failed',path,error instanceof Error?error.message:'unknown');return json({code:'SERVICE_UNAVAILABLE'},503);
  }
 }
 return {db,auth,handle,close:()=>db.close()};
}
