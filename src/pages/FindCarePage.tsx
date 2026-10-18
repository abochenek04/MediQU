import {
  ArrowRight,
  CalendarClock,
  Check,
  ChevronDown,
  Clock3,
  LocateFixed,
  Map,
  MapPin,
  Navigation,
  Search,
  SlidersHorizontal,
  Sparkles,
  Timer,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ClinicCard, MapView } from '../components/ClinicComponents';
import { StatusBadge, InfoNote, PageLoader, SafetyNote } from '../components/UI';
import { useApp } from '../context/AppContext';
import { getClinicEstimate, hasEstimate } from '../utils/estimates';
import { clinicLanguageOptions, insurancePlans, specialtyOptions } from '../data/catalog';
import { requestApproximateLocation, resolveLocationName } from '../services/locationService';
import { clinicService, defaultSearchFilters } from '../services/clinicService';
import type { Clinic, SearchFilters, VisitMode } from '../types';
import { Link, navigate } from '../utils/navigation';
import { formatDateTime, formatTime, getVisitPlan } from '../utils/time';

const defaultFilters = defaultSearchFilters;

type ViewMode = 'list' | 'map';
type SortMode = 'recommended' | 'distance' | 'shortest' | 'reliability';

export function FindCarePage() {
  const { savedAppointments, pushToast, t } = useApp();
  const initialQuery = new URLSearchParams(window.location.search).get('q') || '';
  const [filters, setFilters] = useState<SearchFilters>({ ...defaultFilters, query: initialQuery });
  const [results, setResults] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [view, setView] = useState<ViewMode>('list');
  const [sort, setSort] = useState<SortMode>('recommended');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedClinicId, setSelectedClinicId] = useState('');
  const [upcomingClinic, setUpcomingClinic] = useState<Clinic | undefined>();
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [locationName, setLocationName] = useState('');
  const locationLookup = useRef<AbortController | null>(null);
  const requestId = useRef(0);
  const locationRequestId = useRef(0);
  useEffect(() => () => { requestId.current++; locationRequestId.current++; locationLookup.current?.abort(); }, []);
  const upcoming = savedAppointments[0];

  const loadResults = async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(false);
    try {
      const data = await clinicService.searchClinics(filters);
      if (id === requestId.current) setResults(data);
    } catch {
      if (id === requestId.current) setError(true);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    void loadResults();
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (results.length && !results.some((clinic) => clinic.id === selectedClinicId)) {
      setSelectedClinicId(results[0].id);
    }
  }, [results, selectedClinicId]);

  useEffect(() => {
    if (!upcoming) {
      setUpcomingClinic(undefined);
      return;
    }
    let active = true;
    void clinicService.getClinicById(upcoming.clinicId).then(value => { if (active) setUpcomingClinic(value); }, () => { if (active) setUpcomingClinic(undefined); });
    return () => { active = false; };
  }, [upcoming]);

  const sortedResults = useMemo(() => {
    const copy = [...results];
    if (sort === 'shortest') {
      return copy.sort((a, b) => (hasEstimate(getClinicEstimate(a, filters.visitMode)) ? getClinicEstimate(a, filters.visitMode).totalMinutes : Infinity) - (hasEstimate(getClinicEstimate(b, filters.visitMode)) ? getClinicEstimate(b, filters.visitMode).totalMinutes : Infinity));
    }
    if (sort === 'reliability') {
      return copy.sort((a, b) => (b.estimates.find(e => e.mode === filters.visitMode)?.reliability || b.reliability).score - (a.estimates.find(e => e.mode === filters.visitMode)?.reliability || a.reliability).score);
    }
    return sort === 'distance' && filters.origin ? copy.sort((a, b) => a.distanceMiles - b.distanceMiles) : copy;
  }, [results, sort, filters.timing, filters.visitMode, filters.origin]);

  const activeFilterCount = [
    filters.language,
    filters.minimumRating,
    filters.insurance,
    filters.specialty,
    filters.visitMode !== 'all' ? filters.visitMode : '',
    filters.timing !== 'all' ? filters.timing : '',
    filters.origin && filters.maxDistance !== 10 ? filters.maxDistance : '',
  ].filter(Boolean).length;

  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const runSearch = (event: FormEvent) => {
    event.preventDefault();
    const query = filters.query.trim();
    navigate(query ? `/find?q=${encodeURIComponent(query)}` : '/find', { replace: true });
    document.getElementById('clinic-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const applyQuickFilter = (key: 'walk-in' | 'scheduled' | 'open' | 'pediatrics' | 'medicaid') => {
    if (key === 'walk-in') updateFilter('visitMode', filters.visitMode === 'walk-in' ? 'all' : 'walk-in');
    if (key === 'scheduled') updateFilter('visitMode', filters.visitMode === 'scheduled' ? 'all' : 'scheduled');
    if (key === 'open') updateFilter('timing', filters.timing === 'open-now' ? 'all' : 'open-now');
    if (key === 'pediatrics') updateFilter('specialty', filters.specialty === 'Pediatrics' ? '' : 'Pediatrics');
    if (key === 'medicaid') updateFilter('insurance', filters.insurance === 'Medicaid' ? '' : 'Medicaid');
  };

  const useLocation = async () => {
    const id = ++locationRequestId.current;
    locationLookup.current?.abort();
    const controller = new AbortController();
    locationLookup.current = controller;
    setLocationBusy(true);
    setLocationName('');
    setLocationMessage('Requesting your current device location. Allow access in your browser if prompted.');
    try {
      const origin = await requestApproximateLocation(navigator.geolocation);
      if (id !== locationRequestId.current) return;
      setFilters(current => ({ ...current, origin }));
      setLocationMessage('Location found. Distances use your device’s approximate position.');
      try {
        const name = await resolveLocationName(origin, controller.signal);
        if (id === locationRequestId.current) setLocationName(name);
      } catch {
        if (id === locationRequestId.current) setLocationMessage('Device location found. City name is unavailable; distances still use your location.');
      }
    } catch (error) {
      if (id !== locationRequestId.current) return;
      setFilters(current => ({ ...current, origin: undefined }));
      setLocationName('');
      const code = (error as { code?: number } | null)?.code;
      setLocationMessage(code === 1
        ? 'Location permission was denied. Allow location in your browser’s site settings and try again.'
        : code === 3
          ? 'Location request timed out. Try again with device Location Services enabled.'
          : 'Device location is unavailable. Enable Location Services and try again.');
    } finally {
      if (id === locationRequestId.current) setLocationBusy(false);
    }
  };

  const resetLocation = () => {
    locationRequestId.current++;
    locationLookup.current?.abort();
    setLocationBusy(false);
    setLocationName('');
    setFilters(current => ({ ...current, origin: undefined }));
    setLocationMessage('');
    setSort(current => current === 'distance' ? 'recommended' : current);
  };

  const clearFilters = () => {
    setFilters({ ...defaultFilters, query: filters.query, origin: filters.origin });
  };

  const upcomingPlan = upcoming && upcomingClinic ? getVisitPlan(upcoming, upcomingClinic) : null;

  return (
    <>
      <section className="find-hero">
        <div className="hero-orbit orbit-one" aria-hidden="true" />
        <div className="hero-orbit orbit-two" aria-hidden="true" />
        <div className="shell find-hero-inner">
          <div className="find-hero-copy">
            {locationName && <StatusBadge label={locationName} />}
            <span className="eyebrow light">{t('heroEyebrow')}</span>
            <h1>{t('heroTitle')}</h1>
            <p>{t('heroBody')}</p>
          </div>

          <form className="care-search" onSubmit={runSearch} role="search">
            <label htmlFor="care-search-input">{t("Search for care")}</label>
            <div className="care-search-row">
              <Search aria-hidden="true" />
              <input
                id="care-search-input"
                value={filters.query}
                onChange={(event) => updateFilter('query', event.target.value)}
                placeholder={t('searchPlaceholder')}
              />
              {filters.query && (
                <button className="clear-search" type="button" onClick={() => updateFilter('query', '')} aria-label={t("Clear search")}>
                  <X aria-hidden="true" />
                </button>
              )}
              <button className="button button-coral" type="submit">{t("Search")} <ArrowRight aria-hidden="true" /></button>
            </div>
            <div className="search-location">
              {locationName && <span><MapPin aria-hidden="true" /> {t("Near {location}", { location: locationName })}</span>}
              <button type="button" disabled={locationBusy} onClick={useLocation}><LocateFixed aria-hidden="true" /> {t(locationBusy ? "Locating…" : "Find my location")}</button>
            </div>
            <p className="location-status" role="status">{t(locationMessage)} {filters.origin && <button className="text-button" type="button" onClick={resetLocation}>{t('Clear location')}</button>}</p>
            <p className="location-status">{t('Your approximate location stays on this device and is used to find the nearest city. MediQU does not save your location.')} <a href="/data/NOTICE.txt" target="_blank" rel="noreferrer">GeoNames</a></p>
          </form>

          <div className="quick-filters" aria-label={t('Quick picks')}>
            <span>{t("Quick picks")}</span>
            <button type="button" className={filters.visitMode === 'walk-in' ? 'active' : ''} onClick={() => applyQuickFilter('walk-in')}>{t("Walk-in care")}</button>
            <button type="button" className={filters.visitMode === 'scheduled' ? 'active' : ''} onClick={() => applyQuickFilter('scheduled')}>{t("Scheduled visits")}</button>
            <button type="button" className={filters.timing === 'open-now' ? 'active' : ''} onClick={() => applyQuickFilter('open')}>{t("Open now")}</button>
            <button type="button" className={filters.specialty === 'Pediatrics' ? 'active' : ''} onClick={() => applyQuickFilter('pediatrics')}>{t("Pediatrics")}</button>
            <button type="button" className={filters.insurance === 'Medicaid' ? 'active' : ''} onClick={() => applyQuickFilter('medicaid')}>{t("Medicaid accepted")}</button>
          </div>
        </div>
      </section>

      <div className="shell find-layout">
        {upcoming && upcomingClinic && upcomingPlan && (
          <section className="upcoming-visit-card" aria-labelledby="upcoming-title">
            <div className="upcoming-date-tile" aria-hidden="true">
              <span>{new Intl.DateTimeFormat(document.documentElement.lang, { month: 'short' }).format(new Date(upcoming.appointmentTime))}</span>
              <strong>{new Date(upcoming.appointmentTime).getDate()}</strong>
            </div>
            <div className="upcoming-main">
              <div className="upcoming-kicker"><CalendarClock aria-hidden="true" /> {t("Upcoming visit")}</div>
              <h2 id="upcoming-title">{upcomingClinic.name}</h2>
              <p>{formatDateTime(upcoming.appointmentTime)} · {upcomingClinic.address}</p>
            </div>
            <div className="upcoming-plan">
              <div>
                <span>{t("Suggested leave-by")}</span>
                <strong>{formatTime(upcomingPlan.leaveBy.toISOString())}</strong>
              </div>
              <div>
                <span>{t("Current visit estimate")}</span>
                <strong>{hasEstimate(upcomingPlan.estimate) ? `${upcomingPlan.estimate.totalMinutes} ${t("min")}` : t("Estimate unavailable")}</strong>
              </div>
            </div>
            <Link className="button button-secondary" to="/saved">{t("View plan")} <ArrowRight aria-hidden="true" /></Link>
          </section>
        )}

        <section className="find-main" id="clinic-results" aria-labelledby="results-title">
          <aside className={filtersOpen ? 'filter-panel open' : 'filter-panel'} aria-label={t("Search filters")} data-tour="filters" id="care-filters">
            <div className="filter-heading">
              <div><SlidersHorizontal aria-hidden="true" /><h2>{t("Filter care")} {activeFilterCount > 0 && <small>({activeFilterCount})</small>}</h2></div>
              {activeFilterCount > 0 && <button type="button" onClick={clearFilters}>{t("Clear all")}</button>}
            </div>

            <label className="field-label">
              <span>{t("Location")}</span>
              <input aria-label={t("Search location or neighborhood")} placeholder={t("Neighborhood or ZIP")} value={filters.query} onChange={event => updateFilter("query", event.target.value)} />
            </label>
            <label className="field-label">
              <span>{t("Within")}</span>
              <div className="select-wrap">
                <select aria-label={t("Within")} disabled={!filters.origin} value={filters.maxDistance} onChange={(event) => updateFilter('maxDistance', Number(event.target.value))}>
                  <option value={3}>{t("3 miles")}</option>
                  <option value={5}>{t("5 miles")}</option>
                  <option value={10}>{t("10 miles")}</option>
                  <option value={25}>{t("25 miles")}</option>
                </select>
                <ChevronDown aria-hidden="true" />
              </div>
            </label>
            <label className="field-label">
              <span>{t("Insurance")}</span>
              <div className="select-wrap">
                <select value={filters.insurance} onChange={(event) => updateFilter('insurance', event.target.value)}>
                  <option value="">{t("Any insurance")}</option>
                  {insurancePlans.map((plan) => <option key={plan.id} value={plan.name}>{plan.name}</option>)}
                </select>
                <ChevronDown aria-hidden="true" />
              </div>
            </label>
            <label className="field-label">
              <span>{t("Specialty")}</span>
              <div className="select-wrap">
                <select value={filters.specialty} onChange={(event) => updateFilter('specialty', event.target.value)}>
                  <option value="">{t("Any specialty")}</option>
                  {specialtyOptions.map((specialty) => <option key={specialty} value={specialty}>{t(specialty)}</option>)}
                </select>
                <ChevronDown aria-hidden="true" />
              </div>
            </label>
            <label className="field-label"><span>{t('Language')}</span><div className="select-wrap">
              <select value={filters.language} onChange={event => updateFilter('language', event.target.value)}>
                <option value="">{t('Any language')}</option>
                {clinicLanguageOptions.map(language => <option key={language} value={language}>{t(language)}</option>)}
              </select><ChevronDown aria-hidden="true" />
            </div></label>
            <label className="field-label"><span>{t('Minimum rating')}</span><div className="select-wrap">
              <select value={filters.minimumRating} onChange={event => updateFilter('minimumRating', Number(event.target.value))}>
                <option value={0}>{t('Any rating')}</option>
                {[3, 3.5, 4, 4.5].map(rating => <option key={rating} value={rating}>{rating}+ / 5</option>)}
              </select><ChevronDown aria-hidden="true" />
            </div><small>{t('Clinic experience ratings. Separate from Google reviews.')}</small></label>
            <fieldset className="filter-fieldset">
              <legend>{t("Visit type")}</legend>
              {(['all', 'scheduled', 'walk-in', 'urgent'] as const).map((mode) => (
                <label key={mode}>
                  <input type="radio" name="visit-mode" checked={filters.visitMode === mode} onChange={() => updateFilter('visitMode', mode)} />
                  <span>{mode === 'all' ? t("Any visit type") : mode === 'walk-in' ? t("Walk-in") : t(mode[0].toUpperCase() + mode.slice(1))}</span>
                </label>
              ))}
            </fieldset>
            <fieldset className="filter-fieldset">
              <legend>{t("When")}</legend>
              {([
                ['all', 'Any time'],
                ['open-now', 'Open now'],
                ['morning', 'Morning'],
                ['afternoon', 'Afternoon'],
              ] as const).map(([value, label]) => (
                <label key={value}>
                  <input type="radio" name="timing" checked={filters.timing === value} onChange={() => updateFilter('timing', value)} />
                  <span>{t(label)}</span>
                </label>
              ))}
            </fieldset>
            <InfoNote>{t("Recommended ranks searches by relevance. Without a search, morning and afternoon prioritize shorter historical visits.")}</InfoNote>
          </aside>

          <div className="results-column">
            <div className="mobile-filter-row">
              <button className="button button-secondary" type="button" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen} aria-controls="care-filters">
                <SlidersHorizontal aria-hidden="true" /> {t("Filters")} {activeFilterCount > 0 && <b>{activeFilterCount}</b>}
              </button>
              {activeFilterCount > 0 && <button className="text-button" type="button" onClick={clearFilters}>{t("Clear")}</button>}
            </div>

            <div className="results-toolbar">
              <div>
                <span className="eyebrow">{locationName ? t("Care near {location}", { location: locationName }) : t("Find care")}</span>
                <h2 id="results-title">{loading ? t('Finding options…') : t('Clinics matching your plan: {count}', { count: sortedResults.length })}</h2>
                <p>{t("Every time shown is a total-visit estimate with a separate confidence signal.")}</p>
              </div>
              <div className="toolbar-actions">
                <label className="sort-control">
                  <span className="sr-only">{t("Sort results")}</span>
                  <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
                    <option value="recommended">{t("Recommended / relevance")}</option>
                    <option value="distance" disabled={!filters.origin}>{t("Nearest first")}</option>
                    <option value="shortest">{t("Shortest visit")}</option>
                    <option value="reliability">{t("Highest confidence")}</option>
                  </select>
                  <ChevronDown aria-hidden="true" />
                </label>
                <div className="view-toggle" aria-label={t("Results view")}>
                  <button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} aria-pressed={view === 'list'}>
                    <Navigation aria-hidden="true" /> {t("List")} </button>
                  <button type="button" className={view === 'map' ? 'active' : ''} onClick={() => setView('map')} aria-pressed={view === 'map'}>
                    <Map aria-hidden="true" /> {t("Map")} </button>
                </div>
              </div>
            </div>

            {loading ? (
              <PageLoader />
            ) : error ? (
              <div className="empty-state" role="alert">
                <span className="empty-icon"><Timer aria-hidden="true" /></span>
                <h3>{t("We couldn’t load the clinics")}</h3>
                <p>{t("The directory is unavailable. Your filters are still here.")}</p>
                <button className="button button-primary" type="button" onClick={loadResults}>{t("Try again")}</button>
              </div>
            ) : sortedResults.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon"><Search aria-hidden="true" /></span>
                <h3>{t(!filters.query && !activeFilterCount ? "No clinics are available yet" : "No clinics match everything yet")}</h3>
                <p>{t(!filters.query && !activeFilterCount ? "Clinics will appear here as real directory information is added." : "Try a wider distance or remove one filter. You won’t lose your search text.")}</p>
                <button className="button button-primary" type="button" onClick={clearFilters}>{t("Clear filters")}</button>
              </div>
            ) : view === 'map' ? (
              <MapView
                clinics={sortedResults}
                selectedId={selectedClinicId}
                onSelect={setSelectedClinicId}
                preferredMode={filters.visitMode}
                showDistance={!!filters.origin}
              />
            ) : (
              <div className="clinic-list">
                {sortedResults.map((clinic) => (
                  <ClinicCard clinic={clinic} key={clinic.id} preferredMode={filters.visitMode} showDistance={!!filters.origin} />
                ))}
              </div>
            )}

            {!loading && sortedResults.length > 0 && (
              <div className="results-end-note">
                <Sparkles aria-hidden="true" />
                <div>
                  <strong>{t("Why confidence matters")}</strong>
                  <p>{t("Recent, consistent reports help make visit estimates more reliable.")}</p>
                </div>
                <Link to="/know#reliability">{t("Learn more")} <ArrowRight aria-hidden="true" /></Link>
              </div>
            )}
          </div>
        </section>
        <SafetyNote />
      </div>
    </>
  );
}
