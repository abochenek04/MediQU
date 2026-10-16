import type {
  Clinic,
  HistoricalWaitRecord,
  PatientReport,
  SavedAppointment,
  VisitMode,
} from '../types';

// All people, clinics, addresses, phone numbers, availability, and reports below are fictional.
// This is the single source of mock product data. Swap the service implementation—not UI
// components—when real APIs become available.

const history = (
  values: Array<[string, number, number, number, number, number]>,
): HistoricalWaitRecord[] =>
  values.map(([day, typical, low, high, morning, afternoon]) => ({
    day,
    typical,
    low,
    high,
    morning,
    afternoon,
  }));

const report = (
  id: string,
  clinicId: string,
  submittedAt: string,
  visitMode: VisitMode,
  totalMinutes: number,
  source: PatientReport['source'],
  anonymous = true,
): PatientReport => ({
  id,
  clinicId,
  submittedAt,
  visitMode,
  totalMinutes,
  source,
  anonymous,
});

export interface InsurancePlan {
  id: string;
  name: string;
}

export const insurancePlans: InsurancePlan[] = [
  { id: 'aetna', name: 'Aetna' },
  { id: 'bcbs', name: 'Blue Cross Blue Shield' },
  { id: 'cigna', name: 'Cigna' },
  { id: 'medicaid', name: 'Medicaid' },
  { id: 'medicare', name: 'Medicare' },
  { id: 'united', name: 'UnitedHealthcare' },
  { id: 'self-pay', name: 'Self-pay' },
];

export const specialtyOptions = [
  'Family medicine',
  'Urgent care',
  'Pediatrics',
  "Women's health",
  'Primary care',
  'Community health',
];

