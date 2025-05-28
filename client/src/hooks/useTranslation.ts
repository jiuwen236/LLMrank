import { useMemo } from 'react';
import { useTableStore } from '../stores/useTableStore';
import zhTranslations from '../locales/zh.json';
import enTranslations from '../locales/en.json';

type TranslationKey = string;

interface Translation {
  [key: string]: string | Translation;
}

const translations = {
  zh: zhTranslations,
  en: enTranslations,
};

export function useTranslation() {
  const language = useTableStore(state => state.language);

  const t = useMemo(() => {
    const getNestedValue = (obj: Translation, path: string): string => {
      const keys = path.split('.');
      let current: any = obj;

      for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key];
        } else {
          return path; // Return the key if translation not found
        }
      }

      return typeof current === 'string' ? current : path;
    };

    return (key: TranslationKey): string => {
      return getNestedValue(translations[language], key);
    };
  }, [language]);

  return { t, language };
}
