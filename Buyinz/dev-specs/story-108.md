### Development Specification — User Story: "test test"

Merge Date: 2026-04-20

---

## 1. Ownership & History
- **Primary Owner:** Unknown (PR author not specified)
- **Secondary Owner:** Unknown (PR merger not specified)
- **Merge Date:** 2026-04-20
- **Change history:** Initial specification created for audit and implementation; further commits should append date, author, and short description to this section.

---

## 2. Architectural Diagrams (Mermaid)

Architecture Diagram
```mermaid
%% Architecture Diagram: Client (Mobile) vs Cloud (Supabase)
flowchart LR
  subgraph Client["Mobile Device (Expo / React Native)"]
    direction TB
    App[Expo App (TypeScript)]
    UI[ChatScreen / ConversationScreen]
    Store[Local Cache (AsyncStorage / SQLite)]
    AuthClient[Supabase Auth Client (JS)]
    RealtimeClient[Supabase Realtime / WebSocket]
  end

  subgraph Cloud["Cloud / Supabase"]
    direction TB
    Supabase_JS["@supabase/supabase-js (Edge)"]
    PostgREST[PostgREST]
    RealtimeSvc[Realtime (Phoenix/WS)]
    Storage[Supabase Storage (S3-like)]
    Postgres[(PostgreSQL)]
  end

  App -->|init auth / fetch data| AuthClient
  UI -->|reads/writes| Store
  AuthClient -->|U: JWT| Supabase_JS
  RealtimeClient -->|D: realtime messages| RealtimeSvc
  Supabase_JS -->|RPC / REST (D)| PostgREST
  PostgREST -->|SQL (D)| Postgres
  RealtimeSvc -->|listen/publish (D)| Postgres
  UI -->|upload media (D)| Storage
  Storage -->|serve media| UI
```

Information Flow Diagram (label flows U = User Identifying Information, D = Application Data)
```mermaid
%% Information Flow Diagram
flowchart LR
  Mobile[(Mobile Client)]
  Auth["Supabase Auth"]
  API["PostgREST / RPC"]
  Realtime["Realtime Service"]
  DB[(PostgreSQL)]
  Storage["Supabase Storage"]

  Mobile -->|U: email/password, JWT| Auth
  Mobile -->|U: JWT in Authorization header| API
  Mobile -->|D: create_message(payload)| API
  API -->|D: INSERT message_row| DB
  DB -->|D: NOTIFY / replication| Realtime
  Realtime -->|D: push message event| Mobile
  Mobile -->|D: upload file (signed URL)| Storage
  Storage -->|D: files (media)| Mobile
```

Class Diagram (TypeScript interfaces / logical modules)
```mermaid
%% Class Diagram: TypeScript interfaces and services
classDiagram
  class IMessageRow {
    <<interface>>
    +id: string
    +conversation_id: string
    +sender_id: string
    +body: string
    +metadata?: any
    +created_at: string
    +edited_at?: string
    +deleted: boolean
  }

  class IConversationRow {
    <<interface>>
    +id: string
    +title?: string
    +participant_ids: string[]
    +created_at: string
    +updated_at?: string
    +last_message_id?: string
  }

  class IUserProfile {
    <<interface>>
    +id: string
    +display_name?: string
    +email?: string
    +avatar_url?: string
    +created_at: string
  }

  class MessageService {
    +constructor(supabaseClient)
    +sendMessage(message: IMessageRow): Promise<IMessageRow>
    +fetchMessages(conversationId: string, limit?: number): Promise<IMessageRow[]>
    +subscribeToConversation(conversationId: string, cb): Unsubscribe
  }

  class ChatScreen {
    +props
    +render()
    +onSend(text)
    -state: { messages: IMessageRow[], loading: boolean }
  }

  IMessageRow <|.. MessageService
  IConversationRow <|.. MessageService
  IUserProfile <|.. ChatScreen
```

---

## 3. Implementation Units (Classes / Interfaces / Modules)

Grouped by concept. Each entry lists Public contract (fields/methods) and Private/internal state/helpers.

