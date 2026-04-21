✗ Read package.json
  └ Path does not exist

✗ Read package.json
  │ landing/package.json
  └ Path does not exist

● Read package.json
  │ Buyinz/package.json
  └ 71 lines read

# Development Specification — "New Item Count" Feature

## 1. Ownership & History

* **Primary Owner:** cozey7 (GitHub username; opened the implementation PR)  
* **Secondary Owner:** BigBoa19 (GitHub username; merged the PR, or if not yet merged, the approving reviewer)  
* **Merge Date:** 2026-04-20

---

## 2. Architectural Diagrams (Mermaid)

### 2.1 Architecture Diagram
flowchart LR
  subgraph Client["Client / Mobile Device (Expo / React Native)"]
    direction TB
    RN[Expo / React Native App]
    StoreProfile[StoreProfileScreen]
    ItemCard[ItemCard Component]
    Badge[NewItemBadge Component]
    RN --> StoreProfile
    StoreProfile --> ItemCard
    ItemCard --> Badge
  end

  subgraph Cloud["Cloud / Supabase"]
    direction TB
    Auth[Supabase Auth]
    PostgREST[Supabase PostgREST / REST API]
    Realtime[Supabase Realtime]
    EdgeFuncs[Edge Functions (optional)]
    PG[PostgreSQL Database]
  end

  RN -- HTTPS (Bearer JWT) --> Auth
  RN -- HTTPS (Query /rpc or REST) --> PostgREST
  PostgREST --> PG
  EdgeFuncs --> PG
  Realtime <--> RN

  style Client fill:#f3f8ff,stroke:#1f6feb
  style Cloud fill:#f8fff3,stroke:#2eb85c

### 2.2 Information Flow Diagram (U = User Identifying Info, D = Application Data)
flowchart LR
  subgraph Mobile["Mobile / Expo App"]
    SP[StoreProfileScreen]
    IC[ItemCard]
  end

  subgraph Supabase["Supabase Cloud"]
    API[PostgREST / RPC endpoint: get_new_item_count(store_id)]
    DB[PostgreSQL: items table]
    AUTH[Supabase Auth]
  end

  SP -- "U: Authorization Bearer (JWT)" --> AUTH
  SP -- "D: GET /rpc/get_new_item_count?store_id=UUID" --> API
  API -- "D: SQL query: select count(*) from items where store_id=$1 AND created_at >= now() - interval '24 hours' AND active = true" --> DB
  DB -- "D: integer count" --> API
  API -- "D: { new_item_count: int }" --> SP
  SP -- "D: Render badge when count > 0" --> IC

  classDef u fill:#fff3e0,stroke:#ff8a00
  classDef d fill:#e8f5ff,stroke:#1f78d1
  class SP,AUTH u
  class API,DB,IC d

### 2.3 Class Diagram (TypeScript / React Native)
classDiagram
  class IRow {
    <<interface>>
    +id: string
    +created_at: string
  }

  class ItemRow {
    <<interface>>
    +id: string
    +store_id: string
    +title: string
    +description?: string
    +active: boolean
    +created_at: string
    +media_urls?: string[]
  }

  class StoreRow {
    <<interface>>
    +id: string
    +name: string
    +location?: string
    +created_at: string
  }

  class NewItemCountResponse {
    <<interface>>
    +new_item_count: number
  }

  class IProfileSlice {
    <<interface>>
    +storeId: string
    +newItemCount?: number
    +fetchNewItemCount(storeId: string): Promise<void>
  }

  class ProfileSlice {
    +storeId: string
    +newItemCount?: number
    +fetchNewItemCount(storeId: string): Promise<void>
    -_setNewItemCount(n: number): void
  }

  class StoreProfileScreen {
    +props: { storeId: string }
    +render(): JSX.Element
    +componentDidMount(): void
    -state: { loading: boolean, error?: Error }
  }

  class ItemCard {
    +props: { item: ItemRow }
    +render(): JSX.Element
    -state: { imageLoaded: boolean }
  }

  class NewItemBadge {
    +props: { count: number }
    +render(): JSX.Element
    -styles: object
  }

  IRow <|.. ItemRow
  IRow <|.. StoreRow
  IProfileSlice <|.. ProfileSlice
  ProfileSlice o-- StoreProfileScreen : uses
  StoreProfileScreen o-- ItemCard : composes
  ItemCard o-- NewItemBadge : composes

---

## 3. Implementation Units (Classes / Interfaces / Modules)

