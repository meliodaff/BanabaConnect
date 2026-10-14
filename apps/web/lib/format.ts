// The dashboard runs on Vercel's servers (UTC), so always show Philippine time.
const TIME_ZONE = "Asia/Manila";

const dateTime = new Intl.DateTimeFormat("en-PH", {
  timeZone: TIME_ZONE,
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** "Oct 11, 3:40 PM" */
export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

const dateTimeWithYear = new Intl.DateTimeFormat("en-PH", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** "Oct 11, 2026, 3:40 PM": with the year, for printed records that are kept for years. */
export function formatDateTimeWithYear(iso: string): string {
  return dateTimeWithYear.format(new Date(iso));
}

/** The words for time and distance, in the dashboard's two languages (lib/i18n.ts). */
const UNITS = {
  en: { sec: "sec", hr: "hr", day: "day", days: "days", justNow: "just now", ago: "ago", about: "about" },
  fil: { sec: "seg", hr: "oras", day: "araw", days: "araw", justNow: "ngayon lang", ago: "na ang nakalipas", about: "mga" },
} as const;

type UnitLang = keyof typeof UNITS;

/** "45 sec", "12 min", "3 hr 5 min", "2 days" (in Filipino: "3 oras 5 min", "2 araw") */
export function formatDuration(ms: number, lang: UnitLang = "en"): string {
  const words = UNITS[lang];
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return `${Math.max(1, Math.round(ms / 1000))} ${words.sec}`;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest ? `${hours} ${words.hr} ${rest} min` : `${hours} ${words.hr}`;
  }
  const days = Math.floor(hours / 24);
  return days === 1 ? `1 ${words.day}` : `${days} ${words.days}`;
}

/** How long since `iso`, e.g. "25 min" (for "has waited 25 min"). */
export function timeSince(iso: string, now = Date.now(), lang: UnitLang = "en"): string {
  return formatDuration(now - new Date(iso).getTime(), lang);
}

/** "just now", "12 min ago" (in Filipino: "ngayon lang", "12 min na ang nakalipas") */
export function timeAgo(iso: string, now = Date.now(), lang: UnitLang = "en"): string {
  const ms = now - new Date(iso).getTime();
  const words = UNITS[lang];
  return ms < 60_000 ? words.justNow : `${formatDuration(ms, lang)} ${words.ago}`;
}

/**
 * How long a report waited on the phone for signal before reaching the server.
 * Null when it arrived within a few minutes, which is normal.
 */
export function waitedForSignal(createdAt: string, receivedAt: string, lang: UnitLang = "en"): string | null {
  const ms = new Date(receivedAt).getTime() - new Date(createdAt).getTime();
  return ms >= 5 * 60_000 ? formatDuration(ms, lang) : null;
}

/** Midnight today in the Philippines, as an ISO timestamp (for "reports today"). */
export function startOfTodayInManila(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // "2026-10-11"
  return new Date(`${parts}T00:00:00+08:00`).toISOString();
}

/** 350 → "about 350 m", 1240 → "about 1.2 km" (in Filipino: "mga 350 m"). */
export function formatDistance(meters: number, lang: UnitLang = "en"): string {
  const about = UNITS[lang].about;
  if (meters < 1000) return `${about} ${Math.max(10, Math.round(meters / 10) * 10)} m`;
  return `${about} ${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)} km`;
}

/** 0.873 → "87" (the queue shows priority out of 100). */
export function scoreOutOf100(score: number | null): string {
  return score === null ? "–" : String(Math.round(score * 100));
}
