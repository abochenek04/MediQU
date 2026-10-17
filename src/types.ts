export type VisitMode = 'scheduled' | 'walk-in' | 'urgent';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type ClinicStatus = 'open' | 'closed';
export type DataSourceType = 'patient report' | 'clinic sample' | 'historical model';

export interface Coordinates {
  x: number;
  y: number;
  latitude: number;
  longitude: number;
}

export interface VisitStage {
  label: string;
  minutes: number;
  shortLabel: string;
}

export interface LiveWaitEstimate {
  evidenceState?: 'ready' | 'insufficient' | 'stale';
  reliability?: ReliabilityScore;
  mode: VisitMode;
  totalMinutes: number;
  range: [number, number];
  stages: VisitStage[];
  updatedMinutesAgo: number;
  contributingReports: number;
}

export interface HistoricalWaitRecord {
  day: string;
  typical: number;
  low: number;
  high: number;
  morning: number;
  afternoon: number;
}

export interface ReliabilityFactor {
  label: string;
  score: number;
  explanation: string;
}

export interface ReliabilityScore {
  score: number;
  level: ConfidenceLevel;
  factors: ReliabilityFactor[];
  summary: string;
}

export interface PatientReport {
  moderationStatus?: 'accepted' | 'review' | 'rejected';
  id: string;
  clinicId: string;
  submittedAt: string;
  visitMode: VisitMode;
  totalMinutes: number;
  source: DataSourceType;
  anonymous: boolean;
  accuracy?: 'shorter' | 'about-right' | 'longer';
  communication?: number;
  rushed?: boolean;
  note?: string;
  reportKind?: 'completed-visit' | 'current-wait';
  elapsedMinutes?: number;
  visitDate?: string;
  timing?: Pick<WaitReportDraft, 'arrivalTime' | 'checkInTime' | 'providerTime' | 'departureTime' | 'totalRange'>;
}

export interface Provider {
  id: string;
  name: string;
  initials: string;
  role: string;
  rating: number;
  reviewCount: number;
  nextAvailability: string;
  reviewContext: string;
  color: string;
}

export interface StructuredReview {
  id: string;
  author: string;
  date: string;
  overall: number;
  providerExperience: number;
  communication: number;
  waitAccuracy: number;
  accessibility: number;
  feltRushed: boolean;
  text: string;
  visitMode: VisitMode;
}

export interface ClinicHours {
  display: string;
  today: string;
}

export interface ClinicRating {
  rating: number;
  reviewCount: number;
  source: 'demo' | 'google-places' | 'clinic';
}

export interface SearchOrigin {
  latitude: number;
  longitude: number;
}

export interface Clinic {
  directorySource?: 'approved';
  id: string;
  name: string;
  type: string;
  address: string;
  neighborhood: string;
  coordinates: Coordinates;
  distanceMiles: number;
  status: ClinicStatus;
  closesAt?: string;
  opensAt?: string;
  hours: ClinicHours;
  phone: string;
  visitModes: VisitMode[];
  specialties: string[];
  symptoms: string[];
  insurance: string[];
  languages: string[];
  rating?: ClinicRating;
  estimates: LiveWaitEstimate[];
  historicalWaits: HistoricalWaitRecord[];
  reliability: ReliabilityScore;
  recentReports: PatientReport[];
  providers: Provider[];
  reviews: StructuredReview[];
  bookingUrl: null;
  dataUpdatedAt: string;
  accent: string;
  isSponsored?: boolean;
  takeaway: string;
}

export interface SearchFilters {
  query: string;
  insurance: string;
  specialty: string;
  visitMode: VisitMode | 'all';
  timing: 'all' | 'open-now' | 'morning' | 'afternoon';
  maxDistance: number;
  language: string;
  minimumRating: number;
  origin?: SearchOrigin;
}

export interface SavedAppointment {
  id: string;
  clinicId: string;
  appointmentTime: string;
  visitMode: VisitMode;
  travelMinutes: number;
  bufferMinutes: number;
  isSample?: boolean;
}

export interface WaitReportDraft {
  timezoneOffsetMinutes?: number;
  reportKind?: 'completed-visit' | 'current-wait';
  elapsedMinutes?: number;
  clinicId: string;
  visitMode: VisitMode;
  visitDate: string;
  arrivalTime: string;
  checkInTime: string;
  providerTime: string;
  departureTime: string;
  totalRange: string;
  accuracy: '' | 'shorter' | 'about-right' | 'longer';
  communication: number;
  rushed: '' | 'yes' | 'no';
  note: string;
  anonymous: boolean;
}

export interface AppToast {
  id: number;
  message: string;
  tone?: 'default' | 'success' | 'info';
}
