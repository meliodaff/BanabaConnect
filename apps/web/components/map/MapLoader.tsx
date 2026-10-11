"use client";

import dynamic from "next/dynamic";
import type { MapPoint } from "./ReportsMap";

// Leaflet touches `window`, so the map only renders in the browser.
const ReportsMap = dynamic(() => import("./ReportsMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-60 items-center justify-center rounded-lg border border-line bg-surface text-muted">
      Loading map…
    </div>
  ),
});

export function MapLoader({
  points,
  height,
  focus,
}: {
  points: MapPoint[];
  height: string;
  focus?: "banaba" | "points";
}) {
  return <ReportsMap points={points} height={height} focus={focus} />;
}

export type { MapPoint };