A. Types (types.ts)
- Public (interfaces)
  - IMessageRow
    - id: string — UUID primary key
    - conversation_id: string — FK to conversation
    - sender_id: string — user UUID
    - body: string — text payload
    - metadata?: Record<string, any> — jsonb for flags, attachments
    - created_at: string (ISO/TIMESTAMPTZ)
    - edited_at?: string
    - deleted: boolean
  - IConversationRow
    - id: string
    - title?: string
    - participant_ids: string[]
    - created_at: string
    - updated_at?: string
    - last_message_id?: string
  - IUserProfile
    - id: string
    - display_name?: string
    - email?: string
    - avatar_url?: string
    - created_at: string

- Private: none (interfaces are public contracts)

B. Data Access & Service Layer
- supabaseClient.ts
  - Public
    - getClient(): SupabaseClient — returns configured client
  - Private
    - init(config): void — internal initialization
    - _client instance

- queries.ts
  - Public
    - fetchConversation(conversationId: string): Promise<IConversationRow>
    - fetchMessages(conversationId: string, opts): Promise<IMessageRow[]>
    - createMessage(payload): Promise<IMessageRow>
    - updateMessage(id, patch): Promise<IMessageRow>
  - Private
    - buildMessageInsert(payload): object
    - sanitizeForInsert(body): string

- messageService.ts
  - Public
    - constructor(supabaseClient)
    - sendMessage(conversationId, text, metadata?): Promise<IMessageRow>
    - subscribe(conversationId, cb): Unsubscribe
    - fetchRecent(conversationId, limit): Promise<IMessageRow[]>
  - Private
    - _client
    - _subscriptionRefs: Map
    - _handleRealtime(event): void

C. UI Components (React Native / Expo)
- ChatScreen.tsx
  - Public (props)
    - conversationId: string
    - navigation
  - Public (methods)
    - render()
    - onSend(text)
    - onLoadMore()
  - Private (state/hooks)
    - messages: IMessageRow[]
    - loading: boolean
    - sending: boolean
    - error?: string
    - mountedRef
- MessageList.tsx
  - Public (props)
    - messages: IMessageRow[]
    - onLongPressMessage(id)
  - Private
    - renderItem()
    - keyExtractor()
- MessageBubble.tsx
  - Public (props)
    - message: IMessageRow
    - isMine: boolean
  - Private
    - internal formatting helpers (formatTimestamp)
- ConversationHeader.tsx
  - Public
    - conversation: IConversationRow
  - Private
    - openParticipantsModal()

D. Client-side State / Store
- profileSlice.ts (or context)
  - Public
    - selectors: selectProfile, selectUserId
    - actions: setProfile, clearProfile
  - Private
    - initialState: IUserProfile | null

E. Networking / Auth
- auth.ts
  - Public
    - signIn(email,password)
    - signOut()
    - getSession()
  - Private
    - tokenRefreshHandler()
    - handleAuthChange()

F. Utilities
- validators.ts
  - Public
    - isValidUUID(id): boolean
    - sanitizeText(input): string
  - Private
    - regexps

Notes:
- All UI modules are functional React components in TypeScript; public methods refer to exported props and callbacks; internal state is React useState/useRef.

---

## 4. Dependency & Technology Stack

Table: Technology | Required Version (recommended) | Usage in this story | Rationale | URL | Author / Maintainers

- TypeScript | >=5.0 <6.0 (recommended 5.3.x) | Static typing for React Native app and shared types (IMessageRow, services) | Strong typing improves auditability and DTO contracts; commonplace in RN apps | https://www.typescriptlang.org/ | Microsoft
- React Native | 0.71+ (recommended 0.72.x) | Mobile UI framework used by Expo; renders ChatScreen, MessageList | Standard for cross-platform native apps; wide ecosystem | https://reactnative.dev/ | Meta (Open Source)
- Expo SDK | 48+ (recommend matching RN version; e.g., SDK 49) | Development/runtime for the mobile app, bundling, devtools | Simplifies native dependency management and over-the-air updates | https://docs.expo.dev/ | Expo
- @supabase/supabase-js | ^2.0.0 (recommend latest v2.x) | Client library for Supabase Auth, PostgREST and Realtime operations | Official JS SDK for Supabase; supports Realtime and storage | https://supabase.com/docs/reference/javascript | Supabase
- Node.js | 18.x or 20.x (LTS recommended) | Local dev, bundling, CI tasks, script tooling | LTS stability for build tools and CI | https://nodejs.org/ | OpenJS Foundation
- react-query or SWR (optional) | latest (v4+) | Client-side caching and network state for messages and conversations | Efficient caching, background revalidation, simplifies offline-first UX | https://tanstack.com/query | Tanner Linsley
- @react-native-async-storage/async-storage | latest | Local caching for messages and small attachments | Persistent client-side cache when offline | https://github.com/react-native-async-storage/async-storage | Community
- PostgreSQL | 14+ (as hosted by Supabase) | Primary relational store for messages, conversations, users | ACID, JSONB support, PostgREST integration | https://www.postgresql.org/ | PostgreSQL Global Development Group
- git | any | Version control | Standard | https://git-scm.com/ | Linus Torvalds / community

