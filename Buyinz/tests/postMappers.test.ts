import type { ISOPost, SalePost } from '@/data/mockData';
import { mapRowToPost } from '@/supabase/postMappers';

/** Fixed instant for fake timers; created_at values are derived from this. */
const FIXED_NOW_MS = Date.UTC(2026, 3, 7, 12, 0, 0, 0);

function minimalUser() {
  return {
    id: 'user-1',
    username: 'seller',
    display_name: 'Seller',
  };
}

function saleRow(created_at: string) {
  return {
    id: 'sale-post',
    type: 'sale' as const,
    title: 'Item',
    category: 'Other' as const,
    created_at,
    users: minimalUser(),
  };
}

function isoRow(created_at: string) {
  return {
    id: 'iso-post',
    type: 'iso' as const,
    title: 'Want',
    category: 'Other' as const,
    created_at,
    users: minimalUser(),
  };
}

describe('mapRowToPost createdAt (timeAgo)', () => {
  beforeAll(() => {
    jest.useFakeTimers({ now: FIXED_NOW_MS });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it.each([
    ['sale', saleRow] as const,
    ['iso', isoRow] as const,
  ])('less than 1 minute ago → just now (%s)', (_label, rowFn) => {
    const created_at = new Date(FIXED_NOW_MS - 45_000).toISOString();
    const post = mapRowToPost(rowFn(created_at));
    expect(post.createdAt).toBe('just now');
  });

  it.each([
    ['sale', saleRow] as const,
    ['iso', isoRow] as const,
  ])('30 minutes ago → 30m ago (%s)', (_label, rowFn) => {
    const created_at = new Date(FIXED_NOW_MS - 30 * 60_000).toISOString();
    const post = mapRowToPost(rowFn(created_at));
    expect(post.createdAt).toBe('30m ago');
  });

  it.each([
    ['sale', saleRow] as const,
    ['iso', isoRow] as const,
  ])('3 hours ago → 3h ago (%s)', (_label, rowFn) => {
    const created_at = new Date(FIXED_NOW_MS - 3 * 60 * 60_000).toISOString();
    const post = mapRowToPost(rowFn(created_at));
    expect(post.createdAt).toBe('3h ago');
  });

  it.each([
    ['sale', saleRow] as const,
    ['iso', isoRow] as const,
  ])('2 days ago → 2d ago (%s)', (_label, rowFn) => {
    const created_at = new Date(FIXED_NOW_MS - 2 * 24 * 60 * 60_000).toISOString();
    const post = mapRowToPost(rowFn(created_at));
    expect(post.createdAt).toBe('2d ago');
  });

  it.each([
    ['sale', saleRow] as const,
    ['iso', isoRow] as const,
  ])('21 days ago → 3w ago (floor(days/7) weeks) (%s)', (_label, rowFn) => {
    const created_at = new Date(FIXED_NOW_MS - 21 * 24 * 60 * 60_000).toISOString();
    const post = mapRowToPost(rowFn(created_at));
    expect(post.createdAt).toBe('3w ago');
  });
});

describe('mapRowToPost seller (sellerFromUserRow)', () => {
  const created_at = new Date(FIXED_NOW_MS).toISOString();

  function saleRowWithUsers(users: Record<string, unknown>) {
    return {
      id: 'sale-1',
      type: 'sale' as const,
      title: 'Listing',
      category: 'Other' as const,
      created_at,
      users,
    };
  }

  it('maps users row fields to seller (displayName from display_name, avatar from avatar_url, …)', () => {
    const row = saleRowWithUsers({
      id: 'user-abc',
      username: 'steelcity_thrift',
      display_name: 'Steel City Thrift',
      avatar_url: 'https://cdn.example/avatar.png',
      location: 'Lawrenceville, Pittsburgh PA',
      bio: 'Local thrifter',
    });

    const post = mapRowToPost(row);

    expect(post.seller).toEqual({
      id: 'user-abc',
      username: 'steelcity_thrift',
      displayName: 'Steel City Thrift',
      avatar: 'https://cdn.example/avatar.png',
      location: 'Lawrenceville, Pittsburgh PA',
      bio: 'Local thrifter',
      followers: 0,
      following: 0,
      posts: 0,
      accountType: 'user',
      latitude: null,
      longitude: null,
    });
  });

  it('uses empty string for avatar, location, bio when null, undefined, or omitted', () => {
    const row = saleRowWithUsers({
      id: 'user-min',
      username: 'min_user',
      display_name: 'Min User',
      avatar_url: null,
      location: undefined,
    });

    const post = mapRowToPost(row);

    expect(post.seller.id).toBe('user-min');
    expect(post.seller.username).toBe('min_user');
    expect(post.seller.displayName).toBe('Min User');
    expect(post.seller.avatar).toBe('');
    expect(post.seller.location).toBe('');
    expect(post.seller.bio).toBe('');
    expect(post.seller.followers).toBe(0);
    expect(post.seller.following).toBe(0);
    expect(post.seller.posts).toBe(0);
    expect(post.seller.accountType).toBe('user');
    expect(post.seller.latitude).toBeNull();
    expect(post.seller.longitude).toBeNull();
  });

  it('maps store account_type and coordinates when present', () => {
    const row = saleRowWithUsers({
      id: 'store-1',
      username: 'main_st_thrift',
      display_name: 'Main St Thrift',
      account_type: 'store',
      latitude: 40.4741,
      longitude: -79.9563,
    });

    const post = mapRowToPost(row);

    expect(post.seller.accountType).toBe('store');
    expect(post.seller.latitude).toBe(40.4741);
    expect(post.seller.longitude).toBe(-79.9563);
  });
});

describe('mapRowToPost base (buildPostBase)', () => {
  beforeAll(() => {
    jest.useFakeTimers({ now: FIXED_NOW_MS });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  /** ISO rows only: same base as sale; no images/price assertions. */
  function isoRowForBase(overrides: Record<string, unknown>) {
    return {
      id: 'base-iso-id',
      type: 'iso' as const,
      title: 'ISO title',
      category: 'Books' as const,
      created_at: new Date(FIXED_NOW_MS - 2 * 60_000).toISOString(),
      users: { id: 'u1', username: 'buyer', display_name: 'Buyer' },
      ...overrides,
    };
  }

  it('defaults description to "" and hashtags to [] when null or undefined', () => {
    const a = mapRowToPost(isoRowForBase({ description: null, hashtags: undefined }));
    expect(a.description).toBe('');
    expect(a.hashtags).toEqual([]);

    const b = mapRowToPost(isoRowForBase({ description: undefined, hashtags: null }));
    expect(b.description).toBe('');
    expect(b.hashtags).toEqual([]);
  });

  it('maps legacy placeholder description "Listing" to empty string', () => {
    const post = mapRowToPost(isoRowForBase({ description: 'Listing' }));
    expect(post.description).toBe('');
  });

  it('maps id, title, category, likes, comments, liked, and createdAt from base', () => {
    const post = mapRowToPost(
      isoRowForBase({
        id: 'row-id',
        title: 'My title',
        category: 'Decor',
        description: null,
        hashtags: null,
      }),
    );

    expect(post.id).toBe('row-id');
    expect(post.title).toBe('My title');
    expect(post.category).toBe('Decor');
    expect(post.likes).toBe(0);
    expect(post.comments).toBe(0);
    expect(post.liked).toBe(false);
    expect(post.createdAt).toBeTruthy();
    expect(typeof post.createdAt).toBe('string');
    expect(post.createdAt).toBe('2m ago');
  });

  it('preserves non-null description and hashtags arrays from the row', () => {
    const post = mapRowToPost(
      isoRowForBase({
        description: 'Details here',
        hashtags: ['one', 'two'],
      }),
    );

    expect(post.description).toBe('Details here');
    expect(post.hashtags).toEqual(['one', 'two']);
  });
});

describe('mapRowToPost type branches', () => {
  beforeAll(() => {
    jest.useFakeTimers({ now: FIXED_NOW_MS });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const created_at = new Date(FIXED_NOW_MS - 60_000).toISOString();

  const users = {
    id: 'seller-u1',
    username: 'seller_name',
    display_name: 'Seller Display',
    avatar_url: 'https://cdn.example/a.png',
    location: 'Oakland',
    bio: 'Hi',
  };

  it('iso branch: returns ISOPost with type iso, base fields, and budget from row.budget', () => {
    const row = {
      id: 'iso-1',
      type: 'iso' as const,
      title: 'ISO desk',
      description: 'Looking for standing desk',
      category: 'Furniture' as const,
      created_at,
      hashtags: ['desk'],
      users,
      budget: 175,
    };

    const post = mapRowToPost(row);

    expect(post.type).toBe('iso');
    const iso = post as ISOPost;
    expect(iso.id).toBe('iso-1');
    expect(iso.title).toBe('ISO desk');
    expect(iso.description).toBe('Looking for standing desk');
    expect(iso.category).toBe('Furniture');
    expect(iso.hashtags).toEqual(['desk']);
    expect(iso.budget).toBe(175);
    expect(iso.seller.displayName).toBe('Seller Display');
  });

  it('iso branch: budget is undefined when row.budget is null or undefined', () => {
    const base = {
      type: 'iso' as const,
      id: 'iso-2',
      title: 'Want',
      category: 'Other' as const,
      created_at,
      users,
    };

    const withNull = mapRowToPost({ ...base, budget: null });
    expect(withNull.type).toBe('iso');
    expect((withNull as ISOPost).budget).toBeUndefined();

    const withUndefined = mapRowToPost({ ...base, budget: undefined });
    expect((withUndefined as ISOPost).budget).toBeUndefined();

    const omitted = mapRowToPost(base);
    expect((omitted as ISOPost).budget).toBeUndefined();
  });

  it('iso branch: returned object has no sale-only keys', () => {
    const post = mapRowToPost({
      id: 'iso-3',
      type: 'iso' as const,
      title: 'ISO only',
      category: 'Books' as const,
      created_at,
      users,
      budget: 10,
    });

    expect(post.type).toBe('iso');
    expect(post).not.toHaveProperty('images');
    expect(post).not.toHaveProperty('price');
    expect(post).not.toHaveProperty('condition');
    expect(post).not.toHaveProperty('sold');
  });

  it('sale branch: maps images, price, sold from row', () => {
    const row = {
      id: 'sale-1',
      type: 'sale' as const,
      title: 'Lamp',
      category: 'Decor' as const,
      created_at,
      description: 'Nice lamp',
      users,
      images: ['https://img/1.jpg'],
      price: 42,
      sold: true,
    };

    const post = mapRowToPost(row);

    expect(post.type).toBe('sale');
    const sale = post as SalePost;
    expect(sale.images).toEqual(['https://img/1.jpg']);
    expect(sale.price).toBe(42);
    expect(sale.sold).toBe(true);
  });

  it('sale branch: defaults images [], price null, sold false when missing', () => {
    const row = {
      id: 'sale-2',
      type: 'sale' as const,
      title: 'Minimal sale row',
      category: 'Other' as const,
      created_at,
      users,
    };

    const post = mapRowToPost(row);
    expect(post.type).toBe('sale');
    const sale = post as SalePost;
    expect(sale.images).toEqual([]);
    expect(sale.price).toBeNull();
    expect(sale.sold).toBe(false);
  });

  it('sale branch: maps null title to empty string', () => {
    const row = {
      id: 'sale-null-title',
      type: 'sale' as const,
      title: null,
      category: 'Other' as const,
      created_at,
      users,
    };

    const post = mapRowToPost(row);
    const sale = post as SalePost;
    expect(sale.title).toBe('');
  });

  it('sale branch: maps explicit zero price', () => {
    const row = {
      id: 'sale-3',
      type: 'sale' as const,
      title: 'Free table',
      category: 'Other' as const,
      created_at,
      users,
      price: 0,
    };

    const sale = mapRowToPost(row) as SalePost;
    expect(sale.price).toBe(0);
  });
});

