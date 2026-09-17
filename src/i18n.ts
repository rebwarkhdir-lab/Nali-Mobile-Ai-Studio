import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from './locales/en.json';
import kuTranslations from './locales/ku.json';

// Retrieve saved language or default to English
const savedLanguage = localStorage.getItem('nali_language') || 'en';

// Set document direction based on language (Kurdish Sorani is RTL)
const setDirection = (lang: string) => {
  const dir = lang === 'ku' ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lang;
};

// Initial setup
setDirection(savedLanguage);

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      ku: { translation: kuTranslations }
    },
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already safes from XSS
    }
  });

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('nali_language', lng);
  setDirection(lng);
});

export default i18n;
