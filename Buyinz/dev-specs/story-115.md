### Development Specification: User Story "Test again"

Revision date: 2026-04-21

---

### 1. Ownership & History
- **Primary Owner:** [PR Initiator — replace with PR author username or full name]
- **Secondary Owner:** [PR Merger — replace with user who merged the PR]
- **Merge Date:** 2026-04-21

Change log
- 2026-04-21 — Initial specification prepared for engineering audit (owner placeholders to be filled from PR metadata).

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
    UI["Screens: ChatScreen, ConversationList"]
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
  PostgREST --> Postgres
  Realtime --> Postgres
  EdgeFns --> Postgres
  Storage --> Postgres
  RNRuntime -->|SecureStore access| SecureStore
  RNRuntime -->|Local caching| LocalDB

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
  API -- "D: insert message row" --> DB
  DB -- "D: message rows (pub/sub)" --> RealtimeS
  RealtimeS -- "D: realtime messages" --> Mobile
  Mobile -- "D: upload media" --> StorageS
  StorageS -- "D: media metadata" --> DB
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

  IMessageRow <|.. MessageService
  IConversationRow <|.. ConversationService
  IProfileRow <|.. ConversationService

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
- Private
  - Validation types (e.g., MaxLengths, supportedMimeTypes) exported only internally

B. Data Access Layer (queries.ts)
- Public
  - function fetchMessages(conversationId: string, limit:number, cursor?:string): Promise<MessageRow[]>
  - function createMessage(dto: MessageCreateDTO): Promise<MessageRow>
  - function createConversation(dto: ConversationCreateDTO): Promise<ConversationRow>
  - function listConversations(userId: string): Promise<ConversationRow[]>
- Private
  - SQL templates, parameter builders
  - mapRowToDTO(row) helper
  - exponentialBackoffRetry(fn) helper (internal for transient DB failures)

C. Services (messageService.ts, conversationService.ts)
- Public
  - class MessageService
    - sendMessage(dto: MessageCreateDTO): Promise<MessageRow>
    - markAsRead(messageIds: string[], userId: string): Promise<void>
    - subscribeToConversation(conversationId: string, callback): Unsubscribe
  - class ConversationService
    - createOrGetConversation(participants: string[], meta?): Promise<ConversationRow>
    - renameConversation(id, title): Promise<void>
- Private
  - sanitizeContent(content) — strip dangerous markup, length checks
  - uploadMedia(media): Promise<string> — returns storage URL
  - signURL(url): string — temporary signed access if needed

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
  - MessageBubble (props: MessageRow)
    - onLongPress(): shows actions (edit, delete)
- Private (internal component state / hooks)
  - local state: messages: MessageRow[], loading: boolean, sendingQueue: MessageCreateDTO[]
  - useEffect subscriptions to realtime
  - optimisticUpdate(messageLocalId) helpers
  - reconnection/backoff counters

E. Hooks & State Management (hooks/, store/)
- Public
  - useMessages(conversationId:string) => {messages, sendMessage, loadMore}
  - useConversations(userId) => {conversations, createConversation}
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
- Private
  - telemetry helpers, non-blocking logging

H. Tests (if present)
- Public
  - unit tests for MessageService, queries
- Private
  - test fixtures, mockSupabaseClient

Notes
- Treat interfaces/types as public contracts. Component internal state (React useState/useRef) is private.

---

### 4. Dependency & Technology Stack

Note: repository lacks package.json at time of spec generation. Replace "Required Version" with exact entries from package.json prior to implementation/audit. Recommended versions listed.

| Technology | Required Version (from package.json / recommended) | Specific usage in this story | Rationale | Docs / Author |
|---|---:|---|---|---|
| TypeScript | ^5.2.0 (recommended) | Strong typing of DTOs, services, components | Type safety, better IDE support, compile-time checks | https://www.typescriptlang.org/ — Microsoft |
| React Native | 0.72.x (recommended) | Mobile UI runtime for Chat screens | Mobile performance, community support | https://reactnative.dev/ — Meta |
| Expo SDK | 48 (or match RN) | Build/runtime tooling for development and builds | Simplifies build/deploy for iOS/Android | https://docs.expo.dev/ — Expo |
| @supabase/supabase-js | ^2.0.0 | Supabase client for auth, PostgREST, Realtime, Storage | Official client, Realtime + auth integration | https://supabase.com/docs — Supabase |
| Node.js | 18.x or LTS used by CI | Local dev tooling, build, scripts | LTS stability, compatibility with bundlers | https://nodejs.org/ — Node.js Foundation |
| react-query / @tanstack/react-query | ^5.x (optional) | Network caching, optimistic updates | Simplifies caching + retries | https://tanstack.com/query — Tanner Linsley |
| MMKV / react-native-mmkv | latest matching RN | Local cache for messages/conversations | Fast local persistence, small footprint | https://github.com/mrousavy/react-native-mmkv — community |
| secure-store / expo-secure-store | latest | Store JWTs securely on device | Prevent token theft | https://docs.expo.dev/versions/latest/sdk/securestore — Expo |
| Postgres (Supabase) | 15.x (managed) | Primary relational storage | ACID, JSONB support for metadata | https://www.postgresql.org/ — PostgreSQL Global Dev Group |
| supabase-realtime (via supabase) | bundled | Live message synchronization | Low-latency updates | https://supabase.com/docs — Supabase |

