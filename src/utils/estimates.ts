import type { Clinic, LiveWaitEstimate, VisitMode } from '../types';

export const hasEstimate = (estimate: LiveWaitEstimate | undefined) =>
  !!estimate && estimate.totalMinutes > 0 && (!estimate.evidenceState || estimate.evidenceState === 'ready');

// Missing evidence is an unavailable state, never a generated reference time.
export function getClinicEstimate(clinic: Clinic, mode?: VisitMode | 'all'): LiveWaitEstimate {
  return clinic.estimates.find(item => item.mode === mode) || clinic.estimates[0] || {
    mode: mode && mode !== 'all' ? mode : clinic.visitModes[0] || 'scheduled',
    evidenceState: 'insufficient', totalMinutes: 0, range: [0, 0], stages: [],
    contributingReports: 0, updatedMinutesAgo: 0,
  };
}
