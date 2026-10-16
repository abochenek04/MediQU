import { useEffect, lazy, Suspense } from 'react';
import { AccountPage } from './pages/AccountPage';
import { SettingsPage } from './pages/SettingsPage';
import { PageLoader } from './components/UI';
import { Layout } from './components/Layout';
import { AppProvider, useApp } from './context/AppContext';
import { ContactPage } from './pages/ContactPage';
import { ClinicPage } from './pages/ClinicPage';
import { FindCarePage } from './pages/FindCarePage';
import { KnowPage } from './pages/KnowPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { ReportPage } from './pages/ReportPage';
import { SavedPage } from './pages/SavedPage';
import { Link, useLocationPath } from './utils/navigation';

const AdminPage = (import.meta.env.VITE_APP_ENV === 'staging' || import.meta.env.VITE_APP_ENV === 'development') ? lazy(() => import('./pages/AdminPage')) : null;

const pageTitle = (path: string) => {
  if (path.startsWith('/clinic/')) return 'Clinic details';
  return ({'/':'heroTitle','/find':'Find care','/saved':'Appointments','/report':'Report your visit','/know':'About','/contact':'Contact Us','/login':'Sign in','/signup':'Create a free account','/verify':'Verify your email','/reset-password':'Reset password','/settings':'Settings','/admin':'Administration'} as Record<string,string>)[path] || 'Page not found';
};

function AppRoutes() {
  const { t, accountReady, accountError, refreshAccount, user } = useApp();
  const location = useLocationPath();

  useEffect(() => {
    document.title = `${t(pageTitle(location.pathname))} — MediQU`;
    const skip = document.querySelector('.skip-link'); if (skip) skip.textContent = t('Skip to main content');
  }, [location.pathname, t]);

  if (!accountReady) return <div className="shell page-space">{accountError ? <div role="alert"><p>{t(accountError)}</p><button className="button button-primary" onClick={() => void refreshAccount()}>{t('Try again')}</button></div> : <PageLoader label="Restoring your session" />}</div>;

  if (location.pathname === '/') return <OnboardingPage />;

  let page: React.ReactNode;
  if (location.pathname === '/login') page = <AccountPage key="login" mode="login" />;
  else if (location.pathname === '/signup') page = <AccountPage key="signup" mode="signup" />;
  else if (location.pathname === '/verify') page = <AccountPage key="verify" mode="verify" />;
  else if (location.pathname === '/reset-password') page = <AccountPage key="reset" mode="reset" />;
  else if (location.pathname === '/settings') page = <SettingsPage key={user?.id || 'guest'} />;
  else if (location.pathname === '/admin' && AdminPage) page = <Suspense fallback={<PageLoader />}><AdminPage /></Suspense>;
  else if (location.pathname === '/find') page = <FindCarePage />;
  else if (location.pathname === '/saved') page = <SavedPage />;
  else if (location.pathname === '/report') page = <ReportPage />;
  else if (location.pathname === '/contact') page = <ContactPage />;
  else if (location.pathname === '/know') page = <KnowPage />;
  else if (location.pathname.startsWith('/clinic/')) {
    page = <ClinicPage clinicId={decodeURIComponent(location.pathname.split('/')[2] || '')} />;
  } else {
    page = (
      <div className="shell page-space">
        <div className="empty-state">
          <span className="empty-code">404</span>
          <h1>{t("This page isn’t in the care plan.")}</h1>
          <p>{t("Let’s get you back to the Durham clinic guide.")}</p>
          <Link className="button button-primary" to="/find">{t("Find care")}</Link>
        </div>
      </div>
    );
  }

  return <Layout currentPath={location.pathname}>{page}</Layout>;
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}
