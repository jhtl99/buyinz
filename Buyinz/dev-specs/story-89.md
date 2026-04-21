● Search (glob)
  │ "**/package.json"
  └ 1 file found

● Read package.json
  │ Buyinz/package.json
  └ 70 lines read

# Development Specification — Distance Discovery (Buyinz)

## 1. Ownership & History
* **Primary Owner:** BigBoa19 (GitHub username; opened the implementation PR)  
* **Secondary Owner:** cozey7 (GitHub username; merged the PR, or if not yet merged, the approving reviewer)  
* **Merge Date:** 2026-04-19

---

## 2. Architectural Diagrams (Mermaid)

Architecture Diagram — Execution zones (Client / Mobile Device vs Cloud / Supabase)
```mermaid
flowchart TD
  subgraph Client["Client / Mobile Device (Expo / React Native)"]
    RN[Expo / React Native App]
    UI[StoreListScreen / StoreCard components]
    LOC[LocationService (expo-location)]
    NET[HTTP Layer (fetch / @supabase/supabase-js)]
    RN --> UI
    UI --> NET
    UI --> LOC
    LOC --> RN
  end

  subgraph Cloud["Cloud / Supabase"]
    API[Supabase PostgREST / Realtime / Edge Functions]
    AUTH[Supabase Auth (JWT)]
    DB[(PostgreSQL)]
    API --> DB
    AUTH --> API
    NET --> API
  end

  style Client fill:#f3f9ff,stroke:#1f78b4
  style Cloud fill:#fff6f0,stroke:#d65a31

  NET ---|HTTPS / REST / Realtime| API
  RN ---|JWT (Authorization header)| AUTH
```

Information Flow Diagram — label flows as "U" (User Identifying Information) or "D" (Application Data)
```mermaid
flowchart LR
  subgraph Client["Client"]
    UserDevice[User Device]
    LocationModule[Location (lat,lng)]
  end

  subgraph Cloud["Supabase Cloud"]
    AuthService[Auth (JWT / user_id)]
    StoresAPI[Stores PostgREST]
    Postgres[(PostgreSQL stores table)]
  end

  UserDevice -- D: "GET /stores?participating=true" --> StoresAPI
  UserDevice -- U: "Authorization: Bearer <JWT>" --> AuthService
  AuthService -- U: "user_id (internal)" --> StoresAPI
  StoresAPI -- D: "SELECT * FROM stores" --> Postgres
  UserDevice -- D: "client lat,lng (used locally)" --> LocationModule
  LocationModule -.local compute.-> UserDevice
  UserDevice -- (no location sent if user denies) --> StoresAPI
```

Class Diagram — TypeScript interfaces and component relationships
```mermaid
classDiagram
  direction TB

  class ILocation {
    +latitude: number
    +longitude: number
  }

  class StoreRow {
    +id: string
    +name: string
    +address?: string
    +latitude: number
    +longitude: number
    +is_participating: boolean
    +created_at: string
    +updated_at: string
  }

  class StoreWithDistance {
    +store: StoreRow
    +distanceMeters: number
    +distanceText: string()
  }

  class ILocationService {
    <<interface>>
    +requestPermission(): Promise<LocationPermissionResult>
    +getCurrentPosition(): Promise<ILocation>
  }

  class LocationServiceImpl {
    +requestPermission()
    +getCurrentPosition()
    -_permissionStatus
    -_cachedLocation
  }

  class StoreListScreen {
    +componentDidMount()
    +render()
    -state: { loading:boolean, stores: StoreWithDistance[] }
    -fetchAndSortStores()
  }

  class DistanceUtils {
    <<static>>
    +haversineDistance(a: ILocation, b: ILocation): number
    +formatDistance(meters:number, unit?: "mi"|"km"): string
  }

  ILocation <|.. LocationServiceImpl
  StoreWithDistance o-- StoreRow : contains
  StoreListScreen ..> ILocationService : uses
  StoreListScreen ..> DistanceUtils : uses
```

---

## 3. Implementation Units (Classes / Interfaces / Modules)

Grouped by concept. Public fields/methods first; private/internal state next.

