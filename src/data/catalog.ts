// Search categories and interface languages; these are not clinic records.
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

export const languages = [
  { code: 'pl', label: 'Polski' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'zh', label: '中文' },
  { code: 'ar', label: 'العربية' },
];

export const clinicLanguageOptions = ['English', 'Gujarati', 'Hindi', 'Polish', 'Spanish', 'Arabic', 'Chinese'].sort();
