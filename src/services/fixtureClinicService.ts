// Test/reference service only. The application never selects this adapter.
import type { ClinicDataService } from './clinicService';
import { clinics } from '../data/mockData';
import { searchDirectory } from './search';
import { validateReport } from '../utils/report';
const delay = (milliseconds = 140) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

const getMinutesBetween = (start: string, end: string) => {
  if (!start || !end) return 0;
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  const result = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  return result < 0 ? result + 24 * 60 : result;
};

const rangeMidpoint = (range: string) => {
  const numbers = range.match(/\d+/g)?.map(Number) ?? [];
  if (numbers.length === 0) return 0;
  if (numbers.length === 1) return numbers[0];
  return Math.round((numbers[0] + numbers[1]) / 2);
};

export const mockClinicService: ClinicDataService = {
  async searchClinics(filters) {
    await delay();
    return searchDirectory(clinics, filters);
  },

  async getClinicById(id) {
    await delay(90);
    return clinics.find((clinic) => clinic.id === id);
  },

  async getLiveEstimate(clinicId, visitType) {
    await delay(80);
    return clinics
      .find((clinic) => clinic.id === clinicId)
      ?.estimates.find((estimate) => estimate.mode === visitType);
  },

  async getHistoricalWaits(clinicId) {
    await delay(80);
    return clinics.find((clinic) => clinic.id === clinicId)?.historicalWaits ?? [];
  },

  async submitWaitReport(draft) {
    await delay(260);
    const errors = validateReport(draft, draft.reportKind === 'current-wait' ? 'current' : draft.totalRange ? 'range' : 'exact', false);
    const clinic = clinics.find((item) => item.id === draft.clinicId);
    if (Object.keys(errors).length || !clinic || !clinic.visitModes.includes(draft.visitMode)) throw new Error('Invalid report');
    const exactMinutes = getMinutesBetween(draft.arrivalTime, draft.departureTime);
    const totalMinutes = draft.reportKind === 'current-wait' ? 0 : exactMinutes || rangeMidpoint(draft.totalRange);

    return {
      id: `guest-${crypto.randomUUID()}`,
      clinicId: draft.clinicId,
      submittedAt: new Date().toISOString(),
      visitMode: draft.visitMode,
      totalMinutes,
      source: 'patient report',
      anonymous: draft.anonymous,
      accuracy: draft.accuracy || undefined,
      communication: draft.communication || undefined,
      reportKind: draft.reportKind || 'completed-visit',
      elapsedMinutes: draft.reportKind === 'current-wait' ? draft.elapsedMinutes : undefined,
      visitDate: draft.visitDate,
      timing: { arrivalTime: draft.arrivalTime, checkInTime: draft.checkInTime, providerTime: draft.providerTime, departureTime: draft.departureTime, totalRange: draft.totalRange },
      rushed: draft.rushed ? draft.rushed === 'yes' : undefined,
      note: draft.note || undefined,
    };
  },

  async saveAppointment(appointment) {
    await delay(100);
    return appointment;
  },

  async getSavedAppointments() {
    await delay(80);
    return []; // Guest plans live only in AppContext memory.
  },
};

