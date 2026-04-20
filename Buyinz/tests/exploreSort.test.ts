import { sortNearbyStoresForExplore } from '@/lib/exploreSort';

describe('sortNearbyStoresForExplore', () => {
  const base = [
    { id: 'a', display_name: 'A', distanceMiles: 2, newItemsLast24h: 1 },
    { id: 'b', display_name: 'B', distanceMiles: 0.5, newItemsLast24h: 5 },
    { id: 'c', display_name: 'C', distanceMiles: 1, newItemsLast24h: 5 },
  ];

  it('sorts by distance ascending', () => {
    const sorted = sortNearbyStoresForExplore(base, 'distance');
    expect(sorted.map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });

  it('sorts by new items descending then distance', () => {
    const sorted = sortNearbyStoresForExplore(base, 'newItems');
    expect(sorted.map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });
});
