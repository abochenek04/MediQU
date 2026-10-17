import { getClinicEstimate } from './estimates';
import type { Clinic, SavedAppointment } from '../types';

export const formatDate = (iso: string, options?: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(typeof document === 'undefined' ? 'en-US' : document.documentElement.lang || 'en-US', options || {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso));

export const formatTime = (iso: string) =>
  new Intl.DateTimeFormat(typeof document === 'undefined' ? 'en-US' : document.documentElement.lang || 'en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

export const formatDateTime = (iso: string) => `${formatDate(iso)} · ${formatTime(iso)}`;

export const relativeReportTime = (iso: string) => {
  const difference = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.round(difference / 60000);
  const locale = typeof document === 'undefined' ? 'en' : document.documentElement.lang || 'en';
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (minutes < 60) return format.format(-Math.max(minutes, 1), 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return format.format(-hours, 'hour');
  return format.format(-Math.round(hours / 24), 'day');
};

export const getVisitPlan = (appointment: SavedAppointment, clinic: Clinic) => {
  const appointmentDate = new Date(appointment.appointmentTime);
  const leaveBy = new Date(
    appointmentDate.getTime() - (appointment.travelMinutes + appointment.bufferMinutes) * 60000,
  );
  const estimate =
    getClinicEstimate(clinic, appointment.visitMode);
  const likelyFinish = new Date(appointmentDate.getTime() + estimate.totalMinutes * 60000);

  return { leaveBy, likelyFinish, estimate };
};

export const toLocalDateTimeInput = (date: Date) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
};
