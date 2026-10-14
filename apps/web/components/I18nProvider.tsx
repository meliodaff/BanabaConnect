"use client";

import { createContext, useContext } from "react";
import { DICTIONARIES, type Dictionary, type Lang } from "@/lib/i18n";

const LangContext = createContext<Lang>("en");

/** Gives client components the language the root layout read from the cookie. */
export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

/** The words for client components, in the chosen language. */
export function useDictionary(): Dictionary {
  return DICTIONARIES[useLang()];
}