A. Types & Contracts (types.ts)
- Public:
  - interface ILocation
    - latitude: number — decimal degrees
    - longitude: number — decimal degrees
  - interface StoreRow
    - id: string (UUID) — canonical store id
    - name: string
    - address?: string
    - latitude: number
    - longitude: number
    - is_participating: boolean
    - created_at: string (ISO/TIMESTAMPTZ)
    - updated_at: string
  - interface StoreWithDistance
    - store: StoreRow
    - distanceMeters: number
    - distanceText?: string
- Private: none (interfaces are public contracts)

B. Location Service (locationService.ts)
- Public:
  - class LocationServiceImpl implements ILocationService
    - async requestPermission(): Promise<LocationPermissionResult>
      - triggers native permission prompt via expo-location; returns granted/denied and platform details
    - async getCurrentPosition(): Promise<ILocation>
      - resolves to latest lat/lng (or throws if permission denied)
  - export function createLocationService(): ILocationService
- Private:
  - _permissionStatus: cached permission state
  - _cachedLocation: last known ILocation
  - helpers: parseExpoLocationResponse(), backoff retry for transient failures

C. Distance Utilities (distanceUtils.ts)
- Public:
  - static haversineDistance(a: ILocation, b: ILocation): number
    - returns meters (double)
  - static formatDistance(meters: number, unit?: "mi"|"km"): string
    - returns user-facing string like "0.8 miles away"
- Private:
  - internal constants: EARTH_RADIUS_METERS
  - unit conversion helpers

D. Data Access / Queries (queries.ts)
- Public:
  - async function fetchParticipatingStores(): Promise<StoreRow[]>
    - uses @supabase/supabase-js client to read stores where is_participating=true
    - returns raw rows
- Private:
  - supabase client instance (imported from supabaseClient.ts)
  - retry/backoff helper for network faults
  - optional paging helper (if stores large)

E. UI Screen & Components
1. StoreListScreen (screens/StoreListScreen.tsx)
- Public:
  - component that renders list sorted by distance or fallback sort
  - props: none (reads auth from global)
  - methods:
    - componentDidMount / useEffect => orchestrates permission request, fetch, compute, sort, setState
    - renderStoreCard(storeWithDistance: StoreWithDistance)
- Private state:
  - loading: boolean
  - error?: Error | string
  - stores: StoreWithDistance[]
  - permissionGranted: boolean | null
  - unitPreference: "mi" | "km" (from user settings)
  - helpers: computeDistancesAndSort(location, stores)

2. StoreCard (components/StoreCard.tsx)
- Public:
  - props:
    - store: StoreRow
    - distanceText?: string
    - onPress?: (storeId) => void
  - renders store name, address, icons, and distance text ("0.8 miles away")
- Private:
  - internal layout helpers, avatars, loading placeholders

F. Presentation / Error UX (permissionsNotice.tsx)
- Public:
  - component showing fallback message when location permissions denied
  - includes a primary CTA: "Enable Location" (opens OS permission settings / deep-links to app settings)
- Private:
  - local state to manage ephemeral dismissals

G. supabaseClient.ts
- Public:
  - export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
- Private:
  - environment loader for keys, typed wrapper for queries

H. Integration Tests / Unit Tests
- Public:
  - distanceUtils.test.ts — unit tests verifying haversine results and formatting
  - storeListScreen.integration.test.ts — simulated flows for permission granted/denied using mocks
- Private:
  - mocking helpers for location and supabase fetches

Implementation flow (high level)
1. On mount, StoreListScreen calls LocationService.requestPermission().
2. If granted, call LocationService.getCurrentPosition(), then fetchParticipatingStores().
3. For each store row compute haversineDistance(current, store) -> distanceMeters.
4. Map to StoreWithDistance.distanceText by formatDistance().
5. Sort StoreWithDistance[] ascending by distanceMeters.
6. Render list with nearest first. If denied, fetchParticipatingStores() then sort fallback (alphabetical by name) and render with explanatory notice and CTA.

---

## 4. Dependency & Technology Stack

(Version values taken from Buyinz/package.json)

- TypeScript — "~5.9.2"
  - Usage: Static typing across the React Native codebase; interface contracts (StoreRow, ILocation) and compile-time checks for distance calculations and API contracts.
  - Rationale: Strong typing reduces runtime errors and simplifies refactors; chosen to match repository devDependencies.
  - Docs: https://www.typescriptlang.org/ — Microsoft

