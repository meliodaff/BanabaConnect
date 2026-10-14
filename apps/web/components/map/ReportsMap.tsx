"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import {
  AttributionControl,
  LngLatBounds,
  Map as MapLibreMap,
  NavigationControl,
  Popup,
  setWorkerUrl,
  type GeoJSONSource,
} from "maplibre-gl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BANABA_BOUNDARY, BANABA_BOUNDS, isInsideBanaba } from "@banabaconnect/shared";
import { useDictionary } from "@/components/I18nProvider";
import type { Dictionary } from "@/lib/i18n";
import { PRIORITY_BAND_COLORS, type PriorityBand } from "@/lib/labels";

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
/** Match --color-brand, --color-ink and --color-surface in globals.css (the map paints with raw values). */
const OUTLINE_COLOR = "#0038a8";
const INK_COLOR = "#141a26";
const SURFACE_COLOR = "#ffffff";
/** Fonts the OpenFreeMap style serves; any other name draws no text. */
const LABEL_FONT = ["Noto Sans Bold"];
/** Pins group up to this zoom; one level closer, every pin shows on its own. */
const GROUP_MAX_ZOOM = 19;
/** How close clicking a group zooms at most: one past grouping, so the group always splits. */
const MAX_CLICK_ZOOM = GROUP_MAX_ZOOM + 1;
/** Reports this close together (in meters) count as the same spot and get spread out. */
const SAME_SPOT_METERS = 5;
/**
 * How far apart spread pins sit, in meters: enough to show as separate pins at street-level zoom.
 * Each spread pin has a line back to the exact spot, so the map still shows where they came from.
 */
const SPREAD_METERS = 6;
const METERS_PER_DEGREE = 111_320;
/** Spread lines and exact-spot dots only show from this zoom, when pins have split apart. */
const SPREAD_LINES_MIN_ZOOM = 17;

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Group circle sizes by report count (under 10, 10–49, 50 and up), plus their 6 px ring. */
const GROUP_RADIUS = { small: 15, medium: 19, large: 24 };
const GROUP_RING = 6;
/** A pin's outer edge: its dark outline (see the report-outlines layer). */
const PIN_EDGE = 13.5;
/** Gap between a circle's edge and its card, so the card never covers what you click. */
const CARD_GAP = 6;

function groupEdge(count: number) {
  const radius =
    count >= 50 ? GROUP_RADIUS.large : count >= 10 ? GROUP_RADIUS.medium : GROUP_RADIUS.small;
  return radius + GROUP_RING;
}

/** A hover card with nothing to click; clicks pass through it to the map (see globals.css). */
const PASSIVE_CARD = "map-card-passive";

/** How long a hover card stays after the mouse leaves, so staff can move onto it. */
const HOVER_LINGER_MS = 250;
/** The priority level of each rank in a group's hover card; rank 3 is the most urgent. */
const RANK_BANDS: PriorityBand[] = ["low", "medium", "high", "critical"];

/** Changes only when what's drawn changes, so live refreshes don't reset the groups mid-click. */
function pointsKey(points: MapPoint[]) {
  return points.map((p) => `${p.id}:${p.latitude}:${p.longitude}:${p.color}:${p.rank ?? 0}`).join("|");
}

export interface MapPoint {
  id: string;
  latitude: number;
  longitude: number;
  color: string;
  /** How urgent, for grouped pins: 3 critical, 2 high, 1 medium, 0 low. */
  rank?: number;
  /** Flagged "Outside Banaba" by the database (beyond GPS error). */
  outside?: boolean;
  title: string;
  lines: string[];
  href?: string;
}

type LngLat = [number, number];