Notes:
- If package.json exists, match versions to it. The recommended versions above are conservative and compatible with Supabase v2 patterns and modern TypeScript.

---

## 5. Database & Storage Schema (PostgreSQL)

Primary tables involved for chat functionality:

A. users (auth managed by Supabase Auth; mirrored minimal profile)
- id UUID PRIMARY KEY — uuid (16 bytes) — unique user identifier (matches auth.users)
- email TEXT UNIQUE — email address (avg 50–100 bytes)
- display_name TEXT — human-readable name (avg 32 bytes)
- avatar_url TEXT — URL to storage (avg 100 bytes)
- created_at TIMESTAMPTZ DEFAULT now() — timestamp (8 bytes)

B. conversations
- id UUID PRIMARY KEY — uuid (16 bytes)
- title TEXT NULL — conversation title (optional: 64–256 bytes)
- participant_ids UUID[] NOT NULL — array of participant UUIDs (16 bytes per UUID + array overhead)
- created_at TIMESTAMPTZ DEFAULT now() — 8 bytes
- updated_at TIMESTAMPTZ — 8 bytes
- last_message_id UUID NULL — 16 bytes

C. messages
- id UUID PRIMARY KEY — 16 bytes
- conversation_id UUID REFERENCES conversations(id) — 16 bytes
- sender_id UUID REFERENCES users(id) — 16 bytes
- body TEXT NOT NULL — variable; estimate average 256 bytes (text storage variable)
- metadata JSONB NULL — JSON metadata, attachments, flags (estimate 200 bytes avg)
- created_at TIMESTAMPTZ DEFAULT now() — 8 bytes
- edited_at TIMESTAMPTZ NULL — 8 bytes
- deleted BOOLEAN DEFAULT false — 1 byte (storage rounded)
- attachment_path TEXT NULL — 100 bytes (if media stored in Supabase Storage)
- INDEXES: idx_messages_conversation_created_at (conversation_id, created_at DESC)

D. message_history (optional audit)
- id UUID PK — 16 bytes
- message_id UUID — 16 bytes
- change JSONB — full row snapshot — variable
- changed_by UUID — 16 bytes
- changed_at TIMESTAMPTZ — 8 bytes

Storage estimation per typical messages row (approximate):
- UUIDs: id (16) + conversation_id (16) + sender_id (16) = 48 bytes
- created_at + edited_at = 8 + 8 = 16 bytes
- deleted boolean padded = 1–4 bytes (rounded to 8)
- body text (avg) = 256 bytes
- metadata JSONB (avg) = 200 bytes
- attachment_path = 0–100 bytes (assume none) -> 0
- Postgres row overhead (tuple header, alignment, null bitmap, toast pointer): ~24 bytes
- Total estimated per typical message row (no attachment): 48 + 16 + 8 + 256 + 200 + 24 ≈ 552 bytes ≈ 0.55 KB

Estimates assume short text; for long messages or media references, JSONB or TOAST storage may apply and increase row size significantly.

Storage for conversation row (estimate):
- participant_ids array with 2 UUIDs: ~40 bytes
- title 64 bytes
- timestamps + overhead => ~140 bytes

Indexes and TOAST storage increase disk footprint; assume additional 20–40% overhead for indexes.

Supabase Storage: media files stored in object storage (S3-compatible). Storage cost per file depends on file size; DB holds only paths and metadata.

---

## 6. Resilience & Failure Modes

For each scenario, describe user-visible effects and internal mitigation/operational steps.