- React Native — "0.81.5"
  - Usage: Core UI framework for mobile screens/components (StoreListScreen, StoreCard).
  - Rationale: Already the app's target platform; performant native components and large ecosystem.
  - Docs: https://reactnative.dev/ — Meta (React Native Team)

- Expo SDK (expo) — "~54.0.33"
  - Usage: App runtime for development & distribution; uses expo-location for geolocation permissions and APIs.
  - Rationale: Simplifies native module management; provides expo-location and consistent permission APIs.
  - Docs: https://docs.expo.dev/ — Expo

- @supabase/supabase-js — "^2.100.0"
  - Usage: Client library for querying stores table, handling authentication (JWT), and optionally realtime subscriptions if used.
  - Rationale: Matches backend (Supabase) and provides first-class PostgREST + auth handling.
  - Docs: https://supabase.com/docs/reference/javascript/ — Supabase

- Node.js — (not specified in package.json)
  - Usage: Local builds, tests, bundling, scripts (postinstall, test).
  - Rationale: Node is required for build tooling; repo does not declare engines — recommend Node.js 18.x or newer for compatibility with dependencies.
  - Docs: https://nodejs.org/ — OpenJS Foundation

- expo-location (part of expo dependencies) — "~19.0.8"
  - Usage: Requesting and retrieving geolocation on device; handles prompting native permission.
  - Rationale: Expo-provided, maintained, consistent across platforms.
  - Docs: https://docs.expo.dev/versions/latest/sdk/location/ — Expo

- React & React DOM — "19.1.0"
  - Usage: UI primitives and DOM rendering for web target; consistent library versions with RN.
  - Rationale: Core library; matches project versions.
  - Docs: https://reactjs.org/ — Meta

Notes:
- All URLs above point to canonical vendor documentation pages and authors as indicated.

---

## 5. Database & Storage Schema

Primary long-term storage table(s) relevant to Distance Discovery.

Table: stores
- id — UUID — PRIMARY KEY — unique store identifier (UUID)
  - SQL type: uuid
  - Purpose: canonical id for store metadata and joins
  - Storage estimate: 16 bytes
- name — TEXT
  - SQL type: text
  - Purpose: display name of the store
  - Storage estimate: average 64 bytes (varies by name length)
- address — TEXT (nullable)
  - SQL type: text
  - Purpose: human-readable address shown on store card
  - Storage estimate: average 128 bytes
- latitude — DOUBLE PRECISION
  - SQL type: double precision
  - Purpose: geographic coordinate (decimal degrees)
  - Storage estimate: 8 bytes
- longitude — DOUBLE PRECISION
  - SQL type: double precision
  - Purpose: geographic coordinate (decimal degrees)
  - Storage estimate: 8 bytes
- is_participating — BOOLEAN (default true)
  - SQL type: boolean
  - Purpose: whether the store is participating in Buyinz
  - Storage estimate: 1 byte
- owner_user_id — UUID (nullable)
  - SQL type: uuid
  - Purpose: foreign key to users table (store owner)
  - Storage estimate: 16 bytes
- created_at — TIMESTAMPTZ
  - SQL type: timestamptz
  - Purpose: creation timestamp
  - Storage estimate: 8 bytes
- updated_at — TIMESTAMPTZ
  - SQL type: timestamptz
  - Purpose: last update timestamp
  - Storage estimate: 8 bytes
- metadata — JSONB (nullable)
  - SQL type: jsonb
  - Purpose: optional store attributes (hours, tags)
  - Storage estimate: variable; assume 256 bytes average

Estimated per-row storage (approximation):
- Fixed-size columns: id (16) + lat (8) + lng (8) + owner_user_id (16) + created_at (8) + updated_at (8) + is_participating (1) = 65 bytes
- Variable-size (estimates): name (64) + address (128) + metadata (256) = 448 bytes
- PostgreSQL per-row overhead (tuple header, alignment, TOAST pointers): ~24 bytes (conservative)
- Total estimate per store row: 65 + 448 + 24 ≈ 537 bytes ≈ ~0.54 KB

Indexing recommendations:
- INDEX ON (is_participating) — for query filtering
- GIST or SP-GIST on geography/point column if storing as geometry/geography for fast proximity queries (if using PostGIS / pg_geometry)
- INDEX ON (lower(name)) — for deterministic alphabetic fallback sorts

Alternative geolocation storage:
- geography(Point,4326) — if PostGIS available: storage ~ 25 bytes + index overhead; enables ST_Distance queries server-side if desired.

