// Copies MapLibre's web worker into public/, so the map can load it at /maplibre/.
//
// maplibre-gl 6 looks for its worker next to its own file, which no longer holds once Next.js
// bundles the code. Serving the installed package's files keeps the worker and the map on the
// same version. Runs automatically before `npm run dev` and `npm run build`.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const dist = dirname(require.resolve("maplibre-gl/package.json")) + "/dist";
const target = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "maplibre");

mkdirSync(target, { recursive: true });
// The worker imports the shared file from its own folder, so both are needed.
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(join(dist, file), join(target, file));
}
console.log(`Copied the MapLibre worker to ${target}`);
