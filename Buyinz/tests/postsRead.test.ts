import type { SalePost } from '@/data/mockData';
import { formatBoostRpcError } from '@/lib/boostErrors';
import { supabase } from '@/supabase/client';
import { getFollowingUserIds } from '@/supabase/socialQueries';
import { isMissingSocialTable } from '@/supabase/socialTable';
import { mapRowToPost } from '@/supabase/postMappers';
import {
  applyListingBoost,
  fetchFeedPosts,
  fetchFriendsFeedPosts,
  fetchSaleListingById,
  fetchUserSaleListings,
} from '@/supabase/postsRead';

jest.mock('@/lib/boostErrors', () => ({
  formatBoostRpcError: jest.fn(),
}));

jest.mock('@/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

jest.mock('@/supabase/socialQueries', () => ({
  getFollowingUserIds: jest.fn(),
}));

jest.mock('@/supabase/socialTable', () => ({
  isMissingSocialTable: jest.fn(),
}));

function mockPostsFeedQuery(result: { data: unknown; error: unknown }) {
  const order = jest.fn().mockResolvedValue(result);
  const select = jest.fn().mockReturnValue({ order });
  (supabase.from as jest.Mock).mockReturnValue({ select });
  return { order, select };
}

function createPostsFriendsChain(result: { data: unknown; error: unknown }) {
  const order = jest.fn().mockResolvedValue(result);
  const postsIn = jest.fn().mockReturnValue({ order });
  const select = jest.fn().mockReturnValue({ in: postsIn });
  return { select, postsIn, order };
}

function createSocialConnectionsChain(result: { data: unknown; error: unknown }) {
  const eq = jest.fn().mockResolvedValue(result);
  const inn = jest.fn().mockReturnValue({ eq });
  const select = jest.fn().mockReturnValue({ in: inn });
  return { select, inn, eq };
}

function createUserSaleListingsQuery(result: { data: unknown; error: unknown }) {
  const order = jest.fn().mockResolvedValue(result);
  const eqType = jest.fn().mockReturnValue({ order });
  const eqUserId = jest.fn().mockReturnValue({ eq: eqType });
  const select = jest.fn().mockReturnValue({ eq: eqUserId });
  return { select, eqUserId, eqType, order };
}

function createSaleListingByIdQuery(result: { data: unknown; error: unknown }) {
  const maybeSingle = jest.fn().mockResolvedValue(result);
  const eqType = jest.fn().mockReturnValue({ maybeSingle });
  const eqId = jest.fn().mockReturnValue({ eq: eqType });
  const select = jest.fn().mockReturnValue({ eq: eqId });
  return { select, eqId, eqType, maybeSingle };
}

function minimalUser(id: string) {
  return {
    id,
    username: `u_${id}`,
    display_name: `User ${id}`,
    avatar_url: null,
    location: null,
    bio: null,
  };
}

describe('postsRead', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.from as jest.Mock).mockReset();
    (supabase.rpc as jest.Mock).mockReset();
    jest.mocked(getFollowingUserIds).mockReset();
    jest.mocked(isMissingSocialTable).mockReset();
    jest.mocked(formatBoostRpcError).mockReset();
  });

  describe('fetchFeedPosts', () => {
  it('rejects with the Supabase error when the query fails', async () => {
    const dbError = { message: 'permission denied for table posts', code: '42501' };
    mockPostsFeedQuery({ data: null, error: dbError });

    await expect(fetchFeedPosts()).rejects.toBe(dbError);

    expect(supabase.from).toHaveBeenCalledWith('posts');
    const fromReturn = (supabase.from as jest.Mock).mock.results[0].value;
    expect(fromReturn.select).toHaveBeenCalledWith('*, users(*)');
    const selectReturn = fromReturn.select.mock.results[0].value;
    expect(selectReturn.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('maps rows with nested users to Post via mapRowToPost', async () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    const oneHourAgo = new Date(Date.now() - 60 * 60_000).toISOString();

    const rows = [
      {
        id: 'post-sale-1',
        type: 'sale',
        title: 'Eames chair',
        description: 'Classic lounge',
        category: 'Furniture',
        created_at: fiveMinutesAgo,
        images: ['https://cdn.example/img1.jpg'],
        price: 450,
        condition: 'Like New',
        sold: false,
        boosted_until: null,
        hashtags: ['mcm', 'chair'],
        users: {
          id: 'user-seller-1',
          username: 'mcm_mike',
          display_name: 'MCM Mike',
          avatar_url: 'https://cdn.example/avatar1.png',
          location: 'Point Breeze, Pittsburgh PA',
          bio: 'Collector.',
        },
      },
      {
        id: 'post-iso-1',
        type: 'iso',
        title: 'ISO standing desk',
        description: 'Budget flexible',
        category: 'Furniture',
        created_at: oneHourAgo,
        budget: 200,
        hashtags: ['desk'],
        users: {
          id: 'user-buyer-2',
          username: 'student_pitt',
          display_name: 'Alex Student',
          avatar_url: null,
          location: null,
          bio: null,
        },
      },
    ];

    mockPostsFeedQuery({ data: rows, error: null });

    const posts = await fetchFeedPosts();

    expect(supabase.from).toHaveBeenCalledWith('posts');
    const fromReturn = (supabase.from as jest.Mock).mock.results[0].value;
    expect(fromReturn.select).toHaveBeenCalledWith('*, users(*)');
    const selectReturn = fromReturn.select.mock.results[0].value;
    expect(selectReturn.order).toHaveBeenCalledWith('created_at', { ascending: false });

    expect(posts).toHaveLength(2);

    expect(posts[0].id).toBe('post-sale-1');
    expect(posts[0].title).toBe('Eames chair');
    expect(posts[0].type).toBe('sale');
    if (posts[0].type === 'sale') {
      expect(posts[0].price).toBe(450);
      expect(posts[0].images).toEqual(['https://cdn.example/img1.jpg']);
    }
    expect(posts[0].seller.id).toBe('user-seller-1');
    expect(posts[0].seller.username).toBe('mcm_mike');
    expect(posts[0].seller.displayName).toBe('MCM Mike');
    expect(posts[0].seller.avatar).toBe('https://cdn.example/avatar1.png');
    expect(posts[0].seller.location).toBe('Point Breeze, Pittsburgh PA');

    expect(posts[1].id).toBe('post-iso-1');
    expect(posts[1].title).toBe('ISO standing desk');
    expect(posts[1].type).toBe('iso');
    if (posts[1].type === 'iso') {
      expect(posts[1].budget).toBe(200);
    }
    expect(posts[1].seller.id).toBe('user-buyer-2');
    expect(posts[1].seller.username).toBe('student_pitt');
    expect(posts[1].seller.displayName).toBe('Alex Student');
    expect(posts[1].seller.avatar).toBe('');
    expect(posts[1].seller.location).toBe('');
  });
  });

  describe('fetchFriendsFeedPosts', () => {
    it('returns [] for empty currentUserId without querying posts', async () => {
      const result = await fetchFriendsFeedPosts('', { includeSecondDegree: false });

      expect(result).toEqual([]);
      expect(getFollowingUserIds).not.toHaveBeenCalled();
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('with includeSecondDegree false, removes current user from allowed ids and returns [] when none remain', async () => {
      jest.mocked(getFollowingUserIds).mockResolvedValue(['self']);

      const result = await fetchFriendsFeedPosts('self', { includeSecondDegree: false });

      expect(result).toEqual([]);
      expect(getFollowingUserIds).toHaveBeenCalledWith('self');
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('with includeSecondDegree false, queries posts with first-degree ids only (excluding current user)', async () => {
      jest.mocked(getFollowingUserIds).mockResolvedValue(['follow-a', 'follow-b', 'me']);
      const postsChain = createPostsFriendsChain({ data: [], error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        select: postsChain.select,
      });

      await fetchFriendsFeedPosts('me', { includeSecondDegree: false });

      expect(supabase.from).toHaveBeenCalledTimes(1);
      expect(supabase.from).toHaveBeenCalledWith('posts');
      expect(postsChain.postsIn).toHaveBeenCalledWith(
        'user_id',
        expect.arrayContaining(['follow-a', 'follow-b']),
      );
      expect(postsChain.postsIn.mock.calls[0][1]).toHaveLength(2);
      expect(postsChain.select).toHaveBeenCalledWith('*, users(*)');
      expect(postsChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('with includeSecondDegree true, ignores second query error when isMissingSocialTable is true and merges addressee rows', async () => {
      jest.mocked(getFollowingUserIds).mockResolvedValue(['follow-1']);
      const missingTableError = { message: 'relation social_connections does not exist' };
      const socialChain = createSocialConnectionsChain({
        data: [{ addressee_id: 'fof-1' }],
        error: missingTableError,
      });
      const postsChain = createPostsFriendsChain({ data: [], error: null });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'social_connections') {
          return { select: socialChain.select };
        }
        if (table === 'posts') {
          return { select: postsChain.select };
        }
        throw new Error(`unexpected table: ${table}`);
      });
      jest.mocked(isMissingSocialTable).mockReturnValue(true);

      await fetchFriendsFeedPosts('me', { includeSecondDegree: true });

      expect(isMissingSocialTable).toHaveBeenCalledWith(missingTableError);
      expect(socialChain.inn).toHaveBeenCalledWith('requester_id', ['follow-1']);
      expect(socialChain.eq).toHaveBeenCalledWith('status', 'accepted');
      expect(postsChain.postsIn).toHaveBeenCalledWith(
        'user_id',
        expect.arrayContaining(['follow-1', 'fof-1']),
      );
      expect(postsChain.postsIn.mock.calls[0][1]).toHaveLength(2);
    });

    it('with includeSecondDegree true, throws secondError when isMissingSocialTable is false', async () => {
      jest.mocked(getFollowingUserIds).mockResolvedValue(['follow-1']);
      const secondError = { message: 'permission denied for table social_connections', code: '42501' };
      const socialChain = createSocialConnectionsChain({
        data: null,
        error: secondError,
      });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'social_connections') {
          return { select: socialChain.select };
        }
        throw new Error(`unexpected table: ${table}`);
      });
      jest.mocked(isMissingSocialTable).mockReturnValue(false);

      await expect(fetchFriendsFeedPosts('me', { includeSecondDegree: true })).rejects.toBe(secondError);

      expect(supabase.from).toHaveBeenCalledTimes(1);
      expect(supabase.from).toHaveBeenCalledWith('social_connections');
      expect(supabase.from).not.toHaveBeenCalledWith('posts');
    });

    it('returns posts sorted by sortRowsForHomeFeed then mapped with mapRowToPost', async () => {
      jest.mocked(getFollowingUserIds).mockResolvedValue(['author-1']);
      const older = '2024-01-01T12:00:00.000Z';
      const newer = '2026-06-01T12:00:00.000Z';
      const rows = [
        {
          id: 'post-older',
          type: 'sale',
          title: 'Older listing',
          description: '',
          category: 'Furniture' as const,
          created_at: older,
          images: [],
          price: 10,
          condition: 'Good' as const,
          sold: false,
          boosted_until: null,
          hashtags: [],
          users: minimalUser('author-1'),
        },
        {
          id: 'post-newer',
          type: 'sale',
          title: 'Newer listing',
          description: '',
          category: 'Electronics' as const,
          created_at: newer,
          images: [],
          price: 20,
          condition: 'Good' as const,
          sold: false,
          boosted_until: null,
          hashtags: [],
          users: minimalUser('author-1'),
        },
      ];
      const postsChain = createPostsFriendsChain({ data: rows, error: null });
      (supabase.from as jest.Mock).mockReturnValue({ select: postsChain.select });

      const posts = await fetchFriendsFeedPosts('me', { includeSecondDegree: false });

      expect(posts).toHaveLength(2);
      expect(posts[0].id).toBe('post-newer');
      expect(posts[1].id).toBe('post-older');
      expect(posts[0].title).toBe('Newer listing');
      expect(posts[1].title).toBe('Older listing');
    });
  });

  describe('fetchUserSaleListings', () => {
    it('returns [] for falsy userId without querying', async () => {
      await expect(fetchUserSaleListings('')).resolves.toEqual([]);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('rejects with the Supabase error when the query fails', async () => {
      const dbError = { message: 'row-level security', code: '42501' };
      const chain = createUserSaleListingsQuery({ data: null, error: dbError });
      (supabase.from as jest.Mock).mockReturnValue({ select: chain.select });

      await expect(fetchUserSaleListings('user-1')).rejects.toBe(dbError);

      expect(supabase.from).toHaveBeenCalledWith('posts');
      expect(chain.select).toHaveBeenCalledWith('*, users(*)');
      expect(chain.eqUserId).toHaveBeenCalledWith('user_id', 'user-1');
      expect(chain.eqType).toHaveBeenCalledWith('type', 'sale');
      expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('returns SalePost[] by mapping each row with mapRowToPost', async () => {
      const created = new Date(Date.now() - 10 * 60_000).toISOString();
      const rows = [
        {
          id: 'listing-a',
          type: 'sale',
          title: 'Desk',
          description: 'Solid wood',
          category: 'Furniture' as const,
          created_at: created,
          images: ['https://cdn.example/desk.jpg'],
          price: 80,
          condition: 'Good' as const,
          sold: false,
          boosted_until: null,
          hashtags: ['desk'],
          users: minimalUser('user-xyz'),
        },
        {
          id: 'listing-b',
          type: 'sale',
          title: 'Monitor',
          description: '',
          category: 'Electronics' as const,
          created_at: created,
          images: [],
          price: 120,
          condition: 'Like New' as const,
          sold: true,
          boosted_until: '2027-01-01T00:00:00.000Z',
          hashtags: [],
          users: minimalUser('user-xyz'),
        },
      ];
      const expected = rows.map((row) => mapRowToPost(row) as SalePost);

      const chain = createUserSaleListingsQuery({ data: rows, error: null });
      (supabase.from as jest.Mock).mockReturnValue({ select: chain.select });

      const listings = await fetchUserSaleListings('user-xyz');

      expect(listings).toHaveLength(2);
      expect(listings).toEqual(expected);
      listings.forEach((p) => {
        expect(p.type).toBe('sale');
      });
    });
  });

  describe('fetchSaleListingById', () => {
    it('rejects with the Supabase error when error is set', async () => {
      const dbError = { message: 'not found', code: 'PGRST116' };
      const chain = createSaleListingByIdQuery({ data: null, error: dbError });
      (supabase.from as jest.Mock).mockReturnValue({ select: chain.select });

      await expect(fetchSaleListingById('listing-404')).rejects.toBe(dbError);

      expect(supabase.from).toHaveBeenCalledWith('posts');
      expect(chain.select).toHaveBeenCalledWith('*, users(*)');
      expect(chain.eqId).toHaveBeenCalledWith('id', 'listing-404');
      expect(chain.eqType).toHaveBeenCalledWith('type', 'sale');
      expect(chain.maybeSingle).toHaveBeenCalled();
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
    ])('returns null when data is %s and error is unset', async (_label, data) => {
      const chain = createSaleListingByIdQuery({ data, error: null });
      (supabase.from as jest.Mock).mockReturnValue({ select: chain.select });

      await expect(fetchSaleListingById('any-id')).resolves.toBeNull();
    });

    it('returns mapRowToPost(data) as SalePost when data is present', async () => {
      const created = new Date(Date.now() - 3 * 60_000).toISOString();
      const row = {
        id: 'detail-listing-1',
        type: 'sale',
        title: 'Ceramic lamp',
        description: 'Mint condition',
        category: 'Decor' as const,
        created_at: created,
        images: ['https://cdn.example/lamp.png'],
        price: 35,
        condition: 'Like New' as const,
        sold: false,
        boosted_until: null,
        hashtags: ['lamp'],
        users: minimalUser('seller-99'),
      };
      const expected = mapRowToPost(row) as SalePost;
      const chain = createSaleListingByIdQuery({ data: row, error: null });
      (supabase.from as jest.Mock).mockReturnValue({ select: chain.select });

      const result = await fetchSaleListingById('detail-listing-1');

      expect(result).toEqual(expected);
      expect(result?.id).toBe('detail-listing-1');
      expect(result?.title).toBe('Ceramic lamp');
      expect(result?.type).toBe('sale');
    });
  });

  describe('applyListingBoost', () => {
    it('throws Error whose message is formatBoostRpcError(error) when rpc returns an error', async () => {
      const rpcError = { message: 'insufficient_credits', code: '42883' };
      jest
        .mocked(supabase.rpc)
        .mockResolvedValue({ data: null, error: rpcError } as Awaited<ReturnType<typeof supabase.rpc>>);
      jest.mocked(formatBoostRpcError).mockReturnValue('Boost failed: known test message');

      await expect(applyListingBoost('listing-abc')).rejects.toThrow('Boost failed: known test message');

      expect(supabase.rpc).toHaveBeenCalledWith('apply_listing_boost', {
        p_listing_id: 'listing-abc',
      });
      expect(formatBoostRpcError).toHaveBeenCalledWith(rpcError);
    });

    it('resolves when rpc returns no error', async () => {
      jest
        .mocked(supabase.rpc)
        .mockResolvedValue({ data: { ok: true }, error: null } as Awaited<ReturnType<typeof supabase.rpc>>);

      await expect(applyListingBoost('listing-ok')).resolves.toBeUndefined();

      expect(supabase.rpc).toHaveBeenCalledWith('apply_listing_boost', {
        p_listing_id: 'listing-ok',
      });
      expect(formatBoostRpcError).not.toHaveBeenCalled();
    });
  });
});
