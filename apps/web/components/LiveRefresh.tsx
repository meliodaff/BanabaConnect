"use client";

import { LiveIndicator, useLiveReports } from "@/components/LiveUpdates";

/** Keeps a server-rendered page (e.g. Overview) current, and shows that it is. */
export function LiveRefresh() {
  const { connected } = useLiveReports();
  return <LiveIndicator connected={connected} />;
}
