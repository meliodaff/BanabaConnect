"use client";

import { setLanguage } from "@/app/languageActions";
import { useDictionary, useLang } from "@/components/I18nProvider";
import { LANGS, LANG_NAMES } from "@/lib/i18n";

/** English or Filipino, each written in itself. Remembered on this browser. */
export function LanguageSwitch() {
  const lang = useLang();
  const t = useDictionary();
  return (
    <form action={setLanguage}>
      <fieldset>
        <legend className="mb-1.5 px-1 text-xs font-bold uppercase tracking-wider text-muted">{t.language.label}</legend>
        <div className="grid grid-cols-2 gap-1 rounded-md border border-line bg-page p-0.5">
          {LANGS.map((code) => (
            <button
              key={code}
              type="submit"
              name="lang"
              value={code}
              lang={code}
              aria-pressed={code === lang}
              className={`rounded px-2 py-1.5 text-sm font-bold transition ${
                code === lang ? "bg-surface text-brand shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              {LANG_NAMES[code]}
            </button>
          ))}
        </div>
      </fieldset>
    </form>
  );
}
