import { fetchDiscoveryFeed, type GeoPoint } from '../supabase/discoveryFeed';
import { fetchFeedPosts } from '../supabase/postsRead';
import {
  DEFAULT_PITTSBURGH_COORDS,
  coordinateFromLocation,
  milesBetween,
  resolveNeighborhood,
} from '../lib/discoveryLocation';

jest.mock('../supabase/postsRead', () => ({
  fetchFeedPosts: jest.fn(),
}));

jest.mock('../lib/discoveryLocation', () => {
  const DEFAULT = { latitude: 40.4406, longitude: -79.9959 };
  return {
    DEFAULT_PITTSBURGH_COORDS: DEFAULT,
    coordinateFromLocation: jest.fn(),
    resolveNeighborhood: jest.fn(),
    milesBetween: jest.fn(),
  };
});

const mockedFetchFeedPosts = fetchFeedPosts as jest.MockedFunction<typeof fetchFeedPosts>;
const mockedCoordinateFromLocation = coordinateFromLocation as jest.MockedFunction<
  typeof coordinateFromLocation
>;
const mockedResolveNeighborhood = resolveNeighborhood as jest.MockedFunction<typeof resolveNeighborhood>;
const mockedMilesBetween = milesBetween as jest.MockedFunction<typeof milesBetween>;

function makeSalePost(id: string, sellerLocation: string) {
  return {
    id,
    type: 'sale',
    seller: {
      id: `seller-${id}`,
      username: `user-${id}`,
      displayName: `User ${id}`,
      avatar: 'https://example.com/avatar.png',
      location: sellerLocation,
      bio: 'bio',
      followers: 0,
      following: 0,
      posts: 0,
    },
    images: ['https://example.com/item.png'],
    title: `Item ${id}`,
    price: 50,
    condition: 'Good',
    category: 'Other',
    description: 'desc',
    likes: 5,
    comments: 0,
    liked: false,
    createdAt: 'now',
    hashtags: [],
    sold: false,
  } as const;
}