1) Process Crash (app crash on mobile)
- User-visible: temporary app exit; unsent message may be lost from UI buffer.
- Internal: local state in memory lost; messages already sent to Supabase persisted.
- Mitigation: persist outgoing queue to AsyncStorage before send; retry on restart; optimistic UI should mark messages as "sending" and revert to "failed" if acknowledgement not received. Crash telemetry should capture stack traces.

2) Lost Runtime State (app backgrounded or OS kills process)
- User-visible: UI resets; persisted messages remain; unsent messages retried on next start.
- Internal: subscriptions to realtime channels are dropped.
- Mitigation: reconnect logic on app foreground; exponential backoff; local cache to restore UI.

3) Erased Stored Data (user clears app storage)
- User-visible: local chat history lost; server-side data intact.
- Internal: user tokens may be removed leading to sign-out.
- Mitigation: rely on server-side persistence; encourage server sync; provide export/backup features.

4) Database Corruption
- User-visible: missing or inconsistent messages, query failures.
- Internal: Postgres may return errors or partial results.
- Mitigation: Supabase-managed backups & WAL; implement point-in-time recovery procedures; set up automated daily backups; test restores periodically.

5) RPC Failure (PostgREST or function error)
- User-visible: send/fetch operations fail with appropriate error messages; UI should surface retry option.
- Internal: server-side validations may reject payloads.
- Mitigation: client-side validation; retry with exponential backoff; monitor error rates/alerts.

6) Client Overloaded (UI freeze due to very large payloads)
- User-visible: app becomes slow/unresponsive when rendering huge message sets.
- Mitigation: implement pagination/infinite scroll (fetch last N messages); virtualization for message lists (FlatList with windowing), limit batch size for realtime events; throttle updates.

7) Out of RAM (mobile)
- User-visible: OS kills app; data loss in memory; restart required.
- Mitigation: reduce in-memory caches, use virtualization, persist long items, limit attachments loaded into memory.

8) Database Out of Space
- User-visible: writes fail; new messages not saved.
- Internal: Postgres returns "disk full" errors.
- Mitigation: monitor disk usage, set alerting, archive old messages to cold storage, enforce retention policies, increase quota or clean storage.

9) Network Loss (intermittent / offline)
- User-visible: inability to send/receive realtime messages; queued sends.
- Mitigation: local queue & optimistic UI; send on reconnect; show offline indicator; use exponential backoff for reconnect attempts.

10) Database Access Loss (credentials invalidated)
- User-visible: failed auth or queries; app may request re-login or show degraded mode.
- Mitigation: rotate keys securely; maintain short-lived service tokens; implement admin recovery procedures; log and alert.

11) Bot Spamming (automated high-volume message injection)
- User-visible: spam in conversations, degraded experience.
- Internal: increased DB writes and realtime traffic, possible quota exhaustion.
- Mitigation:
  - Rate limiting: server-side (PostgREST + RLS) or middleware to restrict messages per user per minute.
  - Abuse detection: pattern detection, heuristics (message frequency, similarity).
  - Quarantine flows: flag and soft-delete messages in moderation queue.
  - Account throttling & suspension.
  - Realtime alarms when anomalous write rates detected.
  - Use RLS policies to limit cross-tenant behavior.

Operational measures for all failures:
- Observability: metrics for API latency, error rates, DB size, RT events, auth failures.
- Alerts: PagerDuty/slack alerts for thresholds.
- Playbooks: documented runbooks to recover from backups, rotate keys, and scale DB/storage.

---

## 7. PII & Security (Privacy Analysis)

A. PII Collected & Stored
- Email address (users.email) — Personally Identifying
- Display name (users.display_name) — PII if unique
- Avatar URL (users.avatar_url) — may be indirectly identifying
- JWTs / session tokens — authentication secrets (transient)
- IP addresses & device identifiers (if logged by server/analytics) — may be captured in logs (sensitive)
- Message contents (messages.body) — may contain PII if users include it

B. Retention & Lifecycle
- Collection:
  - At sign-up: email and password handled by Supabase Auth (password hashed by Auth provider; Supabase stores hashed password).
  - Profile creation/edit: display_name, avatar_url stored via profile endpoints.
