import { interfaceTranslations } from './interfaceTranslations';
import { expandedTranslations } from './expandedTranslations';
type TranslationKey =
  | 'findCare'
  | 'saved'
  | 'reportWait'
  | 'howItWorks'
  | 'language'
  | 'heroEyebrow'
  | 'heroTitle'
  | 'heroBody'
  | 'searchPlaceholder';

const translations: Record<string, Record<TranslationKey, string>> = {
  en: {
    findCare: 'Find care',
    saved: 'Appointments',
    reportWait: 'Report wait',
    howItWorks: 'About',
    language: 'Language',
    heroEyebrow: 'Care planning for real life',
    heroTitle: 'Know before you go.',
    heroBody: 'Compare total visit times, understand confidence, and make a plan that respects your day.',
    searchPlaceholder: 'Clinic, provider, specialty, or symptom',
  },
  es: {
    findCare: 'Buscar atención',
    saved: 'Citas',
    reportWait: 'Reportar espera',
    howItWorks: 'Acerca de MediQU',
    language: 'Idioma',
    heroEyebrow: 'Planificación para la vida real',
    heroTitle: 'Infórmate antes de ir.',
    heroBody: 'Compara la duración de las visitas, comprende la confianza y planifica tu día.',
    searchPlaceholder: 'Clínica, proveedor, especialidad o síntoma',
  },
  zh: {
    findCare: '寻找医疗服务',
    saved: '预约',
    reportWait: '报告等待时间',
    howItWorks: '关于',
    language: '语言',
    heroEyebrow: '贴近生活的就医规划',
    heroTitle: '出发前，心中有数。',
    heroBody: '比较就诊总时长，了解数据可信度，合理安排一天。',
    searchPlaceholder: '诊所、医生、专科或症状',
  },
  ar: {
    findCare: 'ابحث عن رعاية',
    saved: 'المواعيد',
    reportWait: 'الإبلاغ عن الانتظار',
    howItWorks: 'حول MediQU',
    language: 'اللغة',
    heroEyebrow: 'تخطيط للرعاية يناسب حياتك',
    heroTitle: 'اعرف قبل أن تذهب.',
    heroBody: 'قارن مدة الزيارة وافهم موثوقية التقدير وخطط ليومك.',
    searchPlaceholder: 'عيادة أو مقدم خدمة أو تخصص أو عرض',
  },
};

export const supportedLanguages = ['en','es','zh','ar','pl','gu','hi'] as const;
export function translate(language:string,key:string,values?:Record<string,string|number>) {
 const locale=translations[language] || translations.en;
 const column=['es','zh','ar'].indexOf(language);
 let text=expandedTranslations[language]?.[key] || locale[key as TranslationKey] || (column>=0?interfaceTranslations[key]?.[column]:undefined) || key;
 for(const [name,value] of Object.entries(values||{}))text=text.replaceAll(`{${name}}`,typeof value==='number'?new Intl.NumberFormat(language).format(value):value);
 return text;
}