Rationale highlights:
- Supabase selected for integrated Auth/Postgres/Realtime/Storage, reducing integration surface vs. assembling discrete vendors.
- Expo used for developer productivity and managed build pipeline.

Audit action: before deployment, capture exact versions from package.json and lockfiles (package-lock.json/yarn.lock) and replace the "Recommended" values.

---

### 5. Database & Storage Schema (PostgreSQL)

Tables required for this story: profiles, conversations, conversation_participants, messages, message_status (optional), media (optional).

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

E. message_status (per-user read receipts, optional)
- message_id UUID REFERENCES messages(id)
- user_id UUID REFERENCES profiles(id)
- status text
- updated_at timestamptz
Primary key (message_id, user_id)
Purpose: per-user delivery/read state.

F. media (optional)
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

Storage sizing guidance:
- Estimate 400 bytes per typical message row; 1M messages ≈ 400 MB plus index overhead (~20-30%).
- Indexes (primary key, conversation_id index, created_at) add additional disk; budget ~1.3x-1.5x for total DB size.

Indexes
- messages: primary key (id), index on (conversation_id, created_at DESC), index on (sender_id), GIN on metadata if queries require it.
- conversations: primary key, index on (updated_at)

Retention and archival:
- Implement partitioning by created_at or conversation_id for large scale.
- Media object lifecycle: store in Supabase Storage with lifecycle rules; store path in media table.

---

### 6. Resilience & Failure Modes

For each scenario: user-visible effects, internal effects, and mitigations.

A. Process Crash (mobile app crash)
- User-visible: temporary loss of UI state, possible unsent messages lost if not persisted.
- Internal: in-memory sendingQueue lost.
- Mitigation:
  - Persist outbound queued messages to local storage (MMKV/SQLite) before dispatch.
  - On app start, reconcile unsent messages: attempt resend with backoff; mark as failed after N attempts.
  - Use optimistic UI but mark locally-created messages with temporary local-id and replace upon server ACK.

B. Lost Runtime State (app killed, backgrounded)
- User-visible: UI rehydration may show stale messages until syncing completes.
- Mitigation:
  - Persist last seen cursor/timestamp and messages page to local DB.
  - On resume, fetch delta (since last sync) via PostgREST query and subscribe to Realtime.

C. Erased Stored Data (local DB cleared)
- User-visible: app shows empty caches; messages reloaded from server but may incur bandwidth/time.
- Mitigation:
  - Implement server-side canonical state; client fetch full recent window on first launch.
  - Prompt user if local data lost for large accounts to avoid heavy downloads.

D. Database Corruption (postgres table/index corruption)
- User-visible: errors from API, timeouts, partial read/write failures; inconsistent conversation state.
- Internal: DB engine may return errors; Realtime replication may fail.
- Mitigation:
  - Rely on managed Supabase backups; enable point-in-time recovery (PITR).
  - Read-only failover or read replicas if available.
  - Monitor DB metrics and set alerts for replication lag / corruption signatures.

E. RPC Failure (PostgREST or network failure)
- User-visible: operations fail with errors; UI should show offline/try again states.
- Mitigation:
  - Implement retry with exponential backoff on idempotent operations.
  - Use local optimistic updates for UI, then rollback on confirmed failure.
  - Graceful error messages and offline mode (queue writes).

F. Client Overloaded (CPU / event storms)
- User-visible: app responsiveness degrades.
- Mitigation:
  - Debounce UI-heavy operations (typing events).
  - Limit Realtime event processing rate; coalesce multiple events into batch updates.
  - Offload heavy transforms to native modules or background JS tasks.

