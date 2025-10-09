import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import translation files
import translationEN from "../public/locales/en/translation.json";
import translationFR from "../public/locales/fr/translation.json";
import translationAR from "../public/locales/ar/translation.json";

// Import endgame translation files
import endgameEN from "../public/locales/en/endgame.json";
import endgameFR from "../public/locales/fr/endgame.json";
import endgameAR from "../public/locales/ar/endgame.json";

const resources = {
  en: {
    translation: translationEN,
    endgame: endgameEN,
  },
  fr: {
    translation: translationFR,
    endgame: endgameFR,
  },
  ar: {
    translation: translationAR,
    endgame: endgameAR,
  },
};

i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    resources,
    fallbackLng: "en",
    debug: false,
    
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "locale",
    },

    interpolation: {
      escapeValue: false, // React already handles escaping
    },

    react: {
      useSuspense: false,
    },
  });

export default i18n;
