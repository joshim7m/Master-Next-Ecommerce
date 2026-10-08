# Plan — Courier Booking (Steadfast / Pathao / REDX) — Order Detail Modal + Status Sync

> Status: **Implemented** · Updated: 2026-10-07
> Adds a **Courier Booking** button to the order detail page `/admin/orders/[orderNo]` that opens a popup modal with a **Select Courier** dropdown (Steadfast · Pathao · REDX), a parcel booking form and booking information — then keeps the order's `orderStatus` in sync with the courier via **webhooks + manual sync**.
>
> **This iteration implements Steadfast only** (credentials available today). Pathao and REDX appear in the dropdown as disabled options behind the same abstraction, so enabling them later is credentials + adapter work, not a redesign.

---

## 1. Overview

Eghuri orders are created at checkout as COD (`app/api/checkout/route.js`) but nothing books them with a courier — dispatch happens outside the system today. This plan integrates a **multi-courier layer** so an admin can book a parcel from the order they are already looking at, choosing which courier carries it, and have delivery status flow back into `Order.orderStatus` automatically.

**Goals**

1. A **Courier Booking** button in the order detail header → modal with a **Select Courier** dropdown (Steadfast, Pathao, REDX) and a prefilled booking form.
2. Persist the booking (`provider`, `consignment_id`, `tracking_code`, courier status) against the order.
3. Status updates arrive two ways: a **webhook** (preferred) and a **manual Sync button** (fallback / 60-second API cache).
4. A **two-way status map** from courier statuses → the store's `orderStatus` values, with guards so an admin's manual decision is never clobbered.
5. A **provider abstraction** — one adapter interface, three implementations; only Steadfast is wired now.

**Non-goals (this iteration):** automatic booking at checkout, bulk booking from the orders list, pickup/return request UI, balance/payout screens, enabling Pathao/REDX (no credentials yet).

### 1.1 Courier status (this iteration)

| Courier | Dropdown | Credentials | Adapter | Status map | Webhook |
|---|---|---|---|---|---|
| **Steadfast Courier** | ✅ selectable | ✅ verified live | ✅ implemented | ✅ defined (§6) | ✅ implemented |
| **Pathao Courier** | ⏸ shown, disabled | ❌ not yet | skeleton (`notConfigured` stub) | 📋 draft — confirm against their docs (§6.2) | route reserved (§7.5) |
| **REDX Delivery** | ⏸ shown, disabled | ❌ not yet | skeleton (`notConfigured` stub) | 📋 draft — confirm against their docs (§6.2) | route reserved (§7.5) |

Disabled entries render with a small "credentials pending" hint and cannot be submitted. `enabled` is driven by env credentials being present (§8), so flipping Pathao on is a `.env` change plus its adapter.

---

## 2. The Steadfast API (verified 2026-10-07)

Both dashboard pages (`/user/api`, `/user/api/guide`) sit behind login; the guide's samples carry the account's live keys. **Tested against production:**

```
GET https://portal.packzy.com/api/v1/ping        → 200 {"message":"pong","service":"steadfast-api","version":"v1"}
GET https://portal.packzy.com/api/v1/get_balance → 200 {"current_balance":0}     ← keys valid
```

| Item | Value |
|---|---|
| Base URL | `https://portal.packzy.com/api/v1` |
| Auth | Headers `Api-Key: <key>` + `Secret-Key: <secret>` on **every** request — no login, no token refresh |
| Content type | `application/json` on POST |
| Rate limits | 1,000 req/min (6,000 booking/min); **10 bad-auth calls in 5 min → 429 for 60 min, valid keys included** |
| Status cache | Status endpoints cache answers for **60 s** — polling faster tells you nothing; prefer the webhook |
| Invoice rule | `invoice` must be letters/digits/`-`/`_` and **unique per account** — this is what makes retrying safe (a duplicate is refused, never double-booked) |

### 2.1 Endpoints used in this plan

| Method | Endpoint | Use |
|---|---|---|
| GET | `/ping` | Connectivity check (no credentials needed) |
| POST | `/create_order` | Book one parcel |
| GET | `/status_with_return_status_by_cid/{consignment_id}` | Status **including return progress** — the only endpoint that knows a returned parcel is physically back with you |
| GET | `/trackings_by_invoice/{invoice}` | Full tracking timeline for the modal |
| GET | `/get_balance` | Cheap "do my keys work?" probe (401 if not) |

