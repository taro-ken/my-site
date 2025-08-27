import { ui, defaultLang } from './ui';

export function useTranslatedPath() {
  return function translatePath(path: string) {
    return path;
  }
}

export function getLangFromUrl() {
  return defaultLang;
}

export function useTranslations() {
  return function t(key: string) {
    const keys = key.split('.');
    let value: any = ui[defaultLang];

    for (const k of keys) {
      value = value?.[k];
    }

    return value || key;
  };
}
