import {
  ArrowRight,
  Bookmark,
  Check,
  Clock3,
  LockKeyhole,
  MapPin,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useState } from 'react';
import { LanguageSelector } from '../components/Layout';
import { Brand } from '../components/Brand';
import { StatusBadge, SafetyNote } from '../components/UI';
import { useApp } from '../context/AppContext';
import { Link, navigate } from '../utils/navigation';

export function OnboardingPage() {
  const { t, pushToast } = useApp();
  const enterAsGuest = () => navigate('/find');

  return (
    <main id="main-content" className="onboarding-page">
      <section className="onboarding-intro">
        <div className="onboarding-brand-row">
          <Brand />
          <LanguageSelector />
          <StatusBadge />
        </div>

        <div className="onboarding-copy">
          <span className="eyebrow light">{t("Healthcare planning, made human")}</span>
          <h1>{t('heroTitle')}</h1>
          <p> {t("See how long a visit may take, how reliable that estimate is, and when to leave—before your day gets away from you.")} </p>
        </div>

        <div className="preview-card" aria-label={t('Clinic directory')}>
          <div className="preview-card-header"><span><MapPin aria-hidden="true" /> {t('Clinic directory')}</span></div>
          <div className="preview-time-row"><div><small>{t('Total visit estimate')}</small><strong>—</strong></div></div>
          <p>{t('Clinics will appear here as real directory information is added.')}</p>
          <div className="preview-labels"><span>{t('Check in')}</span><span>{t('Wait')}</span><span>{t('Care')}</span><span>{t('Check out')}</span></div>
        </div>

        <p className="onboarding-data-note"><LockKeyhole aria-hidden="true" /> {t("No medical history is needed to browse.")}</p>
      </section>

      <section className="onboarding-options" aria-labelledby="start-title">
        <div className="onboarding-options-inner">
          <span className="eyebrow">{t("Welcome to MediQU")}</span>
          <h2 id="start-title">{t("How would you like to start?")}</h2>
          <p className="section-intro">{t("You can explore the full care-finding experience without an account.")}</p>

          <div className="entry-options">
            <article className="entry-card recommended">
              <span className="recommended-tag">{t("Fastest · recommended")}</span>
              <div className="entry-icon"><Clock3 aria-hidden="true" /></div>
              <div>
                <h3>{t("Continue as a guest")}</h3>
                <p>{t("Browse and plan as a guest. Guest changes reset when you reload or close the tab.")}</p>
                <ul>
                  <li><Check aria-hidden="true" /> {t("No sign-up")}</li>
                  <li><Check aria-hidden="true" /> {t("No health information")}</li>
                  <li><Check aria-hidden="true" /> {t("Full access")}</li>
                </ul>
              </div>
              <button className="button button-primary button-large" type="button" onClick={enterAsGuest}> {t("Explore as a guest")} <ArrowRight aria-hidden="true" />
              </button>
            </article>

            <article className="entry-card">
              <div className="entry-icon soft"><UserRound aria-hidden="true" /></div>
              <div>
                <h3>{t("Create a free account")}</h3>
                <p>{t("Verified accounts sync saved clinics, visit plans and preferences across devices.")}</p>
              </div>
              <Link className="button button-secondary button-large" to="/signup">{t('Sign up')}</Link>
            </article>

            <article className="entry-card plus-card">
              <div className="entry-icon gold"><Sparkles aria-hidden="true" /></div>
              <div>
                <div className="entry-title-row">
                  <h3>{t("Explore future Plus")}</h3>
                  <span>{t("Concept")}</span>
                </div>
                <p>{t("See the questions MediQU must answer before any optional planning tier is defined.")}</p>
              </div>
              <Link className="button button-ghost button-large" to="/know#access"> {t("View the concept")} <ArrowRight aria-hidden="true" />
              </Link>
            </article>
          </div>

          <div className="guest-capabilities">
            <Bookmark aria-hidden="true" />
            <p><strong>{t("Guest-first by design.")}</strong> {t("Guest changes are temporary. Account data is private and persistent. No medical history is needed to browse.")}</p>
          </div>
          <SafetyNote compact />
        </div>
      </section>
    </main>
  );
}
