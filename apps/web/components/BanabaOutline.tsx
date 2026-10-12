import { BANABA_BOUNDARY, BANABA_BOUNDS } from "@banabaconnect/shared";

const WIDTH = 1000;

/**
 * Barangay Banaba's official boundary (PSA 2023) as an SVG outline, true to shape: longitudes
 * are shortened by cos(latitude) so the barangay isn't stretched sideways.
 */
function outlinePath() {
  const [[minLng, minLat], [maxLng, maxLat]] = BANABA_BOUNDS;
  const shrink = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const scale = WIDTH / ((maxLng - minLng) * shrink);
  const height = (maxLat - minLat) * scale;
  const d =
    BANABA_BOUNDARY.map(([lng, lat], index) => {
      const x = (lng - minLng) * shrink * scale;
      const y = (maxLat - lat) * scale;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ") + " Z";
  return { d, height: Math.round(height) };
}

const OUTLINE = outlinePath();

export function BanabaOutline({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox={`-20 -20 ${WIDTH + 40} ${OUTLINE.height + 40}`}
      className={className}
      role="img"
      aria-label="Outline of Barangay Banaba"
    >
      {/* White land with a blue border, like the barangay on the dashboard map. */}
      <path
        d={OUTLINE.d}
        className="fill-surface stroke-brand drop-shadow-md"
        strokeWidth={3}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