Supabase considerations:
- If proximity sorting is offloaded server-side, create an edge function or Postgres function using earthdistance or PostGIS for ORDER BY distance LIMIT n, returning distances in meters.

---

## 6. Resilience & Failure Modes

A. Process Crash | Lost Runtime State | Erased Stored Data
- User-visible effect:
  - Process crash on client: app may restart; transient location or UI state lost — user sees loading state again.
  - Erased stored data (DB): stores missing — list becomes empty; app must show an error/fallback message and contact support.
- Internal mitigation:
  - Client: persist minimal UI state (last successful store list) in AsyncStorage (with TTL) to show stale content if app crashes.
  - Backups: DB backups (Supabase automated backups) and point-in-time recovery procedures to restore erased data.
  - Logging: client crash reporting (Sentry) to identify crash triggers.

B. Database Corruption | RPC Failure | Client Overloaded
- User-visible:
  - Corruption: inconsistent store lists or errors; RPC timeouts return errors or empty lists.
  - Client overloaded (many stores rendered at once): UI jank, slow frame rates.
- Mitigation:
  - Corruption: DB integrity checks, verification scripts, and use of backups. Graceful error messages on the client.
  - RPC failure: retry with exponential backoff, circuit breaker, and cached fallback list from device storage.
  - Client overload: paginate results, virtualize list rendering (FlatList with windowing), batch rendering and skeleton UI.

C. Out of RAM | Database Out of Space | Network Loss
- User-visible:
  - Out of RAM: app may be killed or backgrounded — ensure minimal memory usage, avoid loading entire large datasets.
  - Database out of space: writes fail; reads may still work — new stores cannot be created/updated.
  - Network loss: cannot fetch latest stores; user sees cached list or explanatory message.
- Mitigation:
  - Memory: use virtualization; avoid in-memory duplication of store lists and large images; use optimized images with expo-image and placeholders.
  - DB space: monitor DB free space, alerts, auto-scaling plan with Supabase; retention policies for large metadata.
  - Network loss: offline-first UX: show cached last-known list + a toast explaining offline mode; queue up any client-side writes for later sync.

D. Database Access Loss | Bot Spamming
- User-visible:
  - DB access loss (e.g., auth failure): 401/403 responses; user may be shown sign-in prompt or error banners.
  - Bot spamming (automated scraping/requests): degraded performance; rate-limited or blocked behavior.
- Mitigation:
  - DB access loss: fail gracefully with consistent UI messages; fallback to cached data; implement health-checking and alerts for on-call.
  - Bot spamming: enforce rate limits (edge functions, Cloudflare rate limits), require authorization for write endpoints, use CAPTCHAs on public forms (if any), and monitor suspicious activity logs.

Operational responses
- Alerts: set SLOs and alerts on error rates, latency, DB storage pressure.
- Runbooks: clear step-by-step instructions for engineers on restoring DB backups, restarting services, and notifying stakeholders.

---

## 7. PII & Security (Privacy Analysis)

A. PII Stored (explicit)
- User PII relevant to Distance Discovery:
  - precise geolocation (latitude/longitude) if stored (e.g., user home store or owner coordinates) — sensitive
  - user name, email (auth / users table) — stored by Supabase Auth
  - phone number (if collected) — stored if present in users profile
  - store address (street-level) — may be PII for small owner-run shops
- Justification & minimization:
  - Only store store owner contact info and addresses required for operations; do not store live user location unless explicitly needed and consented.
  - For this story, client obtains current device location at runtime and uses it locally to compute distances; location is NOT sent to server unless a feature requires it. This minimizes PII retention.
  - If server-side proximity queries are implemented, consider sending only coarse location (city-level) or perform server-side distance using ephemeral coordinates and do not persist them in user profile.

B. Data Lifecycle (methods / fields movement)
- Permission flow:
  1. App triggers native permission via LocationService.requestPermission() (expo-location).
  2. If granted, LocationService.getCurrentPosition() returns ILocation (lat/lng).
  3. Client computes distances with DistanceUtils (local only).
  4. No write to DB required for distance sorting. If a feature requires persisting (e.g., “Save favorite location”), then:
     - saveFavoriteLocation(user_id, lat, lng) -> stores table or users.profile.locations (JSONB)
     - Retention policy: TTL per user request or user-managed deletion.
