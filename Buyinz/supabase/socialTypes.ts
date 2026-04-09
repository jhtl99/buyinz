export type SocialConnectionStatus =
  | 'none'
  | 'pending_sent'
  | 'pending_received'
  | 'accepted'
  | 'follows_you';

export type SocialUser = {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  location?: string | null;
  bio?: string | null;
  /** Present when selected from DB; used for Pro badge on public profiles. */
  buyinz_pro?: boolean;
};

export type PublicUserProfile = SocialUser & { buyinz_pro: boolean };

export type IncomingFollowRequest = {
  requestId: string;
  fromUser: SocialUser;
  createdAt: string;
};
