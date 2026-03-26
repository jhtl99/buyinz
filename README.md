# Swipe Sell

A peer-to-peer marketplace project: browse local listings, chat with buyers and sellers, and complete sales with mutual confirmation and star ratings. The repo contains a **web prototype** (Vite + React) and a **mobile app** (Expo) that talks to **Supabase** for auth, data, storage, and realtime messaging.

## Repository layout

| Path | Description |
|------|-------------|
| `/` (this folder) | Web UI: Vite, React, TypeScript, Tailwind, shadcn-ui. Uses mock data for demos and UI work. |
| `Buyinz/` | Production-oriented **Expo** app (iOS, Android, web). Supabase-backed listings, profiles, messages, and transaction ratings. |

Work in whichever app matches your task; the Expo app under `Buyinz/` is where backend integration lives.

## Prerequisites

- **Node.js** 20+ (LTS recommended) and npm
- For **Buyinz**: an [Expo](https://docs.expo.dev/) environment (Expo Go or a dev build)
- A **Supabase** project if you run `Buyinz` against a real backend (see below)

## Web app (root)

```bash
npm install
npm run dev
```

Opens the Vite dev server (default port from Vite, often `5173`). Use `npm run build` for production builds and `npm run test` for Vitest.

## Buyinz (Expo mobile app)

```bash
cd Buyinz
npm install
npx expo start
```

Then press `i` / `a` / `w` for iOS simulator, Android emulator, or web. The app uses [Expo Router](https://docs.expo.dev/router/introduction/) (`app/` file-based routes).

### Environment

Create `Buyinz/.env` (or use your shell) with your Supabase **anon** key:

```bash
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

The Supabase project URL is configured in `Buyinz/lib/supabase.ts`. Point it at your own project if you are not using the shared team instance.

Without a valid key, some calls fall back to a dummy key and will fail against a real database; keep the key out of public repos.

### Database (Supabase)

SQL migrations live in `Buyinz/supabase/migrations/`. Apply them in the Supabase SQL editor (or your migration runner) so tables and policies match the app. Migrations add things like:

- `users` profile fields (including `average_rating` / `rating_count` when using ratings)
- `posts`, `conversations`, `messages`
- `user_ratings` and transaction completion timestamps on `conversations`

If Row Level Security blocks an operation (for example updating a conversation when marking a transaction complete), add or adjust policies in the Supabase dashboard so authenticated users can only act as intended.

Enable **Realtime** on relevant tables (e.g. `messages`, optionally `conversations`) if you want live updates without refreshing.

### Auth notes

Email signup and Google OAuth flows are wired through Supabase. For Google sign-in, configure redirect URLs in Supabase (Auth → URL Configuration) to match your Expo scheme (see comments in `Buyinz/lib/supabase.ts` and `Buyinz/app/create-profile.tsx`).

## Features (Buyinz)

- **Feed & discovery** — Listings with location/neighborhood-style discovery helpers.
- **Profiles** — Display name, username, bio, avatar; profile shows **average rating** when reviews exist.
- **Messaging** — Conversations per listing between buyer and seller; realtime message subscription.
- **Transactions & ratings** — Both parties can mark a deal complete in chat; after both confirm, each can submit a **1–5 star** rating for the other person. Averages are stored on `users` and updated when ratings are inserted.

## Scripts (Buyinz)

| Command | Purpose |
|---------|---------|
| `npm start` | `expo start` |
| `npm run ios` / `npm run android` / `npm run web` | Platform-specific dev |
| `npm run lint` | ESLint via Expo |

## Tech stack summary

**Web (root):** Vite, React, TypeScript, Tailwind CSS, Radix/shadcn-style components, React Router (as configured).

**Buyinz:** Expo SDK 54, React Native, Expo Router, Supabase JS client, `@expo/vector-icons`, `expo-image`, etc.

## License

Private / course use unless you add an explicit license.
