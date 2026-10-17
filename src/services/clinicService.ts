import { api, backendEnabled, ApiError } from './api';
export { distanceMiles } from './search';
import type {
  Clinic,
  HistoricalWaitRecord,
  LiveWaitEstimate,
  PatientReport,
  SavedAppointment,
  SearchFilters,
  VisitMode,
  WaitReportDraft,
} from '../types';

export interface ClinicDataService {
  searchClinics(filters: SearchFilters): Promise<Clinic[]>;
  getClinicById(id: string): Promise<Clinic | undefined>;
  getLiveEstimate(clinicId: string, visitType: VisitMode): Promise<LiveWaitEstimate | undefined>;
  getHistoricalWaits(clinicId: string): Promise<HistoricalWaitRecord[]>;
  submitWaitReport(report: WaitReportDraft): Promise<PatientReport>;
  saveAppointment(appointment: SavedAppointment): Promise<SavedAppointment>;
  getSavedAppointments(): Promise<SavedAppointment[]>;
}

export const defaultSearchFilters: SearchFilters = {
  query: '', insurance: '', specialty: '', language: '', minimumRating: 0,
  visitMode: 'all', timing: 'all', maxDistance: 10,
};

const reportKeys = new Map<string, string>();
export const clearReportRequests = () => reportKeys.clear();
export const backendClinicService: ClinicDataService = {
  async searchClinics(filters) { return (await api<Clinic[]>(`/clinics?filters=${encodeURIComponent(JSON.stringify(filters))}`)).filter(clinic=>clinic.directorySource==='approved'); },
  async getClinicById(id) { try { const clinic=await api<Clinic>(`/clinics/${encodeURIComponent(id)}`);return clinic.directorySource==='approved'?clinic:undefined; } catch(error) { if(error instanceof ApiError && error.status === 404) return undefined; throw error; } },
  async getLiveEstimate(id,mode) { return (await this.getClinicById(id))?.estimates.find(e => e.mode === mode); },
  async getHistoricalWaits(id) { return (await this.getClinicById(id))?.historicalWaits || []; },
  submitWaitReport(draft) { const serialized = JSON.stringify(draft); const key = reportKeys.get(serialized) || crypto.randomUUID(); if (reportKeys.size > 100) reportKeys.clear(); reportKeys.set(serialized,key); return api('/reports','POST',draft,{'Idempotency-Key':key}); },
  saveAppointment: appointment => api('/plans','PUT',appointment),
  async getSavedAppointments() { return (await api<{savedAppointments:SavedAppointment[]}>('/me')).savedAppointments || []; },
};
// Without a configured backend the directory is empty, never a fictional fallback.
export const emptyClinicService: ClinicDataService = {
  async searchClinics() { return []; },
  async getClinicById() { return undefined; },
  async getLiveEstimate() { return undefined; },
  async getHistoricalWaits() { return []; },
  async getSavedAppointments() { return []; },
  async submitWaitReport() { throw new Error('Clinic service unavailable'); },
  async saveAppointment() { throw new Error('Clinic service unavailable'); },
};
export const clinicService: ClinicDataService = backendEnabled ? backendClinicService : emptyClinicService;