describe('discoveryFeed', () => {
  const userCoords: GeoPoint = { latitude: 40.44, longitude: -79.95 };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchDiscoveryFeed enrichment behavior', () => {
    test('enriches sale posts with neighborhoodTag and distanceMiles from resolved coordinates', async () => {
      const postCoords = { latitude: 40.4518, longitude: -79.9358 };

      mockedFetchFeedPosts.mockResolvedValue([
        makeSalePost('sale-1', 'Shadyside, Pittsburgh PA'),
        {
          id: 'iso-1',
          type: 'iso',
        },
      ] as any);

      mockedCoordinateFromLocation.mockReturnValue(postCoords);
      mockedResolveNeighborhood.mockImplementation((point) =>
        point.latitude === userCoords.latitude && point.longitude === userCoords.longitude
          ? 'Oakland'
          : 'Shadyside',
      );
      mockedMilesBetween.mockReturnValue(2.25);

      const result = await fetchDiscoveryFeed({ userCoords, radiusMiles: 25 });

      expect(result.listings).toHaveLength(1);
      expect(result.listings[0]).toMatchObject({
        id: 'sale-1',
        neighborhoodTag: 'Shadyside',
        distanceMiles: 2.25,
      });
      expect(mockedCoordinateFromLocation).toHaveBeenCalledWith('Shadyside, Pittsburgh PA');
    });

    test('uses default Pittsburgh coordinates when location cannot be resolved', async () => {
      mockedFetchFeedPosts.mockResolvedValue([makeSalePost('sale-2', 'Unknown Place')] as any);

      mockedCoordinateFromLocation.mockReturnValue(null);
      mockedResolveNeighborhood.mockImplementation((point) =>
        point.latitude === userCoords.latitude && point.longitude === userCoords.longitude
          ? 'UserNeighborhood'
          : 'DefaultNeighborhood',
      );
      mockedMilesBetween.mockImplementation((_, b) =>
        b.latitude === DEFAULT_PITTSBURGH_COORDS.latitude &&
        b.longitude === DEFAULT_PITTSBURGH_COORDS.longitude
          ? 7
          : 99,
      );

      const result = await fetchDiscoveryFeed({ userCoords, radiusMiles: 25 });

      expect(result.listings[0]).toMatchObject({
        id: 'sale-2',
        neighborhoodTag: 'DefaultNeighborhood',
        distanceMiles: 7,
      });
      expect(mockedMilesBetween).toHaveBeenCalledWith(userCoords, DEFAULT_PITTSBURGH_COORDS);
    });
  });

  describe('fetchDiscoveryFeed filterDiscoveryCandidates behavior', () => {
    test('radius <= 0 keeps only listings in user neighborhood', async () => {
      mockedFetchFeedPosts.mockResolvedValue([
        makeSalePost('local', 'Oakland, Pittsburgh PA'),
        makeSalePost('other', 'Shadyside, Pittsburgh PA'),
      ] as any);

      mockedCoordinateFromLocation.mockImplementation((location) =>
        location.includes('Oakland')
          ? { latitude: 40.44, longitude: -79.96 }
          : { latitude: 40.45, longitude: -79.93 },
      );
      mockedResolveNeighborhood.mockImplementation((point) =>
        point.latitude === userCoords.latitude && point.longitude === userCoords.longitude
          ? 'Oakland'
          : point.longitude === -79.96
            ? 'Oakland'
            : 'Shadyside',
      );
      mockedMilesBetween.mockReturnValue(10);

      const result = await fetchDiscoveryFeed({ userCoords, radiusMiles: 0 });

      expect(result.listings.map((post) => post.id)).toEqual(['local']);
    });

    test('radius > 0 keeps only listings within radius', async () => {
      mockedFetchFeedPosts.mockResolvedValue([
        makeSalePost('near', 'Near Location'),
        makeSalePost('far', 'Far Location'),
      ] as any);

      mockedCoordinateFromLocation.mockImplementation((location) =>
        location.includes('Near')
          ? { latitude: 40.441, longitude: -79.951 }
          : { latitude: 40.49, longitude: -80.05 },
      );
      mockedResolveNeighborhood.mockImplementation((point) =>
        point.latitude === userCoords.latitude && point.longitude === userCoords.longitude
          ? 'Oakland'
          : 'Shadyside',
      );
      mockedMilesBetween.mockImplementation((_, b) => (b.latitude === 40.441 ? 1.2 : 8.8));

      const result = await fetchDiscoveryFeed({ userCoords, radiusMiles: 3 });

      expect(result.listings.map((post) => post.id)).toEqual(['near']);
    });
  });

  describe('fetchDiscoveryFeed resolveDiscoveryListingPool behavior', () => {
    test('uses filtered listings when filtered is non-empty', async () => {
      mockedFetchFeedPosts.mockResolvedValue([
        makeSalePost('near', 'Near Location'),
        makeSalePost('far', 'Far Location'),
      ] as any);

      mockedCoordinateFromLocation.mockImplementation((location) =>
        location.includes('Near')
          ? { latitude: 40.441, longitude: -79.951 }
          : { latitude: 40.49, longitude: -80.05 },
      );
      mockedResolveNeighborhood.mockImplementation((point) =>
        point.latitude === userCoords.latitude && point.longitude === userCoords.longitude
          ? 'Oakland'
          : 'Shadyside',
      );
      mockedMilesBetween.mockImplementation((_, b) => (b.latitude === 40.441 ? 1 : 10));

      const result = await fetchDiscoveryFeed({ userCoords, radiusMiles: 3 });

      expect(result.listings.map((post) => post.id)).toEqual(['near']);
    });

    test('falls back to enriched listings when filtered is empty', async () => {
      mockedFetchFeedPosts.mockResolvedValue([
        makeSalePost('a', 'Location A'),
        makeSalePost('b', 'Location B'),
      ] as any);

      mockedCoordinateFromLocation.mockReturnValue({ latitude: 40.48, longitude: -80.02 });
      mockedResolveNeighborhood.mockImplementation((point) =>
        point.latitude === userCoords.latitude && point.longitude === userCoords.longitude
          ? 'Oakland'
          : 'Shadyside',
      );
      mockedMilesBetween.mockReturnValue(9);

      const result = await fetchDiscoveryFeed({ userCoords, radiusMiles: 2 });

      expect(result.listings).toHaveLength(2);
      expect(result.listings.map((post) => post.id)).toEqual(expect.arrayContaining(['a', 'b']));
    });
  });

  describe('fetchDiscoveryFeed sortDiscoveryListings behavior', () => {
    test('prioritizes user-neighborhood listings before non-local listings', async () => {
      mockedFetchFeedPosts.mockResolvedValue([
        makeSalePost('local', 'Local Location'),
        makeSalePost('non-local', 'Non Local Location'),
      ] as any);

      mockedCoordinateFromLocation.mockImplementation((location) =>
        location.includes('Local')
          ? { latitude: 40.441, longitude: -79.951 }
          : { latitude: 40.442, longitude: -79.952 },
      );
      mockedResolveNeighborhood.mockImplementation((point) =>
        point.latitude === userCoords.latitude && point.longitude === userCoords.longitude
          ? 'Oakland'
          : point.latitude === 40.441
            ? 'Oakland'
            : 'Shadyside',
      );
      mockedMilesBetween.mockReturnValue(1);

      const result = await fetchDiscoveryFeed({ userCoords, radiusMiles: 50 });

      expect(result.listings.map((post) => post.id)).toEqual(['local', 'non-local']);
    });

    test('sorts by distance when neighborhood priority is tied', async () => {
      mockedFetchFeedPosts.mockResolvedValue([
        makeSalePost('farther', 'Farther Location'),
        makeSalePost('closer', 'Closer Location'),
      ] as any);

      mockedCoordinateFromLocation.mockImplementation((location) =>
        location.includes('Closer')
          ? { latitude: 40.443, longitude: -79.953 }
          : { latitude: 40.444, longitude: -79.954 },
      );
      mockedResolveNeighborhood.mockImplementation((point) =>
        point.latitude === userCoords.latitude && point.longitude === userCoords.longitude
          ? 'Oakland'
          : 'Shadyside',
      );
      mockedMilesBetween.mockImplementation((_, b) => (b.latitude === 40.443 ? 1.0 : 2.0));

      const result = await fetchDiscoveryFeed({ userCoords, radiusMiles: 50 });

      expect(result.listings.map((post) => post.id)).toEqual(['closer', 'farther']);
    });

    test('uses likes as tiebreak when distance difference is within threshold', async () => {
      const lowLikes = { ...makeSalePost('low-likes', 'Loc A'), likes: 3 };
      const highLikes = { ...makeSalePost('high-likes', 'Loc B'), likes: 20 };
      mockedFetchFeedPosts.mockResolvedValue([lowLikes, highLikes] as any);

      mockedCoordinateFromLocation.mockImplementation((location) =>
        location.includes('Loc A')
          ? { latitude: 40.445, longitude: -79.955 }
          : { latitude: 40.446, longitude: -79.956 },
      );
      mockedResolveNeighborhood.mockImplementation((point) =>
        point.latitude === userCoords.latitude && point.longitude === userCoords.longitude
          ? 'Oakland'
          : 'Shadyside',
      );
      mockedMilesBetween.mockImplementation((_, b) => (b.latitude === 40.445 ? 1.0 : 1.03));

      const result = await fetchDiscoveryFeed({ userCoords, radiusMiles: 50 });

      expect(result.listings.map((post) => post.id)).toEqual(['high-likes', 'low-likes']);
    });
  });

  describe('fetchDiscoveryFeed orchestration', () => {
    test('returns user neighborhood and ignores non-sale posts', async () => {
      mockedFetchFeedPosts.mockResolvedValue([
        {
          id: 'iso-only',
          type: 'iso',
        },
      ] as any);

      mockedResolveNeighborhood.mockReturnValue('Oakland');

      const result = await fetchDiscoveryFeed({ userCoords, radiusMiles: 10 });

      expect(result.neighborhood).toBe('Oakland');
      expect(result.listings).toEqual([]);
      expect(mockedFetchFeedPosts).toHaveBeenCalledTimes(1);
    });

    test('propagates fetchFeedPosts errors', async () => {
      const err = new Error('feed failed');
      mockedResolveNeighborhood.mockReturnValue('Oakland');
      mockedFetchFeedPosts.mockRejectedValue(err);

      await expect(fetchDiscoveryFeed({ userCoords, radiusMiles: 10 })).rejects.toThrow('feed failed');
    });
  });
});
