/**
 * Barrel: re-exports the public Supabase query API.
 */

export type { PublicUserProfile } from './usersRead';
export { fetchUserPublicProfileById, storeProfileAddressLine } from './usersRead';

export type { ExploreSortMode } from '@/lib/exploreSort';
export { sortNearbyStoresForExplore } from '@/lib/exploreSort';

export { DEFAULT_CMU_COORDS } from '@/lib/discoveryLocation';
export type { GeoPoint } from '@/lib/discoveryLocation';

export type { DiscoverySalePost, DiscoveryFeedResult } from './discoveryFeed';

export {
  fetchFeedPosts,
  fetchUserSaleListings,
  fetchStoreSaleListingsLast24h,
  fetchSaleListingById,
  deleteOwnSaleListing,
} from './postsRead';

export { fetchDiscoveryFeed } from './discoveryFeed';

export type { NearbyStoreForExplore } from './storeDiscovery';
export { fetchNearbyStoresForExplore } from './storeDiscovery';

export { fetchNewSaleListingsCountLast24hBatch } from './newItemsCount';

export type { FollowedStoreForHome } from './storeFollows';
export {
  fetchFollowedStoresForHome,
  followStore,
  unfollowStore,
  isFollowingStore,
  fetchStoreFollowerCountsBatch,
} from './storeFollows';

export { insertPost } from './postsInsert';

export type { ConversationCompletion } from './conversationCompletion';
export { fetchConversationCompletion, markMyTransactionComplete } from './conversationCompletion';
