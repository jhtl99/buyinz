export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/** Default map center when location permission is denied (CMU main campus, ~Forbes & Morewood). */
export const DEFAULT_CMU_COORDS: GeoPoint = {
  latitude: 40.44306,
  longitude: -79.9443,
};

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
