import type { Post, SalePost, ISOPost, Seller } from '@/data/mockData';

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
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    avatar: user.avatar_url ?? '',
    location: user.location ?? '',
    bio: user.bio ?? '',
    followers: 0,
    following: 0,
    posts: 0,
  };
}

function buildPostBase(row: any, seller: Seller) {
  return {
    id: row.id,
    seller,
    title: row.title,
    description: row.description ?? '',
    category: row.category,
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

  return {
    ...base,
    type: 'sale',
    images: row.images ?? [],
    price: row.price ?? 0,
    condition: row.condition ?? 'Good',
    sold: row.sold ?? false,
    boostedUntil: row.boosted_until ?? null,
  } as SalePost;
}

/** Raw DB row ordering for Friends+ feed: boosted sale posts first, then recency. */
export function sortRowsForHomeFeed(rows: any[]): any[] {
  const now = Date.now();

  const rowBoostActive = (row: any): boolean => {
    if (row.type !== 'sale') return false;
    if (!row.boosted_until) return false;
    return new Date(row.boosted_until).getTime() > now;
  };

  return [...rows].sort((a, b) => {
    const aBoost = rowBoostActive(a);
    const bBoost = rowBoostActive(b);
    if (aBoost !== bBoost) return aBoost ? -1 : 1;
    if (aBoost && bBoost) {
      return new Date(b.boosted_until).getTime() - new Date(a.boosted_until).getTime();
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
