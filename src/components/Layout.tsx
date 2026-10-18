import {
  CalendarDays,
  CircleHelp,
  House,
  Languages,
  MapPin,
  MessageSquarePlus,
} from 'lucide-react';
import { internalEnabled } from '../services/api';
import type { ReactNode } from 'react';
import { languages } from '../data/catalog';
import { useApp } from '../context/AppContext';
import { ProductTour } from './ProductTour';
import { Brand } from './Brand';
import { Link } from '../utils/navigation';

const isActive = (currentPath: string, target: string) =>
  target === '/find' ? currentPath === target : currentPath.startsWith(target);

export function Layout({ children, currentPath }: { children: ReactNode; currentPath: string }) {
  const { language, setLanguage, t, toasts, user, logout, isAdmin } = useApp();
  const navItems = [
    { to: '/find', label: t('findCare') },
    { to: '/saved', label: t('saved') },
    { to: '/report', label: t('reportWait') },
    { to: '/know', label: t('howItWorks') },
    ...(user ? [{ to: '/settings', label: t('Settings') }] : []),
    ...(isAdmin && internalEnabled ? [{ to: '/admin', label: t('Administration') }] : []),
  ];

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="shell header-inner">
          <Brand />
          <nav className="desktop-nav" aria-label={t('Primary navigation')}>
            {navItems.map((item) => (
              <Link
                data-tour={item.to === '/find' ? 'find' : item.to === '/saved' ? 'appointments' : item.to === '/report' ? 'report' : undefined}
                key={item.to}
                to={item.to}
                className={isActive(currentPath, item.to) ? 'nav-link active' : 'nav-link'}
                aria-current={isActive(currentPath, item.to) ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="header-account"><LanguageSelector />{user ? <><Link className="account-entry" to="/settings">{t('Account')}</Link><button className="text-button" onClick={() => void logout()}>{t('Sign out')}</button></> : <Link className="account-entry" to="/login">{t('Sign in / Sign up')}</Link>}{isAdmin && internalEnabled && <Link className="mobile-admin-entry" to="/admin">{t('Administration')}</Link>}</div>
        </div>
      </header>

      <main id="main-content">{children}</main>

      <footer className="site-footer">
        <div className="shell footer-grid">
          <div>
            <Brand compact />
            <p className="footer-promise">{t("Healthcare is unpredictable. Your schedule shouldn’t be.")}</p>
          </div>
          <div className="footer-note">
            <span className="demo-dot" />
            <p>
              <strong>{t("Plan with confidence.")}</strong> {t('Confirm hours, insurance, and bookings directly with the clinic.')} </p>
          </div>
          <div className="footer-links">
            <Link to="/contact">{t('Contact Us')}</Link>
            <button className="text-button" type="button" onClick={() => window.dispatchEvent(new Event('mediq:tour'))}>{t('Product tour')}</button>
            <Link to="/know#privacy">{t("Privacy approach")}</Link>
            <Link to="/know#limitations">{t("Data limitations")}</Link>
            <Link to="/know#safety">{t("Safety")}</Link>
          </div>
        </div>
      </footer>

      <nav className="mobile-nav" aria-label={t('Mobile navigation')}>
        <Link data-tour="find" to="/find" className={isActive(currentPath, '/find') ? 'active' : ''}>
          <House aria-hidden="true" />
          <span>{t('findCare')}</span>
        </Link>
        <Link data-tour="appointments" to="/saved" className={isActive(currentPath, '/saved') ? 'active' : ''}>
          <CalendarDays aria-hidden="true" />
          <span>{t('saved')}</span>
        </Link>
        <Link data-tour="report" to="/report" className={isActive(currentPath, '/report') ? 'active' : ''}>
          <MessageSquarePlus aria-hidden="true" />
          <span>{t('reportWait')}</span>
        </Link>
        <Link to="/know" className={isActive(currentPath, '/know') ? 'active' : ''}>
          <CircleHelp aria-hidden="true" />
          <span>{t('howItWorks')}</span>
        </Link>
      </nav>

      <ProductTour currentPath={currentPath} />
      <div className="toast-region" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div className={`toast toast-${toast.tone || 'default'}`} key={toast.id} role="status">
            <MapPin aria-hidden="true" size={18} />
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export function LanguageSelector() {
  const { language, setLanguage, t } = useApp();
  return <label className="language-control"><Languages aria-hidden="true" size={17} /><span className="sr-only">{t('language')}</span><select value={language} onChange={event => setLanguage(event.target.value)}>{languages.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>;
}