(18 endpoints exist in total — bulk booking, pickups, returns, payments, `police_stations`, `fraud_check/score/{phone}` are documented in §12 Follow-ups.)

### 2.2 `POST /create_order` contract

Request fields relevant to us:

| Field | Required | Notes |
|---|---|---|
| `invoice` | ✅ | Our `orderNo`. Max 100 chars, unique |
| `recipient_name` | ✅ | Max 100 chars |
| `recipient_phone` | ✅ | 11 digits starting `01` |
| `recipient_address` | ✅ | Max 490 chars |
| `cod_amount` | ✅ | BDT, `0` for prepaid, max 1,000,000 → we send `Number(order.total)` |
| `note` | optional | Rider instructions, ≤480 chars |
| `alternative_phone`, `recipient_email`, `item_description`, `total_lot`, `delivery_type` | optional | `delivery_type`: `0` home (default), `1` point |

Success → `200` with `consignment.consignment_id`, `consignment.tracking_code`, `consignment.tracking_link`, initial status `in_review`.
Failure → `400` with `errors` keyed by field name. **Every parcel starts `in_review` and is approved by Steadfast shortly after.**

Two behaviours worth remembering:

- **Character stripping** — before storing an address/name/note, Steadfast replaces each of `{ } ; < > $` with a space. Text sent ≠ text returned.
- **Truncation, not rejection** — over-long values are silently cut (invoice 100, name 100, phone 40, address 490, note 480 chars).

### 2.3 Response codes

| Code | Meaning | Action |
|---|---|---|
| 200 | Done — but some endpoints report per-item failure **inside** a 200 | Always read the body |
| 400 | Malformed/missing payload | Show `errors` |
| 401 | Wrong/revoked keys, or parcel belongs to another profile | Fix keys; **never retry in a loop** |
| 403 | Authenticated but not allowed — inactive account or **ownership/KYC pending** | Show "complete ownership" message (see §10) |
| 422 | Field rejected | Read `errors` |
| 429 | Rate limited / too many failures | Back off |
| 500 | Their fault | Retry with the **same invoice** — duplicates are refused, so retrying cannot double-book |

---

## 3. Webhook specification (from `steadfast.com.bd/user/webhook/add`)

Steadfast POSTs JSON to a callback URL you register; they wait **5 s** for a 2xx.

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer <your auth token>` (you generate it; `[A-Za-z0-9._=-]` only) |
| `X-Signature` | **HMAC-SHA256 of the raw body, hex, keyed with the auth token** |
| `Idempotency-Key` | Same value when the same event is retried |
| `User-Agent` | `Steadfast-Webhook/1.0` |

**Retries:** 5xx / unreachable → retried after 30 s and after 2 min (3 attempts total). **4xx is never retried** — answer 2xx once the event is durably recorded (or deliberately ignored).

**Events** (only two matter for this plan):

```jsonc
// delivery_status — drives Order.orderStatus
{ "notification_type": "delivery_status", "consignment_id": 12345, "invoice": "INV-67890",
  "cod_amount": 1500.0, "status": "delivered", "delivery_charge": 100.0,
  "tracking_message": "Your package has been delivered successfully.",
  "updated_at": "2025-03-02 12:45:30" }

// tracking_update — appends to the modal's timeline
{ "notification_type": "tracking_update", "consignment_id": 12345, "invoice": "INV-67890",
  "tracking_message": "Package arrived at the sorting center.", "updated_at": "2025-03-02 13:15:00" }
