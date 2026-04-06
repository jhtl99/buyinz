import type { SalePost } from '@/data/mockData';
import {
  coordinateFromLocation,
  DEFAULT_PITTSBURGH_COORDS,
  milesBetween,
  resolveNeighborhood,
  type GeoPoint,
} from '@/lib/discoveryLocation';
import { fetchFeedPosts } from './postsRead';

export { DEFAULT_PITTSBURGH_COORDS };
export type { GeoPoint };

export interface DiscoverySalePost extends SalePost {
  neighborhoodTag: string;
  distanceMiles: number;
}

export interface DiscoveryFeedResult {
  neighborhood: string;
  listings: DiscoverySalePost[];
}

function enrichSalePostsForDiscovery(
  salePosts: SalePost[],
  userCoords: GeoPoint,
): DiscoverySalePost[] {
  return salePosts.map((post) => {
    const postCoords = coordinateFromLocation(post.seller.location) ?? DEFAULT_PITTSBURGH_COORDS;
    const neighborhoodTag = resolveNeighborhood(postCoords);
    const distanceMiles = milesBetween(userCoords, postCoords);
    return {
      ...post,
      neighborhoodTag,
      distanceMiles,
    };
  });
}

function filterDiscoveryCandidates(
  enriched: DiscoverySalePost[],
  userNeighborhood: string,
  radiusMiles: number,
): DiscoverySalePost[] {
  return radiusMiles <= 0
    ? enriched.filter((post) => post.neighborhoodTag === userNeighborhood)
    : enriched.filter((post) => post.distanceMiles <= radiusMiles);
}

function resolveDiscoveryListingPool(
  filtered: DiscoverySalePost[],
  enriched: DiscoverySalePost[],
): DiscoverySalePost[] {
  return (filtered.length > 0 ? filtered : enriched).slice();
}

function sortDiscoveryListings(
  listings: DiscoverySalePost[],
  userNeighborhood: string,
): DiscoverySalePost[] {
  return [...listings].sort((a, b) => {
    const aIsLocal = a.neighborhoodTag === userNeighborhood ? 1 : 0;
    const bIsLocal = b.neighborhoodTag === userNeighborhood ? 1 : 0;

    if (aIsLocal !== bIsLocal) return bIsLocal - aIsLocal;
    if (Math.abs(a.distanceMiles - b.distanceMiles) > 0.05) {
      return a.distanceMiles - b.distanceMiles;
    }
    return b.likes - a.likes;
  });
}

export async function fetchDiscoveryFeed(options: {
  userCoords: GeoPoint;
  radiusMiles: number;
}): Promise<DiscoveryFeedResult> {
  const { userCoords, radiusMiles } = options;
  const userNeighborhood = resolveNeighborhood(userCoords);
  const feed = await fetchFeedPosts();

  const salePosts = feed.filter((post): post is SalePost => post.type === 'sale');

  const enriched = enrichSalePostsForDiscovery(salePosts, userCoords);

  const filtered = filterDiscoveryCandidates(enriched, userNeighborhood, radiusMiles);

  const pool = resolveDiscoveryListingPool(filtered, enriched);

  const listings = sortDiscoveryListings(pool, userNeighborhood);

  return {
    neighborhood: userNeighborhood,
    listings,
  };
}