All paths use TypeScript/React Native conventions (example paths). Interfaces considered public contracts; component state is private.

Group: Types & Contracts
- src/types.ts
  - Public
    - interface ItemRow
      - id: string — UUID of item (public contract)
      - store_id: string — FK to store
      - title: string — short title
      - description?: string — optional text
      - active: boolean — whether item is active/listed
      - created_at: string — ISO timestamp
      - media_urls?: string[] — image URLs
    - interface StoreRow
      - id: string, name: string, location?: string, created_at: string
    - interface NewItemCountResponse
      - new_item_count: number — integer result from backend
  - Private
    - (none — types are public)

Group: Backend query (Supabase / RPC)
- src/api/queries.ts
  - Public
    - async function getNewItemCount(supabaseClient, storeId: string): Promise<number>
      - Accepts a configured supabase client and storeId, returns integer count for last 24 hours
  - Private
    - const QUERY_SQL: string — parameterized SQL or RPC name
    - input validation helpers (validateUUID)

Group: Supabase client wrapper
- src/api/supabaseClient.ts
  - Public
    - function createSupabaseClient(): SupabaseClient — returns configured client (url + anon key) plus auth handling
  - Private
    - env var reads, token refresh helpers

Group: Frontend Screens & Components
- src/screens/StoreProfileScreen.tsx
  - Public
    - props: { storeId: string }
    - render(): JSX.Element — renders header, store metadata, list of items (ItemCard)
    - lifecycle: useEffect(() => fetchNewItemCount(storeId), [storeId])
  - Private (component state)
    - loading: boolean
    - error?: Error
    - itemList: ItemRow[]
    - newItemCount?: number
    - helper: formatCountForDisplay()

- src/components/ItemCard.tsx
  - Public
    - props: { item: ItemRow }
    - render(): JSX.Element — image, title, metadata, optional NewItemBadge (if store-level)
  - Private
    - imageLoaded: boolean
    - imageLoadError: boolean
    - helpers: constructImageUri()

- src/components/NewItemBadge.tsx
  - Public
    - props: { count: number }
    - render(): JSX.Element — visually distinct badge text: `${count} New Today`
    - accessibilityLabel: string (e.g., "12 new items today")
  - Private
    - styles: color, size, placement helpers
    - shouldRender(): boolean — returns true if count > 0

Group: State management / slices
- src/store/profileSlice.ts
  - Public
    - state: { storeId: string, newItemCount?: number }
    - actions:
      - fetchNewItemCount(storeId: string): thunk — dispatches API call and stores integer
      - setNewItemCount(count: number)
  - Private
    - lastFetchedAt: Date | null
    - inFlightRequests: Map<storeId, Promise<number>>

Group: Tests
- tests/api/getNewItemCount.test.ts
  - Public
    - tests for counting logic, boundary around 24 hours, excluding inactive items
  - Private
    - test fixtures for items with created_at values

Group: UI Styling / Assets
- src/components/styles/badge.ts
  - Public
    - export default BadgeStyle
  - Private
    - colors, zIndex constants, responsive sizing

Group: Platform utilities
- src/utils/time.ts
  - Public
    - function isWithinLast24Hours(createdAt: string): boolean
  - Private
    - parse helpers, timezone normalization

Notes:
- All network calls return typed NewItemCountResponse or throw; UI treats errors as "no badge" with telemetry.
- Frontend only renders badge when count > 0 (per Machine Acceptance Criteria).

---

## 4. Dependency & Technology Stack

The versions below are pulled from the repository's package.json where specified.

| Technology | Required Version (package.json) | Specific usage in this story | Rationale | Docs / Source (Author) |
|---|---:|---|---|---|
| TypeScript | ~5.9.2 (devDependency) | Static typing for interfaces (ItemRow, API responses) and safer refactors | Strong type-safety; existing codebase uses it | https://www.typescriptlang.org/ (Microsoft) |
| React Native | 0.81.5 (dependency) | Mobile UI components, screens, rendering badge | Native mobile UI, existing project target | https://reactnative.dev/ (Meta) |
| Expo SDK | ~54.0.33 (dependency: expo) | App runtime, bundling, assets, testing on devices | Simplifies native builds for React Native app | https://docs.expo.dev/ (Expo) |
| @supabase/supabase-js | ^2.100.0 (dependency) | Client used for authenticated requests to Supabase (PostgREST/RPC) | Official Supabase client with typed helpers, realtime, auth | https://supabase.com/docs (Supabase) |
| Node.js | (not specified in package.json) — recommend >=18 LTS | Local development, bundling, scripts, CI runners | Current LTS ensures compatibility with dev toolchain | https://nodejs.org/ (OpenJS Foundation) |
| Jest | ^29.7.0 (devDependency) | Unit tests for backend query logic and frontend slices | Already in project; used for test coverage | https://jestjs.io/ (Facebook) |
| Other (Expo libs) | see package.json | Image, auth, secure store used by app for auth and media | Platform features and existing code integration | See package.json entries (Expo authors / contributors)

