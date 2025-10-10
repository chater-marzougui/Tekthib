import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import translation files
import translationEN from "./locales/en/translation.json";
import translationFR from "./locales/fr/translation.json";
import translationAR from "./locales/ar/translation.json";

// Import endgame translation files
import endgameEN from "./locales/en/endgame.json";
import endgameFR from "./locales/fr/endgame.json";
import endgameAR from "./locales/ar/endgame.json";
// Import game translation files
import gameEN from "./locales/en/game.json";
import gameFR from "./locales/fr/game.json";
import gameAR from "./locales/ar/game.json";
// Import room translation files
import roomEN from "./locales/en/room.json";
import roomFR from "./locales/fr/room.json";
import roomAR from "./locales/ar/room.json";
// Import home translation files
import homeEN from "./locales/en/home.json";
import homeFR from "./locales/fr/home.json";
import homeAR from "./locales/ar/home.json";

const resources = {
  en: {
    translation: {
      ...translationEN,
      ...endgameEN,
      ...gameEN,
      ...roomEN,
      ...homeEN,
    },
  },
  fr: {
    translation: {
      ...translationFR,
      ...endgameFR,
      ...gameFR,
      ...roomFR,
      ...homeFR,
    },
  },
  ar: {
    translation: {
      ...translationAR,
      ...endgameAR,
      ...gameAR,
      ...roomAR,
      ...homeAR,
    },
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