function metersBetween(a: MapPoint, b: MapPoint) {
  const dLat = (a.latitude - b.latitude) * METERS_PER_DEGREE;
  const dLng =
    (a.longitude - b.longitude) * METERS_PER_DEGREE * Math.cos((a.latitude * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

/**
 * Where each pin is drawn. Reports at practically the same spot would stack into what looks like
 * one pin, so each such stack is spread in a small ring around its spot (wider for bigger stacks,
 * so neighbors keep the same gap). Order is by id, so pins don't shuffle on live updates.
 */
function spreadOut(points: MapPoint[]) {
  const drawnAt = new Map<string, LngLat>();
  const spots: { center: LngLat; members: LngLat[] }[] = [];
  const sorted = [...points].sort((a, b) => a.id.localeCompare(b.id));
  const placed = new Set<string>();
  for (const point of sorted) {
    if (placed.has(point.id)) continue;
    const stack = sorted.filter(
      (other) => !placed.has(other.id) && metersBetween(point, other) <= SAME_SPOT_METERS,
    );
    stack.forEach((member) => placed.add(member.id));
    if (stack.length === 1) {
      drawnAt.set(point.id, [point.longitude, point.latitude]);
      continue;
    }
    const lat = stack.reduce((sum, p) => sum + p.latitude, 0) / stack.length;
    const lng = stack.reduce((sum, p) => sum + p.longitude, 0) / stack.length;
    const radius = SPREAD_METERS / Math.sin(Math.PI / stack.length);
    const members = stack.map((member, index): LngLat => {
      const angle = -Math.PI / 2 + (2 * Math.PI * index) / stack.length;
      const at: LngLat = [
        lng + (radius * Math.cos(angle)) / (METERS_PER_DEGREE * Math.cos((lat * Math.PI) / 180)),
        lat + (radius * Math.sin(angle)) / METERS_PER_DEGREE,
      ];
      drawnAt.set(member.id, at);
      return at;
    });
    spots.push({ center: [lng, lat], members });
  }
  return { drawnAt, spots };
}

function toFeatures(points: MapPoint[]) {
  const { drawnAt, spots } = spreadOut(points);
  const pins: GeoJSON.FeatureCollection<GeoJSON.Point> = {
    type: "FeatureCollection",
    features: points.map((point) => ({
      type: "Feature",
      id: point.id,
      geometry: { type: "Point", coordinates: drawnAt.get(point.id) ?? [point.longitude, point.latitude] },
      properties: { id: point.id, color: point.color, rank: point.rank ?? 0 },
    })),
  };
  // A line from each spread pin back to its exact spot, and a small dot on the spot itself.
  const spreadLines: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: spots.flatMap((spot) => [
      ...spot.members.map(
        (at): GeoJSON.Feature => ({
          type: "Feature",
          geometry: { type: "LineString", coordinates: [spot.center, at] },
          properties: {},
        }),
      ),
      { type: "Feature", geometry: { type: "Point", coordinates: spot.center }, properties: {} },
    ]),
  };
  return { pins, spreadLines };
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
  const t = useDictionary();
  // The map's cards are built in handlers set up once, so they read the words through a ref.
  const wordsRef = useRef(t);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const pointsRef = useRef(points);
  const [ready, setReady] = useState(false);
  // Old computers or browsers without WebGL can't draw a vector map.
  const [failed, setFailed] = useState(() => !supportsWebGL());

  useEffect(() => {
    pointsRef.current = points;
    wordsRef.current = t;
  });

  // Create the map once.
  useEffect(() => {
    if (failed || !containerRef.current) return;
    let map: MapLibreMap;
    let hoverTimer: ReturnType<typeof setTimeout> | undefined;
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

      const initial = toFeatures(pointsRef.current);
      // Lines from spread-out pins back to their exact spot, drawn under the pins.
      map.addSource("spread-lines", { type: "geojson", data: initial.spreadLines });
      map.addLayer({
        id: "spread-lines",
        type: "line",
        source: "spread-lines",
        minzoom: SPREAD_LINES_MIN_ZOOM,
        filter: ["==", ["geometry-type"], "LineString"],
        paint: { "line-color": INK_COLOR, "line-opacity": 0.6, "line-width": 1.5 },
      });
      map.addLayer({
        id: "spread-spots",
        type: "circle",
        source: "spread-lines",
        minzoom: SPREAD_LINES_MIN_ZOOM,
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-color": INK_COLOR,
          "circle-radius": 4,
          "circle-stroke-color": SURFACE_COLOR,
          "circle-stroke-width": 1.5,
        },
      });

      // Zoomed out, pins close together merge into one circle with the number of reports in it.
      // Its ring takes the color of the most urgent report inside, so a Critical report is
      // never hidden in a group. Zooming in splits groups back into single pins.
      map.addSource("reports", {
        type: "geojson",
        data: initial.pins,
        cluster: true,
        clusterRadius: 40,
        // Grouping needs the source to go one zoom past the last grouped zoom.
        maxzoom: GROUP_MAX_ZOOM + 1,
        clusterMaxZoom: GROUP_MAX_ZOOM,
        clusterProperties: { maxRank: ["max", ["get", "rank"]] },
      });
      map.addLayer({
        id: "report-groups",
        type: "circle",
        source: "reports",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": SURFACE_COLOR,
          "circle-radius": [
            "step",
            ["get", "point_count"],
            GROUP_RADIUS.small,
            10,
            GROUP_RADIUS.medium,
            50,
            GROUP_RADIUS.large,
          ],
          "circle-stroke-width": 6,
          "circle-stroke-color": [
            "match",
            ["get", "maxRank"],
            3,
            PRIORITY_BAND_COLORS.critical,
            2,
            PRIORITY_BAND_COLORS.high,
            1,
            PRIORITY_BAND_COLORS.medium,
            PRIORITY_BAND_COLORS.low,
          ],
        },
      });
      map.addLayer({
        id: "report-group-counts",
        type: "symbol",
        source: "reports",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": LABEL_FONT,
          "text-size": 14,
          "text-allow-overlap": true,
        },
        paint: { "text-color": INK_COLOR },
      });
      // A thin dark ring under each pin's white ring, so light colors (yellow, gray) stand out.
      map.addLayer({
        id: "report-outlines",
        type: "circle",
        source: "reports",
        filter: ["!", ["has", "point_count"]],
        paint: { "circle-color": INK_COLOR, "circle-opacity": 0.55, "circle-radius": 13.5 },
      });
      map.addLayer({
        id: "reports",
        type: "circle",
        source: "reports",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": 9,
          "circle-stroke-color": SURFACE_COLOR,
          "circle-stroke-width": 3,
        },
      });

      for (const layer of ["reports", "report-groups"]) {
        map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
      }
      // Clicking a group glides in on its reports: framed around all of them (the group's center
      // can be empty ground between them), and at least as close as the zoom where this group
      // splits apart (the map only regroups at whole zoom levels, so "just fits" can stay merged).
      // Reports at the same spot are already spread out (spreadOut), so every group can split.
      map.on("click", "report-groups", async (event) => {
        const properties = event.features?.[0]?.properties;
        const groupId = properties?.cluster_id;
        if (groupId === undefined) return;
        const source = map.getSource("reports") as GeoJSONSource;
        let leaves: GeoJSON.Feature[];
        let splitZoom: number;
        try {
          [leaves, splitZoom] = await Promise.all([
            source.getClusterLeaves(groupId, properties?.point_count ?? 1000, 0),
            source.getClusterExpansionZoom(groupId),
          ]);
        } catch {
          // The pins were refreshed after the click, so this group no longer exists.
          return;
        }
        const bounds = new LngLatBounds();
        for (const leaf of leaves) {
          if (leaf.geometry.type === "Point") {
            bounds.extend(leaf.geometry.coordinates as [number, number]);
          }
        }
        if (bounds.isEmpty()) return;
        const framed = map.cameraForBounds(bounds, { padding: 80, maxZoom: MAX_CLICK_ZOOM });
        const zoom = Math.min(MAX_CLICK_ZOOM, Math.max(framed?.zoom ?? splitZoom, splitZoom));
        map.easeTo({
          center: framed?.center ?? bounds.getCenter(),
          zoom,
          duration: prefersReducedMotion() ? 0 : 900,
          easing: easeInOutCubic,
          essential: true,
        });
      });
      // Hovering a pin or group shows its details right away. The card lingers briefly after the
      // mouse leaves, and stays while the mouse is on it, so "Open report" can still be clicked.
      const hoverPopup = new Popup({
        closeButton: false,
        closeOnClick: false,
        maxWidth: "260px",
      });
      let hovered: string | null = null;
      const hideHover = () => {
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => {
          hoverPopup.remove();
          hovered = null;
        }, HOVER_LINGER_MS);
      };
      // `edge` is how far the circle reaches from its center: the card sits just past it, so it
      // never covers the circle and swallows the click (big groups are bigger when zoomed out).
      const showHover = (key: string, at: [number, number], edge: number, content: HTMLElement) => {
        clearTimeout(hoverTimer);
        if (hovered === key) return;
        hovered = key;
        content.addEventListener("mouseenter", () => clearTimeout(hoverTimer));
        content.addEventListener("mouseleave", hideHover);
        hoverPopup.setOffset(edge + CARD_GAP).setLngLat(at).setDOMContent(content).addTo(map);
      };
      const closeHover = () => {
        clearTimeout(hoverTimer);
        hoverPopup.remove();
        hovered = null;
      };

      // Cards attach where the pin is drawn, which for a spread-out pin isn't its exact spot.
      const pinAt = (feature: GeoJSON.Feature | undefined): LngLat | null =>
        feature?.geometry.type === "Point" ? (feature.geometry.coordinates as LngLat) : null;

      map.on("mousemove", "reports", (event) => {
        const feature = event.features?.[0];
        const point = pointsRef.current.find((p) => p.id === feature?.properties?.id);
        const at = pinAt(feature);
        if (!point || !at) return;
        hoverPopup.removeClassName(PASSIVE_CARD);
        showHover(
          `pin:${point.id}`,
          at,
          PIN_EDGE,
          popupContent(point, (href) => router.push(href), wordsRef.current),
        );
      });
      map.on("mousemove", "report-groups", (event) => {
        const feature = event.features?.[0];
        const properties = feature?.properties;
        if (feature?.geometry.type !== "Point" || properties?.cluster_id === undefined) return;
        const count = Number(properties.point_count);
        hoverPopup.addClassName(PASSIVE_CARD);
        showHover(
          `group:${properties.cluster_id}`,
          feature.geometry.coordinates as [number, number],
          groupEdge(count),
          groupContent(count, Number(properties.maxRank), wordsRef.current),
        );
      });
      map.on("mouseleave", "reports", hideHover);
      map.on("mouseleave", "report-groups", hideHover);
      // Panning, zooming or clicking replaces the hover card.
      map.on("movestart", closeHover);

      // Clicking a pin keeps its card open (and is how tablets, which can't hover, see it).
      map.on("click", "reports", (event) => {
        const feature = event.features?.[0];
        const point = pointsRef.current.find((p) => p.id === feature?.properties?.id);
        const at = pinAt(feature);
        if (!point || !at) return;
        closeHover();
        new Popup({ offset: PIN_EDGE + CARD_GAP, maxWidth: "260px" })
          .setLngLat(at)
          .setDOMContent(popupContent(point, (href) => router.push(href), wordsRef.current))
          .addTo(map);
      });

      setReady(true);
    });

    return () => {
      clearTimeout(hoverTimer);
      map.remove();
      mapRef.current = null;
    };
  }, [router, failed]);

  // Keep the pins in step with live updates. Only redraw when a pin actually changed: every
  // redraw rebuilds the groups, which would cancel a group the staff member just clicked.
  const key = pointsKey(points);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const { pins, spreadLines } = toFeatures(pointsRef.current);
    (map.getSource("reports") as GeoJSONSource | undefined)?.setData(pins);
    (map.getSource("spread-lines") as GeoJSONSource | undefined)?.setData(spreadLines);
  }, [key, ready]);

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

  // The database's flag when given (it allows for GPS error), so this matches the tags elsewhere.
  const outside =
    focus === "banaba"
      ? points.filter((p) => p.outside ?? !isInsideBanaba([p.longitude, p.latitude])).length
      : 0;

  if (failed) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-line bg-surface p-6 text-center text-[15px] text-muted"
        style={{ height }}
      >
        {t.map.noWebgl}
      </div>
    );
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-lg border border-line" style={{ height }}>
        <div
          ref={containerRef}
          className="h-full w-full"
          role="region"
          aria-label={t.map.regionLabel}
        />
        {focus === "banaba" && (
          <div className="absolute left-3 top-3 z-10 flex flex-col gap-2">
            <button
              type="button"
              onClick={showBanaba}
              className="rounded-md border border-line bg-surface px-3 py-2 text-sm font-bold text-ink shadow-sm hover:border-brand hover:text-brand"
            >
              Barangay Banaba
            </button>
            <button
              type="button"
              onClick={showAll}
              disabled={points.length === 0}
              title={points.length === 0 ? t.map.noReports : undefined}
              className="rounded-md border border-line bg-surface px-3 py-2 text-sm font-bold text-ink shadow-sm hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t.map.showAll}
            </button>
          </div>
        )}
      </div>

      {outside > 0 && (
        <p className="mt-3 text-[15px] text-muted">
          {t.map.outsideCount(outside)}{" "}
          <button type="button" onClick={showAll} className="font-bold text-brand underline">
            {t.map.showAll}
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

/** Hover card for a group of pins: how many, the most urgent, and what a click does. */
function groupContent(count: number, maxRank: number, t: Dictionary): HTMLElement {
  const root = document.createElement("div");
  root.className = "space-y-0.5";
  const title = document.createElement("p");
  title.className = "text-[15px] font-bold text-ink";
  title.textContent = t.map.groupCount(count);
  const urgent = document.createElement("p");
  urgent.className = "text-sm text-muted";
  urgent.textContent = t.map.mostUrgent(t.priority[RANK_BANDS[maxRank] ?? "low"]);
  const hint = document.createElement("p");
  hint.className = "text-sm font-bold text-brand";
  hint.textContent = t.map.zoomHint;
  root.append(title, urgent, hint);
  return root;
}

/** Popup body built with DOM nodes (no HTML strings), with an in-app link to the report. */
function popupContent(point: MapPoint, navigate: (href: string) => void, t: Dictionary): HTMLElement {
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
    link.textContent = t.map.openReport;
    const href = point.href;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      navigate(href);
    });
    root.append(link);
  }
  return root;
}
