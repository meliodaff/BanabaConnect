"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { LANG_COOKIE, parseLang } from "@/lib/i18n";

/** Remembers the chosen language on this browser for a year, and redraws the page in it. */
export async function setLanguage(formData: FormData) {
  (await cookies()).set(LANG_COOKIE, parseLang(formData.get("lang")), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  refresh();
}