```

Others (`consignment_update`, `return_list_accepted`, `payment_request`, `cancel_request`, `return_request`, `pickup_request`, `user_update`) are logged and ignored for now.

> **Pathao / REDX webhooks:** each courier has its own callback shape and signature scheme. The route is provider-routed (`§7.5`) so their handlers slot in unchanged; the payload contracts get documented here when credentials arrive.

---

## 4. Decisions (confirmed by owner)

| Question | Decision |
|---|---|
| When is a parcel booked? | **Manually** — "Courier Booking" button on `/admin/orders/[orderNo]` opening a modal with the booking form + info (owner's specification) |
| Which couriers? | **Steadfast, Pathao, REDX** — all offered in a **Select Courier** dropdown in the modal; same process and requirements for each |
| Which courier is built now? | **Steadfast only** (credentials available). Pathao + REDX render disabled with a "credentials pending" hint |
| How do statuses come back? | **Webhook + manual sync** — provider-routed webhook endpoint for push, a Sync button as fallback (60 s API cache, and localhost can't receive webhooks) |
| Status mapping | **Two-way map per courier** — courier statuses drive `orderStatus`, with guards; admin can always override manually afterwards |
| Booking trigger at checkout / bulk booking | **Out of scope** for now (see §12) |

---

## 5. Data model

New table — **one booking per order** (`orderId @unique` enforces "book at most once" at the database level, complementing each courier's duplicate-reference refusal). IDs are only unique **per courier**, hence the compound unique:

```prisma
model CourierBooking {
  id             String   @id @default(cuid())
  order          Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  orderId        String   @unique
  provider       String   @default("steadfast") // steadfast | pathao | redx
  consignmentId  String   // stored as string so a courier with non-numeric ids fits
  trackingCode   String?
  trackingLink   String?
  courierStatus  String   @default("in_review") // raw courier status, shown verbatim in the UI
  lastSyncedAt   DateTime?
  lastEventKey   String?  // Idempotency-Key of the last applied webhook event — replays are ignored
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([provider, consignmentId])
  @@index([provider, courierStatus])
}
```

- `Order` gains the back-relation `courierBooking CourierBooking?`.
- Migration: `npx prisma migrate dev --name add_courier_booking` — created and applied `20261007144130_add_courier_booking`.
- `lastEventKey` was added beyond the first draft: the idempotency check is done against the **DB value**, not the booking object the caller holds, because a webhook replay can arrive with a row that was fetched before the key was written (caught by test, see §9).
- `courierStatus` stores the **raw** courier value (`delivered_approval_pending`, …); the mapping to `orderStatus` lives in code (`§6`), so the UI can always show both truthfully.
- `consignmentId` is a **String** (Steadfast's is numeric today, but the abstraction must not assume that for the other two).
- **Provider is fixed at booking time.** Switching couriers after a successful booking means cancelling/releasing the existing booking first — deliberate constraint for now (§12).

---

## 6. Status mapping (two-way)

Store statuses: `pending · processing · completed · cancelled · return · incomplete`.

### 6.1 Steadfast (implemented)

| Steadfast `delivery_status` | → `orderStatus` | Rationale |
|---|---|---|
| `in_review`, `pending` | `pending` | Booked, not yet attempted |
| `hold` | **no change** + flag in UI | "Contact support" state — don't guess |
| `delivered_approval_pending`, `partial_delivered_approval_pending`, `cancelled_approval_pending`, `unknown_approval_pending` | **no change** (badge updates only) | Docs are explicit: *the rider's word, not ours yet — do not settle your books on it* |
| `delivered` | `completed` | Confirmed; COD now owed |
| `partial_delivered` | `completed` | Confirmed outcome; remainder (if any) surfaces as a return status |
| `cancelled` | `cancelled` | Not delivered, parcel comes back |
| `partial_delivered_return_received`, `cancelled_return_received` | `return` | Physically back with you — reconcile stock |
| other `*_return_proccessing` / `*_return_rider_assigned` | **no change** (badge only) | In flight — not yet received |
| `exceptional`, `unknown` | **no change** + flag in UI | "Ask us" states |

### 6.2 Pathao / REDX (draft — confirm when credentials arrive)

Same *shape* (booked → in-transit → delivered / cancelled / returned) but each courier has its own vocabulary and its own "not confirmed yet" tier. Before enabling either, fetch their API docs and fill in:

| Concept | Pathao status (TBD) | REDX status (TBD) | → `orderStatus` |
|---|---|---|---|
| Just booked / awaiting approval | _(e.g. `Placed`)_ | _(e.g. `Pending`)_ | `pending` |
| In transit / rider assigned | | | **no change** (badge only) |
| Delivery attempt pending confirmation | _(their `*_pending` tier, if any)_ | | **no change** (badge only) |
| Delivered (confirmed) | `Delivered` | `Delivered` | `completed` |
| Cancelled / returned by customer | `Returned` | `Returned` | `cancelled` → `return` once received |
| Lost / exception | `Lost` | | **no change** + flag |

**Guards (never let the courier overwrite a human) — identical for every provider:**

1. Never modify `incomplete` orders (drafts), and never book them (client + server check).
2. If the order is currently `completed`, `cancelled` or `return` **and was set by an admin**, courier updates only apply when the courier is strictly more authoritative (`delivered`). The mapping table is applied **out of** `pending`/`processing` freely; into a terminal admin-set state, only delivered → `completed` and return-received → `return` are allowed, and only when they differ.
3. The admin can always re-set `orderStatus` manually after any sync — the select on the Status card stays the final word.

`processing` is **admin-owned**: no courier has an equivalent ("it's with us" is `pending`), so courier events leave a manually-set `processing` alone unless the terminal mapping applies.

---

## 7. Implementation by file

### 7.0 The courier abstraction

```
src/lib/couriers/
├── index.js       # registry: definitions, enablement check, getCourier(id)
├── steadfast.js   # full adapter (this iteration)
├── pathao.js      # notConfigured stub → throws CourierNotConfigured
└── redx.js        # notConfigured stub → throws CourierNotConfigured
```

**Registry (`index.js`)** — single source of truth for the dropdown:

```js
export const COURIERS = [
  { id: 'steadfast', label: 'Steadfast Courier', envPrefix: 'STEADFAST' },
  { id: 'pathao',    label: 'Pathao Courier',    envPrefix: 'PATHAO' },
  { id: 'redx',      label: 'REDX Delivery',     envPrefix: 'REDX' },
];

