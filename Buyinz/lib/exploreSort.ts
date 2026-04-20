export type ExploreSortMode = 'distance' | 'newItems';

export type ExploreSortableStore = {
  distanceMiles: number;
  newItemsLast24h: number;
  display_name: string;
};

export function sortNearbyStoresForExplore<T extends ExploreSortableStore>(
  list: T[],
  mode: ExploreSortMode,
): T[] {
  const copy = [...list];
  if (mode === 'distance') {
    copy.sort((a, b) => {
      const d = a.distanceMiles - b.distanceMiles;
      if (d !== 0) return d;
      return a.display_name.localeCompare(b.display_name);
    });
  } else {
    copy.sort((a, b) => {
      const n = b.newItemsLast24h - a.newItemsLast24h;
      if (n !== 0) return n;
      const d = a.distanceMiles - b.distanceMiles;
      if (d !== 0) return d;
      return a.display_name.localeCompare(b.display_name);
    });
  }
  return copy;
}
