import { z } from 'zod';
import { reportRanges, validateReport } from '../src/utils/report.ts';
import type { Clinic, WaitReportDraft } from '../src/types.ts';
export const localeSchema = z.enum(['en','es','zh','ar','pl','gu','hi']);
const cleanName = z.string().trim().min(1).max(80);
export const signupSchema = z.object({firstName:cleanName,lastName:cleanName,email:z.email().max(254),password:z.string().min(12).max(128)}).strict();
export const profileSchema = z.object({firstName:cleanName,lastName:cleanName,sex:z.enum(['female','male','intersex']).nullable(),weightLb:z.number().int().min(1).max(1500).nullable(),heightInches:z.number().int().min(12).max(118).nullable(),age:z.number().int().min(0).max(125).nullable(),language:localeSchema,notifications:z.boolean()}).strict();
export const preferenceSchema = z.object({language:localeSchema}).strict();
export const planSchema = z.object({id:z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),clinicId:z.string().min(1).max(100),appointmentTime:z.iso.datetime({offset:true}),visitMode:z.enum(['walk-in','scheduled','urgent']),travelMinutes:z.number().int().min(0).max(1440),bufferMinutes:z.number().int().min(0).max(1440)}).strict();
const time = z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/);
export const draftSchema = z.object({
 timezoneOffsetMinutes:z.number().int().min(-840).max(840).optional(),
 clinicId:z.string().min(1).max(100),visitMode:z.enum(['walk-in','scheduled','urgent']),reportKind:z.enum(['current-wait','completed-visit']).optional(),elapsedMinutes:z.number().int().min(0).max(1440).optional(),
 visitDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),arrivalTime:time,checkInTime:time,providerTime:time,departureTime:time,totalRange:z.union([z.literal(''),z.enum(reportRanges as [string,...string[]])]),
 accuracy:z.enum(['','shorter','about-right','longer']),communication:z.number().int().min(0).max(5),rushed:z.enum(['','yes','no']),note:z.string().max(500),anonymous:z.boolean(),
}).strict();
export function validateDraft(input: unknown, clinic: Clinic | undefined, now = Date.now()) {
 const draft = draftSchema.parse(input) as WaitReportDraft;
 const day = Date.parse(`${draft.visitDate}T00:00:00Z`);
 const localNow = new Date(now - (draft.timezoneOffsetMinutes || 0) * 60000).toISOString();
 if (draft.visitDate > localNow.slice(0,10)) throw new Error('INVALID_REPORT');
 const current = draft.reportKind === 'current-wait';
 if (!clinic || !clinic.visitModes.includes(draft.visitMode) || !Number.isFinite(day) || new Date(day).toISOString().slice(0,10)!==draft.visitDate || day < now-31*86400000 || day > now+86400000 || (current && day < now-2*86400000)) throw new Error('INVALID_REPORT');
 const errors = validateReport(draft,current?'current':draft.totalRange?'range':'exact',false);
 if (Object.keys(errors).length) throw new Error('INVALID_REPORT');
 const minutes=(s:string)=> { const [h,m]=s.split(':').map(Number);return h*60+m; };
 const bounds=draft.totalRange.match(/\d+/g)?.map(Number)||[];
 if (!current && !draft.totalRange && draft.visitDate === localNow.slice(0,10) && draft.departureTime > localNow.slice(11,16)) throw new Error('INVALID_REPORT');
 const total=current?null:draft.totalRange?Math.round((bounds[0]+(bounds[1]??bounds[0]))/2):minutes(draft.departureTime)-minutes(draft.arrivalTime);
 if (!current && (!total || total < 1 || total > 1440)) throw new Error('INVALID_REPORT');
 return {draft,total,kind:current?'current-wait' as const:'completed-visit' as const};
}
export const clinicCorrectionSchema=z.object({name:z.string().trim().min(1).max(150).optional(),phone:z.string().max(50).optional(),address:z.string().max(250).optional(),status:z.enum(['open','closed']).optional(),languages:z.array(z.enum(['English','Spanish','Chinese','Arabic','Polish','Gujarati','Hindi','French','Mandarin'])).min(1).max(9).optional(),insurance:z.array(z.string().min(1).max(80)).min(1).max(30).optional(),specialties:z.array(z.string().min(1).max(80)).min(1).max(30).optional(),symptoms:z.array(z.string().min(1).max(80)).max(100).optional()}).strict().refine(value=>Object.keys(value).length>0);