- Storage:
  - StoreRow (stores table) contains store lat/lng — persistent since it's store metadata required to find stores.
- Disposal:
  - Cached device location in AsyncStorage: TTL (e.g., 5 minutes) and automatic purge on sign out. Do not persist indefinitely.
  - Access logs: store access logs for auditing but purge per retention policy (e.g., 90 days).

C. Access Controls & Responsible Parties
- Primary DB security responsibility: Noah Choi (named responsible)
- Secondary DB security responsibility: Jonathan Gu (named responsible)
  - Both responsible for:
    - configuring DB RBAC, Supabase policies, and service role key custody
    - approving access requests and performing quarterly audits
    - running the incident response for suspected data leaks
- Audit procedures:
  - Role-based access controls: least privilege for application service keys (use anon key for read-only, service_role key kept server-side only).
  - Periodic reviews: quarterly review of privileged accounts, access logs, and grant adjustments.
  - Logging and alerting: enable audit logging in Supabase/Postgres, centralize logs to SIEM, run queries for unusual access patterns.
  - Access requests: documented ticketing workflow; privileged DB access granted temporarily with scope and approval recorded.

D. Security Controls & Hardening
- Data in transit: enforce HTTPS/TLS for all client-server communication; JWTs in Authorization header.
- Secrets: store SUPABASE service_role key only in server-side environment; mobile builds must use anon/public key and server-side functions for privileged operations.
- Encryption at rest: rely on Supabase/Postgres managed encryption; for extra sensitive fields (payment tokens), use field-level encryption and/or tokenization.
- Rate limiting & bot mitigation: apply Cloudflare or edge-level rate limiting; use edge functions to validate requests before invoking DB.

E. Minors
- Storage Policy:
  - The platform does not intentionally collect or store age data for minors under 18 during Distance Discovery flows.
  - If a user-provided profile includes an age/DOB field, it is stored only for regulatory use; currently there is no targeted minor-specific data collected for Distance Discovery.
- Safety & Compliance:
  - If the platform begins to handle minors' data, operations must comply with COPPA (where applicable) and local jurisdictional laws.
  - Access restrictions: PII for users under 18 will be treated with heightened controls; parental consent flows must be implemented before collecting persistent geolocation or contact details.
  - Moderation: owner contact data for minors’ accounts will be masked and accessible only to authorized staff after documented approval.

---

## Appendix — Acceptance & Implementation Notes

1. Machine Acceptance Implementation Checklist
   - [ ] Trigger native location permission prompt using expo-location.requestForegroundPermissionsAsync() (or equivalent) from LocationService.requestPermission().
   - [ ] On success, call getCurrentPositionAsync({accuracy}) and use returned coords {latitude, longitude}.
   - [ ] Use haversineDistance to compute meters between user coords and each StoreRow's lat/lng.
   - [ ] Convert to user-friendly units (miles or km) via formatDistance().
   - [ ] Sort StoreWithDistance[] ascending by numeric distanceMeters and render.
   - [ ] If permission denied: fetch stores, sort fallback (alphabetical by name), render with explanatory message and CTA to enable location.

2. Human Acceptance UX
   - Display the closest store at top when permission granted.
   - Distance string on each StoreCard formatted precisely (e.g., "0.8 miles away", rounding to 1 decimal for sub-1-mile; 0.0 for <50m shown as "Nearby").
   - For denied permissions: show a clear persistent banner with explanation and a button to open app settings.

3. Performance Considerations
   - If stores count is large (>1k), prefer server-assisted proximity filtering: accept ephemeral client location (not persisted) sent to an edge function which returns nearest N stores with distances computed server-side using PostGIS or earthdistance formulas; ensure ephemeral location transmission is done only after explicit consent and minimize retention.
   - For offline/slow networks, display cached last-known stores from AsyncStorage and mark them as possibly stale.

4. Testing
   - Unit tests for DistanceUtils (edge cases: antipodal points, very small distances).
   - Integration tests mocking expo-location responses for both granted and denied flows and asserting sort order and UI messages.
   - E2E flows (if present) to validate permission prompts (simulated on CI/emulators with permission toggles).

---

This specification is intended for engineering implementation and security audit. For design decisions requiring product confirmation (units preference, fallback sort rule), implement the default behaviors described above, and submit a short PR description referencing the user story and acceptance criteria.

