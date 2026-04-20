jest.mock('../supabase/client', () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

import { supabase } from '../supabase/client';
import { fetchStoreFollowerCountsBatch } from '@/supabase/storeFollows';

describe('storeFollows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchStoreFollowerCountsBatch', () => {
    it('returns zeros for all ids when rpc returns no rows', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: [], error: null });

      const out = await fetchStoreFollowerCountsBatch(['x', 'y']);

      expect(out).toEqual({ x: 0, y: 0 });
      expect(supabase.rpc).toHaveBeenCalledWith('store_follower_counts', {
        p_store_ids: ['x', 'y'],
      });
    });

    it('merges follower counts from rpc rows', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: [
          { store_id: 'a', follower_count: 3 },
          { store_id: 'b', follower_count: 1 },
        ],
        error: null,
      });

      const out = await fetchStoreFollowerCountsBatch(['a', 'b', 'c']);

      expect(out).toEqual({ a: 3, b: 1, c: 0 });
    });
  });
});
