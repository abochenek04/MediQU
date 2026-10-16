import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { navigate } from '../utils/navigation';

const steps = [
  ['find', 'Find care', 'Start here to find and compare care.'],
  ['filters', 'Filter care', 'Filter by specialty, insurance, language, rating, visit type, and more.'],
  ['estimates', 'The entire visit', 'See the estimated time for the entire visit, not just the waiting room.'],
  ['reliability', 'Estimate confidence', 'See how much confidence MediQU has in each estimate.'],
  ['appointments', 'Appointments', 'Plan saved visits and see when to leave.'],
  ['report', 'Report wait', 'Share your visit experience to improve MediQU’s timing information.'],
];
export function ProductTour({ currentPath }: { currentPath: string }) {
  const { t, tourDone, finishTour } = useApp();
  const [step, setStep] = useState<number | null>(() => {
    return currentPath === '/find' && !tourDone ? 0 : null;
  });
  const [rect, setRect] = useState<DOMRect | null>(null);
  const finish = () => { setStep(null); finishTour(); };
  useEffect(() => {
    const replay = () => { navigate('/find'); setStep(0); };
    window.addEventListener('mediq:tour', replay);
    return () => window.removeEventListener('mediq:tour', replay);
  }, []);
  useEffect(() => {
    if (step === null) return;
    if (currentPath !== '/find') { setStep(null); return; }
    let target: Element | undefined;
    const locate = () => {
      target = [...document.querySelectorAll(`[data-tour="${steps[step][0]}"]`)].find(el => el.getBoundingClientRect().width > 0);
      setRect(target?.getBoundingClientRect() ?? null);
    };
    if (step === 1) {
      const button = document.querySelector<HTMLButtonElement>('[aria-controls="care-filters"]');
      if (button?.offsetWidth && button.getAttribute('aria-expanded') === 'false') button.click();
    }
    locate();
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timer = window.setInterval(locate, 350);
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') finish(); };
    window.addEventListener('keydown', escape);
    window.addEventListener('resize', locate);
    window.addEventListener('scroll', locate, true);
    return () => { clearInterval(timer); window.removeEventListener('keydown', escape); window.removeEventListener('resize', locate); window.removeEventListener('scroll', locate, true); };
  }, [step, currentPath]);
  if (step === null) return null;
  return <>
    {rect && <div className="tour-highlight" aria-hidden="true" style={{ top: rect.top - 5, left: rect.left - 5, width: rect.width + 10, height: rect.height + 10 }} />}
    <aside className="product-tour" aria-label={t('Product tour')}>
      <button type="button" className="modal-close" aria-label={t('Skip tour')} onClick={finish}><X aria-hidden="true" /></button>
      <div aria-live="polite" aria-atomic="true"><span className="eyebrow">{t('Quick introduction')} · {step + 1} / {steps.length}</span><h2>{t(steps[step][1])}</h2><p>{t(steps[step][2])}</p></div>
      <div className="tour-actions"><button className="text-button" onClick={finish}>{t('Skip tour')}</button><div>{step > 0 && <button className="button button-secondary" onClick={() => setStep(step - 1)}>{t('Back')}</button>}<button className="button button-primary" onClick={() => step === steps.length - 1 ? finish() : setStep(step + 1)}>{t(step === steps.length - 1 ? 'Done' : 'Next')}</button></div></div>
    </aside>
  </>;
}
