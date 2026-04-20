import type { SalePost } from '@/data/mockData';
import { supabase } from '@/supabase/client';
import { mapRowToPost } from '@/supabase/postMappers';
import {
  fetchFeedPosts,
  fetchSaleListingById,
  fetchStoreSaleListingsLast24h,
  fetchUserSaleListings,
} from '@/supabase/postsRead';

jest.mock('@/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

function mockPostsFeedQuery(result: { data: unknown; error: unknown }) {
  const order = jest.fn().mockResolvedValue(result);
  const select = jest.fn().mockReturnValue({ order });
  (supabase.from as jest.Mock).mockReturnValue({ select });
  return { order, select };
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

      expect(posts).toHaveLength(2);
      expect(posts[0].id).toBe('post-sale-1');
      expect(posts[0].type).toBe('sale');
      if (posts[0].type === 'sale') {
        expect(posts[0].price).toBe(450);
        expect(posts[0].images).toEqual(['https://cdn.example/img1.jpg']);
      }
      expect(posts[1].id).toBe('post-iso-1');
      expect(posts[1].type).toBe('iso');
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
          hashtags: ['desk'],
          users: minimalUser('user-xyz'),
        },
      ];
      const expected = rows.map((row) => mapRowToPost(row) as SalePost);

      const chain = createUserSaleListingsQuery({ data: rows, error: null });
      (supabase.from as jest.Mock).mockReturnValue({ select: chain.select });

      const listings = await fetchUserSaleListings('user-xyz');

      expect(listings).toHaveLength(1);
      expect(listings).toEqual(expected);
      expect(listings[0].type).toBe('sale');
    });
  });

  describe('fetchStoreSaleListingsLast24h', () => {
    it('chains user, type, sold, created_at filter and maps rows', async () => {
      const created = new Date(Date.now() - 60 * 60_000).toISOString();
      const row = {
        id: 'new-1',
        type: 'sale' as const,
        title: 'Jacket',
        description: '',
        category: 'Tops' as const,
        created_at: created,
        images: ['https://cdn.example/j.jpg'],
        price: 20,
        sold: false,
        hashtags: [],
        users: minimalUser('store-1'),
      };
      const order = jest.fn().mockResolvedValue({ data: [row], error: null });
      const gte = jest.fn().mockReturnValue({ order });
      const eqSold = jest.fn().mockReturnValue({ gte });
      const eqType = jest.fn().mockReturnValue({ eq: eqSold });
      const eqUser = jest.fn().mockReturnValue({ eq: eqType });
      const select = jest.fn().mockReturnValue({ eq: eqUser });
      (supabase.from as jest.Mock).mockReturnValue({ select });

      const listings = await fetchStoreSaleListingsLast24h('store-1');

      expect(supabase.from).toHaveBeenCalledWith('posts');
      expect(eqUser).toHaveBeenCalledWith('user_id', 'store-1');
      expect(eqType).toHaveBeenCalledWith('type', 'sale');
      expect(eqSold).toHaveBeenCalledWith('sold', false);
      expect(gte).toHaveBeenCalledWith('created_at', expect.any(String));
      expect(listings).toHaveLength(1);
      expect(listings[0].id).toBe('new-1');
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
});
