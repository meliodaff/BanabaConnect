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

/** "45 sec", "12 min", "3 hr 5 min", "2 days" */
export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return `${Math.max(1, Math.round(ms / 1000))} sec`;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
  }
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day" : `${days} days`;
}

/** How long since `iso`, e.g. "25 min" (for "has waited 25 min"). */
export function timeSince(iso: string, now = Date.now()): string {
  return formatDuration(now - new Date(iso).getTime());
}

/** "just now", "12 min ago" */
export function timeAgo(iso: string, now = Date.now()): string {
  const ms = now - new Date(iso).getTime();
  return ms < 60_000 ? "just now" : `${formatDuration(ms)} ago`;
}

/**
 * How long a report waited on the phone for signal before reaching the server.
 * Null when it arrived within a few minutes, which is normal.
 */
export function waitedForSignal(createdAt: string, receivedAt: string): string | null {
  const ms = new Date(receivedAt).getTime() - new Date(createdAt).getTime();
  return ms >= 5 * 60_000 ? formatDuration(ms) : null;
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

/** 0.873 → "87" (the queue shows priority out of 100). */
export function scoreOutOf100(score: number | null): string {
  return score === null ? "–" : String(Math.round(score * 100));
}
