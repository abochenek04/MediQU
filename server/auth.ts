import { betterAuth } from 'better-auth';
import { emailOTP } from 'better-auth/plugins';
import { mkdirSync, writeFileSync } from 'node:fs';
import { hash, limit } from './security.ts';
import { randomUUID } from 'node:crypto';
import type { ServerConfig } from './config.ts';
import { countEvent, type DB } from './database.ts';

export function makeAuth(db: DB, config: ServerConfig) {
 return betterAuth({
  appName: 'MediQU', baseURL: config.origin, basePath: '/api/auth', secret: config.secret,
  database: db, trustedOrigins: [config.origin],
  emailAndPassword: { enabled: true, requireEmailVerification: true, autoSignIn: false, minPasswordLength: 12, maxPasswordLength: 128, revokeSessionsOnPasswordReset: true },
  emailVerification: { autoSignInAfterVerification: false },
  session: { expiresIn: 60*60*24*30, updateAge: 60*60*24, freshAge: 300, cookieCache: { enabled: false } },
  user: { additionalFields: { firstName: { type: 'string', required: true }, lastName: { type: 'string', required: true } } },
  advanced: { useSecureCookies: config.origin.startsWith('https:'), ipAddress: { disableIpTracking: true }, defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', path: '/' } },
  // Persistent IP/email limits are applied before the handler, including in development.
  rateLimit: { enabled: false },
  databaseHooks: { user: { update: { after: async user => {
   if (user.emailVerified) {
    const result = db.prepare('INSERT OR IGNORE INTO account_metadata VALUES (?,?)').run(user.id,Date.now());
    if (result.changes) countEvent(db,'verified_signups');
   }
  } } }, session: { create: { before: async session => {
   const user = db.prepare('SELECT emailVerified FROM user WHERE id=?').get(session.userId);
   if (!user?.emailVerified) return false;
   return {data: {...session, ipAddress: null, userAgent: null}};
  } } } },
  plugins: [emailOTP({
   sendVerificationOnSignUp: true, overrideDefaultEmailVerification: true, disableSignUp: true,
   otpLength: 6, expiresIn: 600, allowedAttempts: 5, storeOTP: 'hashed',
   async sendVerificationOTP({email,otp,type}) {
    limit(db,`mail-cooldown:${hash(config.secret,email)}`,1,60000);
    limit(db,`mail-daily:${hash(config.secret,email)}`,20,86400000);
    const subject = type === 'forget-password' ? 'MediQU password reset / Restablecer contraseña / 重置密码 / إعادة تعيين كلمة المرور / Reset hasła / પાસવર્ડ રીસેટ / पासवर्ड रीसेट' : 'MediQU email verification / Verificar correo / 验证邮箱 / تحقق البريد / Weryfikacja e-mail / ઈમેલ ચકાસણી / ईमेल सत्यापन';
    const text = `MediQU\n${otp}\n\nExpires in 10 minutes. Do not share this code.\nCaduca en 10 minutos. No compartas este código.\n10 分钟后失效。请勿分享此验证码。\nتنتهي صلاحيته خلال 10 دقائق. لا تشارك الرمز.\nWygasa za 10 minut. Nie udostępniaj kodu.\n10 મિનિટમાં સમાપ્ત થશે. કોડ શેર કરશો નહીં.\n10 मिनट में समाप्त होगा। कोड साझा न करें.\n\nIf you did not request this, ignore this message.`;
    if (config.mailMode === 'file') {
     if (!['development','test'].includes(config.environment)) throw new Error('Local mail is forbidden outside development/test');
     mkdirSync(config.mailDirectory,{recursive:true,mode:0o700});
     writeFileSync(`${config.mailDirectory}/${randomUUID()}.json`,JSON.stringify({to:email,subject,text,otp,type,createdAt:new Date().toISOString()}),{mode:0o600});
     return;
    }
    try {
     const result = await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${config.resendKey}`,'Content-Type':'application/json'},body:JSON.stringify({from:config.mailFrom,to:[email],subject,text}),signal:AbortSignal.timeout(10000)});
     if (!result.ok) throw new Error('EMAIL_DELIVERY_FAILED');
    } catch {
     countEvent(db,'email_failures');
     throw new Error('EMAIL_DELIVERY_FAILED');
    }
   },
  })],
 });
}
export type Auth = ReturnType<typeof makeAuth>;
