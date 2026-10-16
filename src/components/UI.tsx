import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { CircleAlert, Info, ShieldCheck, X } from 'lucide-react';
import type { ConfidenceLevel } from '../types';

export function StatusBadge({ label = 'Care planning' }: { label?: string }) {
  const { t } = useApp();
  return (
    <span className="demo-badge">
      <span aria-hidden="true" />
      {t(label)}
    </span>
  );
}

export function ReliabilityBadge({ score, level }: { score: number; level: ConfidenceLevel }) {
  const { t } = useApp();
  return (
    <span data-tour="reliability" className={`reliability-badge reliability-${level}`} aria-label={t('{score} percent reliability, {level} confidence', {score, level: t(level)})}>
      <ShieldCheck aria-hidden="true" size={15} />
      {score}% · {t(level)}
    </span>
  );
}

export function SafetyNote({ compact = false }: { compact?: boolean }) {
  const { t } = useApp();
  return (
    <div className={compact ? 'safety-note compact' : 'safety-note'}>
      <CircleAlert aria-hidden="true" />
      <p> {t("Wait estimates are planning information, not medical advice or guarantees. If you believe you are experiencing a medical emergency, contact emergency services.")} </p>
    </div>
  );
}

export function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="info-note">
      <Info aria-hidden="true" size={18} />
      <div>{children}</div>
    </div>
  );
}

export function PageLoader({ label = 'Loading care information' }: { label?: string }) {
  const { t } = useApp();
  return (
    <div className="page-loader" role="status">
      <span className="loader-ring" aria-hidden="true" />
      <p>{t(label)}…</p>
    </div>
  );
}

// Shared native dialog: focus containment, Escape, inert background and focus restoration.
export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const { t } = useApp();
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return createPortal(<dialog ref={ref} className="plan-modal native-modal" aria-labelledby={id} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) onClose(); } }}>
    <button className="modal-close" type="button" onClick={onClose} aria-label={t('Close')}><X aria-hidden="true" /></button>
    <h2 id={id}>{title}</h2>{children}
  </dialog>, document.body);
}
