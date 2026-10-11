"use client";

import { LiveIndicator, useLiveReports } from "@/components/LiveUpdates";
import { MapLoader, type MapPoint } from "./MapLoader";

/** The full map page: refreshes its pins when reports arrive or change. */
export function LiveMap({ points }: { points: MapPoint[] }) {
  const { connected } = useLiveReports();
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <LiveIndicator connected={connected} />
      </div>
      <MapLoader points={points} height="calc(100vh - 250px)" focus="banaba" />
    </div>
  );
}
