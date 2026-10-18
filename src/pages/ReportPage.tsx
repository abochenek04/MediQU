import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  Clock3,
  Info,
  LockKeyhole,
  MessageSquarePlus,
  ShieldCheck,
  Sparkles,
  Timer,
  UserRoundCheck,
} from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { StatusBadge, InfoNote, SafetyNote } from '../components/UI';
import { useApp } from '../context/AppContext';
import { backendEnabled } from '../services/api';
import { clinicService } from '../services/clinicService';
import type { Clinic, VisitMode, WaitReportDraft } from '../types';
import { Link } from '../utils/navigation';

import { initialDraft, localToday, validateReport } from '../utils/report';

export function ReportPage() {
  const { submitReport, t } = useApp();
  const today = localToday();
  const queryClinicId = new URLSearchParams(window.location.search).get('clinic') || '';
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [draft, setDraft] = useState<WaitReportDraft>(() => initialDraft(queryClinicId));
  const [durationMode, setDurationMode] = useState<'exact' | 'range'>('range');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<{ totalMinutes: number; clinicId: string; review?: boolean } | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true; setLoadError(false);
    void clinicService.searchClinics({
      query: '', insurance: '', specialty: '', language: '', minimumRating: 0, visitMode: 'all', timing: 'all', maxDistance: 25,
    }).then((items) => {
      if (!active) return;
      setClinics(items);
      const selected = items.find((clinic) => clinic.id === queryClinicId);
      if (selected && !selected.visitModes.includes(draft.visitMode)) {
        setDraft((current) => ({ ...current, visitMode: selected.visitModes[0] }));
      }
    }, () => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [retry]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedClinic = clinics.find((clinic) => clinic.id === draft.clinicId);

  const updateDraft = <K extends keyof WaitReportDraft>(key: K, value: WaitReportDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const selectClinic = (clinicId: string) => {
    const clinic = clinics.find((item) => item.id === clinicId);
    setErrors(current => { const next = { ...current }; delete next.clinicId; return next; });
    setDraft((current) => ({
      ...current,
      clinicId,
      visitMode: clinic?.visitModes.includes(current.visitMode) ? current.visitMode : clinic?.visitModes[0] || 'scheduled',
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    const nextErrors = validateReport(draft, durationMode);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      window.setTimeout(() => errorRef.current?.focus(), 0);
      return;
    }
    setSubmitting(true);
    const payload = durationMode === 'range'
      ? { ...draft, arrivalTime: '', checkInTime: '', providerTime: '', departureTime: '' }
      : { ...draft, totalRange: '' };
    try {
      const result = await submitReport(payload);
      setConfirmation({ totalMinutes: result.totalMinutes, clinicId: result.clinicId, review: result.moderationStatus === 'review' });
    } catch {
      setErrors({ submit: 'Your report could not be saved. Please try again.' });
      window.setTimeout(() => errorRef.current?.focus(), 0);
    } finally { setSubmitting(false); }
  };

  const reset = () => {
    setDraft({ ...initialDraft(queryClinicId), visitMode: clinics.find(c => c.id === queryClinicId)?.visitModes[0] || 'scheduled' });
    setDurationMode('range');
    setErrors({});
    setConfirmation(null);
  };

  if (confirmation) {
    const clinic = clinics.find((item) => item.id === confirmation.clinicId);
    return (
      <div className="report-page page-space">
        <div className="shell report-shell">
          <section className="report-confirmation">
            <div className="confirmation-mark"><Check aria-hidden="true" /></div>
            <StatusBadge label={t(confirmation.review ? 'Report received for review.' : backendEnabled ? 'Report accepted. Thank you.' : 'Report added')} />
            <h1>{t("That’s one more useful signal.")}</h1>
            <p>
              {t('Report saved for {clinic}: {minutes} minutes.', { clinic: clinic?.name || '', minutes: confirmation.totalMinutes })}
            </p>
            <div className="confirmation-summary">
              <div><Clock3 aria-hidden="true" /><span><strong>{confirmation.totalMinutes} {t("min")}</strong><small>{t("Reported total visit")}</small></span></div>
              <div><ShieldCheck aria-hidden="true" /><span><strong>{draft.anonymous ? t("Anonymous") : t("Source labeled")}</strong><small>{t("Reporting preference")}</small></span></div>
              <div><LockKeyhole aria-hidden="true" /><span><strong>{t("No medical details")}</strong><small>{t("Operational data only")}</small></span></div>
            </div>
            <div className="confirmation-actions">
              <Link className="button button-primary" to={`/clinic/${confirmation.clinicId}`}>{t("See clinic report feed")} <ArrowRight aria-hidden="true" /></Link>
              <button className="button button-secondary" type="button" onClick={reset}>{t("Report another visit")}</button>
            </div>
          </section>
          <SafetyNote />
        </div>
      </div>
    );
  }

  return (
    <div className="report-page page-space">
      <div className="shell report-shell">
        <Link className="back-link" to={draft.clinicId ? `/clinic/${draft.clinicId}` : '/find'}><ArrowLeft aria-hidden="true" /> {t("Back")}</Link>
        <div className="report-heading">
          <div>
            <span className="eyebrow">{t("About one minute")}</span>
            <h1>{t("Report your visit")}</h1>
            <p>{t("Your timing helps make the next person’s day easier. Share only operational details—never diagnoses or medical records.")}</p>
          </div>
          <div className="report-time-badge"><Timer aria-hidden="true" /><span><strong>{t("≈ 1 minute")}</strong><small>{t("7 quick answers")}</small></span></div>
        </div>

        {loadError && <p role="alert">{t('The service is unavailable. Please try again.')} <button className="button button-secondary" onClick={() => setRetry(n => n + 1)}>{t('Try again')}</button></p>}
        <div className="journey-strip" aria-label={t('Visit stages')}>
          {['Check in', 'Wait', 'Care', 'Check out'].map((stage, index) => <span key={stage}><b>{index + 1}</b>{t(stage)}</span>)}
        </div>
        {!loadError && clinics.length === 0 && <InfoNote>{t('No clinics are available for reporting yet.')}</InfoNote>}
        <form className="report-form" onSubmit={handleSubmit} noValidate>
          {Object.keys(errors).length > 0 && (
            <div className="form-error-summary" role="alert" tabIndex={-1} ref={errorRef}>
              <Info aria-hidden="true" />
              <div><strong>{t('Please check your answers.')}</strong><p>{t(Object.values(errors)[0])}</p></div>
            </div>
          )}

          <section className="form-section" aria-labelledby="visit-basics-title">
            <div className="form-section-number">1</div>
            <div className="form-section-content">
              <div className="form-section-heading">
                <div><h2 id="visit-basics-title">{t("Which visit?")}</h2><p>{t("Choose a clinic and the kind of visit.")}</p></div>
                <span>{t("Required")}</span>
              </div>
              <div className="form-grid two-col">
                <label className="field-label">
                  <span>{t("Clinic")}</span>
                  <select value={draft.clinicId} onChange={(event) => selectClinic(event.target.value)} aria-invalid={Boolean(errors.clinicId)}>
                    <option value="">{t("Choose a clinic")}</option>
                    {clinics.map((clinic) => <option key={clinic.id} value={clinic.id}>{clinic.name}</option>)}
                  </select>
                  {errors.clinicId && <small className="field-error">{t(errors.clinicId)}</small>}
                </label>
                <label className="field-label">
                  <span>{t("Visit date")}</span>
                  <input type="date" max={today} value={draft.visitDate} onChange={(event) => updateDraft('visitDate', event.target.value)} aria-invalid={Boolean(errors.visitDate)} />
                  {errors.visitDate && <small className="field-error">{t(errors.visitDate)}</small>}
                </label>
              </div>
              <fieldset className="choice-fieldset">
                <legend>{t("Visit type")}</legend>
                <div className="choice-row compact-choices">
                  {(selectedClinic?.visitModes || ['scheduled', 'walk-in', 'urgent']).map((visitMode) => (
                    <label key={visitMode}>
                      <input type="radio" name="report-visit-mode" value={visitMode} checked={draft.visitMode === visitMode} onChange={() => updateDraft('visitMode', visitMode)} />
                      <span>{visitMode === 'walk-in' ? t("Walk-in") : visitMode === 'urgent' ? t("Urgent visit") : t("Scheduled")}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </section>

          <section className="form-section" aria-labelledby="visit-time-title">
            <div className="form-section-number">2</div>
            <div className="form-section-content">
              <div className="form-section-heading">
                <div><h2 id="visit-time-title">{t("How long did it take?")}</h2><p>{t("Check in → Wait → Care → Check out. Approximate times are fine.")}</p></div>
                <span>{t("Required")}</span>
              </div>
              <div className="duration-mode-toggle" aria-label={t('How to report visit duration')}>
                <button type="button" className={durationMode === 'range' ? 'active' : ''} onClick={() => setDurationMode('range')} aria-pressed={durationMode === 'range'}>{t("Approximate")}</button>
                <button type="button" className={durationMode === 'exact' ? 'active' : ''} onClick={() => setDurationMode('exact')} aria-pressed={durationMode === 'exact'}>{t("Detailed")}</button>
              </div>
              {durationMode === 'exact' ? (
                <>
                  <div className="time-fields">
                    <label className="field-label"><span>{t("Arrived")}</span><input type="time" value={draft.arrivalTime} onChange={(event) => updateDraft('arrivalTime', event.target.value)} aria-invalid={Boolean(errors.arrivalTime || errors.times)} />{errors.arrivalTime && <small className="field-error">{t(errors.arrivalTime)}</small>}</label>
                    <span className="time-arrow" aria-hidden="true">→</span>
                    <label className="field-label"><span>{t("Checked in")} <small>{t("optional")}</small></span><input type="time" value={draft.checkInTime} onChange={(event) => updateDraft('checkInTime', event.target.value)} aria-invalid={Boolean(errors.times)} /></label>
                    <span className="time-arrow" aria-hidden="true">→</span>
                    <label className="field-label"><span>{t("Provider arrived")}</span><input type="time" value={draft.providerTime} onChange={(event) => updateDraft('providerTime', event.target.value)} aria-invalid={Boolean(errors.providerTime || errors.times)} />{errors.providerTime && <small className="field-error">{t(errors.providerTime)}</small>}</label>
                    <span className="time-arrow" aria-hidden="true">→</span>
                    <label className="field-label"><span>{t('Check out complete')}</span><input type="time" value={draft.departureTime} onChange={(event) => updateDraft('departureTime', event.target.value)} aria-invalid={Boolean(errors.departureTime || errors.times)} />{errors.departureTime && <small className="field-error">{t(errors.departureTime)}</small>}</label>
                  </div>
                  {errors.times && <p className="field-error standalone">{t(errors.times)}</p>}
                </>
              ) : (
                <label className="field-label range-field">
                  <span>{t("Approximate total visit time")}</span>
                  <select value={draft.totalRange} onChange={(event) => updateDraft('totalRange', event.target.value)} aria-invalid={Boolean(errors.totalRange)}>
                    <option value="">{t("Choose a range")}</option>
                    <option value="0–30 minutes">{t("Under 30 minutes")}</option>
                    <option value="30–60 minutes">{t("30–60 minutes")}</option>
                    <option value="60–90 minutes">{t("1–1.5 hours")}</option>
                    <option value="90–120 minutes">{t("1.5–2 hours")}</option>
                    <option value="120–180 minutes">{t("2–3 hours")}</option>
                    <option value="180 minutes">{t("More than 3 hours")}</option>
                  </select>
                  {errors.totalRange && <small className="field-error">{t(errors.totalRange)}</small>}
                </label>
              )}
            </div>
          </section>

          <section className="form-section" aria-labelledby="experience-title">
            <div className="form-section-number">3</div>
            <div className="form-section-content">
              <div className="form-section-heading">
                <div><h2 id="experience-title">{t("A little context")}</h2><p>{t("This helps people understand more than the minutes.")}</p></div>
                <span>{t("Required")}</span>
              </div>
              <fieldset className="choice-fieldset">
                <legend>{t("Compared with the MediQU estimate, your visit was…")}</legend>
                <div className="choice-row">
                  {([
                    ['shorter', 'Shorter', 'Finished sooner'],
                    ['about-right', 'About right', 'Close to estimate'],
                    ['longer', 'Longer', 'Took more time'],
                  ] as const).map(([value, label, detail]) => (
                    <label key={value}>
                      <input type="radio" name="accuracy" value={value} checked={draft.accuracy === value} onChange={() => updateDraft('accuracy', value)} />
                      <span><strong>{t(label)}</strong><small>{t(detail)}</small></span>
                    </label>
                  ))}
                </div>
                {errors.accuracy && <small className="field-error">{t(errors.accuracy)}</small>}
              </fieldset>

              <fieldset className="choice-fieldset rating-fieldset">
                <legend>{t("How clear was communication about delays or next steps?")}</legend>
                <div className="number-rating">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <label key={value}>
                      <input type="radio" name="communication" value={value} checked={draft.communication === value} onChange={() => updateDraft('communication', value)} />
                      <span>{value}</span>
                    </label>
                  ))}
                </div>
                <div className="rating-ends"><span>{t("Not clear")}</span><span>{t("Very clear")}</span></div>
                {errors.communication && <small className="field-error">{t(errors.communication)}</small>}
              </fieldset>

              <fieldset className="choice-fieldset">
                <legend>{t("Did the provider portion of your visit feel rushed?")}</legend>
                <div className="choice-row compact-choices">
                  <label><input type="radio" name="rushed" checked={draft.rushed === 'no'} onChange={() => updateDraft('rushed', 'no')} /><span>{t("No")}</span></label>
                  <label><input type="radio" name="rushed" checked={draft.rushed === 'yes'} onChange={() => updateDraft('rushed', 'yes')} /><span>{t("Yes")}</span></label>
                </div>
                {errors.rushed && <small className="field-error">{t(errors.rushed)}</small>}
              </fieldset>

              <label className="field-label note-field">
                <span>{t("Optional non-medical note")}</span>
                <textarea maxLength={240} value={draft.note} onChange={(event) => updateDraft('note', event.target.value)} placeholder={t("Example: Staff explained that an emergency changed the timing.")} />
                <small>{draft.note.length}/240 · {t('Please don’t include symptoms, diagnoses, medications, or names.')}</small>
              </label>
            </div>
          </section>

          <section className="form-section privacy-form-section" aria-labelledby="privacy-choice-title">
            <div className="form-section-number"><LockKeyhole aria-hidden="true" /></div>
            <div className="form-section-content">
              <div className="form-section-heading">
                <div><h2 id="privacy-choice-title">{t("Your privacy choice")}</h2><p>{t("No account is required to report a visit.")}</p></div>
              </div>
              <label className="toggle-row">
                <span><strong>{t("Submit anonymously")}</strong><small>{t("No name or account label will appear with this report.")}</small></span>
                <input type="checkbox" checked={draft.anonymous} onChange={(event) => updateDraft('anonymous', event.target.checked)} />
                <i aria-hidden="true" />
              </label>
              <InfoNote> {t("In backend mode, accepted reports are shared and retained independently of guest state. Do not include personal or medical details.")} </InfoNote>
            </div>
          </section>

          <div className="report-submit-row">
            <div><UserRoundCheck aria-hidden="true" /><span><strong>{t("Ready to help the next patient?")}</strong><small>{t("You can review every answer before submitting.")}</small></span></div>
            <button className="button button-coral button-large" type="submit" disabled={submitting || !selectedClinic}>
              {submitting ? t("Checking report…") : t('Submit report')} <ArrowRight aria-hidden="true" />
            </button>
          </div>
        </form>

        <SafetyNote />
      </div>
    </div>
  );
}
