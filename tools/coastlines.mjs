/* Regenerate the LAND array in src/data.js from Natural Earth 1:110m land.
   Fetches the source GeoJSON, keeps exterior rings above a size threshold,
   simplifies each with Douglas–Peucker, and prints a ready-to-paste array.

   Usage:  node tools/coastlines.mjs > /tmp/land.js
   Then replace the LAND=[…] block in src/data.js with the printed body.

   Antarctica is handled separately in data.js (closed off round the pole), so
   rings reaching below −78° latitude are skipped here. */

const SOURCE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson";
const AREA_MIN = 8;   // deg² — drops micro-islands, keeps Iceland/Ireland-sized land
const TOL = 1.0;      // Douglas–Peucker tolerance in degrees

function perpendicularDistance(point, lineStart, lineEnd) {
  const dx = lineEnd[0]-lineStart[0], dy = lineEnd[1]-lineStart[1];
  const length = Math.hypot(dx, dy) || 1e-9;
  return Math.abs((point[0]-lineStart[0])*dy - (point[1]-lineStart[1])*dx) / length;
}

function douglasPeucker(points, tolerance) {
  if (points.length < 3) return points.slice();
  let maxDistance = 0, splitIndex = 0;
  for (let i = 1; i < points.length-1; i++) {
    const d = perpendicularDistance(points[i], points[0], points[points.length-1]);
    if (d > maxDistance) { maxDistance = d; splitIndex = i; }
  }
  if (maxDistance > tolerance) {
    const left = douglasPeucker(points.slice(0, splitIndex+1), tolerance);
    const right = douglasPeucker(points.slice(splitIndex), tolerance);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[points.length-1]];
}

// Shoelace area in deg² — only used to rank and threshold ring size.
function ringArea(ring) {
  let sum = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1,y1] = ring[i], [x2,y2] = ring[(i+1)%n];
    sum += x1*y2 - x2*y1;
  }
  return Math.abs(sum)/2;
}

// Douglas–Peucker needs an open polyline; a GeoJSON ring closes on itself, so
// split it at the vertex farthest from the start and simplify the two arcs.
function simplifyRing(ring) {
  const open = ring.slice(0, -1);
  let farIndex = 0, farDistance = -1;
  for (let i = 1; i < open.length; i++) {
    const d = Math.hypot(open[i][0]-open[0][0], open[i][1]-open[0][1]);
    if (d > farDistance) { farDistance = d; farIndex = i; }
  }
  const arcA = douglasPeucker(open.slice(0, farIndex+1), TOL);
  const arcB = douglasPeucker(open.slice(farIndex).concat([open[0]]), TOL);
  return arcA.slice(0, -1).concat(arcB.slice(0, -1))
    .map(([lon,lat]) => [Math.round(lon*10)/10, Math.round(lat*10)/10]);
}

const geojson = await fetch(SOURCE).then(response => response.json());

const rings = [];
for (const feature of geojson.features) {
  const geometry = feature.geometry;
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  for (const polygon of polygons) rings.push(polygon[0]); // exterior ring only
}

const kept = [];
for (const ring of rings) {
  const minLatitude = Math.min(...ring.map(point => point[1]));
  if (minLatitude < -78) continue;       // Antarctica, handled separately in data.js
  if (ringArea(ring) < AREA_MIN) continue;
  const simplified = simplifyRing(ring);
  if (simplified.length >= 4) kept.push(simplified);
}
kept.sort((a, b) => ringArea(b) - ringArea(a));

const totalPoints = kept.reduce((sum, ring) => sum + ring.length, 0);
process.stderr.write(`${kept.length} rings, ${totalPoints} points\n`);

const body = kept.map(ring =>
  "[" + ring.map(([lon,lat]) => `[${lon},${lat}]`).join(",") + "]"
).join(",\n");
process.stdout.write("export const LAND=[\n" + body + "\n];\n");