export function isConfigured(id)   // required env vars present?
export function getCourier(id)     // → adapter, or throw CourierNotConfigured
```

**Adapter interface (every provider implements):**

```js
{
  createOrder(order, payload),           // → { consignmentId, trackingCode, trackingLink, status }
  statusByConsignment(consignmentId),    // → { status }
  trackings(invoice),                    // → [{ text, createdAt }] (or [] if unsupported)
  healthCheck(),                         // cheap "are my credentials alive?" probe
}
```

The booking action, sync action, modal and webhook route are all **provider-agnostic** — they only ever talk to the adapter + the per-provider status map. Enabling Pathao later = fill `pathao.js`, add its env vars, define its §6.2 row: **no changes** to actions, modal, schema, or webhook routing.

### 7.1 `src/lib/steadfast.js` → becomes `src/lib/couriers/steadfast.js`

Thin `fetch` client implementing the adapter interface.

```js
const BASE = process.env.STEADFAST_BASE_URL || 'https://portal.packzy.com/api/v1';

async function call(path, { method = 'GET', body } = {}) { /* headers, JSON, error mapping */ }
```

Error handling: normalize every failure into `CourierError { provider, status, code, message }` with human messages —
`403` → *"Booking is on hold — complete your ownership (KYC) on the Steadfast dashboard"*, `429` → rate-limit message, `400/422` → per-field `errors`, `401` → *"Check STEADFAST_API_KEY / STEADFAST_SECRET_KEY"*.
Never retry `401` automatically; retry `500` **once** with the same invoice (safe by the uniqueness rule). `CourierNotConfigured` (missing env) is a distinct error → maps to the dropdown's disabled state.

### 7.2 `src/lib/courierStatus.js` (new)

Pure, per-provider, unit-testable:

```js
export function mapCourierToOrderStatus(provider, courierStatus, currentOrderStatus)
// → { orderStatus | null, flag?: 'hold' | 'unrecognized' }
export function courierStatusLabel(provider, courierStatus) // raw status → friendly label for the badge
```

Implements §6 exactly (a map per provider); returns `null` for "leave `orderStatus` alone". Unknown provider/status → no change + `unrecognized` flag — a new courier can never accidentally rewrite statuses.

### 7.3 `src/actions/courier.js` (new, `'use server'`)

Matches the existing `src/actions/orders.js` conventions (serialize via `JSON.parse(JSON.stringify(...))`).

| Action | Behaviour |
|---|---|
| `getAvailableCouriers()` | Registry + `isConfigured()` → drives the dropdown (labels only, never env values) |
| `getCourierBooking(orderNo)` | Booking + timeline (fetched on modal open) |
| `bookCourier(orderNo, provider, payload)` | Guard (`incomplete`/`cancelled` refused, not already booked, provider configured) → validate phone `^01\d{9}$`, name, address → `getCourier(provider).createOrder(...)` with `invoice = orderNo`, `cod_amount = Number(order.total)` → persist `CourierBooking { provider, ... }` → revalidate → return booking |
| `syncCourierStatus(orderNo)` | Reads `booking.provider` → `statusByConsignment` → update `courierStatus` + `lastSyncedAt` → apply §6 map → return `{ courierStatus, orderStatus, changed }` |

### 7.4 `src/components/admin/CourierBookingModal.jsx` (new)

Built on the `ConfirmDialog` shell (fixed overlay, `role="dialog"`, ESC-to-close, focus trap) but wider (`max-w-2xl`), two states:

**A — Not booked: booking form**

Top of the form: **Select Courier** dropdown

- Styled like the existing Status select (appearance-none, chevron, dark-mode aware).
- Options: `Steadfast Courier` (enabled), `Pathao Courier — credentials pending` and `REDX Delivery — credentials pending` (`disabled`, muted styling + hint).
- Default = Steadfast; last-used choice remembered in `localStorage` for convenience.
- Options come from `getAvailableCouriers()` — when Pathao credentials land in `.env`, it becomes selectable with **zero UI changes**.

Then the prefilled fields:

| Form field | Prefill |
|---|---|
| Invoice | `order.orderNo` (readonly — the idempotency key) |
| Recipient name | `order.details.customerName` |
| Recipient phone | `order.details.phoneNumber` |
| Recipient address | `order.details.shippingAddress` |
| COD amount | `Number(order.total)` (editable — e.g. partial COD) |
| Note, item description, lots, alt. phone, delivery type | empty / defaults; items summary shown read-only above |

- Client validation: BD mobile `/^01\d{9}$/`, name/address required (mirrors checkout rules); server re-validates.
- Submit → spinner → on success the modal **switches to state B** showing the fresh booking (no close-and-reopen).
- `400/422` → inline field errors; `403` → KYC banner (Steadfast); `429` → back-off message; `500` → "safe to retry — reference uniqueness prevents double-booking".

**B — Booked: information panel**

- Courier name (which provider carried it), consignment ID, tracking code (copy button), **tracking link** (new tab)
- Courier status badge (raw value + friendly label, colored) with **last synced** time
- **Sync status** button (calls `syncCourierStatus`, shows "changed / no change", 60 s cache respected)
- Tracking timeline — newest first (`trackings(invoice)`; empty state if the provider has no timeline endpoint)
- Order status after mapping shown alongside, so the admin sees both sides

**C — Order page changes (`app/admin/orders/[orderNo]/page.jsx`)**

1. **"Courier Booking" button** in the header action group (next to *Download Invoice*), truck icon, same button styling.
2. Modal state (`courierOpen`) + render `<CourierBookingModal order={...} onClose={...} onBooked={refreshOrder} />`.
3. A compact **Courier** summary card in the bottom row grid (courier + booking status, tracking code, last sync) when booked — otherwise the card is hidden and only the header button shows.

### 7.5 `app/api/webhooks/courier/[provider]/route.js` (new)

```
POST /api/webhooks/courier/steadfast     ← registered now
POST /api/webhooks/courier/pathao        ← reserved, returns 200 + "not configured" log
POST /api/webhooks/courier/redx          ← reserved
```

Provider-routed by the path segment, so each courier's signature scheme and payload shape is validated by its own handler:

1. Read the **raw text body** first (signature covers raw bytes).
2. `switch (provider)`:
   - **`steadfast`** — verify `X-Signature` = HMAC-SHA256(body, `STEADFAST_WEBHOOK_TOKEN`); if the token env is unset, log loudly and reject (fail closed). Verify `Authorization: Bearer` matches the same token.
   - **`pathao` / `redx`** — reserved: log and answer `200` (their signature rules get implemented when credentials/docs arrive).
3. Parse JSON; switch on the provider's event type:
   - delivery-status event → find booking by `(provider, consignment_id)` → update `courierStatus` → apply §6 map to the order (same guards).
   - tracking event → update booking's `lastSyncedAt` (timeline rows are fetched on demand in this iteration; webhook only bumps freshness).
   - everything else → `console.info` and ignore.
4. **Idempotency:** if the provider's idempotency key equals the last processed key for this booking, return `200` without re-applying.
5. Answer `200` fast; **never** return 4xx/5xx for an event we merely don't understand (that would stop retries of events we do want).

Registered in the Steadfast dashboard at `/user/webhook/add` (§10).

---

## 8. Credentials — database only (removed from .env)

Courier credentials are **not** stored in `.env` — env vars were removed
permanently. Everything is entered and stored in the database via
**Settings → Courier Services**:

| Provider | Credential fields (Settings UI) |
|---|---|
| **Steadfast** | `API Key`, `Secret Key`, `Webhook Token`, `Base URL` |
| **Pathao / REDX** | fields land with the adapter + keys (§12) |

`isConfigured(id)` reads the service row straight from the DB
(`src/lib/couriers/credentials.js`) — no env fallback — so a row with blank
keys (or no row at all) leaves the dropdown option disabled as
"credentials pending". The **webhook token** is the row's `webhookToken`
value: paste the same string into the Steadfast dashboard at
`/user/webhook/add` (§10), and rotating it in the UI applies immediately.

---

## 9. Testing checklist

**Legend** — [x] automated & verified 2026-10-07 (43 unit/integration + 10 webhook e2e tests) · [ ] needs the owner in the browser / outside the code.

**Shared / UI**

- [x] `npx prisma migrate dev --name add_courier_booking` applies cleanly; `npm run build` passes
- [ ] Modal opens from the header button; form prefills match `order.details`; ESC/overlay closes
- [ ] **Select Courier dropdown lists all three; Pathao + REDX are disabled with "credentials pending" and cannot be submitted**
- [x] Server-side field validation in `bookCourier` (phone `^01\d{9}$`, name/address/COD required, COD ≤ 1,000,000); returns `fieldErrors` for inline display
- [ ] Booking an `incomplete`/`cancelled` order is refused; booking an already-booked order shows state B, never a second parcel (double-submit also caught by `orderId @unique` → `P2002`)
- [x] No `STEADFAST_*` value, no key/secret, not even `portal.packzy.com` appears in the client bundle (grepped `.next/static`)

**Steadfast**

- [x] `/ping` and `/get_balance` succeed from the app (keys wired) — `healthCheck()` → `balance ৳0`
- [x] Wrong API key → `CourierError` 401 with the key-check message, no retry; unreachable host → status 0; bogus consignment/invoice → clean error, never a crash
- [ ] Real booking (test order!) → state B shows `consignment_id`, `tracking_code`, link; DB row exists with `provider: "steadfast"` — **blocked on KYC (§10.1)**
- [x] Signed `delivery_status: delivered` webhook flips a `pending` order to `completed` (end-to-end against `next start`, temp order created/asserted/deleted)
- [x] Wrong/tampered signature → 401, nothing recorded; missing or wrong-token `Authorization` → 401; replayed `Idempotency-Key` (same key, different status) → ignored, no double-apply
- [x] Admin-set `completed`/`cancelled` is **not** resurrected by a stray courier `pending` event — and a new-key `cancelled` after `delivered` updates the badge only (guard 2)
- [x] `*_approval_pending` changes the badge but **not** `orderStatus`; `hold` sets the `hold` flag; unknown status/provider → `unrecognized` flag, no change; `incomplete` never touched
- [ ] Sync button respects the 60 s cache (immediate second click reports "no change") — logic covered by tests, click-through pending
- [ ] KYC hold: a real booking attempt renders the ownership banner instead of a raw 403 (mapping `403 → KYC message` is in `steadfast.js#messageFor`). **Probe result 2026-10-07:** an invalid `create_order` now returns HTTP 200 + `{status:400, errors:{recipient_name:[…],…}}` — i.e. field validation, *not* 403 — so either the hold was lifted or validation runs first; only a real submission settles it. The banner path now reads *"recipient name: The recipient name field is required. · …"* (humanized by `summarizeErrors`, field-keyed errors render inline next to the matching input).

