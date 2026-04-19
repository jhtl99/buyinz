import type { SalePost } from '@/data/mockData';
import { milesBetween, type GeoPoint } from '@/lib/discoveryLocation';
import { fetchFeedPosts } from './postsRead';

export type { GeoPoint };

export interface DiscoverySalePost extends SalePost {
  distanceMiles: number;
}

export interface DiscoveryFeedResult {
  listings: DiscoverySalePost[];
}

function storeHasGeo(seller: SalePost['seller']): seller is SalePost['seller'] & {
  latitude: number;
  longitude: number;
} {
  return (
    seller.accountType === 'store' &&
    seller.latitude !== null &&
    seller.longitude !== null &&
    Number.isFinite(seller.latitude) &&
    Number.isFinite(seller.longitude)
  );
}

function enrichStoreSalePostsForDiscovery(
  salePosts: SalePost[],
  userCoords: GeoPoint,
): DiscoverySalePost[] {
  const out: DiscoverySalePost[] = [];
  for (const post of salePosts) {
    if (!storeHasGeo(post.seller)) continue;
    const storePoint: GeoPoint = {
      latitude: post.seller.latitude,
      longitude: post.seller.longitude,
    };
    out.push({
      ...post,
      distanceMiles: milesBetween(userCoords, storePoint),
    });
  }
  return out;
}

function filterByRadiusMiles(listings: DiscoverySalePost[], radiusMiles: number): DiscoverySalePost[] {
  return listings.filter((post) => post.distanceMiles <= radiusMiles);
}

function sortByDistanceThenId(listings: DiscoverySalePost[]): DiscoverySalePost[] {
  return [...listings].sort((a, b) => {
    const d = a.distanceMiles - b.distanceMiles;
    if (Math.abs(d) > 1e-6) return d;
    return a.id.localeCompare(b.id);
  });
}

export async function fetchDiscoveryFeed(options: {
  userCoords: GeoPoint;
  radiusMiles: number;
}): Promise<DiscoveryFeedResult> {
  const { userCoords, radiusMiles } = options;
  const feed = await fetchFeedPosts();

  const salePosts = feed.filter((post): post is SalePost => post.type === 'sale');
  const enriched = enrichStoreSalePostsForDiscovery(salePosts, userCoords);
  const inRadius = filterByRadiusMiles(enriched, radiusMiles);
  const listings = sortByDistanceThenId(inRadius);

  return { listings };
}
