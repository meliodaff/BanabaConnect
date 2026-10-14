import { cookies } from "next/headers";
import { DICTIONARIES, LANG_COOKIE, parseLang, type Dictionary, type Lang } from "@/lib/i18n";

/** The language this staff member chose (English until they pick one). */
export async function getLang(): Promise<Lang> {
  return parseLang((await cookies()).get(LANG_COOKIE)?.value);
}

/** The words for server components, in the chosen language. */
export async function getDictionary(): Promise<Dictionary> {
  return DICTIONARIES[await getLang()];
}
