import type { Post, SalePost, ISOPost, Seller } from '@/data/mockData';
import { sanitizePublicAvatarUrl } from '@/lib/avatar';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

function sellerFromUserRow(user: any): Seller {
  const lat = user.latitude;
  const lng = user.longitude;
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    avatar: sanitizePublicAvatarUrl(user.avatar_url) ?? '',
    location: user.location ?? '',
    bio: user.bio ?? '',
    followers: 0,
    following: 0,
    posts: 0,
    accountType: user.account_type === 'store' ? 'store' : 'user',
    latitude: typeof lat === 'number' && Number.isFinite(lat) ? lat : null,
    longitude: typeof lng === 'number' && Number.isFinite(lng) ? lng : null,
  };
}

/** Maps DB description to UI; treats legacy placeholder default as empty. */
function descriptionForDisplay(raw: unknown): string {
  if (raw == null) return '';
  const s = String(raw).trim();
  if (s.length === 0) return '';
  if (s.toLowerCase() === 'listing') return '';
  return s;
}

function buildPostBase(row: any, seller: Seller) {
  return {
    id: row.id,
    seller,
    title: row.title ?? '',
    description: descriptionForDisplay(row.description),
    likes: 0,
    comments: 0,
    liked: false,
    createdAt: timeAgo(row.created_at),
    hashtags: row.hashtags ?? [],
  };
}

export function mapRowToPost(row: any): Post {
  const seller = sellerFromUserRow(row.users);
  const base = buildPostBase(row, seller);

  if (row.type === 'iso') {
    return {
      ...base,
      type: 'iso',
      budget: row.budget ?? undefined,
    } as ISOPost;
  }

  const rawPrice = row.price;
  let price: number | null = null;
  if (rawPrice !== null && rawPrice !== undefined) {
    const n = typeof rawPrice === 'number' ? rawPrice : Number(rawPrice);
    if (Number.isFinite(n)) price = n;
  }

  return {
    ...base,
    type: 'sale',
    images: row.images ?? [],
    price,
    sold: row.sold ?? false,
  } as SalePost;
}
