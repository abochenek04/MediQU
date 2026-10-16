import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useApp } from '../context/AppContext';
import { authRequest, backendEnabled, announceAccountChange, errorKey } from '../services/api';
import { Link, navigate } from '../utils/navigation';
let pendingEmail='';let lastCodeAt=0;
export function PasswordField({label,value,onChange,newPassword=false}:{label:string;value:string;onChange:(value:string)=>void;newPassword?:boolean}){
 const {t}=useApp();const [visible,setVisible]=useState(false);
 return <label className="field-label"><span>{t(label)}</span><span className="password-control"><input aria-label={t(label)} required minLength={newPassword?12:1} maxLength={128} type={visible?'text':'password'} autoComplete={newPassword?'new-password':'current-password'} value={value} onChange={e=>onChange(e.target.value)} /><button type="button" aria-label={t(visible?'Hide password':'Show password')} aria-pressed={visible} onClick={()=>setVisible(v=>!v)}>{t(visible?'Hide':'Show')}</button></span>{newPassword&&<small>{t('Use 12–128 characters.')}</small>}</label>;
}
export function AccountPage({mode}:{mode:'signup'|'login'|'verify'|'reset'}){
 const {t,user}=useApp();const [email,setEmail]=useState(pendingEmail);const [firstName,setFirstName]=useState('');const [lastName,setLastName]=useState('');const [password,setPassword]=useState('');const [otp,setOtp]=useState('');
 const [busy,setBusy]=useState(false);const busyRef=useRef(false);const [error,setError]=useState('');const [message,setMessage]=useState('');const [resetSent,setResetSent]=useState(false);const [cooldown,setCooldown]=useState(Math.max(0,Math.ceil((lastCodeAt+60000-Date.now())/1000)));
 useEffect(()=>{const timer=setInterval(()=>setCooldown(Math.max(0,Math.ceil((lastCodeAt+60000-Date.now())/1000))),1000);return()=>clearInterval(timer);},[]);
 const title=mode==='signup'?'Create a free account':mode==='verify'?'Verify your email':mode==='reset'?'Reset password':'Sign in';
 const run=async(action:()=>Promise<void>)=>{if(busyRef.current)return;busyRef.current=true;setBusy(true);setError('');setMessage('');try{await action();}catch(e){setError(errorKey(e));}finally{busyRef.current=false;setBusy(false);}};
 const send=()=>run(async()=>{
  const normalized=email.trim().toLowerCase();
  if(mode==='reset'){await authRequest('/email-otp/request-password-reset',{email:normalized});setResetSent(true);}else await authRequest('/email-otp/send-verification-otp',{email:normalized,type:'email-verification'});
  lastCodeAt=Date.now();setCooldown(60);setMessage('If eligible, a code has been sent. Check your inbox and spam folder.');
 });
 const submit=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();if (!event.currentTarget.checkValidity()) { setError('Check the form and try again.'); event.currentTarget.querySelector<HTMLElement>(':invalid')?.focus(); return; } void run(async()=>{
  const normalized=email.trim().toLowerCase();pendingEmail=normalized;
  if(mode==='signup'){
   await authRequest('/sign-up/email',{firstName:firstName.trim(),lastName:lastName.trim(),email:normalized,password});setPassword('');lastCodeAt=Date.now();navigate('/verify');
  }else if(mode==='login'){
   await authRequest('/sign-in/email',{email:normalized,password});setPassword('');announceAccountChange();navigate('/find');
  }else if(mode==='verify'){
   await authRequest('/email-otp/verify-email',{email:normalized,otp});setMessage('Email verified. You can now sign in.');setOtp('');
  }else if(resetSent){
   await authRequest('/email-otp/reset-password',{email:normalized,otp,password});setPassword('');setOtp('');announceAccountChange();setMessage('Password reset. Sign in with your new password.');
  }else{
   await authRequest('/email-otp/request-password-reset',{email:normalized});setResetSent(true);lastCodeAt=Date.now();setCooldown(60);setMessage('If eligible, a code has been sent. Check your inbox and spam folder.');
  }
 });};
 return <div className="shell page-space account-shell"><section className="account-card"><span className="eyebrow">MediQU</span><h1>{t(title)}</h1>
  {!backendEnabled?<div className="info-note"><p>{t('Account services are currently unavailable. Continue browsing as a guest.')}</p><Link to="/find">{t('Continue as a guest')}</Link></div>:<>
  {user&&<p>{t('You are signed in as {email}.',{email:user.email})} <Link to="/settings">{t('Settings')}</Link></p>}
  {mode==='verify'&&<p>{t('Enter the six-digit code. It expires after 10 minutes. Your account stays pending until verification.')}</p>}
  {mode==='signup'&&<p>{t('Already registered? Sign in or reset your password. Signup responses protect account privacy.')}</p>}
  <form onSubmit={submit} className="account-form" noValidate>
   {mode==='signup'&&<div className="field-pair"><label className="field-label"><span>{t('First name')}</span><input required maxLength={80} autoComplete="given-name" value={firstName} onChange={e=>setFirstName(e.target.value)} /></label><label className="field-label"><span>{t('Last name')}</span><input required maxLength={80} autoComplete="family-name" value={lastName} onChange={e=>setLastName(e.target.value)} /></label></div>}
   <label className="field-label"><span>{t('Email')}</span><input required type="email" autoComplete="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} /></label>
   {(mode==='verify'||(mode==='reset'&&resetSent))&&<label className="field-label"><span>{t('Verification code')}</span><input required pattern="[0-9]{6}" inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={e=>setOtp(e.target.value)} /></label>}
   {(mode==='login'||mode==='signup'||(mode==='reset'&&resetSent))&&<PasswordField label={mode==='reset'?'New password':'Password'} value={password} onChange={setPassword} newPassword={mode!=='login'} />}
   {error&&<p className="form-error" role="alert">{t(error)}</p>}{message&&<p className="success-message" role="status">{t(message)}</p>}
   <button className="button button-primary" disabled={busy} type="submit">{t(busy?'Please wait…':mode==='reset'&&!resetSent?'Send reset code':title)}</button>
   {(mode==='verify'||(mode==='reset'&&resetSent))&&<button className="button button-secondary" disabled={busy||cooldown>0} type="button" onClick={()=>void send()}>{cooldown>0?t('Resend in {seconds}s',{seconds:cooldown}):t('Resend code')}</button>}
  </form></>}
  <nav className="account-links" aria-label={t('Account navigation')}><Link to="/login">{t('Sign in')}</Link><Link to="/signup">{t('Sign up')}</Link><Link to="/verify">{t('Verify email')}</Link><Link to="/reset-password">{t('Forgot password?')}</Link><Link to="/find">{t('Continue as a guest')}</Link></nav>
 </section></div>;
}
