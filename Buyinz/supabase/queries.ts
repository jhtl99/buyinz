/**
 * Barrel: re-exports the public Supabase query API.
 */

export type { PublicUserProfile } from './usersRead';
export { fetchUserPublicProfileById } from './usersRead';

export { DEFAULT_CMU_COORDS } from '@/lib/discoveryLocation';
export type { GeoPoint } from '@/lib/discoveryLocation';

export type { DiscoverySalePost, DiscoveryFeedResult } from './discoveryFeed';

export {
  fetchFeedPosts,
  fetchUserSaleListings,
  fetchSaleListingById,
  deleteOwnSaleListing,
} from './postsRead';

export { fetchDiscoveryFeed } from './discoveryFeed';

export { insertPost } from './postsInsert';

export type { ConversationCompletion, UserRatingStats } from './transactionRatings';
export {
  fetchConversationCompletion,
  markMyTransactionComplete,
  fetchMyRatingForConversation,
  submitConversationRating,
  fetchUserRatingStats,
} from './transactionRatings';
