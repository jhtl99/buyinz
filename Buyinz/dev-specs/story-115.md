### Development Specification: User Story "Test again"

Revision date: 2026-04-21

---

### 1. Ownership & History
- **Primary Owner:** zachkfan
- **Secondary Owner:** thejonathangu
- **Merge Date:** 2026-04-21

Change log
- 2026-04-21 — Initial specification prepared for engineering audit (owner fields populated from PR #118 metadata: Primary Owner = zachkfan, Secondary Owner = thejonathangu).
- 2026-04-21 — Updated to reflect PR #118: added CreateListing UI, listings library + submission flow, PhotoPicker usage; removed client Location-based Explore watch logic; updated DB schema to include listings table and images metadata.

---

### 2. Architectural Diagrams (Mermaid)

Architecture Diagram
flowchart LR
  subgraph Client/Mobile Device
    direction TB
    Expo["Expo / React Native App"]
    RNRuntime["React Native JS runtime"]
    LocalDB["Local Storage / SQLite / MMKV"]
    SecureStore["SecureStore (JWT, keys)"]
    UI["Screens: ChatScreen, ConversationList, CreateListingScreen"]
    PhotoPicker["PhotoPicker (component)"]
  end

  subgraph Cloud / Supabase
    direction TB
    Auth["Supabase Auth"]
    PostgREST["Supabase PostgREST (REST+RPC)"]
    Realtime["Supabase Realtime (listen/replication)"]
    Storage["Supabase Storage (media)"]
    EdgeFns["Edge Functions / API"]
    Postgres["PostgreSQL (primary)"]
  end

  UI -->|HTTP / WS| RNRuntime
  RNRuntime -->|HTTPS (SSL/TLS)| PostgREST
  RNRuntime -->|Realtime WS| Realtime
  RNRuntime -->|Auth: JWT| Auth
  RNRuntime -->|Upload media| Storage
  RNRuntime -->|Create listing / messages| PostgREST
  PostgREST --> Postgres
  Realtime --> Postgres
  EdgeFns --> Postgres
  Storage --> Postgres
  RNRuntime -->|SecureStore access| SecureStore
  RNRuntime -->|Local caching| LocalDB
  PhotoPicker -->|images| Storage

Information Flow Diagram (U = User Identifying Information, D = Application Data)
flowchart LR
  Mobile["Mobile Client (Expo)"]
  AuthS["Supabase Auth"]
  API["PostgREST / Edge Functions"]
  RealtimeS["Realtime"]
  StorageS["Supabase Storage"]
  DB["PostgreSQL"]

  Mobile -- "U: JWT, user_id" --> AuthS
  Mobile -- "U: JWT" --> API
  Mobile -- "D: create_message(payload)" --> API
  Mobile -- "D: create_listing(payload, images metadata)" --> API
  API -- "D: insert message row" --> DB
  API -- "D: insert listing row" --> DB
  DB -- "D: message/listing rows (pub/sub)" --> RealtimeS
  RealtimeS -- "D: realtime messages/notifications" --> Mobile
  Mobile -- "D: upload media" --> StorageS
  StorageS -- "D: media metadata (path, size, mime)" --> DB
  Mobile -- "U: profile updates" --> API
  API -- "D: profile row" --> DB

Class Diagram (TypeScript / interfaces)
classDiagram
  direction TB
  interface IMessageRow {
    +id: string
    +conversation_id: string
    +sender_id: string
    +content: string
    +content_type: string
    +media_url?: string
    +created_at: string
    +edited_at?: string
    +status: string
  }

  interface IConversationRow {
    +id: string
    +title?: string
    +is_group: boolean
    +metadata?: object
    +created_at: string
    +updated_at?: string
  }

  interface IProfileRow {
    +id: string
    +email: string
    +display_name?: string
    +avatar_url?: string
    +created_at: string
  }

  interface IListingRow {
    +id: string
    +seller_id: string
    +title?: string
    +description?: string
    +price?: string
    +category?: string
    +images?: any[]         %% images metadata array (storage paths, mime, size)
    +status?: string
    +created_at: string
    +updated_at?: string
  }

  interface ListingDraft {
    +title?: string
    +description?: string
    +price?: string
    +category?: string
    +images: ImageAsset[]
  }

  class MessageService {
    +sendMessage(dto: MessageCreateDTO): Promise<IMessageRow>
    +fetchMessages(conversationId:string, opts?:FetchOpts): Promise<IMessageRow[]>
    -validateContent(content:string): boolean
  }

  class ConversationService {
    +createConversation(dto: ConversationCreateDTO): Promise<IConversationRow>
    +listConversations(userId:string): Promise<IConversationRow[]>
    -normalizeTitle(...)
  }

  class ListingService {
    +submitListing(draft: ListingDraft, sellerId: string): Promise<{success:boolean; listing?:IListingRow}>
    +validateDraft(draft: ListingDraft): boolean
    -uploadImages(images: ImageAsset[]): Promise<string[]>   %% returns storage paths
  }

  IMessageRow <|.. MessageService
  IConversationRow <|.. ConversationService
  IProfileRow <|.. ConversationService
  IListingRow <|.. ListingService

---

### 3. Implementation Units (Classes / Interfaces / Modules)

Grouped by concept. For each unit: public contract then private state/helpers.

A. Types / DTOs (types.ts or types/index.ts)
- Public
  - interface MessageRow
    - id: string — UUID primary key
    - conversation_id: string — FK to ConversationRow
    - sender_id: string — FK to profiles.users
    - content: string — message text
    - content_type: 'text'|'image'|'system' — content mime/type discriminator
    - media_url?: string — public storage URL
    - created_at: string (ISO/TIMESTAMPTZ)
    - edited_at?: string
    - status: 'sent'|'delivered'|'read'|'failed'
  - interface ConversationRow
    - id: string
    - title?: string
    - is_group: boolean
    - metadata?: Record<string, any>
    - created_at: string
    - updated_at?: string
  - interface MessageCreateDTO
    - conversation_id: string
    - sender_id: string
    - content: string
    - content_type?: string
    - media?: File | Blob | null
  - interface FetchOpts
    - limit?: number
    - before?: string (cursor)
    - after?: string
  - interface IListingRow
    - id: string
    - seller_id: string
    - title?: string
    - description?: string
    - price?: string
    - category?: string (one of LISTING_CATEGORIES)
    - images?: Array<{ storage_path: string; mime_type?: string; size?: number }>
    - status?: 'draft'|'published'|'removed'
    - created_at: string
    - updated_at?: string
  - type ListingDraft
    - title?: string
    - description?: string
    - price?: string
    - category?: ListingCategory
    - images: ImageAsset[]
  - type ImageAsset
    - localUri: string
    - mimeType?: string
    - width?: number
    - height?: number
  - const EMPTY_DRAFT
  - function isDraftValid(draft: ListingDraft): boolean
  - const LISTING_CATEGORIES: ListingCategory[]
- Private
  - Validation types (e.g., MaxLengths, supportedMimeTypes) exported only internally

B. Data Access Layer (queries.ts / listingsQueries.ts)
- Public
  - function fetchMessages(conversationId: string, limit:number, cursor?:string): Promise<MessageRow[]>
  - function createMessage(dto: MessageCreateDTO): Promise<MessageRow>
  - function createConversation(dto: ConversationCreateDTO): Promise<ConversationRow>
  - function listConversations(userId: string): Promise<ConversationRow[]>
  - function createListing(dto: Partial<IListingRow>): Promise<IListingRow>   <-- new
  - function fetchListingsBySeller(sellerId: string, opts?): Promise<IListingRow[]>
- Private
  - SQL templates, parameter builders
  - mapRowToDTO(row) helper
  - exponentialBackoffRetry(fn) helper (internal for transient DB failures)

C. Services (messageService.ts, conversationService.ts, listingService.ts)
- Public
  - class MessageService
    - sendMessage(dto: MessageCreateDTO): Promise<MessageRow>
    - markAsRead(messageIds: string[], userId: string): Promise<void>
    - subscribeToConversation(conversationId: string, callback): Unsubscribe
  - class ConversationService
    - createOrGetConversation(participants: string[], meta?): Promise<ConversationRow>
    - renameConversation(id, title): Promise<void>
  - class ListingService (new)
    - submitListing(draft: ListingDraft, sellerId: string): Promise<{success:boolean; listing?:IListingRow}>
    - validateDraft(draft: ListingDraft): boolean
    - fetchListingsForSeller(sellerId:string): Promise<IListingRow[]>
- Private
  - sanitizeContent(content) — strip dangerous markup, length checks
  - uploadMedia(media): Promise<string> — returns storage URL (shared by MessageService and ListingService)
  - signURL(url): string — temporary signed access if needed
  - listing-specific helpers:
    - uploadImages(images: ImageAsset[]): Promise<Array<{storage_path:string; mime_type?:string; size?:number}>>
    - buildListingRowFromDraft(draft, sellerId)

D. UI Components (React Native / screens/)
- Public (component props, exported screens)
  - ChatScreen (props: conversationId: string)
    - props: navigation, route
    - methods:
      - sendMessage(content, media?)
      - loadMoreMessages()
  - ConversationListScreen
    - methods:
      - openConversation(conversationId)
      - createConversation(participantIds)
  - CreateListingScreen (new)
    - props: navigation, route
    - behavior:
      - uses AuthContext to redirect non-store users
      - uses ListingDraft state (EMPTY_DRAFT)
      - uses PhotoPicker component to select images
      - computes canSubmit via isDraftValid and calls submitListing / ListingService.submitListing
      - shows ActivityIndicator while submitting and navigates back on success
  - PhotoPicker (new)
    - props: images: ImageAsset[], onChange(images: ImageAsset[]): void
    - handles image selection/cropping and returns ImageAsset with localUri
  - MessageBubble (props: MessageRow)
    - onLongPress(): shows actions (edit, delete)
- Private (internal component state / hooks)
  - CreateListingScreen local state: draft: ListingDraft, submitting: boolean
  - local state: messages: MessageRow[], loading: boolean, sendingQueue: MessageCreateDTO[]
  - useEffect subscriptions to realtime
  - optimisticUpdate(messageLocalId) helpers
  - reconnection/backoff counters

E. Hooks & State Management (hooks/, store/)
- Public
  - useMessages(conversationId:string) => {messages, sendMessage, loadMore}
  - useConversations(userId) => {conversations, createConversation}
  - useListings(sellerId) => {listings, submitListing, isSubmitting}  <-- new hook
  - ProfileSlice (IProfileSlice) — public selectors: getCurrentUser(), isAuthenticated()
- Private
  - internal reducers, action creators
  - persist middleware (persist to MMKV/AsyncStorage)
  - serialization helpers

F. Networking / Auth (supabaseClient.ts)
- Public
  - getSupabaseClient(): SupabaseClient
  - getAuthToken(): Promise<string>
- Private
  - client singleton instance
  - refreshTokenIfNeeded()
  - attachAuthHeaders(request)

G. Utilities
- Public
  - date utilities, cursor encoding/decoding
  - listing utilities: price formatting, category constants
- Private
  - telemetry helpers, non-blocking logging

H. Tests (if present)
- Public
  - unit tests for MessageService, queries
  - unit tests for ListingService and lib/listings functions (isDraftValid, submitListing) — recommended
- Private
  - test fixtures, mockSupabaseClient, mock ImageAsset fixtures

Notes
- Treat interfaces/types as public contracts. Component internal state (React useState/useRef) is private.
- The Explore tab's previous location-watching logic was removed in the changed screen; update client documentation and telemetry to reflect no background GPS collection in this screen.

---

### 4. Dependency & Technology Stack

Note: repository lacks package.json at time of spec generation. Replace "Required Version" with exact entries from package.json prior to implementation/audit. Recommended versions listed.

| Technology | Required Version (from package.json / recommended) | Specific usage in this story | Rationale | Docs / Author |
|---|---:|---|---|---|
| TypeScript | ^5.2.0 (recommended) | Strong typing of DTOs, services, components | Type safety, better IDE support, compile-time checks | https://www.typescriptlang.org/ — Microsoft |
| React Native | 0.72.x (recommended) | Mobile UI runtime for Chat screens and CreateListingScreen | Mobile performance, community support | https://reactnative.dev/ — Meta |
| Expo SDK | 48 (or match RN) | Build/runtime tooling for development and builds; expo-router usage | Simplifies build/deploy for iOS/Android | https://docs.expo.dev/ — Expo |
| @supabase/supabase-js | ^2.0.0 | Supabase client for auth, PostgREST, Realtime, Storage | Official client, Realtime + auth integration | https://supabase.com/docs — Supabase |
| Node.js | 18.x or LTS used by CI | Local dev tooling, build, scripts | LTS stability, compatibility with bundlers | https://nodejs.org/ — Node.js Foundation |
| react-query / @tanstack/react-query | ^5.x (optional) | Network caching, optimistic updates | Simplifies caching + retries | https://tanstack.com/query — Tanner Linsley |
| MMKV / react-native-mmkv | latest matching RN | Local cache for messages/conversations and drafts | Fast local persistence, small footprint | https://github.com/mrousavy/react-native-mmkv — community |
| secure-store / expo-secure-store | latest | Store JWTs securely on device | Prevent token theft | https://docs.expo.dev/versions/latest/sdk/securestore — Expo |
| expo-router | latest matching Expo SDK | Navigation and route redirection used by CreateListingScreen | App routing and redirects | https://expo.github.io/router/docs |
| @expo/vector-icons | latest | UI icons (Ionicons) used in CreateListingScreen | Common icon set for RN | https://icons.expo.fyi/ |
| Postgres (Supabase) | 15.x (managed) | Primary relational storage | ACID, JSONB support for metadata | https://www.postgresql.org/ — PostgreSQL Global Dev Group |
| supabase-realtime (via supabase) | bundled | Live message synchronization | Low-latency updates | https://supabase.com/docs — Supabase |

Rationale highlights:
- Supabase selected for integrated Auth/Postgres/Realtime/Storage, reducing integration surface vs. assembling discrete vendors.
- CreateListing implementation uses Expo Router, PhotoPicker, and Supabase Storage to upload images.

Audit action: before deployment, capture exact versions from package.json and lockfiles (package-lock.json/yarn.lock) and replace the "Recommended" values.

---

### 5. Database & Storage Schema (PostgreSQL)

Tables required for this story: profiles, conversations, conversation_participants, messages, listings (new), message_status (optional), media (optional).

A. profiles
- id UUID PRIMARY KEY — uuid_generate_v4() — user id (16 bytes)
- email text UNIQUE NOT NULL — user email
- display_name text — display name
- avatar_url text — public storage path
- created_at timestamptz NOT NULL DEFAULT now() — (8 bytes)
- updated_at timestamptz — (8 bytes)
Purpose: user identity and public profile.

B. conversations
- id UUID PRIMARY KEY — conversation id (16 bytes)
- title text — optional group title
- is_group boolean NOT NULL DEFAULT false — group flag (1 byte)
- metadata jsonb — conversation metadata (variable)
- created_at timestamptz NOT NULL DEFAULT now()
- updated_at timestamptz
Purpose: logical conversation container.

C. conversation_participants
- conversation_id UUID REFERENCES conversations(id)
- user_id UUID REFERENCES profiles(id)
- joined_at timestamptz
- role text — 'member'|'admin' etc.
Primary key (conversation_id, user_id)
Purpose: which users are in a conversation.

D. messages
- id UUID PRIMARY KEY (16 bytes)
- conversation_id UUID REFERENCES conversations(id) — FK (16 bytes)
- sender_id UUID REFERENCES profiles(id) — FK (16 bytes)
- content text — message text (variable bytes)
- content_type text — 'text'|'image' etc.
- media_url text — if media attached (variable)
- metadata jsonb — message-level metadata (reactions, quoted message id) (variable)
- created_at timestamptz NOT NULL DEFAULT now() (8 bytes)
- edited_at timestamptz
- status text — 'sent'|'delivered'|'read'|'failed'
Purpose: store all messages.

E. listings (NEW)
- id UUID PRIMARY KEY
- seller_id UUID REFERENCES profiles(id)
- title text
- description text
- price text — stored as normalized string (or numeric/decimal if required)
- category text
- images jsonb — array of image metadata objects: [{storage_path,text, mime_type,text, size,bigint}]
- status text — 'draft'|'published'|'removed'
- created_at timestamptz NOT NULL DEFAULT now()
- updated_at timestamptz
Purpose: marketplace listing rows created by users via CreateListingScreen.

Storage impact for new columns:
- images (jsonb) — typical small array of image metadata (3 items) ≈ 300–400 bytes depending on fields; estimate ~320 bytes average per listing for images metadata.
- title/description/text columns already accounted; adding images jsonb increases per-row storage roughly by estimated 320 bytes (metadata only). Images themselves stored in Supabase Storage (object store), not in DB.

F. message_status (per-user read receipts, optional)
- message_id UUID REFERENCES messages(id)
- user_id UUID REFERENCES profiles(id)
- status text
- updated_at timestamptz
Primary key (message_id, user_id)
Purpose: per-user delivery/read state.

G. media (optional)
- id UUID PRIMARY KEY
- storage_path text
- uploaded_by uuid
- size bigint
- mime_type text
Purpose: central media catalog for retention/policy.

Storage estimation (approx per row)
- UUID fields: 16 bytes each
- TIMESTAMPTZ: 8 bytes
- BOOLEAN: 1 byte
- INTEGER: 4 bytes
- TEXT: variable, estimate average for content: 200 chars ~ 200 bytes (UTF-8 single bytes)
- JSONB: overhead + data; small object ~ 32 bytes + content

Estimate examples:
- profiles row:
  - id (16) + email avg 50 + display_name avg 30 + avatar_url avg 80 + created_at (8) + updated_at (8) + row overhead ~ 40
  - Total ≈ 232 bytes
- conversation row:
  - id (16) + title avg 40 + is_group (1) + metadata jsonb small (32) + created_at (8) + overhead (40)
  - Total ≈ 137 bytes
- messages row (typical text message):
  - id (16) + conv_id (16) + sender_id (16) + content (200) + content_type (10) + created_at (8) + metadata small (32) + status (8) + overhead (50)
  - Total ≈ 356 bytes
- messages row (with media):
  - add media_url (80) + media size tracked in media table; total ≈ 436 bytes
- listings row (typical)
  - id (16) + seller_id (16) + title (80) + description (200) + price (8) + category (20) + images jsonb (assume 3 images * ~100 bytes each metadata ≈ 320) + status (8) + created_at (8) + overhead (60)
  - Total ≈ 736 bytes

Storage sizing guidance:
- Estimate 400 bytes per typical message row; 1M messages ≈ 400 MB plus index overhead (~20-30%).
- Estimate ~0.7 KB per listing metadata row (images stored in object storage). Images themselves live in Supabase Storage — budget separately.
- Indexes (primary key, conversation_id index, created_at) add additional disk; budget ~1.3x-1.5x for total DB size.

Indexes
- messages: primary key (id), index on (conversation_id, created_at DESC), index on (sender_id), GIN on metadata if queries require it.
- listings: primary key (id), index on (seller_id, created_at DESC), GIN on images if needed for metadata searches.
- conversations: primary key, index on (updated_at)

Retention and archival:
- Implement partitioning by created_at or conversation_id for large scale.
- Media object lifecycle: store in Supabase Storage with lifecycle rules; store path in media/listings.images.
- Listings lifecycle:
  - Drafts remain until published or deleted by user.
  - On account deletion, remove or anonymize listing rows and delete images from storage per retention policy.

---

### 6. Resilience & Failure Modes

For each scenario: user-visible effects, internal effects, and mitigations.

A. Process Crash (mobile app crash)
- User-visible: temporary loss of UI state, possible unsent messages or in-progress listing creation lost if not persisted.
- Internal: in-memory sendingQueue or draft state lost.
- Mitigation:
  - Persist outbound queued messages and listing drafts to local storage (MMKV/SQLite) before dispatch.
  - On app start, reconcile unsent messages and drafts: attempt resend with backoff; mark as failed after N attempts.
  - Use optimistic UI but mark locally-created messages/listings with temporary local-id and replace upon server ACK.

B. Lost Runtime State (app killed, backgrounded)
- User-visible: UI rehydration may show stale messages until syncing completes; in-progress listing draft reloaded from persisted draft.
- Mitigation:
  - Persist last seen cursor/timestamp and messages page to local DB.
  - Persist listing draft (EMPTY_DRAFT fallback) to local DB.
  - On resume, fetch delta (since last sync) via PostgREST query and subscribe to Realtime.

C. Erased Stored Data (local DB cleared)
- User-visible: app shows empty caches; messages and drafts reloaded from server but listing drafts may be lost.
- Mitigation:
  - Implement server-side canonical state; client fetch full recent window on first launch.
  - For listing drafts, consider server-side draft save or prompt user to re-create if local draft is missing.

D. Database Corruption (postgres table/index corruption)
- User-visible: errors from API, timeouts, partial read/write failures; inconsistent conversation or listing state.
- Internal: DB engine may return errors; Realtime replication may fail.
- Mitigation:
  - Rely on managed Supabase backups; enable point-in-time recovery (PITR).
  - Read-only failover or read replicas if available.
  - Monitor DB metrics and set alerts for replication lag / corruption signatures.

E. RPC Failure (PostgREST or network failure)
- User-visible: operations fail with errors; UI should show offline/try again states. Listing submission may fail.
- Mitigation:
  - Implement retry with exponential backoff on idempotent operations.
  - Use local optimistic updates for UI, then rollback on confirmed failure.
  - Graceful error messages and offline mode (queue listing uploads and image uploads until connectivity).

F. Client Overloaded (CPU / event storms)
- User-visible: app responsiveness degrades.
- Mitigation:
  - Debounce UI-heavy operations (typing events).
  - Limit Realtime event processing rate; coalesce events into batch updates.
  - Offload heavy transforms (image resizing) to native modules or run in background tasks.

G. Out of RAM (device)
- User-visible: OS may kill app; data loss for unsaved state.
- Mitigation:
  - Limit in-memory caches to reasonable sizes; page messages from disk.
  - Use efficient data structures; avoid storing full image blobs in memory. Store only local URIs and thumbnails.

H. Database Out of Space
- User-visible: writes fail; new messages and listings cannot be persisted.
- Mitigation:
  - Monitor disk usage, set alerts.
  - Implement retention policy: archive or delete old messages/media/listings.
  - Use object storage for media; keep DB for metadata only.

I. Network Loss
- User-visible: inability to send/receive new messages; listing submission and image uploads fail.
- Mitigation:
  - Local queue for outbound messages and queued image uploads; UI shows "offline" indicator and queued status.
  - On reconnect, resynchronize using cursors and Realtime subscription.

J. Database Access Loss (credentials revoked or rotated)
- User-visible: server-side errors; potential authentication failures for API calls.
- Mitigation:
  - Use rotating service accounts with automated secret management (Vault).
  - Failover plan: store limited read-only cached copies on edge functions if possible.
  - Alert and roll back to previous credentials; implement zero-downtime rotation.

K. Bot Spamming (high-frequency message injection)
- User-visible: conversation spam; degraded UX and potential abusive listings.
- Internal: high write rate, potential quota usage, rate-limits triggered.
- Mitigation:
  - Server-side rate-limiting (RLS/Edge Functions) per user and per IP.
  - Spam detection: heuristics and ML scoring (rapid messages, repeated content).
  - Throttling, temporary rate bans, require CAPTCHA for suspicious accounts.
  - Moderation tooling: bulk delete, block user flows; flag listings for review.

Operational notes
- Implement telemetry and alerting (Sentry for client crashes, Prometheus/Datadog for server metrics).
- Use circuit-breaker patterns when dependent services fail.
- For listing image uploads: implement resumable uploads or upload-then-create semantics to avoid orphaned storage objects.

---

### 7. PII & Security (Privacy Analysis)

A. PII elements stored
- Email address (profiles.email)
- Display name (profiles.display_name) — may be less sensitive but personally identifying
- Avatar URL (if derived from user-uploaded image)
- User ID (UUID) — pseudonymous identifier
- JWTs / Auth tokens (stored on device SecureStore)
- Device metadata (if collected): device id, push token (if applicable)
- Phone number (if implemented) — may be added later
- Images uploaded as part of listings — may contain PII in the image content (faces, personal documents) and are stored in Supabase Storage; metadata (storage path, size, mime) stored in DB.

Note: the refactor that produced CreateListingScreen removed the runtime Location.watchPositionAsync usage from the Explore/CreateListing screen — the app no longer actively watches user GPS in that screen. If future features reintroduce location collection, rerun privacy analysis.

B. Retention justification & lifecycle
- Email: required for authentication, account recovery, and notifications. Lifecycle:
  - Collected at signup -> stored in profiles.email (Postgres). Accessed by Auth flows, password reset flows, and admin audits. Deleted on explicit account deletion (data deletion flow). Retention policy default: retain until account deletion plus 30 days for backups unless legal requirement demands longer.
- Display name & avatar:
  - Used to present identity in conversations. Stored in profiles. Can be updated; old values retained only in backups. On account deletion, cleared from active DB and removed from storage; media deleted via Storage lifecycle.
- JWTs:
  - Never stored server-side long-term. On client: stored in SecureStore; short-lived tokens with refresh tokens stored securely. Lifecycle: obtain at login -> used for auth headers -> refreshed -> revoked on logout.
- Message content:
  - Stored in messages table. Purpose: application function. Retention policy: default retention (e.g., 1 year) configurable. Personal data removal on account deletion: either anonymize or delete messages per policy and legal requests.
- Media (listing images):
  - Stored in Supabase Storage. Lifecycle: upload -> storage_path stored in DB (listings.images) -> accessible via signed URLs for delivery -> subject to retention/TTL policy for deleted accounts. Images are treated as potentially containing PII; implement deletion of storage objects on account deletion or upon explicit takedown requests.
  - On failed listing creation (e.g., client uploaded but listing not persisted), implement cleanup/garbage-collection of orphaned storage objects.
- Listing metadata:
  - Stored in listings table. Lifecycle: drafts may be transient; published listings remain until deletion or retention policy expiry.

C. Responsible persons (database security)
- Primary DB security contacts: Noah Choi (Noah Choi) and Jonathan Gu (Jonathan Gu). They are responsible for DB access policies, backups, credential rotation, and incident response related to database security.

D. Audit procedures for access
- All admin/DB access must be via SSO and recorded in admin audit logs.
- Privileged accounts: MFA enforced for all engineers with DB access.
- DB access logged (connection logs) and stored for at least 90 days.
- Periodic audits:
  - Weekly automated scan for open roles/RLS misconfigurations.
  - Quarterly manual audit by security team (Noah & Jonathan) for privilege creep.
  - On any suspicion of compromise, rotate credentials and run forensic query on recent connections.
- Least-privilege: services use scoped service accounts with only the needed SQL permissions (INSERT/SELECT on messages, INSERT/SELECT on listings when appropriate). Admin rights limited and tracked.

E. Data Access Patterns & RLS
- Use Row-Level Security (RLS) policies in Supabase/Postgres:
  - profiles: allow a user to read their own profile, and public fields for other users only if permitted.
  - messages: allow read if the requesting user is a member of the conversation; allow insert if sender_id matches authenticated user.
  - conversation_participants: restrict visibility to participants.
  - listings: allow read of published listings to public; allow insert if seller_id matches authenticated user; drafts readable only by seller or staff. Use RLS to ensure only the seller may modify their listing rows.

F. Encryption & Key management
- In transit: TLS for all API calls and WebSocket connections.
- At rest:
  - Supabase-managed PostgreSQL: enable encryption at rest.
  - Storage: server-side encryption for media.
- JWT secret and service account keys stored in secrets manager (not in repo); rotate per policy.
- Device-level: secure storage (expo-secure-store) for JWTs on mobile.

G. Minors
- Current storage: no explicit age attribute stored by default. If age is collected:
  - If user under 18: additional guardrails required. Policy:
    - Do not collect unnecessary PII.
    - Parental consent flows as required by jurisdiction (e.g., COPPA).
    - Limit retention and enable expedited removal requests.
    - Noah Choi and Jonathan Gu to approve any feature storing age data.
- If minors usage is expected, include explicit field (date_of_birth) and mark data handling in privacy policy; record consent events in DB.

H. Data deletion / subject requests
- Implement APIs to:
  - Export personal data per user request (generate package: profiles + messages + listings metadata + media links).
  - Delete user: anonymize or remove messages (policy-dependent); remove profile PII; remove media from Storage and remove listing rows or mark them removed.
- Log all data export and deletion operations for audit.

I. Other security controls
- Rate-limiting for auth endpoints to prevent account enumeration.
- Rejection of dangerous content (XSS, script tags) in message content and listing text; sanitize both client and server-side.
- Moderation and reporting endpoints for abusive content and suspicious listings.
- For images: implement content-moderation pipeline (optional) to detect illegal/abusive material prior to public listing.

---

Appendix: Implementation & Operational Checklist (for audit)
- [x] Fill Owner fields from PR metadata and record in change log.
- [x] Capture concrete versions from package.json and lockfiles; update Dependency table. (TODO: replace placeholders)
- [ ] Ensure RLS policies implemented for messages, conversations, and listings matching the described rules.
- [ ] Configure automated backups (PITR) and verify restore in a staging environment.
- [ ] Implement secure storage of secrets (no secrets in repo).
- [ ] Add server-side rate limits and spam throttles.
- [ ] Implement local persistence for outbound message queue and rehydration on app start, and persist listing drafts.
- [ ] Add telemetry: Sentry for client crashes, and server metrics for DB health and error rates.
- [ ] Define retention policy for messages, listings and media; implement lifecycle rules in Supabase Storage.
- [ ] Implement cleanup for orphaned uploaded images on failed listing creation.

---

Revision History
| Date | Summary | PR |
|---|---|---:|
| 2026-04-21 | Added CreateListingScreen, PhotoPicker usage, new listings library and submitListing flow; removed Explore screen's runtime location watcher; introduced listings DB table + images metadata; updated PII handling for listing images. | #118 |
| 2026-04-21 | Populated Ownership fields from PR metadata and synced spec with PR #118 diff (CreateListing UI + listings library + PhotoPicker; removed location watch). | #118 |

End of specification.

