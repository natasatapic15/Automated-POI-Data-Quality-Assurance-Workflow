const elements = ($input.first().json.elements) || [];

const points = [];
for (const el of elements) {
  let lat = el.lat;
  let lon = el.lon;
  if ((lat === undefined || lon === undefined) && el.center) {
    lat = el.center.lat;
    lon = el.center.lon;
  }
  if (typeof lat !== 'number' || typeof lon !== 'number') continue;
  const name = (el.tags && el.tags.name) ? el.tags.name : 'Unknown';
  points.push({ id: el.id, lat, lon, name });
}

const n = points.length;

const R = 6371.0088;
function toRad(d) { return (d * Math.PI) / 180; }
function haversineKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const epsKm = 0.1;
const minSamples = 5;

const epsDegLat = epsKm / 110.574;
const grid = new Map();
function cellKey(ci, cj) { return ci + '|' + cj; }
function lonCellSize(lat) {
  const kmPerDegLon = 111.320 * Math.cos(toRad(lat));
  return kmPerDegLon > 0 ? epsKm / kmPerDegLon : epsDegLat;
}
for (let i = 0; i < n; i++) {
  const p = points[i];
  const ci = Math.floor(p.lat / epsDegLat);
  const cj = Math.floor(p.lon / lonCellSize(p.lat));
  const k = cellKey(ci, cj);
  if (!grid.has(k)) grid.set(k, []);
  grid.get(k).push(i);
}

function regionQuery(idx) {
  const p = points[idx];
  const ci = Math.floor(p.lat / epsDegLat);
  const lonSize = lonCellSize(p.lat);
  const cj = Math.floor(p.lon / lonSize);
  const neighbors = [];
  for (let di = -1; di <= 1; di++) {
    for (let dj = -1; dj <= 1; dj++) {
      const bucket = grid.get(cellKey(ci + di, cj + dj));
      if (!bucket) continue;
      for (const j of bucket) {
        if (haversineKm(p, points[j]) <= epsKm) neighbors.push(j);
      }
    }
  }
  return neighbors;
}

const labels = new Array(n).fill(undefined);
let clusterId = -1;
for (let i = 0; i < n; i++) {
  if (labels[i] !== undefined) continue;
  const neighbors = regionQuery(i);
  if (neighbors.length < minSamples) {
    labels[i] = -1;
    continue;
  }
  clusterId++;
  labels[i] = clusterId;
  const seeds = neighbors.filter((x) => x !== i);
  let qi = 0;
  while (qi < seeds.length) {
    const q = seeds[qi++];
    if (labels[q] === -1) labels[q] = clusterId;
    if (labels[q] !== undefined) continue;
    labels[q] = clusterId;
    const qNeighbors = regionQuery(q);
    if (qNeighbors.length >= minSamples) {
      for (const nb of qNeighbors) {
        if (labels[nb] === undefined || labels[nb] === -1) seeds.push(nb);
      }
    }
  }
}

const anomalies = [];
for (let i = 0; i < n; i++) {
  if (labels[i] === -1) {
    anomalies.push({ id: points[i].id, lat: points[i].lat, lon: points[i].lon, name: points[i].name });
  }
}

return [{
  json: {
    total_pois: n,
    anomalies_detected: anomalies.length > 0,
    anomaly_count: anomalies.length,
    anomalies,
    run_date: new Date().toISOString(),
  },
}];
