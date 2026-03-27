/** Maps Supabase/Postgres RPC errors from `apply_listing_boost` to short UI copy. */
export function formatBoostRpcError(error: unknown): string {
  const raw =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: string }).message)
      : String(error ?? 'Unknown error');

  const lower = raw.toLowerCase();

  if (lower.includes('not authenticated')) {
    return 'Sign in to boost a listing.';
  }
  if (lower.includes('already boosted')) {
    return 'This listing is already boosted.';
  }
  if (lower.includes('sold listings') || lower.includes('sold listing')) {
    return 'Sold listings cannot be boosted.';
  }
  if (lower.includes('only sale listings') || lower.includes('sale listings can be boosted')) {
    return 'Only sale listings can be boosted.';
  }
  if (lower.includes('not allowed')) {
    return 'You can only boost your own listings.';
  }
  if (lower.includes('listing not found') || lower.includes('not found')) {
    return 'Listing not found.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Network error. Check your connection and try again.';
  }

  return 'Could not apply boost. Please try again.';
}
