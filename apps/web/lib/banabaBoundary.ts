// Barangay Banaba, San Mateo, Rizal (PSGC 0405811012): official boundary from the PSA
// administrative boundaries (PSGC as of 31 Dec 2023), simplified to 10% by
// github.com/faeldon/philippines-json-maps (MIT license). About 1.44 km².
// Shown as the outline on the dashboard map, and used to tell which reports are outside Banaba.

/** [longitude, latitude] pairs; the first and last points are the same. */
export const BANABA_BOUNDARY: [number, number][] = [[121.123914,14.674856],[121.123541,14.675495],[121.120064,14.676885],[121.118828,14.678392],[121.115577,14.677118],[121.114465,14.678459],[121.112828,14.679208],[121.114015,14.680575],[121.110543,14.681152],[121.108373,14.677084],[121.106766,14.675521],[121.110578,14.672976],[121.109805,14.670932],[121.110694,14.669853],[121.111889,14.671163],[121.115348,14.672408],[121.11466,14.673712],[121.116151,14.673949],[121.116872,14.672266],[121.119388,14.67146],[121.120533,14.670489],[121.120032,14.669176],[121.121823,14.666385],[121.125013,14.666852],[121.124704,14.668568],[121.125743,14.670101],[121.125712,14.672416],[121.124229,14.672822],[121.123914,14.674856]];

/** South-west and north-east corners, for framing the map on the barangay. */
export const BANABA_BOUNDS: [[number, number], [number, number]] = [[121.106766,14.666385],[121.125743,14.681152]];

/** Middle of the barangay [longitude, latitude]. */
export const BANABA_CENTER: [number, number] = [121.116792,14.674074];

/** True if [longitude, latitude] is inside Barangay Banaba (ray casting). */
export function isInsideBanaba([lng, lat]: [number, number]): boolean {
  let inside = false;
  for (let i = 0, j = BANABA_BOUNDARY.length - 1; i < BANABA_BOUNDARY.length; j = i++) {
    const [xi, yi] = BANABA_BOUNDARY[i];
    const [xj, yj] = BANABA_BOUNDARY[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