Notes:
- @supabase/supabase-js is the library used to perform the RPC/REST call that returns the new item count integer as required. Version ^2.100.0 is present in package.json.
- Node.js version is not declared in package.json engines; recommend documenting and pinning Node >=18 in CI.

---

## 5. Database & Storage Schema

Minimal relevant storage model (PostgreSQL schema). Column sizes and storage estimations are conservative approximations for planning.

Table: items
- id — UUID (uuid) — Primary key. Purpose: unique item identifier. Storage: 16 bytes
- store_id — UUID (uuid) — FK to stores.id. Purpose: link to store. Storage: 16 bytes
- title — TEXT — Short title. Purpose: display text. Avg 64 bytes + 4 bytes varlena = ~68 bytes
- description — TEXT — Optional detailed description. Avg 256 bytes + 4 = ~260 bytes (nullable)
- active — BOOLEAN — Whether item is currently listed. Storage: 1 byte
- created_at — TIMESTAMPTZ — When the item was created. Storage: 8 bytes
- updated_at — TIMESTAMPTZ — Last update time. Storage: 8 bytes
- media_urls — JSONB — optional array of image URL strings. Avg: 200 bytes (varies)
- metadata — JSONB — optional arbitrary metadata. Avg: 256 bytes
Estimated storage per items row (typical): 16 + 16 + 68 + 260 + 1 + 8 + 8 + 200 + 256 + row overhead (approx 24 bytes) = ~857 bytes ≈ 0.85 KB

Table: stores
- id — UUID — Primary key. Storage: 16 bytes
- name — TEXT — Display name. Avg 64 + 4 = ~68 bytes
- location — TEXT — optional store address. Avg 128 + 4 = ~132 bytes
- created_at — TIMESTAMPTZ — 8 bytes
- metadata — JSONB — optional 128 bytes
Estimated storage per stores row: 16 + 68 + 132 + 8 + 128 + overhead 24 ≈ 376 bytes ≈ 0.37 KB

Table: users (if present)
- id — UUID — 16 bytes
- email — TEXT — avg 32 + 4 = 36 bytes
- display_name — TEXT — avg 32 + 4 = 36 bytes
- created_at — TIMESTAMPTZ — 8 bytes
- last_sign_in — TIMESTAMPTZ — 8 bytes
Estimated per user row: ~104 bytes + overhead ≈ 128 bytes

Indexes and overhead:
- Index on items(store_id, created_at, active) is recommended to optimize the "new today" query; index size depends on rows and B-tree overhead.
- For a store with N items/day the RPC uses an index scan on (store_id, created_at) to be performant.

RPC / Query for Machine Acceptance:
- SQL (example RPC):
  CREATE FUNCTION get_new_item_count(store_uuid uuid) RETURNS integer AS $$
    SELECT count(*) FROM items
    WHERE store_id = store_uuid
      AND active = true
      AND created_at >= now() - interval '24 hours';
  $$ LANGUAGE sql STABLE;

Alternative: use PostgREST endpoint with query params:
  GET /items?store_id=eq.<UUID>&active=eq.true&created_at=gte.<ISO-24h-ago>&select=count

Storage estimation example:
- If site has 1M items rows: ~0.85 KB * 1,000,000 ≈ 850 MB (raw row payloads), plus index space and TOAST for large descriptions.

---

## 6. Resilience & Failure Modes

For each scenario, describe user-visible effects, internal effects, and mitigations.

1) Process Crash
- User-visible: Temporary inability to fetch new counts; UI shows no badge (graceful degradation).
- Internal: In-flight requests fail; transient caches cleared.
- Mitigation: Client shows cached last-known count if < 15 minutes old; on app restart, re-fetch. Backend processes deployed in auto-restart group (Supabase managed).

