
import english from '@/i18n/en.json';
import spanish from '@/i18n/es.json';

const LANG = {
  ENGLISH: 'en',
  SPANISH: 'es',
  JAPANESE: 'ja',
};

export const getI18N = (
  { currentLocale = 'ja' }:
    { currentLocale: string | undefined; }
) => {
  // 暫定: 日本語データが未整備のため、既存の英語/スペイン語をフォールバック
  if (currentLocale === LANG.JAPANESE) return english
  if (currentLocale === LANG.ENGLISH) return english
  if (currentLocale === LANG.SPANISH) return spanish
  return english;
};
