import {
  coordinateFromLocation,
  isPointInPolygon,
  milesBetween,
  normalizeLocationQuery,
  resolveNeighborhood,
  type GeoPoint,
} from '../lib/discoveryLocation';

describe('discoveryLocation.isPointInPolygon', () => {
  const square: GeoPoint[] = [
    { latitude: 40.0, longitude: -80.0 },
    { latitude: 40.0, longitude: -79.0 },
    { latitude: 41.0, longitude: -79.0 },
    { latitude: 41.0, longitude: -80.0 },
  ];

  test('returns true for a point inside the polygon', () => {
    const point: GeoPoint = { latitude: 40.5, longitude: -79.5 };

    expect(isPointInPolygon(point, square)).toBe(true);
  });

  test('returns false for a point outside the polygon', () => {
    const point: GeoPoint = { latitude: 41.5, longitude: -79.5 };

    expect(isPointInPolygon(point, square)).toBe(false);
  });
});

describe('discoveryLocation.resolveNeighborhood', () => {
  test('returns containing neighborhood when point is inside a known polygon', () => {
    const oaklandCenter: GeoPoint = { latitude: 40.4407, longitude: -79.9594 };

    expect(resolveNeighborhood(oaklandCenter)).toBe('Oakland');
  });

  test('falls back to nearest neighborhood center when point is outside all polygons', () => {
    const farOutsidePoint: GeoPoint = { latitude: 39.0, longitude: -80.011 };

    expect(resolveNeighborhood(farOutsidePoint)).toBe('Mount Washington');
  });
});

describe('discoveryLocation.milesBetween', () => {
  test('returns 0 when both coordinates are the same', () => {
    const point: GeoPoint = { latitude: 40.4406, longitude: -79.9959 };

    expect(milesBetween(point, point)).toBeCloseTo(0, 10);
  });

  test('returns a positive distance for two different coordinates', () => {
    const downtown: GeoPoint = { latitude: 40.4406, longitude: -79.9959 };
    const shadyside: GeoPoint = { latitude: 40.4518, longitude: -79.9358 };

    const distance = milesBetween(downtown, shadyside);

    expect(distance).toBeGreaterThan(3);
    expect(distance).toBeLessThan(3.5);
  });
});

describe('discoveryLocation.normalizeLocationQuery', () => {
  test('trims whitespace and lowercases input', () => {
    expect(normalizeLocationQuery('  ShAdYSiDe  ')).toBe('shadyside');
  });

  test('returns unchanged value for already normalized input', () => {
    expect(normalizeLocationQuery('oakland')).toBe('oakland');
  });
});

describe('discoveryLocation.coordinateFromLocation', () => {
  test('returns coordinates for a known neighborhood string', () => {
    expect(coordinateFromLocation('Shadyside')).toEqual({
      latitude: 40.4518,
      longitude: -79.9358,
    });
  });

  test('matches neighborhood names within a longer location string', () => {
    expect(coordinateFromLocation('Apartment in Oakland, Pittsburgh PA')).toEqual({
      latitude: 40.4407,
      longitude: -79.9594,
    });
  });

  test('returns null when no known neighborhood is present', () => {
    expect(coordinateFromLocation('new york city')).toBeNull();
  });

  test('returns null for blank or whitespace-only input', () => {
    expect(coordinateFromLocation('   ')).toBeNull();
  });
});
