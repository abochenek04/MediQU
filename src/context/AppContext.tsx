import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { clinicService, clearReportRequests } from '../services/clinicService';
import { api, authRequest, backendEnabled, announceAccountChange, errorKey, setExpectedAccount } from '../services/api';
import type { AccountState, AccountUser, PrivateProfile } from '../services/account';
import { translate, supportedLanguages } from './translate';
import type { AppToast, PatientReport, SavedAppointment, WaitReportDraft } from '../types';
interface AppContextValue {
 savedClinicIds:string[];savedAppointments:SavedAppointment[];submittedReports:PatientReport[];language:string;toasts:AppToast[];
 user:AccountUser|null;profile:PrivateProfile|null;isAdmin:boolean;accountReady:boolean;accountError:string;
 tourDone:boolean;finishTour:()=>void;
 refreshAccount:()=>Promise<void>;logout:()=>Promise<void>;
 toggleSavedClinic:(id:string)=>void;saveAppointment:(appointment:SavedAppointment)=>Promise<void>;removeAppointment:(id:string)=>void;
 submitReport:(draft:WaitReportDraft)=>Promise<PatientReport>;setLanguage:(language:string)=>void;
 pushToast:(message:string,tone?:AppToast['tone'])=>void;t:(key:string,values?:Record<string,string|number>)=>string;
}
const AppContext=createContext<AppContextValue|null>(null);
const guestPlans=():SavedAppointment[]=>[];
const tourSeenKey='mediqu-tour-seen-v1';
const hasSeenTour=()=>{try{return localStorage.getItem(tourSeenKey)==='true';}catch{return false;}};
export function AppProvider({children}:{children:ReactNode}) {
 const [savedClinicIds,setSavedClinicIds]=useState<string[]>([]);
 const [savedAppointments,setSavedAppointments]=useState<SavedAppointment[]>(guestPlans);
 const [submittedReports,setSubmittedReports]=useState<PatientReport[]>([]);
 const [language,updateLanguage]=useState('en');
 const [toasts,setToasts]=useState<AppToast[]>([]);
 const [user,setUser]=useState<AccountUser|null>(null);
 const [profile,setProfile]=useState<PrivateProfile|null>(null);
 const [isAdmin,setIsAdmin]=useState(false);
 const [accountReady,setAccountReady]=useState(!backendEnabled);
 const [accountError,setAccountError]=useState('');
 const [tourDone,setTourDone]=useState(hasSeenTour);
 const dataRevision=useRef(0);const generation=useRef(0);const restoreRequest=useRef(0);const owner=useRef<string|null>(null);const toastId=useRef(0);
 const savedRef=useRef(savedClinicIds);savedRef.current=savedClinicIds;
 const busy=useRef(new Set<string>());
 const t=useCallback((key:string,values?:Record<string,string|number>)=>translate(language,key,values),[language]);
 const pushToast=useCallback((message:string,tone:AppToast['tone']='default')=>{const id=++toastId.current;setToasts(current=>[...current,{id,message,tone}]);window.setTimeout(()=>setToasts(current=>current.filter(item=>item.id!==id)),5000);},[]);
 const clearPrivate=useCallback(()=>{generation.current++;clearReportRequests();busy.current.clear();owner.current=null;setExpectedAccount(null);setUser(null);setProfile(null);setIsAdmin(false);setSavedClinicIds([]);setSavedAppointments(guestPlans());setSubmittedReports([]);setToasts([]);updateLanguage('en');},[]);
 const refreshAccount=useCallback(async()=>{
  if(!backendEnabled)return;
  const request=++restoreRequest.current;const revision=dataRevision.current;
  try{
   const state=await api<AccountState>('/me');if(request!==restoreRequest.current)return;
   const identityChanged=state.user?.id!==owner.current && !(state.user===null&&owner.current===null);
   if(identityChanged)clearPrivate();
   owner.current=state.user?.id||null;setExpectedAccount(owner.current);setUser(state.user);setIsAdmin(state.admin);
   if(identityChanged||revision===dataRevision.current)setProfile(state.profile||null);
   if(state.user&&(identityChanged||revision===dataRevision.current)){setSavedClinicIds(state.savedClinicIds||[]);setSavedAppointments((state.savedAppointments||[]).filter(plan=>!plan.isSample));updateLanguage(state.profile?.language||'en');}
   setAccountError('');setAccountReady(true);
  }catch(error){if(request===restoreRequest.current){setAccountError(errorKey(error));setAccountReady(false);}}
 },[clearPrivate]);
 useEffect(()=>{
  // Only legacy MediQU keys; never clear unrelated browser storage.
  try{for(const key of ['mediq-saved-clinics','mediq-appointments','mediq-reports','mediq-language','mediq-tour-v1','mediq-onboarded'])localStorage.removeItem(key);}catch{/* Storage may be disabled. */}
  void refreshAccount();
  const changed=()=>{restoreRequest.current++;clearPrivate();setAccountReady(!backendEnabled);void refreshAccount();};
  const focused=()=>{if(document.visibilityState==='visible')void refreshAccount();};
  const storage=(e:StorageEvent)=>{if(e.key===tourSeenKey&&e.newValue==='true')setTourDone(true);if(e.key==='mediq-account-signal'&&e.newValue)changed();};
  let channel:BroadcastChannel|undefined;try{channel=new BroadcastChannel('mediq-account');channel.onmessage=changed;}catch{/* Storage/focus/poll provide fallback. */}
  window.addEventListener('mediq:account-change',changed);window.addEventListener('mediq:session-expired',changed);window.addEventListener('storage',storage);window.addEventListener('focus',focused);
  const timer=window.setInterval(focused,30000);
  return()=>{restoreRequest.current++;generation.current++;channel?.close();clearInterval(timer);window.removeEventListener('mediq:account-change',changed);window.removeEventListener('mediq:session-expired',changed);window.removeEventListener('storage',storage);window.removeEventListener('focus',focused);};
 },[refreshAccount,clearPrivate]);
 useEffect(()=>{document.documentElement.lang=language;document.documentElement.dir=language==='ar'?'rtl':'ltr';},[language]);
 useEffect(()=>{
  if(!backendEnabled||!accountReady)return;
  let activeAt=Date.now();const active=()=>{activeAt=Date.now();};
  const heartbeat=()=>{if(document.visibilityState==='visible'&&Date.now()-activeAt<5*60000)void api('/presence','POST').catch(()=>{});};
  window.addEventListener('pointerdown',active);window.addEventListener('keydown',active);heartbeat();const timer=window.setInterval(heartbeat,60000);
  return()=>{clearInterval(timer);window.removeEventListener('pointerdown',active);window.removeEventListener('keydown',active);};
 },[accountReady,user?.id]);
 const logout=useCallback(async()=>{restoreRequest.current++;clearPrivate();setAccountReady(false);try{await authRequest('/sign-out');announceAccountChange();}catch(error){pushToast(t(errorKey(error)),'info');await refreshAccount();}},[clearPrivate,refreshAccount,pushToast,t]);
 const toggleSavedClinic=useCallback((id:string)=>{
  if(busy.current.has(`clinic:${id}`)||!accountReady)return;const epoch=generation.current;const wasSaved=savedRef.current.includes(id);busy.current.add(`clinic:${id}`);
  void(async()=>{try{if(owner.current)await api(`/saved-clinics/${encodeURIComponent(id)}`,wasSaved?'DELETE':'PUT');if(epoch!==generation.current)return;dataRevision.current++;setSavedClinicIds(current=>wasSaved?current.filter(value=>value!==id):[...new Set([...current,id])]);pushToast(t(wasSaved?'Clinic removed from saved care.':'Clinic saved for later.'),'success');}catch(error){if(epoch===generation.current)pushToast(t(errorKey(error)),'info');}finally{busy.current.delete(`clinic:${id}`);}})();
 },[accountReady,pushToast,t]);
 const saveAppointment=useCallback(async(appointment:SavedAppointment)=>{
  const epoch=generation.current;if(!accountReady||busy.current.has(`plan:${appointment.id}`))throw new Error('BUSY');busy.current.add(`plan:${appointment.id}`);
  try{const saved=owner.current?await clinicService.saveAppointment(appointment):appointment;if(epoch!==generation.current)throw new Error('ACCOUNT_CHANGED');dataRevision.current++;setSavedAppointments(current=>[saved,...current.filter(p=>p.id!==saved.id)]);pushToast(t('Visit saved. Your planning window is ready.'),'success');}finally{busy.current.delete(`plan:${appointment.id}`);}
 },[accountReady,pushToast,t]);
 const removeAppointment=useCallback((id:string)=>{
  const epoch=generation.current;if(!accountReady||busy.current.has(`plan:${id}`))return;busy.current.add(`plan:${id}`);
  void(async()=>{try{if(owner.current)await api(`/plans/${encodeURIComponent(id)}`,'DELETE');if(epoch!==generation.current)return;dataRevision.current++;setSavedAppointments(current=>current.filter(p=>p.id!==id));pushToast(t('Saved visit removed.'));}catch(error){if(epoch===generation.current)pushToast(t(errorKey(error)),'info');}finally{busy.current.delete(`plan:${id}`);}})();
 },[accountReady,pushToast,t]);
 const submitReport=useCallback(async(draft:WaitReportDraft)=>{
  const epoch=generation.current;const result=await clinicService.submitWaitReport(draft);if(epoch!==generation.current)throw new Error('ACCOUNT_CHANGED');
  if(result.moderationStatus!=='review')setSubmittedReports(current=>[result,...current.filter(r=>r.id!==result.id)]);
  pushToast(t(result.moderationStatus==='review'?'Report received for review.':backendEnabled?'Report accepted. Thank you.':'Thank you—your report was added.'),'success');return result;
 },[pushToast,t]);
 const setLanguage=useCallback((next:string)=>{
  if(!(supportedLanguages as readonly string[]).includes(next))return;const epoch=generation.current;
  if(!owner.current){updateLanguage(next);return;}
  void api('/preferences','PUT',{language:next}).then(()=>{if(epoch===generation.current){dataRevision.current++;updateLanguage(next);setProfile(current=>current?{...current,language:next}:null);}},error=>{if(epoch===generation.current)pushToast(t(errorKey(error)),'info');});
 },[pushToast,t]);
 const finishTour=useCallback(()=>{setTourDone(true);try{localStorage.setItem(tourSeenKey,'true');}catch{/* Keep the preference in memory when browser storage is unavailable. */}},[]);
 const value=useMemo(()=>({savedClinicIds,savedAppointments,submittedReports,language,toasts,user,profile,isAdmin,accountReady,accountError,tourDone,finishTour,refreshAccount,logout,toggleSavedClinic,saveAppointment,removeAppointment,submitReport,setLanguage,pushToast,t}),[savedClinicIds,savedAppointments,submittedReports,language,toasts,user,profile,isAdmin,accountReady,accountError,tourDone,finishTour,refreshAccount,logout,toggleSavedClinic,saveAppointment,removeAppointment,submitReport,setLanguage,pushToast,t]);
 return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
export const useApp=()=>{const context=useContext(AppContext);if(!context)throw new Error('useApp must be used within AppProvider');return context;};
