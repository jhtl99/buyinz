/**
 * Distance-based Discover feed (user story): store-only listings, haversine sort/filter,
 * CMU default when location is unavailable. See `unit_test_checklist.md` for review criteria.
 */

import type { SalePost } from '@/data/mockData';
import { mapRowToPost } from '@/supabase/postMappers';
import { DEFAULT_CMU_COORDS, milesBetween, type GeoPoint } from '@/lib/discoveryLocation';
import { DEFAULT_CMU_COORDS as defaultCoordsFromQueries } from '@/supabase/queries';
import { fetchDiscoveryFeed } from '@/supabase/discoveryFeed';
import { fetchFeedPosts } from '@/supabase/postsRead';

jest.mock('@/supabase/postsRead', () => ({
  fetchFeedPosts: jest.fn(),
}));

const mockedFetchFeedPosts = fetchFeedPosts as jest.MockedFunction<typeof fetchFeedPosts>;

const shopperCoords: GeoPoint = { latitude: 40.443, longitude: -79.944 };

function baseSeller(overrides: Partial<SalePost['seller']> = {}): SalePost['seller'] {
  return {
    id: 'seller-1',
    username: 'thrift_shop',
    displayName: 'Thrift',
    avatar: '',
    location: 'Pittsburgh PA',
    bio: '',
    followers: 0,
    following: 0,
    posts: 0,
    accountType: 'store',
    latitude: 40.444,
    longitude: -79.944,
    ...overrides,
  };
}

function makeSalePost(id: string, sellerOverrides: Partial<SalePost['seller']> = {}): SalePost {
  return {
    id,
    type: 'sale',
    seller: baseSeller(sellerOverrides),
    images: ['https://example.com/i.png'],
    title: `Item ${id}`,
    price: 10,
    category: 'Other',
    description: '',
    likes: 5,
    comments: 0,
    liked: false,
    createdAt: '1h ago',
    hashtags: [],
    sold: false,
  };
}

describe('Distance discovery — lib/discoveryLocation', () => {
  it('DEFAULT_CMU_COORDS is exported from queries barrel for the Discover screen', () => {
    expect(defaultCoordsFromQueries).toEqual(DEFAULT_CMU_COORDS);
  });

  it('milesBetween returns 0 for identical points', () => {
    const p = { latitude: 40.44, longitude: -79.95 };
    expect(milesBetween(p, p)).toBe(0);
  });

  it('milesBetween returns a positive distance for distinct nearby points', () => {
    const a = { latitude: 40.443, longitude: -79.944 };
    const b = { latitude: 40.453, longitude: -79.934 };
    expect(milesBetween(a, b)).toBeGreaterThan(0.5);
    expect(milesBetween(a, b)).toBeLessThan(5);
  });
});

describe('Distance discovery — postMappers → seller geo', () => {
  it('maps store account_type and coordinates for distance ranking', () => {
    const row = {
      id: 'post-1',
      type: 'sale' as const,
      title: 'Lamp',
      category: 'Other' as const,
      created_at: new Date().toISOString(),
      users: {
        id: 'store-uuid',
        username: 'oak_thrift',
        display_name: 'Oak Thrift',
        account_type: 'store',
        latitude: 40.444,
        longitude: -79.944,
      },
    };

    const post = mapRowToPost(row) as SalePost;

    expect(post.seller.accountType).toBe('store');
    expect(post.seller.latitude).toBe(40.444);
    expect(post.seller.longitude).toBe(-79.944);
  });

  it('treats non-finite latitude/longitude as null so listing is excluded from discovery', () => {
    const row = {
      id: 'post-bad-geo',
      type: 'sale' as const,
      title: 'Chair',
      category: 'Furniture' as const,
      created_at: new Date().toISOString(),
      users: {
        id: 'store-2',
        username: 'bad_geo',
        display_name: 'Bad Geo',
        account_type: 'store',
        latitude: Number.NaN,
        longitude: 40.1,
      },
    };

    const post = mapRowToPost(row) as SalePost;
    expect(post.seller.latitude).toBeNull();
  });
});

describe('Distance discovery — fetchDiscoveryFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('includes only store sellers with finite latitude and longitude', async () => {
    mockedFetchFeedPosts.mockResolvedValue([
      makeSalePost('store-ok', { accountType: 'store', latitude: 40.444, longitude: -79.944 }),
      makeSalePost('user-seller', { accountType: 'user', latitude: 40.444, longitude: -79.944 }),
      makeSalePost('store-no-geo', { accountType: 'store', latitude: null, longitude: null }),
      { id: 'iso-1', type: 'iso' },
    ] as any);

    const result = await fetchDiscoveryFeed({ userCoords: shopperCoords, radiusMiles: 50 });

    expect(result.listings.map((p) => p.id)).toEqual(['store-ok']);
  });

  it('sorts by distance ascending and tie-breaks by id when distance is equal', async () => {
    const sameLat = 40.445;
    const sameLng = -79.945;
    mockedFetchFeedPosts.mockResolvedValue([
      makeSalePost('b', { id: 'b', latitude: sameLat, longitude: sameLng }),
      makeSalePost('a', { id: 'a', latitude: sameLat, longitude: sameLng }),
    ] as any);

    const result = await fetchDiscoveryFeed({ userCoords: shopperCoords, radiusMiles: 50 });

    expect(result.listings.map((p) => p.id)).toEqual(['a', 'b']);
    expect(result.listings[0].distanceMiles).toBeCloseTo(result.listings[1].distanceMiles, 5);
  });

  it('orders farther listings after nearer ones when distances differ', async () => {
    mockedFetchFeedPosts.mockResolvedValue([
      makeSalePost('far', { latitude: 40.46, longitude: -79.944 }),
      makeSalePost('near', { latitude: 40.4435, longitude: -79.9441 }),
    ] as any);

    const result = await fetchDiscoveryFeed({ userCoords: shopperCoords, radiusMiles: 50 });

    expect(result.listings.map((p) => p.id)).toEqual(['near', 'far']);
    expect(result.listings[0].distanceMiles).toBeLessThan(result.listings[1].distanceMiles);
  });

  it('filters by radiusMiles using haversine distance', async () => {
    const near = makeSalePost('near', { latitude: 40.4432, longitude: -79.9442 });
    const far = makeSalePost('far', { latitude: 40.49, longitude: -79.944 });
    mockedFetchFeedPosts.mockResolvedValue([near, far] as any);

    const dNear = milesBetween(shopperCoords, { latitude: 40.4432, longitude: -79.9442 });
    const dFar = milesBetween(shopperCoords, { latitude: 40.49, longitude: -79.944 });

    const maxRadius = dNear + (dFar - dNear) / 2;
    const result = await fetchDiscoveryFeed({ userCoords: shopperCoords, radiusMiles: maxRadius });

    expect(result.listings.map((p) => p.id)).toEqual(['near']);
  });

  it('returns empty listings when nothing qualifies (ISO-only or user sellers)', async () => {
    mockedFetchFeedPosts.mockResolvedValue([
      { id: 'iso-only', type: 'iso' },
      makeSalePost('u', { accountType: 'user', latitude: 40.44, longitude: -79.94 }),
    ] as any);

    const result = await fetchDiscoveryFeed({ userCoords: shopperCoords, radiusMiles: 50 });

    expect(result.listings).toEqual([]);
  });

  it('propagates fetchFeedPosts errors', async () => {
    mockedFetchFeedPosts.mockRejectedValue(new Error('feed failed'));

    await expect(fetchDiscoveryFeed({ userCoords: shopperCoords, radiusMiles: 10 })).rejects.toThrow(
      'feed failed',
    );
  });
});
