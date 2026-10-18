import { resolve } from 'node:path';
export interface ServerConfig {
 environment: 'development' | 'staging' | 'production' | 'test';
 database: string; origin: string; port: number; host: string; secret: string;
 mailMode: 'file' | 'resend'; mailDirectory: string; resendKey?: string; mailFrom?: string;
 mailDailyLimit: number; mailMonthlyLimit: number;
 serveStatic: boolean; adminEnabled: boolean; trustProxy: boolean;
}
export function readConfig(): ServerConfig {
 const environment = process.env.APP_ENV || 'development';
 if (!['development','staging','production','test'].includes(environment)) throw new Error('Invalid APP_ENV');
 const deployed = ['staging','production'].includes(environment);
 const secret = process.env.AUTH_SECRET || (deployed ? '' : 'local-development-only-change-before-deploy-64-character-secret');
 const origin = process.env.APP_ORIGIN || 'http://localhost:4173';
 const mailMode = process.env.MAIL_MODE || (deployed ? 'resend' : 'file');
 if (secret.length < 32 || (deployed && /^(local-|replace-|change-me)/i.test(secret))) throw new Error('Set a unique AUTH_SECRET of at least 32 characters');
 if (deployed && (!origin.startsWith('https://') || mailMode !== 'resend' || !process.env.RESEND_API_KEY || !process.env.MAIL_FROM)) throw new Error('Deployed environments require HTTPS and configured email delivery');
 if (!['file','resend'].includes(mailMode)) throw new Error('Invalid MAIL_MODE');
 const mailLimit=(name:string,fallback:number)=>{
  const raw=process.env[name];const value=raw===undefined?fallback:Number(raw);
  if((raw!==undefined&&!/^\d+$/.test(raw))||!Number.isSafeInteger(value)||value<0)throw new Error(`${name} must be a non-negative integer; 0 pauses email delivery`);
  return value;
 };
 return { environment: environment as ServerConfig['environment'], database: resolve(process.env.DATABASE_PATH || `.data/${environment}/mediq.sqlite`), origin: new URL(origin).origin, port: Number(process.env.PORT || 3001), host: process.env.HOST || '127.0.0.1', secret, mailMode: mailMode as 'file' | 'resend', mailDirectory: resolve(process.env.MAIL_DIRECTORY || `.data/${environment}/mail`), resendKey: process.env.RESEND_API_KEY, mailFrom: process.env.MAIL_FROM, mailDailyLimit: mailLimit('MAIL_DAILY_LIMIT',100), mailMonthlyLimit: mailLimit('MAIL_MONTHLY_LIMIT',1000), serveStatic: process.env.SERVE_STATIC === 'true', adminEnabled: environment !== 'production', trustProxy: process.env.TRUST_PROXY === 'true' };
}
