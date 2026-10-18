import { rmSync } from 'node:fs';
import { readConfig } from '../server/config.ts';
import { openDatabase } from '../server/database.ts';
import { seedApprovedTestClinics } from '../tests/helpers/approvedFixtures.ts';
import { runJobs } from '../server/jobs.ts';
// This directory is generated solely for browser tests; never use a developer or cloud DB.
process.env.APP_ENV='test';process.env.DATABASE_PATH='.data/e2e/mediq.sqlite';process.env.MAIL_DIRECTORY='.data/e2e/mail';process.env.APP_ORIGIN='http://localhost:4173';process.env.MAIL_MODE='file';process.env.HOST='127.0.0.1';process.env.PORT='3001';
rmSync('.data/e2e',{recursive:true,force:true});
const config=readConfig();const db=openDatabase(config);seedApprovedTestClinics(db,config,true);await runJobs(db,config);db.close();
await import('../server/index.ts');