G. Out of RAM (device)
- User-visible: OS may kill app; data loss for unsaved state.
- Mitigation:
  - Limit in-memory caches to reasonable sizes; page messages from disk.
  - Use efficient data structures; avoid storing full image blobs in memory.

H. Database Out of Space
- User-visible: writes fail; new messages cannot be persisted.
- Mitigation:
  - Monitor disk usage, set alerts.
  - Implement retention policy: archive or delete old messages/media.
  - Use object storage for media; keep DB for metadata only.

I. Network Loss
- User-visible: inability to send/receive new messages; offline mode.
- Mitigation:
  - Local queue for outbound messages; UI shows "offline" indicator and queued status.
  - On reconnect, resynchronize using cursors and Realtime subscription.

J. Database Access Loss (credentials revoked or rotated)
- User-visible: server-side errors; potential authentication failures for API calls.
- Mitigation:
  - Use rotating service accounts with automated secret management (Vault).
  - Failover plan: store limited read-only cached copies on edge functions if possible.
  - Alert and roll back to previous credentials; implement zero-downtime rotation.

K. Bot Spamming (high-frequency message injection)
- User-visible: conversation spam; degraded UX.
- Internal: high write rate, potential quota usage, rate-limits triggered.
- Mitigation:
  - Server-side rate-limiting (RLS/Edge Functions) per user and per IP.
  - Spam detection: heuristics and ML scoring (rapid messages, repeated content).
  - Throttling, temporary rate bans, require CAPTCHA for suspicious accounts.
  - Moderation tooling: bulk delete, block user flows.

Operational notes
- Implement telemetry and alerting (Sentry for client crashes, Prometheus/Datadog for server metrics).
- Use circuit-breaker patterns when dependent services fail.

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

B. Retention justification & lifecycle
- Email: required for authentication, account recovery, and notifications. Lifecycle:
  - Collected at signup -> stored in profiles.email (Postgres). Accessed by Auth flows, password reset flows, and admin audits. Deleted on explicit account deletion (data deletion flow). Retention policy default: retain until account deletion plus 30 days for backups unless legal requirement demands longer.
- Display name & avatar:
  - Used to present identity in conversations. Stored in profiles. Can be updated; old values retained only in backups. On account deletion, cleared from active DB and removed from storage; media deleted via Storage lifecycle.
- JWTs:
  - Never stored server-side long-term. On client: stored in SecureStore; short-lived tokens with refresh tokens stored securely. Lifecycle: obtain at login -> used for auth headers -> refreshed -> revoked on logout.
- Message content:
  - Stored in messages table. Purpose: application function. Retention policy: default retention (e.g., 1 year) configurable. Personal data removal on account deletion: either anonymize or delete messages per policy and legal requests.
- Media:
  - Stored in Supabase Storage. Lifecycle: upload -> storage_path stored in DB -> accessible via signed URLs for delivery -> subject to retention/TTL policy for deleted accounts.

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
- Least-privilege: services use scoped service accounts with only the needed SQL permissions (INSERT/SELECT on messages, SELECT on profiles when appropriate). Admin rights limited and tracked.

E. Data Access Patterns & RLS
- Use Row-Level Security (RLS) policies in Supabase/Postgres:
  - profiles: allow a user to read their own profile, and public fields for other users only if permitted.
  - messages: allow read if the requesting user is a member of the conversation; allow insert if sender_id matches authenticated user.
  - conversation_participants: restrict visibility to participants.

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
  - Export personal data per user request (generate package: profiles + messages + media links).
  - Delete user: anonymize or remove messages (policy-dependent); remove profile PII; remove media from Storage.
- Log all data export and deletion operations for audit.

I. Other security controls
- Rate-limiting for auth endpoints to prevent account enumeration.
- Rejection of dangerous content (XSS, script tags) in message content; sanitize both client and server-side.
- Moderation and reporting endpoints for abusive content.

---

Appendix: Implementation & Operational Checklist (for audit)
- [ ] Fill Owner fields from PR metadata and record in change log.
- [ ] Capture concrete versions from package.json and lockfiles; update Dependency table.
- [ ] Ensure RLS policies implemented for messages and conversations matching the described rules.
- [ ] Configure automated backups (PITR) and verify restore in a staging environment.
- [ ] Implement secure storage of secrets (no secrets in repo).
- [ ] Add server-side rate limits and spam throttles.
- [ ] Implement local persistence for outbound message queue and rehydration on app start.
- [ ] Add telemetry: Sentry for client crashes, and server metrics for DB health and error rates.
- [ ] Define retention policy for messages and media; implement lifecycle rules in Supabase Storage.

End of specification.

