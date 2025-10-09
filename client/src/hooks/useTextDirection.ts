import { useMemo } from "react";
import { useTranslation } from "react-i18next";

/**
 * Custom hook to get the text direction based on the current language
 * @returns "rtl" for right-to-left languages (Arabic, Hebrew, Persian, Urdu) or "ltr" for left-to-right languages
 */
export function useTextDirection(): "rtl" | "ltr" {
  const { i18n } = useTranslation();

  const direction = useMemo(() => {
    const currentLang = i18n.language || window.navigator.language;
    const langCode = currentLang.split("-")[0].toLowerCase();
    
    // List of RTL language codes
    const rtlLanguages = ["ar", "he", "fa", "ur"];
    
    return rtlLanguages.includes(langCode) ? "rtl" : "ltr";
  }, [i18n.language]);

  return direction;
}

/**
 * Custom hook to check if the current language is RTL
 * @returns true if current language is RTL, false otherwise
 */
export function useIsRTL(): boolean {
  const direction = useTextDirection();
  return direction === "rtl";
}
