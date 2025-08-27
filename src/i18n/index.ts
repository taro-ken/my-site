import english from '@/i18n/en.json';

export const getI18N = (
  { currentLocale = 'ja' }:
    { currentLocale: string | undefined; }
) => {
  // 日本語のみのため、常に英語ファイル（日本語内容）を返す
  return english;
};
