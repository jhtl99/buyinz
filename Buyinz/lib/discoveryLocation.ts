export interface GeoPoint {
  latitude: number;
  longitude: number;
}

interface NeighborhoodPolygon {
  name: string;
  points: GeoPoint[];
  center: GeoPoint;
}

export const DEFAULT_PITTSBURGH_COORDS: GeoPoint = {
  latitude: 40.4406,
  longitude: -79.9959,
};

const PITTSBURGH_NEIGHBORHOODS: NeighborhoodPolygon[] = [
  {
    name: 'Oakland',
    points: [
      { latitude: 40.4526, longitude: -79.9748 },
      { latitude: 40.4488, longitude: -79.9567 },
      { latitude: 40.4341, longitude: -79.9601 },
      { latitude: 40.435, longitude: -79.9806 },
    ],
    center: { latitude: 40.4407, longitude: -79.9594 },
  },
  {
    name: 'Shadyside',
    points: [
      { latitude: 40.4622, longitude: -79.9457 },
      { latitude: 40.4572, longitude: -79.9248 },
      { latitude: 40.4462, longitude: -79.9284 },
      { latitude: 40.4482, longitude: -79.9468 },
    ],
    center: { latitude: 40.4518, longitude: -79.9358 },
  },
  {
    name: 'Squirrel Hill',
    points: [
      { latitude: 40.4468, longitude: -79.9365 },
      { latitude: 40.4398, longitude: -79.9106 },
      { latitude: 40.4248, longitude: -79.9153 },
      { latitude: 40.4289, longitude: -79.9402 },
    ],
    center: { latitude: 40.4342, longitude: -79.9222 },
  },
  {
    name: 'Lawrenceville',
    points: [
      { latitude: 40.4852, longitude: -79.9723 },
      { latitude: 40.4802, longitude: -79.9395 },
      { latitude: 40.466, longitude: -79.9445 },
      { latitude: 40.4687, longitude: -79.9766 },
    ],
    center: { latitude: 40.4741, longitude: -79.9563 },
  },
  {
    name: 'Strip District',
    points: [
      { latitude: 40.4572, longitude: -80.0121 },
      { latitude: 40.4555, longitude: -79.9767 },
      { latitude: 40.4451, longitude: -79.9798 },
      { latitude: 40.4467, longitude: -80.0116 },
    ],
    center: { latitude: 40.4508, longitude: -79.9913 },
  },
  {
    name: 'North Side',
    points: [
      { latitude: 40.4648, longitude: -80.0264 },
      { latitude: 40.4662, longitude: -79.9911 },
      { latitude: 40.4462, longitude: -79.9939 },
      { latitude: 40.4455, longitude: -80.0258 },
    ],
    center: { latitude: 40.4542, longitude: -80.0078 },
  },
  {
    name: 'Mount Washington',
    points: [
      { latitude: 40.4442, longitude: -80.0222 },
      { latitude: 40.4382, longitude: -79.9968 },
      { latitude: 40.4216, longitude: -80.0018 },
      { latitude: 40.4236, longitude: -80.0273 },
    ],
    center: { latitude: 40.4326, longitude: -80.0109 },
  },
  {
    name: 'Point Breeze',
    points: [
      { latitude: 40.4586, longitude: -79.9203 },
      { latitude: 40.4538, longitude: -79.8961 },
      { latitude: 40.4418, longitude: -79.8998 },
      { latitude: 40.4446, longitude: -79.9232 },
    ],
    center: { latitude: 40.4501, longitude: -79.9108 },
  },
];

const LOCATION_TO_COORDINATE: { match: string; point: GeoPoint }[] = [
  { match: 'oakland', point: { latitude: 40.4407, longitude: -79.9594 } },
  { match: 'shadyside', point: { latitude: 40.4518, longitude: -79.9358 } },
  { match: 'squirrel hill', point: { latitude: 40.4342, longitude: -79.9222 } },
  { match: 'lawrenceville', point: { latitude: 40.4741, longitude: -79.9563 } },
  { match: 'strip district', point: { latitude: 40.4508, longitude: -79.9913 } },
  { match: 'north side', point: { latitude: 40.4542, longitude: -80.0078 } },
  { match: 'mount washington', point: { latitude: 40.4326, longitude: -80.0109 } },
  { match: 'point breeze', point: { latitude: 40.4501, longitude: -79.9108 } },
];

export function milesBetween(a: GeoPoint, b: GeoPoint): number {
  const earthRadiusMiles = 3958.8;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(h));
}

export function isPointInPolygon(point: GeoPoint, polygon: GeoPoint[]): boolean {
  let inside = false;
  const x = point.longitude;
  const y = point.latitude;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;

    const intersects =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }

  return inside;
}

export function resolveNeighborhood(point: GeoPoint): string {
  const containing = PITTSBURGH_NEIGHBORHOODS.find((hood) =>
    isPointInPolygon(point, hood.points),
  );
  if (containing) return containing.name;

  let nearest = PITTSBURGH_NEIGHBORHOODS[0];
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const hood of PITTSBURGH_NEIGHBORHOODS) {
    const d = milesBetween(point, hood.center);
    if (d < nearestDistance) {
      nearest = hood;
      nearestDistance = d;
    }
  }

  return nearest.name;
}

export function coordinateFromLocation(location: string): GeoPoint | null {
  const normalized = location.toLowerCase();
  const mapping = LOCATION_TO_COORDINATE.find((entry) => normalized.includes(entry.match));
  return mapping?.point ?? null;
}
