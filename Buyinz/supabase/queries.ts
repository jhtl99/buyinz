/**
 * Barrel: re-exports the public Supabase query API (same surface as the former monolithic module).
 */

export type {
  SocialConnectionStatus,
  SocialUser,
  IncomingFollowRequest,
  PublicUserProfile,
} from './socialTypes';

export { DEFAULT_PITTSBURGH_COORDS } from './discoveryFeed';
export type { GeoPoint } from './discoveryFeed';

export type { DiscoverySalePost, DiscoveryFeedResult } from './discoveryFeed';

export {
  fetchFeedPosts,
  fetchFriendsFeedPosts,
  fetchUserSaleListings,
  fetchSaleListingById,
  applyListingBoost,
} from './postsRead';

export {
  getFollowingUserIds,
  searchUsers,
  getRecommendedProfiles,
  sendFollowRequest,
  getIncomingFollowRequests,
  respondToFollowRequest,
  getFollowers,
  getFollowing,
  fetchUserPublicProfileById,
} from './socialQueries';

export { syncBuyinzProToSupabase } from './userProfileSync';

export { fetchDiscoveryFeed } from './discoveryFeed';

export { insertPost } from './postsInsert';

export type { ConversationRow, MessageRow } from './messaging';
export {
  getOrCreateConversation,
  fetchConversations,
  fetchMessages,
  sendMessage,
  subscribeToMessages,
} from './messaging';

export type { ConversationCompletion, UserRatingStats } from './transactionRatings';
export {
  fetchConversationCompletion,
  markMyTransactionComplete,
  fetchMyRatingForConversation,
  submitConversationRating,
  fetchUserRatingStats,
} from './transactionRatings';
