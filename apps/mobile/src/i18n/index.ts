import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { Logger } from '../lib/logger';

// Import translations
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';
import fa from './locales/fa.json';

const LANGUAGE_KEY = '@noteece_language';

// Language detector
const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lng: string) => void) => {
    try {
      // Try to get saved language preference
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (savedLanguage) {
        callback(savedLanguage);
        return;
      }

      // Fall back to device language
      // @ts-ignore: expo-localization type mismatch
      const locales = Localization.getLocales();
      const deviceLanguage = locales?.[0]?.languageCode || 'en';
      callback(deviceLanguage);
    } catch (error) {
      Logger.error('Error detecting language:', error);
      callback('en'); // Fallback to English
    }
  },
  init: () => {},
  cacheUserLanguage: async (language: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, language);
    } catch (error) {
      Logger.error('Error saving language:', error);
    }
  },
};

i18n
  .use(languageDetector as any)
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4', // Upgraded to v4 compatibility
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
      ja: { translation: ja },
      zh: { translation: zh },
      fa: { translation: fa },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    react: {
      useSuspense: false,
    },
    // Add pluralization support
    pluralSeparator: '_',
    contextSeparator: '_',
  });

export default i18n;
export { LANGUAGE_KEY };

/**
 * Helper for pluralized translations
 * Usage: tp('posts', count) => "1 post" or "5 posts"
 */
export function tp(key: string, count: number, options?: object): string {
  return i18n.t(key, { count, ...options });
}

/**
 * Helper for RTL-aware formatting
 */
export function isRTL(): boolean {
  const rtlLanguages = ['fa', 'ar', 'he'];
  return rtlLanguages.includes(i18n.language);
}