**Webhook routing**

- [x] `POST /api/webhooks/courier/pathao` (reserved) answers 200 and logs without throwing
- [x] Unknown provider → 404; malformed JSON → 200 acknowledged; `tracking_update` → 200 + `lastSyncedAt` refreshed; unknown consignment → 200 (acknowledged, not an error); unrecognized event type → 200 (never 4xx — that would stop Steadfast's retries)
- [x] Fail-closed: no `STEADFAST_WEBHOOK_TOKEN` → every Steadfast webhook is rejected 401

---

## 10. Setup outside the code

1. **Steadfast ownership / KYC** — ⚠️ the dashboard showed *"Parcel booking is on hold. Please complete your ownership information to continue booking parcels."* Reads (`ping`, `get_balance`, status) work either way. **Update 2026-10-07:** a deliberately-invalid `create_order` probe now reaches field validation (HTTP 200 + `status:400, errors:…`) instead of a 403 — so the hold may have been lifted (or validation simply runs first). **Attempt one real booking to settle it** — the modal surfaces whatever the API says either way.
2. **Steadfast webhook** — at `steadfast.com.bd/user/webhook/add`: Callback URL `https://<production-domain>/api/webhooks/courier/steadfast`, and for the auth token paste the `Webhook Token` value saved in **Settings → Courier Services → Steadfast** (keep them identical — the route verifies `Authorization: Bearer <token>` **and** `X-Signature: HMAC-SHA256(raw body, <token>)`), Save. The existing `SiteSetting.siteUrl` holds the canonical domain. **localhost cannot receive webhooks** — until the app is deployed (or a tunnel is used), the manual Sync button is the path.
3. **Pathao / REDX accounts** — when credentials arrive: add env vars (§8), implement the two adapters + their §6.2 mapping rows + their webhook signature checks. Everything else is already provider-routed.
4. **Rate-limit awareness** — do not wire polling loops; the Sync button is per-order, manual.

---

## 11. Security notes

- Keys live in `.env` + server modules only. Steadfast itself prints live keys in its guide samples ("treat this page as a secret") — treat every courier dashboard the same; rotate if a repo ever leaks.
- Webhook authenticity = per-provider signature verification over the raw body (Steadfast: HMAC-SHA256), fail-closed when the token is missing; reserved providers never trust a payload they haven't verified.
- Admin API routes in this project are self-guarded (`verifyToken` from `src/lib/auth-edge.js`, as in `app/api/admin/backup/route.js`) — the new webhook route is intentionally **public** but signature-verified; any future `/api/admin/courier/*` route must carry the `verifyToken` guard (known gap: `progress-tracker.md` §"Add an auth guard to /api/admin/*"). Server actions used here are only reachable from the admin page.
- The dropdown only ever exposes courier **labels** — never env values or configured/unconfigured internals beyond the intentional enabled/disabled hint.

---

## 12. Follow-ups (explicitly out of scope now)

- **Enable Pathao + REDX**: adapters, env, §6.2 status rows, webhook handlers (§7) — designed to slot in without touching actions/modal/schema
- **Switch courier after booking** (release an existing booking, rebook elsewhere) — currently `orderId @unique` forbids a second booking
- Auto-book when an admin flips `pending → processing`, and **bulk book** from the orders list (Steadfast: `/create_order/bulk-order/extended`, ≤500/request)
- Return / pickup request UI (`create_return_request`, `create_pickup_request` + `police_stations` lookup)
- Balance & payouts card (`/get_balance`, `/payments/{id}` reconciliation)
- Fraud check in checkout (`/fraud_check/score/{phone}` — numeric scoring is **disabled**; read ratios/volume band)
- Add `tracking_code` + courier + status columns to the existing courier XLSX export (`docs/plan-sales-report.md`)
- Store the tracking timeline as rows (webhook tracking events currently only bump freshness)
- Optional: a **default courier** setting in `SiteSetting` preselecting the dropdown

---

## 13. Risks

| Risk | Mitigation |
|---|---|
| KYC hold blocks Steadfast `create_order` at launch | Clear 403 copy in the modal; owner completes ownership in parallel (§10) |
| Webhooks unreachable from localhost | Manual Sync button; webhook optional for development |
| 60 s status cache makes "Sync" feel stale | UI shows `lastSyncedAt` and explains the cache |
| Courier event vs. manual status conflict | §6 guards; admin select remains authoritative |
| Keys leaked via client bundle | Server-only modules; build-time grep check (§9) |
| Double-booking | Per-courier reference uniqueness + `orderId @unique` locally + guarded action |
| Pathao/REDX differ more than expected (auth, fields, status vocabulary) | Everything provider-specific is isolated in the adapter + status map; unknown statuses map to **no change** by default — a new courier cannot corrupt `orderStatus` |
| Premature abstraction | The abstraction is a registry + 4-method interface shared by three known integrations — no speculative machinery; Steadfast ships first and validates it |