2) Lost Runtime State (client-side)
- User-visible: Badge may not appear until re-fetch; possible stale item list.
- Internal: Local slice state lost (e.g., newItemCount).
- Mitigation: Persist minimal last-known counts to AsyncStorage with timestamp; revalidate on foreground/resume.

3) Erased Stored Data
- User-visible: If items table corrupted or truncated, counts drop to zero; merchants see missing items.
- Internal: Data loss causes inconsistent counts and item references.
- Mitigation: Regular backups (Supabase/PG backups), point-in-time recovery retention policy, automated alerts for row-count anomalies (> 50% delta).

4) Database Corruption
- User-visible: RPC may fail with 5xx; UI hides badge and shows non-blocking error telemetry.
- Internal: Queries return errors or wrong counts.
- Mitigation: Monitoring alerts, DB restore procedures, failover to read-replica (if available). Run CHECK constraints and integrity tests in maintenance windows.

5) RPC Failure (timeouts, malformed params)
- User-visible: No badge shown; possible spinner then fallback.
- Internal: Errors logged with store_id and JWT removed for privacy in logs.
- Mitigation: Client retries with exponential backoff (max 2 retries), circuit breaker to prevent storming. Instrumentation (Sentry/Logs) for error analysis.

6) Client Overloaded (UI jank)
- User-visible: Slow UI rendering; badge delayed or frame drops.
- Internal: JS thread locked by heavy rendering.
- Mitigation: Keep badge render cheap (no blocking image decode), memoize NewItemBadge, run heavy list virtualization (FlatList) for item lists.

7) Out of RAM (server or client)
- User-visible: App crash or slow server responses.
- Mitigation: Memory limits per function/container, pagination and limit queries to reduce payloads, image resizing server-side.

8) Database Out of Space
- User-visible: 5xx errors; inability to write new items; badge may be stale or absent.
- Mitigation: Monitoring (alerts for free space < 15%), retention policy to archive old items, compress large JSONB fields, add storage scaling.

9) Network Loss
- User-visible: No badge until network restored; offline indicator shown.
- Internal: Requests fail, queued actions remain pending.
- Mitigation: Show offline UI; use optimistic UI only for non-critical flows; allow background re-fetch on connectivity regained.

10) Database Access Loss (credentials, permission misconfiguration)
- User-visible: Immediate failure for RPC calls; badges disappear.
- Mitigation: Secret rotation procedures, RBAC with least privilege, emergency runbooks to restore credentials, automated tests in CI to detect permission regressions.

11) Bot Spamming (automated writes to items)
- User-visible: Inflated new counts showing misleading badge numbers.
- Internal: DB write volume spike; possible rate limits exceeded.
- Mitigation:
  - Backend rate-limiting at edge functions or API gateway (per API key / user).
  - Validate authenticated actors; require verified seller accounts for item creation.
  - Add anomaly detection: if a single account creates > X items in 5 minutes, flag and throttle.
  - Display counts computed from distinct, validated sellers optionally.

Operational notes:
- Frontend displays badge only when API returns integer > 0 (Machine Acceptance). When API returns error or non-integer, UI logs telemetry and hides badge.
- Monitoring: track 24h new-item counts per store and deviations; alert when sudden spikes indicative of abuse.

---

## 7. PII & Security (Privacy Analysis)

### PII Stored (explicit)
- users.email (TEXT) — email address
- users.display_name (TEXT) — displayable name
- users.location (optional) — location string or geodata
- items.media_urls — may contain EXIF metadata if not stripped (risk)
- Authentication tokens (JWTs) — not stored in DB in plaintext; Supabase session store used

Note: Item and store data do not typically include sensitive PII, but images and descriptions may contain PII (names, phone numbers) if users include them.

### Retention and Lifecycle
- Ingestion:
  - Item creation flows: client POST to authenticated supabase endpoint or edge function with user JWT (U flow). Server validates seller account then inserts into items table with active = true and created_at = now().
- Storage:
  - Items persisted in items table (see schema). Backups performed via Supabase backup/point-in-time snapshots.
- Usage:
  - get_new_item_count RPC queries items where created_at >= now() - interval '24 hours' and active = true; returns integer to client.
- Deletion/Archival:
  - Soft-delete pattern: active=false used to remove from listing (immediate effect on counts).
  - Full data deletion policy: user account deletion triggers archival job or GDPR-compliant purge within retention window (defined in org policy).
- Logging:
  - Application logs must redact JWTs and full email addresses where possible; store truncated email hash for troubleshooting if required.