export const clinics: Clinic[] = [
  {
    id: 'brightwell-urgent-care',
    name: 'Brightwell Urgent Care',
    type: 'Urgent care',
    address: '214 Lantern Way, Durham, NC 27701',
    neighborhood: 'Downtown Durham',
    coordinates: { x: 61, y: 38, latitude: 35.9982, longitude: -78.9019 },
    distanceMiles: 1.2,
    status: 'open',
    closesAt: '8:00 PM',
    hours: { display: 'Mon–Sun, 8 AM–8 PM', today: '8:00 AM–8:00 PM' },
    phone: '(919) 555-0142',
    visitModes: ['walk-in', 'urgent'],
    specialties: ['Urgent care', 'Minor injuries', 'Illness visits'],
    symptoms: ['headache', 'sore throat', 'fever', 'sprain', 'cough', 'minor injury'],
    insurance: ['Aetna', 'Blue Cross Blue Shield', 'Cigna', 'Medicaid', 'Self-pay'],
    languages: ['English', 'Spanish', 'Polish'],
    estimates: [
      {
        mode: 'walk-in',
        totalMinutes: 54,
        range: [43, 68],
        stages: [
          { label: 'Arrival to check-in', shortLabel: 'Check in', minutes: 7 },
          { label: 'Check-in to provider', shortLabel: 'Wait', minutes: 24 },
          { label: 'Face-to-face provider time', shortLabel: 'Care', minutes: 17 },
          { label: 'Provider to departure', shortLabel: 'Check out', minutes: 6 },
        ],
        updatedMinutesAgo: 6,
        contributingReports: 18,
      },
      {
        mode: 'urgent',
        totalMinutes: 72,
        range: [52, 96],
        stages: [
          { label: 'Arrival to triage', shortLabel: 'Check in', minutes: 9 },
          { label: 'Triage to provider', shortLabel: 'Wait', minutes: 35 },
          { label: 'Face-to-face provider time', shortLabel: 'Care', minutes: 21 },
          { label: 'Provider to departure', shortLabel: 'Check out', minutes: 7 },
        ],
        updatedMinutesAgo: 6,
        contributingReports: 11,
      },
    ],
    historicalWaits: history([
      ['Mon', 59, 43, 77, 51, 68],
      ['Tue', 48, 38, 62, 44, 53],
      ['Wed', 46, 35, 59, 41, 51],
      ['Thu', 52, 39, 68, 46, 59],
      ['Fri', 66, 49, 88, 55, 76],
      ['Sat', 72, 54, 96, 63, 81],
      ['Sun', 63, 47, 84, 56, 69],
    ]),
    reliability: {
      score: 91,
      level: 'high',
      summary: 'Fresh reports agree closely with this clinic’s recent pattern.',
      factors: [
        { label: 'Data freshness', score: 96, explanation: 'Several reports arrived in the past hour.' },
        { label: 'Report volume', score: 92, explanation: '18 recent walk-in reports contribute.' },
        { label: 'Report agreement', score: 88, explanation: 'Most recent totals fall within a narrow range.' },
        { label: 'Historical consistency', score: 86, explanation: 'Today resembles prior Tuesdays.' },
        { label: 'Source diversity', score: 90, explanation: 'Patient samples and historical modeling contribute.' },
      ],
    },
    recentReports: [
      report('bw-r1', 'brightwell-urgent-care', '2026-09-08T16:44:00Z', 'walk-in', 52, 'patient report'),
      report('bw-r2', 'brightwell-urgent-care', '2026-09-08T16:21:00Z', 'walk-in', 58, 'patient report'),
      report('bw-r3', 'brightwell-urgent-care', '2026-09-08T15:50:00Z', 'urgent', 69, 'clinic sample', false),
    ],
    providers: [
      {
        id: 'maya-brooks',
        name: 'Maya Brooks, PA-C',
        initials: 'MB',
        role: 'Urgent care physician assistant',
        rating: 4.8,
        reviewCount: 46,
        nextAvailability: 'Walk-ins today',
        reviewContext: 'Often noted for clear next-step explanations.',
        color: '#d7ece4',
      },
      {
        id: 'daniel-cho',
        name: 'Daniel Cho, NP',
        initials: 'DC',
        role: 'Family nurse practitioner',
        rating: 4.6,
        reviewCount: 31,
        nextAvailability: 'On shift after 2 PM',
        reviewContext: 'Patients mention calm, unrushed conversations.',
        color: '#f4d7cf',
      },
    ],
    reviews: [
      {
        id: 'bw-v1', author: 'Visit experience', date: 'Sep 7', overall: 5,
        providerExperience: 5, communication: 5, waitAccuracy: 4, accessibility: 5,
        feltRushed: false, visitMode: 'walk-in',
        text: 'The front desk explained each step, and the total visit was close to the estimate.',
      },
      {
        id: 'bw-v2', author: 'Anonymous', date: 'Sep 5', overall: 4,
        providerExperience: 5, communication: 4, waitAccuracy: 3, accessibility: 4,
        feltRushed: false, visitMode: 'urgent',
        text: 'It became busier after I arrived, but staff told us why the timing had changed.',
      },
    ],
    bookingUrl: null,
    dataUpdatedAt: '2026-09-08T16:54:00Z',
    accent: '#ef7a65',
    takeaway: 'Weekday mornings are usually the quickest time to arrive.',
  },
  {
    id: 'juniper-family-health',
    name: 'Juniper Family Health',
    type: 'Family medicine',
    address: '830 Grove Avenue, Durham, NC 27705',
    neighborhood: 'Old West Durham',
    coordinates: { x: 39, y: 29, latitude: 36.0124, longitude: -78.9287 },
    distanceMiles: 2.4,
    status: 'open',
    closesAt: '5:30 PM',
    hours: { display: 'Mon–Fri, 7:30 AM–5:30 PM', today: '7:30 AM–5:30 PM' },
    phone: '(919) 555-0186',
    visitModes: ['scheduled', 'walk-in'],
    specialties: ['Family medicine', 'Primary care', 'Preventive care'],
    symptoms: ['headache', 'checkup', 'wellness', 'blood pressure', 'physical', 'cold'],
    insurance: ['Aetna', 'Blue Cross Blue Shield', 'Cigna', 'Medicare', 'UnitedHealthcare'],
    languages: ['English', 'Spanish', 'French'],
    estimates: [
      {
        mode: 'scheduled', totalMinutes: 63, range: [51, 78], updatedMinutesAgo: 14, contributingReports: 10,
        stages: [
          { label: 'Arrival to check-in', shortLabel: 'Check in', minutes: 8 },
          { label: 'Check-in to provider', shortLabel: 'Wait', minutes: 17 },
          { label: 'Face-to-face provider time', shortLabel: 'Care', minutes: 29 },
          { label: 'Provider to departure', shortLabel: 'Check out', minutes: 9 },
        ],
      },
      {
        mode: 'walk-in', totalMinutes: 88, range: [68, 111], updatedMinutesAgo: 14, contributingReports: 7,
        stages: [
          { label: 'Arrival to check-in', shortLabel: 'Check in', minutes: 9 },
          { label: 'Check-in to provider', shortLabel: 'Wait', minutes: 41 },
          { label: 'Face-to-face provider time', shortLabel: 'Care', minutes: 29 },
          { label: 'Provider to departure', shortLabel: 'Check out', minutes: 9 },
        ],
      },
    ],
    historicalWaits: history([
      ['Mon', 76, 58, 94, 64, 84], ['Tue', 62, 49, 77, 55, 70],
      ['Wed', 58, 46, 72, 52, 65], ['Thu', 64, 51, 81, 57, 72],
      ['Fri', 72, 56, 92, 63, 81], ['Sat', 0, 0, 0, 0, 0], ['Sun', 0, 0, 0, 0, 0],
    ]),
    reliability: {
      score: 78, level: 'medium',
      summary: 'Useful recent coverage, with some variation between scheduled and walk-in visits.',
      factors: [
        { label: 'Data freshness', score: 84, explanation: 'The newest sample is 14 minutes old.' },
        { label: 'Report volume', score: 72, explanation: '10 scheduled and 7 walk-in reports contribute.' },
        { label: 'Report agreement', score: 74, explanation: 'Walk-in totals vary more than scheduled visits.' },
        { label: 'Historical consistency', score: 81, explanation: 'Scheduled patterns are fairly consistent.' },
        { label: 'Source diversity', score: 79, explanation: 'More than one mock source type contributes.' },
      ],
    },
    recentReports: [
      report('jf-r1', 'juniper-family-health', '2026-09-08T16:36:00Z', 'scheduled', 61, 'patient report'),
      report('jf-r2', 'juniper-family-health', '2026-09-08T15:59:00Z', 'walk-in', 94, 'patient report'),
      report('jf-r3', 'juniper-family-health', '2026-09-08T14:42:00Z', 'scheduled', 68, 'clinic sample', false),
    ],
    providers: [
      {
        id: 'nia-watkins', name: 'Nia Watkins, MD', initials: 'NW', role: 'Family medicine physician',
        rating: 4.9, reviewCount: 73, nextAvailability: 'Thu, Sep 10 · 9:20 AM',
        reviewContext: 'Strong marks for listening and visit preparation.', color: '#dce8f0',
      },
      {
        id: 'samir-patel', name: 'Samir Patel, DO', initials: 'SP', role: 'Primary care physician',
        rating: 4.7, reviewCount: 58, nextAvailability: 'Fri, Sep 11 · 1:40 PM',
        reviewContext: 'Reviewers value detailed follow-up instructions.', color: '#efe4b9',
      },
    ],
    reviews: [
      {
        id: 'jf-v1', author: 'Visit experience', date: 'Sep 6', overall: 5,
        providerExperience: 5, communication: 5, waitAccuracy: 4, accessibility: 4,
        feltRushed: false, visitMode: 'scheduled',
        text: 'My appointment began a little late, but the care team kept me updated throughout.',
      },
      {
        id: 'jf-v2', author: 'Anonymous', date: 'Aug 30', overall: 4,
        providerExperience: 4, communication: 4, waitAccuracy: 3, accessibility: 5,
        feltRushed: false, visitMode: 'walk-in',
        text: 'The walk-in line took longer than I expected; the visit itself was thoughtful.',
      },
    ],
    bookingUrl: null,
    dataUpdatedAt: '2026-09-08T16:46:00Z',
    accent: '#6e98a7',
    takeaway: 'Wednesday mornings have been the most consistent for scheduled visits.',
  },
  {
    id: 'little-oak-pediatrics',
    name: 'Little Oak Pediatrics',
    type: 'Pediatrics',
    address: '412 Meadowlark Street, Durham, NC 27707',
    neighborhood: 'Lakewood',
    coordinates: { x: 46, y: 59, latitude: 35.9746, longitude: -78.9255 },
    distanceMiles: 3.1,
    status: 'open',
    closesAt: '8:00 PM',
    hours: { display: 'Mon–Fri, 8 AM–6 PM · Sat, 9 AM–1 PM', today: '8:00 AM–6:00 PM' },
    phone: '(919) 555-0119',
    visitModes: ['scheduled', 'walk-in'],
    specialties: ['Pediatrics', 'Well-child visits', 'Same-day sick visits'],
    symptoms: ['child', 'pediatric', 'fever', 'earache', 'well child'],
    insurance: ['Aetna', 'Blue Cross Blue Shield', 'Medicaid', 'UnitedHealthcare', 'Self-pay'],
    languages: ['English', 'Spanish', 'Arabic', 'Gujarati', 'Hindi'],
    estimates: [
      {
        mode: 'scheduled', totalMinutes: 49, range: [41, 60], updatedMinutesAgo: 9, contributingReports: 15,
        stages: [
          { label: 'Arrival to check-in', shortLabel: 'Check in', minutes: 6 },
          { label: 'Check-in to provider', shortLabel: 'Wait', minutes: 13 },
          { label: 'Face-to-face provider time', shortLabel: 'Care', minutes: 24 },
          { label: 'Provider to departure', shortLabel: 'Check out', minutes: 6 },
        ],
      },
      {
        mode: 'walk-in', totalMinutes: 71, range: [55, 91], updatedMinutesAgo: 9, contributingReports: 12,
        stages: [
          { label: 'Arrival to check-in', shortLabel: 'Check in', minutes: 7 },
          { label: 'Check-in to provider', shortLabel: 'Wait', minutes: 33 },
          { label: 'Face-to-face provider time', shortLabel: 'Care', minutes: 24 },
          { label: 'Provider to departure', shortLabel: 'Check out', minutes: 7 },
        ],
      },
    ],
    historicalWaits: history([
      ['Mon', 57, 43, 73, 49, 64], ['Tue', 51, 40, 64, 45, 57],
      ['Wed', 49, 39, 60, 44, 54], ['Thu', 53, 41, 68, 46, 61],
      ['Fri', 62, 47, 81, 52, 72], ['Sat', 68, 51, 87, 59, 76], ['Sun', 0, 0, 0, 0, 0],
    ]),
    reliability: {
      score: 87, level: 'high',
      summary: 'Frequent recent reports and stable scheduled-visit patterns.',
      factors: [
        { label: 'Data freshness', score: 91, explanation: 'The newest report is 9 minutes old.' },
        { label: 'Report volume', score: 88, explanation: '27 recent samples cover both visit modes.' },
        { label: 'Report agreement', score: 85, explanation: 'Most reports cluster close to the estimate.' },
        { label: 'Historical consistency', score: 89, explanation: 'Day-of-week patterns repeat reliably.' },
        { label: 'Source diversity', score: 80, explanation: 'Patient reports lead the sample mix.' },
      ],
    },
    recentReports: [
      report('lo-r1', 'little-oak-pediatrics', '2026-09-08T16:41:00Z', 'scheduled', 47, 'patient report'),
      report('lo-r2', 'little-oak-pediatrics', '2026-09-08T16:02:00Z', 'walk-in', 74, 'patient report'),
      report('lo-r3', 'little-oak-pediatrics', '2026-09-08T15:18:00Z', 'scheduled', 52, 'patient report'),
    ],
    providers: [
      {
        id: 'elena-ruiz', name: 'Elena Ruiz, MD', initials: 'ER', role: 'Pediatrician', rating: 4.9,
        reviewCount: 81, nextAvailability: 'Wed, Sep 9 · 3:10 PM',
        reviewContext: 'Families mention clear explanations for children and adults.', color: '#f4d7cf',
      },
      {
        id: 'amina-bell', name: 'Amina Bell, NP', initials: 'AB', role: 'Pediatric nurse practitioner', rating: 4.8,
        reviewCount: 64, nextAvailability: 'Same-day visits available',
        reviewContext: 'Often praised for a gentle, efficient approach.', color: '#d7ece4',
      },
    ],
    reviews: [
      {
        id: 'lo-v1', author: 'Visit experience', date: 'Sep 7', overall: 5,
        providerExperience: 5, communication: 5, waitAccuracy: 5, accessibility: 4,
        feltRushed: false, visitMode: 'scheduled',
        text: 'The estimate made arranging school pickup much easier, and the visit stayed on track.',
      },
      {
        id: 'lo-v2', author: 'Anonymous', date: 'Sep 2', overall: 4,
        providerExperience: 5, communication: 4, waitAccuracy: 4, accessibility: 4,
        feltRushed: false, visitMode: 'walk-in',
        text: 'Busy, but organized. We knew where we were in the process.',
      },
    ],
    bookingUrl: null,
    dataUpdatedAt: '2026-09-08T16:51:00Z',
    accent: '#e5b95f',
    takeaway: 'Tuesday and Wednesday mornings tend to be shortest.',
  },
  {
    id: 'solace-womens-health',
    name: "Solace Women’s Health",
    type: "Women's health",
    address: '1608 Willow Bend Road, Durham, NC 27713',
    neighborhood: 'Southpoint',
    coordinates: { x: 69, y: 77, latitude: 35.9049, longitude: -78.9383 },
    distanceMiles: 6.8,
    status: 'closed',
    opensAt: '8:30 AM tomorrow',
    hours: { display: 'Mon–Fri, 8:30 AM–5 PM', today: '8:30 AM–5:00 PM' },
    phone: '(919) 555-0165',
    visitModes: ['scheduled'],
    specialties: ["Women's health", 'Preventive care', 'Reproductive health'],
    symptoms: ['annual exam', 'womens health', 'preventive', 'contraception'],
    insurance: ['Aetna', 'Blue Cross Blue Shield', 'Cigna', 'UnitedHealthcare', 'Self-pay'],
    languages: ['English', 'Chinese'],
    estimates: [
      {
        mode: 'scheduled', totalMinutes: 76, range: [59, 96], updatedMinutesAgo: 53, contributingReports: 8,
        stages: [
          { label: 'Arrival to check-in', shortLabel: 'Check in', minutes: 8 },
          { label: 'Check-in to provider', shortLabel: 'Wait', minutes: 22 },
          { label: 'Face-to-face provider time', shortLabel: 'Care', minutes: 37 },
          { label: 'Provider to departure', shortLabel: 'Check out', minutes: 9 },
        ],
      },
    ],
    historicalWaits: history([
      ['Mon', 82, 63, 104, 72, 91], ['Tue', 74, 58, 93, 67, 81],
      ['Wed', 71, 56, 89, 64, 78], ['Thu', 76, 59, 96, 67, 86],
      ['Fri', 79, 61, 101, 69, 90], ['Sat', 0, 0, 0, 0, 0], ['Sun', 0, 0, 0, 0, 0],
    ]),
    reliability: {
      score: 73, level: 'medium', summary: 'A consistent historical pattern, but fewer fresh samples today.',
      factors: [
        { label: 'Data freshness', score: 62, explanation: 'The newest sample is nearly an hour old.' },
        { label: 'Report volume', score: 70, explanation: 'Eight recent scheduled-visit reports contribute.' },
        { label: 'Report agreement', score: 76, explanation: 'Reported totals show moderate agreement.' },
        { label: 'Historical consistency', score: 84, explanation: 'Weekday patterns are generally stable.' },
        { label: 'Source diversity', score: 69, explanation: 'The sample mix is still limited.' },
      ],
    },
    recentReports: [
      report('sw-r1', 'solace-womens-health', '2026-09-08T16:01:00Z', 'scheduled', 78, 'patient report'),
      report('sw-r2', 'solace-womens-health', '2026-09-08T14:36:00Z', 'scheduled', 72, 'historical model'),
    ],
    providers: [
      {
        id: 'rachel-kim', name: 'Rachel Kim, MD', initials: 'RK', role: 'Obstetrician-gynecologist', rating: 4.8,
        reviewCount: 68, nextAvailability: 'Mon, Sep 14 · 10:30 AM',
        reviewContext: 'Patients highlight careful answers and shared decision-making.', color: '#eadcf0',
      },
      {
        id: 'monique-james', name: 'Monique James, CNM', initials: 'MJ', role: 'Certified nurse-midwife', rating: 4.9,
        reviewCount: 49, nextAvailability: 'Tue, Sep 15 · 2:00 PM',
        reviewContext: 'Reviewers often describe visits as supportive and unrushed.', color: '#efe4b9',
      },
    ],
    reviews: [
      {
        id: 'sw-v1', author: 'Visit experience', date: 'Sep 3', overall: 5,
        providerExperience: 5, communication: 5, waitAccuracy: 4, accessibility: 4,
        feltRushed: false, visitMode: 'scheduled',
        text: 'The visit ran a little long, but I had time to ask every question I brought.',
      },
    ],
    bookingUrl: null,
    dataUpdatedAt: '2026-09-08T16:01:00Z',
    accent: '#ab83b7',
    takeaway: 'Tuesday mornings are usually the most predictable.',
  },
  {
    id: 'bull-city-community-clinic',
    name: 'Bull City Community Clinic',
    type: 'Community health',
    address: '905 Hopewell Lane, Durham, NC 27704',
    neighborhood: 'East Durham',
    coordinates: { x: 76, y: 48, latitude: 36.0029, longitude: -78.8661 },
    distanceMiles: 4.3,
    status: 'open',
    closesAt: '7:00 PM',
    hours: { display: 'Mon–Sat, 8 AM–7 PM', today: '8:00 AM–7:00 PM' },
    phone: '(919) 555-0133',
    visitModes: ['scheduled', 'walk-in'],
    specialties: ['Community health', 'Primary care', 'Family medicine'],
    symptoms: ['checkup', 'primary care', 'vaccination', 'cold', 'wellness'],
    insurance: ['Medicaid', 'Medicare', 'Self-pay', 'Blue Cross Blue Shield'],
    languages: ['English', 'Spanish', 'Arabic'],
    estimates: [
      {
        mode: 'scheduled', totalMinutes: 84, range: [57, 118], updatedMinutesAgo: 39, contributingReports: 4,
        stages: [
          { label: 'Arrival to check-in', shortLabel: 'Check in', minutes: 12 },
          { label: 'Check-in to provider', shortLabel: 'Wait', minutes: 34 },
          { label: 'Face-to-face provider time', shortLabel: 'Care', minutes: 30 },
          { label: 'Provider to departure', shortLabel: 'Check out', minutes: 8 },
        ],
      },
      {
        mode: 'walk-in', totalMinutes: 112, range: [72, 154], updatedMinutesAgo: 39, contributingReports: 3,
        stages: [
          { label: 'Arrival to check-in', shortLabel: 'Check in', minutes: 14 },
          { label: 'Check-in to provider', shortLabel: 'Wait', minutes: 58 },
          { label: 'Face-to-face provider time', shortLabel: 'Care', minutes: 31 },
          { label: 'Provider to departure', shortLabel: 'Check out', minutes: 9 },
        ],
      },
    ],
    historicalWaits: history([
      ['Mon', 102, 68, 143, 88, 118], ['Tue', 88, 61, 122, 77, 99],
      ['Wed', 91, 63, 127, 80, 102], ['Thu', 96, 66, 134, 82, 111],
      ['Fri', 109, 73, 151, 92, 126], ['Sat', 116, 78, 160, 101, 132], ['Sun', 0, 0, 0, 0, 0],
    ]),
    reliability: {
      score: 54, level: 'low', summary: 'Only a few recent reports are available, and they vary widely.',
      factors: [
        { label: 'Data freshness', score: 68, explanation: 'The latest sample is 39 minutes old.' },
        { label: 'Report volume', score: 38, explanation: 'Only seven recent reports cover both modes.' },
        { label: 'Report agreement', score: 43, explanation: 'Recent totals vary substantially.' },
        { label: 'Historical consistency', score: 57, explanation: 'Day-to-day demand changes often.' },
        { label: 'Source diversity', score: 61, explanation: 'Patient and modeled samples contribute.' },
      ],
    },
    recentReports: [
      report('bc-r1', 'bull-city-community-clinic', '2026-09-08T16:15:00Z', 'scheduled', 79, 'patient report'),
      report('bc-r2', 'bull-city-community-clinic', '2026-09-08T14:52:00Z', 'walk-in', 128, 'patient report'),
    ],
    providers: [
      {
        id: 'luis-mendoza', name: 'Luis Mendoza, MD', initials: 'LM', role: 'Family medicine physician', rating: 4.7,
        reviewCount: 39, nextAvailability: 'Thu, Sep 10 · 11:40 AM',
        reviewContext: 'Bilingual care and practical follow-up are frequently noted.', color: '#d7ece4',
      },
      {
        id: 'jade-wilson', name: 'Jade Wilson, FNP', initials: 'JW', role: 'Family nurse practitioner', rating: 4.8,
        reviewCount: 35, nextAvailability: 'Walk-ins today',
        reviewContext: 'Patients appreciate straightforward, respectful conversations.', color: '#dce8f0',
      },
    ],
    reviews: [
      {
        id: 'bc-v1', author: 'Anonymous', date: 'Sep 4', overall: 4,
        providerExperience: 5, communication: 4, waitAccuracy: 2, accessibility: 5,
        feltRushed: false, visitMode: 'walk-in',
        text: 'The wait changed a lot, though staff were kind and the sliding-scale process was clear.',
      },
    ],
    bookingUrl: null,
    dataUpdatedAt: '2026-09-08T16:15:00Z',
    accent: '#5f9f87',
    takeaway: 'Timing varies; call ahead if your schedule has little flexibility.',
  },
  {
    id: 'eno-quickcare',
    name: 'Eno QuickCare',
    type: 'Walk-in clinic',
    address: '72 Riverstone Drive, Durham, NC 27712',
    neighborhood: 'North Durham',
    coordinates: { x: 53, y: 14, latitude: 36.0731, longitude: -78.9202 },
    distanceMiles: 7.6,
    status: 'closed',
    opensAt: '9:00 AM tomorrow',
    hours: { display: 'Mon–Sat, 9 AM–6 PM', today: '9:00 AM–6:00 PM' },
    phone: '(919) 555-0197',
    visitModes: ['walk-in'],
    specialties: ['Urgent care', 'Walk-in care', 'Minor injuries'],
    symptoms: ['sore throat', 'cough', 'sprain', 'rash', 'walk in'],
    insurance: ['Aetna', 'Cigna', 'Medicare', 'UnitedHealthcare', 'Self-pay'],
    languages: ['English'],
    estimates: [
      {
        mode: 'walk-in', totalMinutes: 44, range: [30, 61], updatedMinutesAgo: 72, contributingReports: 6,
        stages: [
          { label: 'Arrival to check-in', shortLabel: 'Check in', minutes: 6 },
          { label: 'Check-in to provider', shortLabel: 'Wait', minutes: 18 },
          { label: 'Face-to-face provider time', shortLabel: 'Care', minutes: 15 },
          { label: 'Provider to departure', shortLabel: 'Check out', minutes: 5 },
        ],
      },
    ],
    historicalWaits: history([
      ['Mon', 52, 37, 71, 43, 62], ['Tue', 45, 32, 61, 38, 53],
      ['Wed', 43, 31, 59, 37, 50], ['Thu', 48, 34, 65, 41, 56],
      ['Fri', 58, 41, 79, 48, 69], ['Sat', 64, 45, 88, 54, 75], ['Sun', 0, 0, 0, 0, 0],
    ]),
    reliability: {
      score: 69, level: 'medium', summary: 'The pattern is fairly steady, but today’s sample is no longer fresh.',
      factors: [
        { label: 'Data freshness', score: 49, explanation: 'The latest report is more than an hour old.' },
        { label: 'Report volume', score: 66, explanation: 'Six recent walk-in reports contribute.' },
        { label: 'Report agreement', score: 76, explanation: 'Most reports land near the shown range.' },
        { label: 'Historical consistency', score: 78, explanation: 'Midweek patterns are fairly predictable.' },
        { label: 'Source diversity', score: 65, explanation: 'The sample mix is still developing.' },
      ],
    },
    recentReports: [
      report('eq-r1', 'eno-quickcare', '2026-09-08T15:42:00Z', 'walk-in', 46, 'patient report'),
      report('eq-r2', 'eno-quickcare', '2026-09-08T13:55:00Z', 'walk-in', 41, 'historical model'),
    ],
    providers: [
      {
        id: 'tyler-green', name: 'Tyler Green, PA-C', initials: 'TG', role: 'Physician assistant', rating: 4.5,
        reviewCount: 27, nextAvailability: 'Walk-ins tomorrow',
        reviewContext: 'Reviewers mention an efficient and friendly manner.', color: '#efe4b9',
      },
    ],
    reviews: [
      {
        id: 'eq-v1', author: 'Anonymous', date: 'Sep 1', overall: 4,
        providerExperience: 4, communication: 4, waitAccuracy: 5, accessibility: 3,
        feltRushed: true, visitMode: 'walk-in',
        text: 'Very quick overall. The visit moved fast, so I was glad I had my questions ready.',
      },
    ],
    bookingUrl: null,
    dataUpdatedAt: '2026-09-08T15:42:00Z',
    accent: '#df9b5f',
    takeaway: 'Midweek mornings have historically been quickest.',
  },
];

// Clinic ratings derive from the existing fictional clinic reviews, not provider scores.
// A future adapter can populate the same structure with an attributed source.
for (const clinic of clinics) {
  if (clinic.reviews.length) clinic.rating = {
    rating: Math.round(clinic.reviews.reduce((sum, review) => sum + review.overall, 0) / clinic.reviews.length * 10) / 10,
    reviewCount: clinic.reviews.length,
    source: 'demo',
  };
}
export const clinicLanguageOptions = [...new Set(clinics.flatMap((clinic) => clinic.languages))].sort();

const sampleTime = new Date(Date.now() + 1000 * 60 * 60 * 45);
sampleTime.setMinutes(30, 0, 0);

export const sampleAppointment: SavedAppointment = {
  id: 'sample-appointment',
  clinicId: 'juniper-family-health',
  appointmentTime: sampleTime.toISOString(),
  visitMode: 'scheduled',
  travelMinutes: 18,
  bufferMinutes: 15,
  isSample: true,
};

export const languages = [
  { code: 'pl', label: 'Polski' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'zh', label: '中文' },
  { code: 'ar', label: 'العربية' },
];
