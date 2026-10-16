import {
  ArrowRight,
  Bookmark,
  Check,
  Clock3,
  Heart,
  Languages,
  MapPin,
  MessageSquarePlus,
  Navigation,
  Star,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Clinic, HistoricalWaitRecord, LiveWaitEstimate, VisitMode } from '../types';
import { Link } from '../utils/navigation';
import { QuickReport } from './QuickReport';
import { ReliabilityBadge } from './UI';

export const formatMode = (mode: VisitMode) =>
  mode === 'walk-in' ? 'Walk-in' : mode === 'urgent' ? 'Urgent visit' : 'Scheduled';

export function VisitBreakdown({ estimate, compact = false }: { estimate: LiveWaitEstimate; compact?: boolean }) {
  const { t } = useApp();
  const palette = ['#d1601a', '#2e9fe5', '#376b91', '#68b7d6'];
  return (
    <div className={compact ? 'visit-breakdown compact' : 'visit-breakdown'}>
      <div className="stage-bar" aria-hidden="true">
        {estimate.stages.map((stage, index) => (
          <span
            key={stage.label}
            style={{
              flexGrow: stage.minutes,
              backgroundColor: palette[index],
            }}
          />
        ))}
      </div>
      <div className="stage-labels" aria-label={t("Estimated visit stages")}>
        {estimate.stages.map((stage, index) => (
          <div key={stage.label} title={t(stage.label)}>
            <span className="stage-key" style={{ backgroundColor: palette[index] }} />
            <span>{t(stage.shortLabel)}</span>
            <strong>{stage.minutes}m</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClinicCard({
  clinic,
  preferredMode,
  selected = false,
  onSelect,
}: {
  clinic: Clinic;
  preferredMode?: VisitMode | 'all';
  selected?: boolean;
  onSelect?: () => void;
}) {
  const { savedClinicIds, toggleSavedClinic, t } = useApp();
  const [reportOpen, setReportOpen] = useState(false);
  const isSaved = savedClinicIds.includes(clinic.id);
  const estimate =
    clinic.estimates.find((item) => item.mode === preferredMode) || clinic.estimates[0];

  return (
    <article
      className={selected ? 'clinic-card selected' : 'clinic-card'}
      data-clinic-id={clinic.id}
      onMouseEnter={onSelect}
    >
      <div className="clinic-card-top">
        <div className="clinic-identity">
          <span className="clinic-icon" style={{ background: `${clinic.accent}22`, color: clinic.accent }}>
            <Heart aria-hidden="true" fill="currentColor" size={18} />
          </span>
          <div>
            <div className="clinic-kicker">
              {clinic.type}
              {clinic.isSponsored && <span className="sponsored-label">{t('Sponsored')}</span>}
            </div>
            <h3><Link to={`/clinic/${clinic.id}`}>{clinic.name}</Link></h3>
          </div>
        </div>
        <button
          className={isSaved ? 'icon-button saved' : 'icon-button'}
          type="button"
          onClick={() => toggleSavedClinic(clinic.id)}
          aria-label={t(isSaved ? 'Remove {clinic} from saved clinics' : 'Save {clinic}', { clinic: clinic.name })}
          aria-pressed={isSaved}
        >
          <Bookmark aria-hidden="true" fill={isSaved ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="clinic-meta-row">
        <span className={`status status-${clinic.status}`}>
          <span aria-hidden="true" />
          {clinic.status === 'open' ? t('Open · Closes {time}', { time: clinic.closesAt || '' }) : t('Closed · Opens {time}', { time: clinic.opensAt || '' })}
        </span>
        <span><MapPin aria-hidden="true" /> {clinic.distanceMiles.toFixed(1)} mi · {clinic.neighborhood}</span>
      </div>

      <div className="estimate-panel" data-tour="estimates">
        <div>
          <span className="estimate-label">{t("Total visit estimate")}</span>
          <strong className="estimate-number">{estimate.totalMinutes}<small> {t("min")}</small></strong>
          <span className="estimate-range">{t('Usually {low}–{high} min', { low: estimate.range[0], high: estimate.range[1] })}</span>
        </div>
        <div className="estimate-context">
          <span className="mode-pill">{t(formatMode(estimate.mode))}</span>
          <span className="updated"><Clock3 aria-hidden="true" /> {t('Updated {minutes}m ago', { minutes: estimate.updatedMinutesAgo })}</span>
          <ReliabilityBadge score={(estimate.reliability || clinic.reliability).score} level={(estimate.reliability || clinic.reliability).level} />
        </div>
      </div>

      <VisitBreakdown estimate={estimate} compact />

      <div className="clinic-supporting">
        {clinic.rating && <span><Star aria-hidden="true" /> {clinic.rating.rating.toFixed(1)} · {clinic.rating.reviewCount} {t('reviews')}</span>}
        <span><Languages aria-hidden="true" /> {clinic.languages.join(' · ')}</span>
        <span><MessageSquarePlus aria-hidden="true" /> {t('{count} recent reports', { count: estimate.contributingReports })}</span>
      </div>

      <div className="clinic-card-actions">
        <button className="button button-secondary" type="button" onClick={() => setReportOpen(true)}>
          {t('Report a wait')}
        </button>
        <Link className="button button-primary" to={`/clinic/${clinic.id}`}> {t("View clinic")} <ArrowRight aria-hidden="true" />
        </Link>
      </div>
      {reportOpen && <QuickReport clinic={clinic} mode={estimate.mode} onClose={() => setReportOpen(false)} />}
    </article>
  );
}

export function MapView({
  clinics,
  selectedId,
  onSelect,
  preferredMode,
}: {
  clinics: Clinic[];
  selectedId: string;
  onSelect: (id: string) => void;
  preferredMode: VisitMode | 'all';
}) {
  const { t } = useApp();
  const selected = clinics.find((clinic) => clinic.id === selectedId) || clinics[0];

  if (!selected) return null;

  return (
    <div className="map-experience">
      <div className="mock-map" aria-label={t("Clinic overview near Durham")}>
        <div className="map-grid" aria-hidden="true" />
        <div className="road road-one" aria-hidden="true" />
        <div className="road road-two" aria-hidden="true" />
        <div className="road road-three" aria-hidden="true" />
        <span className="map-area area-one" aria-hidden="true">OLD WEST</span>
        <span className="map-area area-two" aria-hidden="true">DOWNTOWN</span>
        <span className="map-area area-three" aria-hidden="true">LAKEWOOD</span>
        <div className="user-pin" style={{ left: '51%', top: '43%' }}>
          <span><Navigation aria-hidden="true" /></span>
          <small>{t("Durham center")}</small>
        </div>
        {clinics.map((clinic, index) => {
          const estimate = clinic.estimates.find((item) => item.mode === preferredMode) || clinic.estimates[0];
          return (
            <button
              key={clinic.id}
              type="button"
              className={selected.id === clinic.id ? 'map-marker selected' : 'map-marker'}
              style={{ left: `${clinic.coordinates.x}%`, top: `${clinic.coordinates.y}%` }}
              onClick={() => onSelect(clinic.id)}
              aria-label={t('{clinic}, {minutes} minute {mode} estimate', {clinic: clinic.name, minutes: estimate.totalMinutes, mode: t(formatMode(estimate.mode))})}
              aria-pressed={selected.id === clinic.id}
            >
              <span>{estimate.totalMinutes}m</span>
              <i aria-hidden="true">{index + 1}</i>
            </button>
          );
        })}
        <div className="map-legend"><span className="demo-dot" /> {t("Clinic overview")}</div>
      </div>
      <aside className="map-side-list" aria-label={t("Map results")}>
        <p className="map-result-count">{clinics.length} nearby options</p>
        {clinics.map((clinic, index) => {
          const estimate = clinic.estimates.find((item) => item.mode === preferredMode) || clinic.estimates[0];
          return (
            <button
              className={selected.id === clinic.id ? 'map-list-item selected' : 'map-list-item'}
              key={clinic.id}
              type="button"
              onClick={() => onSelect(clinic.id)}
            >
              <span className="map-list-index">{index + 1}</span>
              <span>
                <strong>{clinic.name}</strong>
                <small>{clinic.distanceMiles.toFixed(1)} mi · {t(formatMode(estimate.mode))}</small>
              </span>
              <b>{estimate.totalMinutes}m</b>
            </button>
          );
        })}
        <Link className="button button-primary button-full" to={`/clinic/${selected.id}`}>
          View {selected.name} <ArrowRight aria-hidden="true" />
        </Link>
      </aside>
    </div>
  );
}

type ChartMetric = 'typical' | 'morning' | 'afternoon';

export function HistoricalChart({ records, takeaway }: { records: HistoricalWaitRecord[]; takeaway: string }) {
  const { t } = useApp();
  const [metric, setMetric] = useState<ChartMetric>('typical');
  const chartRecords = records.filter((record) => record.high > 0);
  const maxValue = Math.max(...chartRecords.map((record) => record.high), 120);
  const width = 700;
  const height = 290;
  const plotTop = 30;
  const plotBottom = 230;
  const plotHeight = plotBottom - plotTop;
  const left = 52;
  const right = 676;
  const slot = (right - left) / Math.max(chartRecords.length, 1);
  const y = (value: number) => plotBottom - (value / maxValue) * plotHeight;
  const ticks = useMemo(() => [0, 30, 60, 90, 120, 150].filter((tick) => tick <= maxValue + 10), [maxValue]);
  const metricLabel = metric === 'typical' ? 'Daily typical' : metric === 'morning' ? 'Morning' : 'Afternoon';

  return (
    <div className="history-chart-wrap">
      <div className="chart-controls" aria-label={t("Historical chart time of day")}>
        {(['typical', 'morning', 'afternoon'] as ChartMetric[]).map((option) => (
          <button
            type="button"
            key={option}
            className={metric === option ? 'active' : ''}
            onClick={() => setMetric(option)}
            aria-pressed={metric === option}
          >
            {option === 'typical' ? t("Daily typical") : t(option[0].toUpperCase() + option.slice(1))}
          </button>
        ))}
      </div>
      <div className="chart-scroll">
        <svg
          className="history-chart"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-labelledby="history-chart-title history-chart-description"
        >
          <title id="history-chart-title">{t('Historical total visit time by day')}</title>
          <desc id="history-chart-description">
            {t('Expected range and {metric} total visit time in minutes.', {metric: t(metricLabel)})} {takeaway}
          </desc>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={left} x2={right} y1={y(tick)} y2={y(tick)} className="chart-gridline" />
              <text x={left - 12} y={y(tick) + 4} textAnchor="end" className="chart-y-label">{tick}</text>
            </g>
          ))}
          <text x={14} y={22} className="chart-unit">{t("min")}</text>
          {chartRecords.map((record, index) => {
            const center = left + slot * index + slot / 2;
            const value = record[metric];
            return (
              <g key={record.day}>
                <rect
                  x={center - 12}
                  y={y(record.high)}
                  width={24}
                  height={Math.max(y(record.low) - y(record.high), 3)}
                  rx={12}
                  className="chart-range"
                />
                <circle cx={center} cy={y(value)} r={6} className="chart-point" />
                <text x={center} y={y(value) - 12} textAnchor="middle" className="chart-value">{value}</text>
                <text x={center} y={plotBottom + 28} textAnchor="middle" className="chart-day">{new Intl.DateTimeFormat(document.documentElement.lang, {weekday: 'short'}).format(new Date(2026, 0, 5 + ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(record.day)))}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="chart-footer">
        <div className="chart-legend">
          <span><i className="legend-range" /> {t("Expected range")}</span>
          <span><i className="legend-dot" /> {t('{metric} time', {metric: t(metricLabel)})}</span>
        </div>
        <p><Check aria-hidden="true" /> {takeaway}</p>
      </div>
    </div>
  );
}

export function RatingStars({ value, label }: { value: number; label: string }) {
  const { t } = useApp();
  return (
    <span className="rating-value" aria-label={t('{label}: {value} out of 5', {label, value})}>
      <Star aria-hidden="true" fill="currentColor" /> {value.toFixed(1)}
    </span>
  );
}