- Transit:
  - All client<>server communications over TLS (HTTPS / WebSocket over TLS). JWTs included in Authorization headers for API calls.
- Storage:
  - Email/display_name in users table (Postgres).
  - Messages in messages table (Postgres).
  - Attachments in Supabase Storage (object store).
- Access:
  - Application services access via @supabase/supabase-js using project keys and per-user JWTs.
  - Server-side functions (PostgREST or Edge functions) enforce RLS (Row Level Security) to ensure users only access permitted rows.
- Deletion:
  - Soft deletion: messages.deleted boolean; optional purge job that permanently deletes rows older than retention period (e.g., 90 days) for compliance.
  - Profile deletion: cascade optional deletion or anonymization of messages (replace sender_id with NULL or pseudonymous id).
- Backups:
  - Supabase automatic backups retained per provider policy; sensitive data included in backups and should be protected.

C. Responsible Parties
- Database Security Owners: Noah Choi and Jonathan Gu — responsible for DB access policies, key rotation, audit reviews, and incident response.

D. Access Audit Procedures
- Access control:
  - Principle of least privilege for all service accounts.
  - Use Supabase/RLS + Postgres grants for fine-grained control.
- Key management:
  - Rotate service_role and anon keys periodically.
  - Store secrets in vault (HashiCorp Vault / cloud KMS), not in source code.
- Logging & Audit:
  - Enable and retain audit logs for DB admin operations; maintain access logs for privileged queries.
  - Quarterly audit reviews by DB security owners (Noah Choi & Jonathan Gu).
- Access reviews:
  - Maintain an access matrix for engineers, rotate/expire access, and require approvals for DB admin grants.
- Penetration tests / vulnerability scans:
  - Annual pentest, monthly dependency vulnerability scans.

E. Encryption
- In transit: TLS for all API, websocket, and storage links.
- At rest: Supabase-managed DB encryption; ensure storage encryption for object store.
- Field-level encryption: encrypt highly sensitive fields (e.g., government ID) using client-side or server-side encryption where necessary.

F. Minors
- Current policy: the application does not intentionally collect date-of-birth (DOB) by default; therefore it does not knowingly store data for users under 18.
- If DOB or age is introduced, policy:
  - Obtain verifiable parental consent for users under 13 (COPPA compliance).
  - For ages 13-17, apply reduced data exposure: remove targeted features (no public listing of personal info), restrict external messaging, and require additional moderation.
  - Data storage for minors: minimize retained PII, enable account deletion and parental requests, and flag accounts for additional review.
- Enforcement:
  - If minors' data is discovered, immediate notification to DB owners (Noah Choi & Jonathan Gu) and legal/compliance team; removal or anonymization as required by law.

G. RLS and Authorization Design Notes
- Row Level Security policies:
  - messages: SELECT/INSERT allowed if user is participant of conversation (verify conversation.participant_ids contains auth.uid)
  - conversations: visibility limited to participant list
  - profiles: public profile fields selectable; sensitive fields require explicit consent
- Policy example (pseudocode):
  - CREATE POLICY "participants_only" ON messages USING ( auth.uid = sender_id OR conversation_id IN (SELECT id FROM conversations WHERE auth.uid = ANY(participant_ids)) )

H. Secrets & CI
- Do not commit supabase anon/service_role keys or KMS credentials to repo.
- CI uses secrets manager (GitHub Actions secrets) with minimal exposure; rotate and audit usage.

---

## Appendix: API & Routines (High-level)

- sendMessage(conversationId, text, metadata)
  - Validate: conversation exists and user is participant
  - Insert into messages (server timestamp)
  - Publish via Realtime to participants
  - Return created row

- fetchMessages(conversationId, limit, before?)
  - Validate participant
  - Query messages ordered by created_at desc, with pagination

- subscribeToConversation(conversationId)
  - Use Realtime on messages table filtered by conversation_id
  - Reconcile optimistic updates using message id and created_at

- moderation/abuse endpoints
  - reportMessage(messageId, reason)
  - admin endpoints to soft-delete or purge

---

This document is intended for engineering review and audit. For any implementation, align package versions to package.json in the repository and ensure RLS policies and backups are configured prior to deployment. Contact Noah Choi or Jonathan Gu for DB access requests and security approval.

