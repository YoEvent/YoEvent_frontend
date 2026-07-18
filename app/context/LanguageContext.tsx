"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { en, fr } from "@/app/i18n/translations";

export type Language = "en" | "fr";

const dictionaries: Record<Language, any> = { en, fr };
const STORAGE_KEY = "yowevent_lang";

function resolve(dict: any, key: string): any {
  return key.split(".").reduce((acc, part) => (acc && typeof acc === "object" ? acc[part] : undefined), dict);
}

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  /** Resolve a translated string, optionally interpolating {var} placeholders. */
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Resolve a translated list/object (for repeated content blocks). */
  tl: (key: string) => any;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "fr") setLanguageState(stored);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    window.localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === "en" ? "fr" : "en");
  }, [language, setLanguage]);

  const tl = useCallback((key: string): any => {
    return resolve(dictionaries[language], key) ?? resolve(dictionaries.en, key);
  }, [language]);

  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    const raw = tl(key);
    let str = typeof raw === "string" ? raw : key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replaceAll(`{${k}}`, String(v));
      }
    }
    return str;
  }, [tl]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t, tl }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
