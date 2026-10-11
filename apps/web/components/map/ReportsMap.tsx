"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import {
  AttributionControl,
  Map as MapLibreMap,
  NavigationControl,
  Popup,
  setWorkerUrl,
  type GeoJSONSource,
} from "maplibre-gl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BANABA_BOUNDARY, BANABA_BOUNDS, isInsideBanaba } from "@/lib/banabaBoundary";

// Served from public/maplibre by scripts/copy-maplibre-worker.mjs.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

/**
 * OpenFreeMap: free vector map tiles, no API key, card, or usage limits. "Liberty" looks close
 * to Google Maps (colored roads, parks, water, landmarks). The plainer gray alternative is
 * ".../styles/positron".
 */
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const BOUNDARY_ATTRIBUTION =
  'Barangay boundary: <a href="https://psa.gov.ph/classification/psgc" target="_blank" rel="noreferrer">PSA</a> 2023 via <a href="https://github.com/faeldon/philippines-json-maps" target="_blank" rel="noreferrer">philippines-json-maps</a>';
/** Matches --color-brand in globals.css (the map paints with raw values). */
const OUTLINE_COLOR = "#0038a8";

export interface MapPoint {
  id: string;
  latitude: number;
  longitude: number;
  color: string;
  title: string;
  lines: string[];
  href?: string;
}

function toFeatures(points: MapPoint[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: points.map((point) => ({
      type: "Feature",
      id: point.id,
      geometry: { type: "Point", coordinates: [point.longitude, point.latitude] },
      properties: { id: point.id, color: point.color },
    })),
  };
}

const BOUNDARY_FEATURE: GeoJSON.Feature<GeoJSON.Polygon> = {
  type: "Feature",
  geometry: { type: "Polygon", coordinates: [BANABA_BOUNDARY] },
  properties: {},
};

/**
 * - `focus="banaba"` (the Map page): opens framed on Barangay Banaba with its outline, so reports
 *   sent from far away don't drag the view out of the barangay.
 * - `focus="points"` (a report's page): centers on the report, with the outline for context.
 */
export default function ReportsMap({
  points,
  height,
  focus = "points",
}: {
  points: MapPoint[];
  height: string;
  focus?: "banaba" | "points";
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const pointsRef = useRef(points);
  const [ready, setReady] = useState(false);
  // Old computers or browsers without WebGL can't draw a vector map.
  const [failed, setFailed] = useState(() => !supportsWebGL());

  useEffect(() => {
    pointsRef.current = points;
  });

  // Create the map once.
  useEffect(() => {
    if (failed || !containerRef.current) return;
    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container: containerRef.current,
        style: MAP_STYLE,
        bounds: BANABA_BOUNDS,
        fitBoundsOptions: { padding: 48 },
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
      });
    } catch (error) {
      // WebGL is present but unusable (e.g. a blocked or crashed graphics driver).
      console.error("Map could not start", error);
      queueMicrotask(() => setFailed(true));
      return;
    }
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(new AttributionControl({ compact: true, customAttribution: BOUNDARY_ATTRIBUTION }));

    map.on("load", () => {
      map.addSource("banaba", { type: "geojson", data: BOUNDARY_FEATURE });
      map.addLayer({
        id: "banaba-fill",
        type: "fill",
        source: "banaba",
        paint: { "fill-color": OUTLINE_COLOR, "fill-opacity": 0.06 },
      });
      map.addLayer({
        id: "banaba-outline",
        type: "line",
        source: "banaba",
        paint: { "line-color": OUTLINE_COLOR, "line-width": 3 },
      });

      map.addSource("reports", { type: "geojson", data: toFeatures(pointsRef.current) });
      map.addLayer({
        id: "reports",
        type: "circle",
        source: "reports",
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": 9,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 3,
        },
      });

      map.on("mouseenter", "reports", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "reports", () => (map.getCanvas().style.cursor = ""));
      map.on("click", "reports", (event) => {
        const id = event.features?.[0]?.properties?.id;
        const point = pointsRef.current.find((p) => p.id === id);
        if (!point) return;
        new Popup({ offset: 14, maxWidth: "260px" })
          .setLngLat([point.longitude, point.latitude])
          .setDOMContent(popupContent(point, (href) => router.push(href)))
          .addTo(map);
      });

      setReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [router, failed]);

  // Keep the pins in step with live updates.
  useEffect(() => {
    const source = mapRef.current?.getSource("reports") as GeoJSONSource | undefined;
    source?.setData(toFeatures(points));
  }, [points, ready]);

  // A report's own map centers on that report.
  const firstId = points[0]?.id;
  useEffect(() => {
    const first = pointsRef.current[0];
    if (ready && focus === "points" && first) {
      mapRef.current?.jumpTo({ center: [first.longitude, first.latitude], zoom: 16.5 });
    }
  }, [ready, focus, firstId]);

  const showBanaba = () => mapRef.current?.fitBounds(BANABA_BOUNDS, { padding: 48 });
  const showAll = () => {
    const map = mapRef.current;
    const current = pointsRef.current;
    if (!map || current.length === 0) return;
    const lngs = current.map((p) => p.longitude).concat(BANABA_BOUNDS[0][0], BANABA_BOUNDS[1][0]);
    const lats = current.map((p) => p.latitude).concat(BANABA_BOUNDS[0][1], BANABA_BOUNDS[1][1]);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 48, maxZoom: 17 },
    );
  };

  const outside =
    focus === "banaba" ? points.filter((p) => !isInsideBanaba([p.longitude, p.latitude])).length : 0;

  if (failed) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-line bg-surface p-6 text-center text-[15px] text-muted"
        style={{ height }}
      >
        This computer can&apos;t show the map (its browser doesn&apos;t support WebGL). Every report is
        still listed under Reports.
      </div>
    );
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-line" style={{ height }}>
        <div
          ref={containerRef}
          className="h-full w-full"
          role="region"
          aria-label="Map of Barangay Banaba with report locations"
        />
        {focus === "banaba" && (
          <div className="absolute left-3 top-3 z-10 flex flex-col gap-2">
            <button
              type="button"
              onClick={showBanaba}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-bold text-ink shadow-sm hover:border-brand hover:text-brand"
            >
              Barangay Banaba
            </button>
            <button
              type="button"
              onClick={showAll}
              disabled={points.length === 0}
              title={points.length === 0 ? "No reports to show" : undefined}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-bold text-ink shadow-sm hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
            >
              Show all reports
            </button>
          </div>
        )}
      </div>

      {outside > 0 && (
        <p className="mt-3 text-[15px] text-muted">
          {outside === 1 ? "1 report is" : `${outside} reports are`} outside Barangay Banaba.{" "}
          <button type="button" onClick={showAll} className="font-bold text-brand underline">
            Show all reports
          </button>
        </p>
      )}
    </div>
  );
}

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Popup body built with DOM nodes (no HTML strings), with an in-app link to the report. */
function popupContent(point: MapPoint, navigate: (href: string) => void): HTMLElement {
  const root = document.createElement("div");
  root.className = "space-y-0.5";
  const title = document.createElement("p");
  title.className = "text-[15px] font-bold text-ink";
  title.textContent = point.title;
  root.append(title);
  for (const line of point.lines) {
    const p = document.createElement("p");
    p.className = "text-sm text-muted";
    p.textContent = line;
    root.append(p);
  }
  if (point.href) {
    const link = document.createElement("a");
    link.href = point.href;
    link.className = "mt-1 inline-block text-sm font-bold text-brand underline";
    link.textContent = "Open report";
    const href = point.href;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      navigate(href);
    });
    root.append(link);
  }
  return root;
}
