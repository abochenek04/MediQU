import {
  ArrowRight,
  Bookmark,
  CalendarDays,
  Car,
  Check,
  Clock3,
  MapPin,
  Navigation,
  Route,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { getClinicEstimate, hasEstimate } from '../utils/estimates';
import { StatusBadge, SafetyNote } from '../components/UI';
import { useApp } from '../context/AppContext';
import { clinicService } from '../services/clinicService';
import type { Clinic } from '../types';
import { Link } from '../utils/navigation';
import { formatDateTime, formatTime, getVisitPlan } from '../utils/time';

export function SavedPage() {
  const { t, user, language, savedAppointments, savedClinicIds, removeAppointment, toggleSavedClinic } = useApp();
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [clinicMap, setClinicMap] = useState<Record<string, Clinic>>({});

  useEffect(() => {
    let active = true; setLoadError(false);
    const ids = [...new Set([...savedAppointments.map((item) => item.clinicId), ...savedClinicIds])];
    void Promise.all(ids.map((id) => clinicService.getClinicById(id))).then((items) => {
      if (!active) return;
      const nextMap: Record<string, Clinic> = {};
      items.forEach((clinic) => {
        if (clinic) nextMap[clinic.id] = clinic;
      });
      setClinicMap(nextMap);
    }, () => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [savedAppointments, savedClinicIds, retry]);

  const visibleAppointments = savedAppointments.filter(appointment => !appointment.isSample && clinicMap[appointment.clinicId]);
  const savedClinics = savedClinicIds.map((id) => clinicMap[id]).filter(Boolean);

  return (
    <div className="saved-page page-space">
      <div className="shell narrow-shell">
        <div className="page-heading">
          <div>
            <span className="eyebrow">{t("Your care plan")}</span>
            <h1>{t("Appointments")}</h1>
            <p>{t("Keep the parts of your day in one place—appointment, travel, buffer, and expected visit time.")}</p>
          </div>
          <StatusBadge label={t(user ? 'Saved to your private account' : 'Temporary guest session')} />
        </div>

        <p className="info-note">{t('Saved visit plans are not confirmed clinic bookings.')}</p>
        {loadError && <p role="alert">{t('The service is unavailable. Please try again.')} <button className="button button-secondary" onClick={() => setRetry(n => n + 1)}>{t('Try again')}</button></p>}
        {visibleAppointments.length === 0 ? (
          <div className="empty-state saved-empty">
            <span className="empty-icon"><CalendarDays aria-hidden="true" /></span>
            <h2>{t("No visits are saved")}</h2>
            <p>{t("Open a clinic and choose “Plan this visit” to create a leave-by suggestion.")}</p>
            <Link className="button button-primary" to="/find">{t("Find care")} <ArrowRight aria-hidden="true" /></Link>
          </div>
        ) : (
          <div className="appointment-list">
            {visibleAppointments.map((appointment) => {
              const clinic = clinicMap[appointment.clinicId];
              if (!clinic) return <div className="appointment-skeleton" key={appointment.id} />;
              const plan = getVisitPlan(appointment, clinic);
              return (
                <article className="appointment-card" key={appointment.id}>
                  <div className="appointment-card-head">
                    <div className="appointment-date-block">
                      <span>{new Intl.DateTimeFormat(language, { month: 'short' }).format(new Date(appointment.appointmentTime))}</span>
                      <strong>{new Date(appointment.appointmentTime).getDate()}</strong>
                      <small>{new Intl.DateTimeFormat(language, { weekday: 'short' }).format(new Date(appointment.appointmentTime))}</small>
                    </div>
                    <div className="appointment-identity">
                      <div className="title-kicker-row">
                        <span className="mode-pill">{appointment.visitMode === 'walk-in' ? t("Walk-in plan") : appointment.visitMode === 'urgent' ? t("Urgent visit plan") : t("Scheduled visit")}</span>
                        {appointment.isSample && <span className="sample-chip">{t("Visit plan")}</span>}
                      </div>
                      <h2>{clinic.name}</h2>
                      <p><MapPin aria-hidden="true" /> {clinic.address}</p>
                      <p><CalendarDays aria-hidden="true" /> {formatDateTime(appointment.appointmentTime)}</p>
                    </div>
                    <div className="appointment-live">
                      <span>{t("Current estimate")}</span>
                      <strong>{hasEstimate(plan.estimate) ? `${plan.estimate.totalMinutes} ${t("min")}` : t("Estimate unavailable")}</strong>
                      {hasEstimate(plan.estimate) && <small>{t("Updated")} {plan.estimate.updatedMinutesAgo}{t("m ago")}</small>}
                    </div>
                  </div>

                  <div className="plan-timeline" aria-label={t('Visit planning timeline')}>
                    <div className="plan-stop leave-stop">
                      <span className="plan-stop-icon"><Navigation aria-hidden="true" /></span>
                      <span><small>{t("Leave by")}</small><strong>{formatTime(plan.leaveBy.toISOString())}</strong></span>
                    </div>
                    <div className="plan-connector"><span /><small>{appointment.travelMinutes} {t("min travel")}</small></div>
                    <div className="plan-stop">
                      <span className="plan-stop-icon"><MapPin aria-hidden="true" /></span>
                      <span><small>{t("Arrive by")}</small><strong>{formatTime(new Date(new Date(appointment.appointmentTime).getTime() - appointment.bufferMinutes * 60000).toISOString())}</strong></span>
                    </div>
                    <div className="plan-connector"><span /><small>{appointment.bufferMinutes} {t("min buffer")}</small></div>
                    <div className="plan-stop">
                      <span className="plan-stop-icon"><Clock3 aria-hidden="true" /></span>
                      <span><small>{t("Visit begins")}</small><strong>{formatTime(appointment.appointmentTime)}</strong></span>
                    </div>
                    <div className="plan-connector visit"><span /><small>{t("about")} {hasEstimate(plan.estimate) ? `${plan.estimate.totalMinutes} ${t("min")}` : t("Estimate unavailable")}</small></div>
                    <div className="plan-stop finish-stop">
                      <span className="plan-stop-icon"><Check aria-hidden="true" /></span>
                      <span><small>{t("Likely finish")}</small><strong>{hasEstimate(plan.estimate) ? formatTime(plan.likelyFinish.toISOString()) : "—"}</strong></span>
                    </div>
                  </div>

                  <div className="plan-explanation">
                    <div><Car aria-hidden="true" /><span><strong>{appointment.travelMinutes} {t("min")}</strong><small>{t("Travel time")}</small></span></div>
                    <div><Route aria-hidden="true" /><span><strong>{appointment.bufferMinutes} {t("min")}</strong><small>{t("Your arrival buffer")}</small></span></div>
                    <div><ShieldCheck aria-hidden="true" /><span><strong>{hasEstimate(plan.estimate) ? `${clinic.reliability.score}% · ${clinic.reliability.level}` : "—"}</strong><small>{t("Estimate confidence")}</small></span></div>
                  </div>

                  <div className="appointment-note">
                    {hasEstimate(plan.estimate) ? t('Planning subtracts travel and your buffer from the visit time. Expected finish adds the {minutes}-minute estimate. These are planning aids, not guarantees.', { minutes: plan.estimate.totalMinutes }) : t('Visit estimates will appear when enough recent reports are available.')}
                  </div>

                  <div className="appointment-actions">
                    <Link className="button button-primary" to={`/clinic/${clinic.id}`}>{t("View updated clinic info")} <ArrowRight aria-hidden="true" /></Link>
                    <Link className="button button-secondary" to={`/report?clinic=${clinic.id}`}>{t("Report after visit")}</Link>
                    <button className="button button-ghost danger" type="button" onClick={() => removeAppointment(appointment.id)}><Trash2 aria-hidden="true" /> {t("Remove visit")}</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {savedClinics.length > 0 && (
          <section className="saved-clinics-section" aria-labelledby="saved-clinics-title">
            <div className="section-heading split-heading">
              <div>
                <span className="eyebrow">{t("Shortlist")}</span>
                <h2 id="saved-clinics-title">{t("Saved clinics")}</h2>
              </div>
              <Link className="text-link" to="/find">{t("Browse more")} <ArrowRight aria-hidden="true" /></Link>
            </div>
            <div className="saved-clinic-grid">
              {savedClinics.map((clinic) => (
                <article key={clinic.id}>
                  <div className="saved-clinic-icon" style={{ background: `${clinic.accent}22`, color: clinic.accent }}><Bookmark aria-hidden="true" fill="currentColor" /></div>
                  <div><span>{clinic.type}</span><h3>{clinic.name}</h3><p>{clinic.distanceMiles.toFixed(1)} mi · {hasEstimate(getClinicEstimate(clinic)) ? `${getClinicEstimate(clinic).totalMinutes} ${t("min total visit")}` : t("Estimate unavailable")}</p></div>
                  <Link to={`/clinic/${clinic.id}`} aria-label={t('View {clinic}', { clinic: clinic.name })}><ArrowRight aria-hidden="true" /></Link>
                  <button type="button" onClick={() => toggleSavedClinic(clinic.id)}>{t("Remove")}</button>
                </article>
              ))}
            </div>
          </section>
        )}

        <SafetyNote />
      </div>
    </div>
  );
}
