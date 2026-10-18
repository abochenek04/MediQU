import { backup } from 'node:sqlite';
import { readConfig } from './config.ts';
import { openDatabase } from './database.ts';
import { seedTasks } from './seed.ts';
import { runJobs } from './jobs.ts';
const config=readConfig();const db=openDatabase(config);
try {
 const command=process.argv[2];
 if(command==='migrate')console.log(`Migrations applied to ${config.environment}.`);
 else if(command==='seed'){seedTasks(db);await runJobs(db,config);console.log('Launch checklist ready. No clinics or accounts were generated.');}
 else if(command==='admin'){
  if(!config.adminEnabled)throw new Error('Administration is disabled on the public production server');
  const email=(process.argv[3]||'').trim().toLowerCase();const user=db.prepare('SELECT id FROM user WHERE email=? AND emailVerified=1').get(email);
  if(!user)throw new Error('Verify the account first, then provide its email to the trusted server CLI');
  db.prepare('INSERT OR IGNORE INTO administrators VALUES (?,?)').run(user.id,Date.now());seedTasks(db);console.log('Administrator granted.');
 } else if(command==='jobs'){await runJobs(db,config);console.log('Jobs completed.');}
 else if(command==='backup'){const path=process.argv[3];if(!path)throw new Error('Provide a new backup path outside the static assets');await backup(db,path);console.log('Consistent SQLite backup created; encrypt it before off-host storage.');}
 else throw new Error('Usage: server/cli.ts migrate|seed|admin <email>|jobs|backup <path>');
}finally{db.close();}
