# Applying Supabase migrations

1. Open your Supabase project: **SQL Editor**.
2. Paste the contents of [`migrations/20260326120000_listing_boost.sql`](./migrations/20260326120000_listing_boost.sql).
3. Run the script once.

Alternatively, with the [Supabase CLI](https://supabase.com/docs/guides/cli): link the project and run `supabase db push` from the repo root (if your project is configured for migrations).

After applying, the app can call the `apply_listing_boost` RPC with the authenticated user’s JWT.
