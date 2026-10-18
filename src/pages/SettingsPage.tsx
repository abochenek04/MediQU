import { useState, useRef, type FormEvent } from 'react';
import { useApp } from '../context/AppContext';
import { api, authRequest, announceAccountChange, errorKey } from '../services/api';
import { PasswordField } from './AccountPage';
import { Modal } from '../components/UI';
import { Link, navigate } from '../utils/navigation';
import type { PrivateProfile } from '../services/account';
export function SettingsPage(){
 const {user,profile,t,pushToast,refreshAccount}=useApp();
 if(!user||!profile)return <div className="shell page-space"><h1>{t('Settings')}</h1><p>{t('Sign in to manage your account.')}</p><Link to="/login">{t('Sign in')}</Link></div>;
 return <SettingsForm key={user.id} initial={profile} />;
}
function SettingsForm({initial}:{initial:PrivateProfile}){
 const {user,t,pushToast,refreshAccount,language}=useApp();const [profile,setProfile]=useState(initial);const [firstName,setFirstName]=useState(user!.firstName);const [lastName,setLastName]=useState(user!.lastName);
 const [busy,setBusy]=useState(false);const lock=useRef(false);const [error,setError]=useState('');const [currentPassword,setCurrentPassword]=useState('');const [newPassword,setNewPassword]=useState('');
 const [deleting,setDeleting]=useState(false);const [deletePassword,setDeletePassword]=useState('');const [confirmation,setConfirmation]=useState('');
 const run=async(action:()=>Promise<void>)=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await action();}catch(e){setError(errorKey(e));}finally{setBusy(false);lock.current=false;}};
 const pounds=profile.weightLb===null?'':String(profile.weightLb);
 const inches=profile.heightInches===null?'':String(profile.heightInches);
 const weightOptions=Array.from({length:1500},(_,i)=>i+1);
 const save=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();if (!e.currentTarget.checkValidity()) { setError('Check the form and try again.'); e.currentTarget.querySelector<HTMLElement>(':invalid')?.focus(); return; } void run(async()=>{await api('/profile','PUT',{...profile,language,firstName,lastName});await refreshAccount();pushToast(t('Settings saved.'),'success');});};
 const changePassword=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();if (!e.currentTarget.checkValidity()) { setError('Check the form and try again.'); e.currentTarget.querySelector<HTMLElement>(':invalid')?.focus(); return; } void run(async()=>{await authRequest('/change-password',{currentPassword,newPassword,revokeOtherSessions:true});setCurrentPassword('');setNewPassword('');announceAccountChange();pushToast(t('Password changed. Other sessions were revoked.'),'success');});};
 const remove=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();if (!e.currentTarget.checkValidity()) { setError('Check the form and try again.'); e.currentTarget.querySelector<HTMLElement>(':invalid')?.focus(); return; } void run(async()=>{await api('/account','DELETE',{password:deletePassword,confirmation});setDeletePassword('');announceAccountChange();navigate('/find');});};
 return <div className="shell page-space settings-shell"><h1>{t('Settings')}</h1><p>{t('Your profile is private. Optional fields start empty and can be cleared.')}</p>
  <form className="account-card account-form" onSubmit={save} noValidate><h2>{t('Profile')}</h2><div className="field-pair">
   <label className="field-label"><span>{t('First name')}</span><input required maxLength={80} value={firstName} onChange={e=>setFirstName(e.target.value)} autoComplete="given-name" /></label><label className="field-label"><span>{t('Last name')}</span><input required maxLength={80} value={lastName} onChange={e=>setLastName(e.target.value)} autoComplete="family-name" /></label>
  </div><label className="field-label"><span>{t('Email')}</span><input readOnly value={user!.email} /></label><h3>{t('Optional personal information')}</h3><p>{t('These fields are private and are never included in reports or activity metrics.')}</p>
  <div className="field-pair"><label className="field-label"><span>{t('Sex')}</span><select value={profile.sex||''} onChange={e=>setProfile({...profile,sex:(e.target.value||null) as PrivateProfile['sex']})}><option value="">{t('Not provided')}</option>{['female','male','intersex'].map(value=><option key={value} value={value}>{t(value)}</option>)}</select></label>
  <label className="field-label"><span>{t('Age (years)')}</span><input type="number" min={0} max={125} step={1} placeholder={t('Not provided')} value={profile.age??''} onChange={e=>setProfile({...profile,age:e.target.value===''?null:Number(e.target.value)})} /></label></div>
  <div className="field-pair">
   <label className="field-label"><span>{t('Weight (lb)')}</span><select aria-label={t('Weight (lb)')} value={pounds} onChange={e=>setProfile({...profile,weightLb:e.target.value===''?null:Number(e.target.value)})}><option value="">{t('Not provided')}</option>{weightOptions.map(value=><option key={value} value={value}>{value}</option>)}</select></label>
   <label className="field-label"><span>{t('Height (feet and inches)')}</span><select aria-label={t('Height (feet and inches)')} value={inches} onChange={e=>setProfile({...profile,heightInches:e.target.value===''?null:Number(e.target.value)})}><option value="">{t('Not provided')}</option>{Array.from({length:107},(_,i)=>i+12).map(value=><option key={value} value={value}>{t('{feet} ft {inches} in',{feet:Math.floor(value/12),inches:value%12})}</option>)}</select></label>
  </div>
  <label className="check-row"><input type="checkbox" checked={profile.notifications} onChange={e=>setProfile({...profile,notifications:e.target.checked})} />{t('Allow future visit notifications. Delivery is not configured.')}</label>
  <button type="button" className="text-button" onClick={()=>setProfile({...profile,sex:null,weightLb:null,heightInches:null,age:null})}>{t('Clear optional fields')}</button>
  <button disabled={busy} className="button button-primary">{t(busy?'Please wait…':'Save settings')}</button></form>
  <form className="account-card account-form" onSubmit={changePassword} noValidate><h2>{t('Change password')}</h2><PasswordField label="Current password" value={currentPassword} onChange={setCurrentPassword} /><PasswordField label="New password" value={newPassword} onChange={setNewPassword} newPassword /><button disabled={busy} className="button button-secondary">{t('Change password')}</button></form>
  {error&&!deleting&&<p className="form-error" role="alert">{t(error)}</p>}
  <section className="account-card"><h2>{t('Delete account')}</h2><p>{t('Deletion removes your identity, private profile, saved plans, saved clinics and submitted account reports. Aggregate counts remain. Backups may retain data until their retention period ends.')}</p><button className="button button-danger" onClick={()=>{setError('');setDeleting(true);}}>{t('Delete account')}</button></section>
  {deleting&&<Modal title={t('Permanently delete account?')} onClose={()=>{if(!busy){setDeleting(false);setDeletePassword('');}}}><form className="account-form" onSubmit={remove} noValidate><p>{t('This cannot be undone. Enter your password and type DELETE to confirm.')}</p><PasswordField label="Current password" value={deletePassword} onChange={setDeletePassword} /><label className="field-label"><span>{t('Type DELETE')}</span><input required pattern="DELETE" autoComplete="off" value={confirmation} onChange={e=>setConfirmation(e.target.value)} /></label>{error&&<p className="form-error" role="alert">{t(error)}</p>}<button disabled={busy||confirmation!=='DELETE'} className="button button-danger">{t(busy?'Please wait…':'Permanently delete account')}</button></form></Modal>}
 </div>;
}
