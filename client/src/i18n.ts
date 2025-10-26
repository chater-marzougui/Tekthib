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
// Import bot translation files
import botEN from "./locales/en/bot.json";
import botFR from "./locales/fr/bot.json";
import botAR from "./locales/ar/bot.json";
// Import auth translation files
import authEN from "./locales/en/auth.json";
import authFR from "./locales/fr/auth.json";
import authAR from "./locales/ar/auth.json";
// Import profile translation files
import profileEN from "./locales/en/profile.json";
import profileFR from "./locales/fr/profile.json";
import profileAR from "./locales/ar/profile.json";
// Import settings translation files
import settingsEN from "./locales/en/settings.json";
import settingsFR from "./locales/fr/settings.json";
import settingsAR from "./locales/ar/settings.json";
// Import replay translation files
import replayEN from "./locales/en/replay.json";
import replayFR from "./locales/fr/replay.json";
import replayAR from "./locales/ar/replay.json";

const resources = {
  en: {
    translation: {
      ...translationEN,
      ...endgameEN,
      ...gameEN,
      ...roomEN,
      ...homeEN,
      ...botEN,
      ...authEN,
      ...profileEN,
      ...settingsEN,
      ...replayEN,
    },
  },
  fr: {
    translation: {
      ...translationFR,
      ...endgameFR,
      ...gameFR,
      ...roomFR,
      ...homeFR,
      ...botFR,
      ...authFR,
      ...profileFR,
      ...settingsFR,
      ...replayFR,
    },
  },
  ar: {
    translation: {
      ...translationAR,
      ...endgameAR,
      ...gameAR,
      ...roomAR,
      ...homeAR,
      ...botAR,
      ...authAR,
      ...profileAR,
      ...settingsAR,
      ...replayAR,
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
