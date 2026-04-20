jest.mock('../supabase/client', () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

import { supabase } from '../supabase/client';
import { sortNearbyStoresForExplore } from '@/lib/exploreSort';
import { fetchNewSaleListingsCountLast24hBatch } from '@/supabase/newItemsCount';

describe('fetchNewSaleListingsCountLast24hBatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty object when no store ids', async () => {
    await expect(fetchNewSaleListingsCountLast24hBatch([])).resolves.toEqual({});
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('initializes every id to 0 when RPC returns no rows', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: [], error: null });

    const out = await fetchNewSaleListingsCountLast24hBatch(['s1', 's2']);

    expect(out).toEqual({ s1: 0, s2: 0 });
    expect(supabase.rpc).toHaveBeenCalledWith('new_sale_listings_count_last_24h_by_stores', {
      p_store_user_ids: ['s1', 's2'],
    });
  });

  it('deduplicates ids before calling RPC', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: [], error: null });

    await fetchNewSaleListingsCountLast24hBatch(['a', 'a', 'b']);

    expect(supabase.rpc).toHaveBeenCalledWith('new_sale_listings_count_last_24h_by_stores', {
      p_store_user_ids: ['a', 'b'],
    });
  });

  it('filters falsy ids', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: [], error: null });

    await fetchNewSaleListingsCountLast24hBatch(['x', '', 'y']);

    expect(supabase.rpc).toHaveBeenCalledWith('new_sale_listings_count_last_24h_by_stores', {
      p_store_user_ids: ['x', 'y'],
    });
  });

  it('merges counts from RPC rows and leaves missing stores at 0', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: [
        { store_user_id: 'a', new_count: 3 },
        { store_user_id: 'c', new_count: '12' },
      ],
      error: null,
    });

    const out = await fetchNewSaleListingsCountLast24hBatch(['a', 'b', 'c']);

    expect(out).toEqual({ a: 3, b: 0, c: 12 });
  });

  it('throws when RPC returns an error', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: new Error('rpc failed'),
    });

    await expect(fetchNewSaleListingsCountLast24hBatch(['z'])).rejects.toThrow('rpc failed');
  });
});

describe('sortNearbyStoresForExplore (Explore sort by new items vs distance)', () => {
  const base = [
    { id: 'a', display_name: 'A', distanceMiles: 2, newItemsLast24h: 1 },
    { id: 'b', display_name: 'B', distanceMiles: 0.5, newItemsLast24h: 5 },
    { id: 'c', display_name: 'C', distanceMiles: 1, newItemsLast24h: 5 },
  ];

  it('returns a new array instance without mutating the input array reference order of elements', () => {
    const copy = [...base];
    const sorted = sortNearbyStoresForExplore(copy, 'distance');
    expect(sorted).not.toBe(copy);
    expect(copy.map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('sorts by distance ascending, then display_name when distances tie', () => {
    const tie = [
      { id: 'x', display_name: 'Zebra', distanceMiles: 1, newItemsLast24h: 0 },
      { id: 'y', display_name: 'Alpha', distanceMiles: 1, newItemsLast24h: 0 },
    ];
    const sorted = sortNearbyStoresForExplore(tie, 'distance');
    expect(sorted.map((s) => s.id)).toEqual(['y', 'x']);
  });

  it('sorts by distance ascending', () => {
    const sorted = sortNearbyStoresForExplore(base, 'distance');
    expect(sorted.map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });

  it('sorts by new items count descending, then distance, then display_name', () => {
    const sorted = sortNearbyStoresForExplore(base, 'newItems');
    expect(sorted.map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });

  it('with newItems mode when all counts are zero, falls back to distance then name', () => {
    const zeros = [
      { id: 'far', display_name: 'Far', distanceMiles: 10, newItemsLast24h: 0 },
      { id: 'near', display_name: 'Near', distanceMiles: 0.1, newItemsLast24h: 0 },
    ];
    const sorted = sortNearbyStoresForExplore(zeros, 'newItems');
    expect(sorted.map((x) => x.id)).toEqual(['near', 'far']);
  });

  it('handles empty list', () => {
    expect(sortNearbyStoresForExplore([], 'distance')).toEqual([]);
    expect(sortNearbyStoresForExplore([], 'newItems')).toEqual([]);
  });
});