### Database Security: Responsible Parties
- Noah Choi — Responsible for database security (design, access control, audit).
- Jonathan Gu — Responsible for database security (operations, incident response).
  - Both are points of contact for security audits, credential rotations, and emergency DB access.

### Access Audit Procedures
- Principle of least privilege:
  - Frontend uses anon/public supabase keys only for read operations with RLS (Row-Level Security) where applicable.
  - Server-side runners or admin scripts use service_role keys stored in secrets manager and rotated quarterly.
- Audit logging:
  - All privileged DB access logged (who, when, query summary). Review cadence: weekly automated scan and quarterly manual audit.
- Approvals:
  - Schema or permission changes require code review and approval by either Primary or Secondary Owner plus one security owner (Noah or Jonathan).
- Emergency access:
  - Temporary elevated access must be recorded, limited in time, and followed by a post-incident review.

### Minors (under 18) policy
- Does the system store data for users under 18? The schema does not include age explicitly. If a user is under 18 and signs up, no special PII beyond standard user records are stored.
- Policy:
  - Avoid intentional collection of age unless necessary.
  - If under-18 users are present, do not collect additional PII like school details.
  - Any content (images/descriptions) that appears to involve minors must be reported and addressed per abuse policy.
  - Parental consent flows are not implemented; product should restrict features if legal obligations arise. Responsible parties (Noah, Jonathan) must be notified if minor-specific data collection is added.
  - Safety: rate-limit messaging and reporting features; provide explicit abuse reporting and takedown workflows.

---

## Implementation Notes (Engineer's Checklist)

- Backend (Supabase):
  - Implement RPC get_new_item_count(store_uuid) returning integer (as Machine Acceptance).
  - Ensure index exists on items(store_id, created_at, active) to avoid full table scans.
  - Enforce access rules: Only publicly reading the count is acceptable; if counts should be private, enforce RLS.
  - Add unit tests verifying boundary conditions: items created exactly 24 hours ago handled consistently (use >= or > semantics based on product decision).

- Frontend:
  - API call: client calls POST/GET to /rpc/get_new_item_count?store_id=UUID or call supabase.rpc('get_new_item_count', { store_uuid }).
  - Render NewItemBadge only when response.new_item_count > 0.
  - Accessibility: badge must include accessible label (e.g., "12 new items today") and not overlap main image (use safe zIndex and margin).
  - Do not display 0 or negative numbers. Sanitize backend result to non-negative integer before use.

- Telemetry & Observability:
  - Track success/failure rate of RPC, distribution of counts, and high-volume stores.
  - Log suppressed badge events (when count is zero) only as metrics, not as PII.

- Testing:
  - Unit tests for getNewItemCount behaviour using time mocking (freeze time, create items at t-24h+epsilon, t-24h-epsilon).
  - Integration test: full flow from item insert to API count to frontend conditional render (use a test Supabase instance or local stub).

- UX:
  - Copy: use format "12 New Today" (per Human Acceptance).
  - Visual: contrast ratio compliant color for badge; do not obscure primary image; responsive sizing for small screens.

---

## Queries (Examples)

- RPC (recommended):
  CREATE FUNCTION public.get_new_item_count(store_uuid uuid)
  RETURNS integer LANGUAGE sql STABLE AS $$
    SELECT count(*) FROM public.items
    WHERE store_id = store_uuid
      AND active = true
      AND created_at >= now() - interval '24 hours';
  $$;

- PostgREST query:
  GET /items?select=count&id=eq.<store_id>&active=eq.true&created_at=gte.<ISO-24h-ago>

---

## Acceptance Verification Checklist (for audit)

- [ ] Backend RPC exists and returns integer for valid store_id.
- [ ] Query uses created_at >= now() - interval '24 hours' semantics (documented test).
- [ ] Index on (store_id, created_at, active) exists and query plan shows index scan.
- [ ] Frontend conditionally renders badge only when returned integer > 0.
- [ ] UI shows no "0" or negative values; negative responses sanitized to 0 server-side.
- [ ] Badge visual design accessible, not overlapping primary content.
- [ ] Unit and integration tests covering edge cases (24h boundary, inactive items).
- [ ] Monitoring/alerts configured for RPC errors and abnormal count spikes.
- [ ] Security audit log of DB access and service_role key rotation documented; Noah Choi and Jonathan Gu are listed as DB security owners.

---

End of specification.

