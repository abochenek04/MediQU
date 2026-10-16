import { ArrowRight } from 'lucide-react';
import { VisitBreakdown } from '../components/ClinicComponents';
import { StatusBadge, SafetyNote } from '../components/UI';
import { useApp } from '../context/AppContext';
import { clinics } from '../data/mockData';
import { Link } from '../utils/navigation';

export function KnowPage() {
  const { t } = useApp();
  return <div className="page-space about-page"><div className="shell narrow-shell">
    <div className="page-heading"><div><span className="eyebrow">{t('About MediQU')}</span><h1>{t('heroTitle')}</h1><p>{t('Make room for care, with a clearer picture of your day.')}</p></div><StatusBadge /></div>
    <nav className="about-nav" aria-label={t('About sections')}>
      {[['why', 'Why MediQU'], ['journey', 'Patient Journey'], ['estimates', 'Wait Estimates'], ['reliability', 'Reliability']].map(([id, title]) => <a key={id} href={`#${id}`}>{t(title)}</a>)}
    </nav>
    <section id="why" className="about-section"><span className="eyebrow">01</span><h2>{t('Why MediQU')}</h2><p>{t('A visit can affect work, childcare, transport, and the rest of your day. MediQU brings clinic options, total visit estimates, and planning tools together so you can make a more informed plan.')}</p><Link className="text-link" to="/find">{t('findCare')} <ArrowRight aria-hidden="true" /></Link></section>
    <section id="journey" className="about-section"><span className="eyebrow">02</span><h2>{t('Patient Journey')}</h2><ol className="patient-journey">
      {[
        ['Search', 'Find clinics by your needs, language, insurance, and visit type.'],
        ['Compare', 'Compare the whole visit, clinic reviews, and estimate confidence.'],
        ['Plan', 'Save a visit to see leave-by, arrival, and expected finish times.'],
        ['Visit', 'Use your plan as a guide. Confirm arrangements with the clinic.'],
        ['Report', 'Share timing to help others understand the visit experience.'],
      ].map(([title, body], index) => <li key={title}><b>{index + 1}</b><div><h3>{t(title)}</h3><p>{t(body)}</p></div></li>)}
    </ol></section>
    <section id="estimates" className="about-section"><span className="eyebrow">03</span><h2>{t('Wait Estimates')}</h2><p>{t('The total estimate covers arrival through departure. Check in includes arrival and registration; Wait covers time before the provider; Care is time with the provider; Check out covers the final steps before leaving.')}</p>
      <div className="about-estimate"><strong>54 <small>{t('minutes')}</small></strong><VisitBreakdown estimate={clinics[0].estimates[0]} /></div>
      <p>{t('A range leaves room for variation. Historical patterns help compare times of day.')}</p>
    </section>
    <section id="reliability" className="about-section"><span className="eyebrow">04</span><h2>{t('Reliability')}</h2><p>{t('Confidence describes the timing evidence: how recent, plentiful, consistent, and varied the reports are. It is separate from a clinic’s star rating and does not measure medical quality or guarantee a finish time.')}</p>
      <p id="limitations">{t('Urgent cases, staffing changes, and different patient needs can change visit times. Confirm hours, insurance, and bookings directly with the clinic.')}</p>
      <details id="privacy"><summary>{t('Privacy and data')}</summary><p>{t('Guests use temporary in-memory preferences and plans. Verified accounts use private server storage. Shared reports omit names and notes; anti-abuse identifiers expire after seven days. Optional profile fields stay private. Location is optional and is not saved.')}</p></details>
      <details id="access"><summary>{t('Guests and verified accounts')}</summary><p>{t('Browse, plan and report as a guest. Verify an account to save across devices. Booking, ratings, travel routes and notifications require authorized integrations; none are claimed when unavailable.')}</p></details>
      <div id="safety"><SafetyNote /></div>
    </section>
  </div></div>;
}
