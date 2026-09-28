device-blocking.md

# Customer Blocking (Device Block) System — Feature Specification

> Reference implementation: this Next.js project (radiant-picks). This document describes the
> system **exactly as it behaves today**, with per-section **Laravel port notes** so it can be
> replicated 1:1 in a Laravel project.
>
> Companion doc: `order-management.md` (the blocked-device guards are enforced inside the
> checkout flow).
>
> Source of truth files (this repo):
> - `prisma/schema.prisma` — `BlockedDevice`, `OrderDetails.deviceHash/ipAddress`
> - `src/hooks/useDeviceFingerprint.js` — device fingerprinting
> - `app/api/admin/orders/block/route.js`, `app/api/admin/orders/unblock/route.js` — admin APIs
> - `app/api/checkout/check-blocked/route.js`, `app/api/checkout/route.js` — lookup + enforcement
> - `app/admin/orders/[orderNo]/page.jsx` — admin blocking UI ("Device & Block" card)
> - `app/(storefront)/checkout/page.jsx` — customer-side block check
> - `src/components/ConfirmDialog.jsx` — confirmation modal

---

## 1. Concept — what "blocking a customer" means here

- Blocking is keyed on a **browser/device fingerprint**, not a user account. There is **no
  user-account blocking** (the `User` model has no blocked/banned field; customers don't even
  log in — checkout is guest-only).
- The fingerprint is the **FingerprintJS `visitorId`** (open-source agent
  `@fingerprintjs/fingerprintjs` v5.2.0), captured at checkout and stored on every order as
  `OrderDetails.deviceHash`.
- The customer's **IP address is captured and displayed for investigation only** — it is
  **never** checked against any blocklist (no IP blocking exists).
- Blocking is enforced at **checkout only**: a blocked device can browse products, use the
  cart, and open the checkout page — it just can never place an order.
- There is **no dedicated "blocked devices" admin page**. Blocks are created/removed from the
  admin **order detail page**, per order.

### End-to-end flow

```
Customer (browser)                          Admin
──────────────────                          ─────
1. fingerprint computed (FingerprintJS)
   → cached in localStorage['device-hash']
2. /checkout loads → GET check-blocked
   ├─ blocked → redirect to google.com      4. opens /admin/orders/{orderNo}
   └─ not blocked → submit order               "Device & Block" card shows hash/IP/status
3. POST /api/checkout (server re-checks)     5. "Block Device" → ConfirmDialog
   ├─ blocked device → 403                      → POST /api/admin/orders/block
   ├─ has pending order → 403                   → BlockedDevice row created
   └─ ok → order created (hash+IP saved)     6. "Unblock Device" → ConfirmDialog
   └─ Telegram alert sent                       → DELETE /api/admin/orders/unblock
```

From step 5 onward, that browser fingerprint can never place another order (steps 2 and 3
fail) until an admin unblocks it.

---

## 2. Data model

### 2.1 `BlockedDevice` (the blocklist)

```prisma
model BlockedDevice {
  id          String   @id @default(cuid())
  deviceHash  String   @unique
  reason      String?
  orderNo     String?
  blockedAt   DateTime @default(now())

  @@index([deviceHash])
}
```

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `deviceHash` | String, **unique** | FingerprintJS `visitorId` — one row per device |
| `reason` | String, nullable | Free-text reason (UI hardcodes `'Blocked from order detail page'`) |
| `orderNo` | String, nullable | The order the block was created from |
| `blockedAt` | DateTime, default `now()` | Block timestamp |

Notes:
- **No FK relations** to any model; `orderNo` is a plain string reference, not enforced.
- **No "blocked by (admin)" field** — no audit trail of who blocked.

### 2.2 Capture columns on orders — `OrderDetails`

```prisma
ipAddress  String?   // client IP at checkout (display only — never used for blocking)
deviceHash String?   // FingerprintJS visitorId at checkout — the blocking key
```

The blocklist is **existence-checked**: a device is "blocked" iff a `BlockedDevice` row with
its hash exists. There is no `isBlocked` boolean anywhere and no status enum.

#### 🐘 Laravel port — migration & model

```php
// database/migrations/xxxx_create_blocked_devices.php
Schema::create('blocked_devices', function (Blueprint $table) {
    $table->id();
    $table->string('device_hash')->unique();
    $table->string('reason')->nullable();
    $table->string('order_no')->nullable();
    $table->timestamp('blocked_at')->useCurrent();
    $table->timestamps(); // optional; original has none
    $table->index('device_hash');
});

// Add to the order_details migration:
$table->string('ip_address')->nullable();
$table->string('device_hash')->nullable();
```

```php
// app/Models/BlockedDevice.php
class BlockedDevice extends Model
{
    protected $fillable = ['device_hash', 'reason', 'order_no'];
    protected $casts = ['blocked_at' => 'datetime'];
    public function isBlocked(string $hash): bool
    {
        return static::where('device_hash', $hash)->exists();
    }
}
```

> Recommended additions (not in the original): `blocked_by` FK to the admin user, and a
> `blocked_devices` index page.

---

## 3. Device fingerprinting (how the hash is produced)

`src/hooks/useDeviceFingerprint.js` — `useDeviceFingerprint()`:

```js
const STORAGE_KEY = 'device-hash';

useEffect(() => {
  const cached = getStorageHash();
  if (cached) { setDeviceHash(cached); return; }        // 1. use cache if present

  import('@fingerprintjs/fingerprintjs').then(({ default: FingerprintJS }) => {
    FingerprintJS.load().then((fp) => fp.get()).then((result) => {
      const hash = result.visitorId;                     // 2. compute visitorId
      setStorageHash(hash);                              // 3. cache in localStorage
      setDeviceHash(hash);
    });
  });
}, []);
```

Behavior:
- Returns `null` until the hash is computed (callers must null-check).
- **Caches the hash in `localStorage` under key `'device-hash'`** so FingerprintJS runs once
  per browser; subsequent visits read the cache instantly.
- Client-only (SSR-safe `typeof window === 'undefined'` guards).
- The hash is attached to the checkout request body (`deviceHash`) and used for the
  pre-check; it is **not** sent with other requests (no cookie/header propagation).

> Note: FingerprintJS `visitorId` is stable per browser profile. Clearing localStorage only
> forces recomputation (same id); a different browser/incognito profile yields a different
> id — that is the system's inherent bypass, accepted by design.

#### 🐘 Laravel port

No server package needed — fingerprinting is client-side:

```html
{{-- resources/views/layouts/app.blade.php (or the checkout page) --}}
<script src="https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@5/dist/fp.min.js"></script>
<script>
  async function getDeviceHash() {
    const cached = localStorage.getItem('device-hash');
    if (cached) return cached;
    const fp = await FingerprintJS.load();
    const { visitorId } = await fp.get();
    localStorage.setItem('device-hash', visitorId);
    return visitorId;
  }
</script>
```

In a Livewire/Inertia app, resolve the hash in JS and pass it with the checkout submission
(fetch/AJAX), exactly like the original. Do **not** try to compute it in PHP — it is a
browser attribute set.

---

## 4. API reference

### 4.1 Admin — block a device

`POST /api/admin/orders/block` — **JWT-guarded** (admin session). Body:
`{ deviceHash, orderNo, reason }`.

Exact behavior (`app/api/admin/orders/block/route.js`):

| Condition | Response |
|---|---|
| `deviceHash` missing | `400 { error: 'Device hash is required.' }` |
| Hash already in blocklist | `409 { error: 'This device is already blocked.' }` |
| OK | `200 { success: true, blocked: { ...newRow } }` |

```js
const blocked = await prisma.blockedDevice.create({
  data: { deviceHash, orderNo: orderNo || null, reason: reason || null },
});
```

### 4.2 Admin — unblock a device

`DELETE /api/admin/orders/unblock?deviceHash=<hash>` — **JWT-guarded**.

| Condition | Response |
|---|---|
| `deviceHash` missing | `400 { error: 'Device hash is required.' }` |
| OK (even if none existed — idempotent `deleteMany`) | `200 { success: true }` |

### 4.3 Public — blocklist lookup

`GET /api/checkout/check-blocked?deviceHash=<hash>` — **public, no auth.**

- No hash provided → `200 { blocked: false }`.
- Otherwise → `200 { blocked: !!row }` (existence check).

Used by both the storefront checkout page (pre-redirect) and the admin order detail page
(status pill state).

### 4.4 Enforcement — inside checkout

`POST /api/checkout` (public) — two guards run **before** an order is created, only when
`deviceHash` was supplied:

1. **Blocklist check** → `403 { error: 'You have been blocked from placing orders.' }`
2. **One-pending-order-per-device** → `403 { error: 'You already have a pending order
   #{orderNo}. Please wait for it to be processed.' }`
   (query: `OrderDetails where deviceHash = hash AND order.orderStatus = 'pending'`)

If allowed, `ipAddress` (from `x-forwarded-for` → `x-real-ip` → `cf-connecting-ip` → null)
and `deviceHash` are persisted with the new `OrderDetails` row.

### 4.5 Auth protection for admin endpoints

`proxy.js` (Next 16 middleware, matcher `/admin/:path*`) verifies the `admin_session` JWT
cookie (HS256, 8h, `role === 'admin'`) for all `/admin/*` pages and `/api/admin/*` routes
(except the login page): unauthenticated pages → redirect to `/admin/login?redirect=…`,
unauthenticated API calls → `401 { error: 'Unauthorized' }`. This is what restricts
block/unblock to admins.

#### 🐘 Laravel port

```php
// routes/api.php
Route::post('/checkout', [CheckoutController::class, 'store']);                 // public
Route::get('/checkout/check-blocked', [CheckoutController::class, 'checkBlocked']); // public

// routes/web.php — admin, protected by Laravel auth + role middleware
Route::middleware(['auth', 'role:admin'])->prefix('admin')->group(function () {
    Route::post('/orders/devices/block',   [BlockedDeviceController::class, 'block']);
    Route::delete('/orders/devices/block', [BlockedDeviceController::class, 'unblock']);
});
```

```php
// app/Http/Controllers/BlockedDeviceController.php
public function block(Request $request)
{
    $data = $request->validate([
        'deviceHash' => ['required', 'string'],
        'orderNo'    => ['nullable', 'string'],
        'reason'     => ['nullable', 'string'],
    ]);

    if (BlockedDevice::where('device_hash', $data['deviceHash'])->exists()) {
        return response()->json(['error' => 'This device is already blocked.'], 409);
    }

    $blocked = BlockedDevice::create([
        'device_hash' => $data['deviceHash'],
        'order_no'    => $data['orderNo'] ?? null,
        'reason'      => $data['reason'] ?? null,
    ]);

    return response()->json(['success' => true, 'blocked' => $blocked]);
}

public function unblock(Request $request)
{
    $hash = $request->query('deviceHash');
    if (!$hash) {
        return response()->json(['error' => 'Device hash is required.'], 400);
    }
    BlockedDevice::where('device_hash', $hash)->delete(); // idempotent
    return response()->json(['success' => true]);
}

// CheckoutController@checkBlocked (public)
public function checkBlocked(Request $request)
{
    $hash = $request->query('deviceHash');
    return response()->json(['blocked' => $hash ? BlockedDevice::where('device_hash', $hash)->exists() : false]);
}
```

The checkout 403 guards map 1:1 — see `order-management.md` §4.2 / the `CheckoutController`
snippet.

---

## 5. Enforcement points (full picture)

### 5.1 Server-side (authoritative) — `POST /api/checkout`

- Blocked hash → `403`, message: *"You have been blocked from placing orders."*
- This runs on every checkout attempt regardless of what the client did — the client-side
  redirect is only cosmetic; **the server check is the real enforcement**.

### 5.2 Client-side (UX) — storefront checkout page

`app/(storefront)/checkout/page.jsx` (lines 55–66):

```js
const deviceHash = useDeviceFingerprint();

useEffect(() => {
  if (deviceHash) {
    fetch(`/api/checkout/check-blocked?deviceHash=${deviceHash}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.blocked) {
          window.location.href = 'https://google.com';   // silent redirect
        }
      })
      .catch(() {});
  }
}, [deviceHash]);
```

- Runs as soon as the fingerprint resolves. Blocked customers are **silently redirected to
  `https://google.com`** — no error page, no message, nothing rendered.
- If the redirect somehow doesn't happen and the customer submits, the API 403 message is
  surfaced in the red error banner at the top of the form.
- **Only `/checkout` checks.** Product pages, cart, and cart drawer are unaffected — blocked
  devices shop normally until checkout.

### 5.3 Related (not a block, but same checkout guard)

- **One-pending-order-per-device:** a device with an existing `pending` order is refused new
  orders (403) — anti-spam measure sharing the same `deviceHash` key (§4.4).

### 5.4 What is NOT enforced

- No IP blocking (IP is stored/display only).
- No blocking on any other route/action (admin-only CRUD is protected by JWT instead).
- No rate limiting.

---

## 6. Admin UI — the "Device & Block" card

Location: **order detail page** `/admin/orders/{orderNo}`, third card of the bottom 3-card
grid (Status | Customer | **Device & Block**), `app/admin/orders/[orderNo]/page.jsx:457–512`.

Card contents (top to bottom):

| Element | Behavior |
|---|---|
| **Device Hash** | Label + `font-mono break-all` value, `—` when missing |
| **IP Address** | Label + `font-mono` value, `—` when missing |
| **Status** | Pill: `Blocked` = red (`bg-red-50 text-red-700`) with a prohibition-slash icon · `Active` = emerald (`bg-emerald-50 text-emerald-700`) with a checkmark icon |
| **Action button** | Only if `order.details.deviceHash` exists: blocked → full-width emerald **"Unblock Device"**; active → full-width red **"Block Device"**; both show **"Processing..."** while `blockLoading`. No hash → gray text *"No device hash — cannot block."* |

**State logic (client component):**
- `isBlocked` is resolved on load: after the order fetch, it calls
  `GET /api/checkout/check-blocked?deviceHash=…` and stores `data.blocked`.
- `handleBlock()` → `POST /api/admin/orders/block` with
  `{ deviceHash, orderNo: order.orderNo, reason: 'Blocked from order detail page' }`
  (⚠️ **reason is hardcoded** — there is no free-text input). Success sets `isBlocked = true`;
  failure → `alert(data.error || 'Failed to block device.')`.
- `handleUnblock()` → `DELETE /api/admin/orders/unblock?deviceHash=…`. Success sets
  `isBlocked = false`; failure → `alert(...)`.

**Confirmation modals** (shared `ConfirmDialog` component — overlay, `max-w-sm` panel,
Escape closes, auto-focus confirm):

```jsx
// Block (danger variant — red confirm button)
<ConfirmDialog
  open={confirmBlock}
  title="Block Device"
  message={`Block this device?\n\nDevice: ${deviceHash}\nOrder: #${orderNo}\nCustomer: ${customerName || '—'}`}
  confirmLabel="Block"
  cancelLabel="Cancel"
  variant="danger"
  onConfirm={() => { setConfirmBlock(false); handleBlock(); }}
/>
```

Unblock mirrors it: title **"Unblock Device"**, message shows the device hash only, default
(non-danger) variant, confirm label "Unblock".

**Elsewhere in the admin UI:**
- Orders **list** page shows the customer's **IP Address** column (and IP in expanded mobile
  cards) but has **no** device-hash column, no blocked-status column, and no block actions —
  you must open the order detail page.
- There is **no dedicated blocked-devices list page** and no UI to edit a block's
  reason/order reference after creation.

#### 🐘 Laravel port

Replicate as a card on the order show page (Blade + Livewire or Inertia):

- Same three data rows (hash in `<code class="font-mono break-all">`, IP in mono, status
  pill) and the same button rules (red "Block Device" / emerald "Unblock Device",
  "Processing..." disabled state, hidden with the *"No device hash — cannot block."* note
  when the order has no hash).
- Keep the two-step confirmation (dialog with the exact message text above; danger variant
  for Block). In Livewire: `wire:confirm` or a small Alpine dialog; in Inertia/React: port
  `ConfirmDialog` as-is.
- Poll the block state from the public `check-blocked` endpoint (or hydrate it server-side —
  simpler in Laravel: `BlockedDevice::where('device_hash', $order->details->device_hash)->exists()`).
- On failure show the API error via `alert()` or a toast — original uses `alert()`.

---

## 7. Customer-facing behavior when blocked

| Touchpoint | Behavior |
|---|---|
| Open `/checkout` | Fingerprint computed → `check-blocked` → **redirect to `https://google.com`** (silent) |
| Submit checkout (if redirect bypassed) | `403 { error: 'You have been blocked from placing orders.' }` shown in the red banner at the top of the form |
| Browsing products / cart | **Fully functional** — nothing is checked outside `/checkout` |
| Existing pending order (same device) | `403 "You already have a pending order #X. Please wait for it to be processed."` in the same red banner |
| Unblocked later | Can order again immediately (no cache to clear server-side; the row is simply deleted) |

---

## 8. Limitations of the reference implementation

Decide which to keep vs. improve when porting:

1. **No blocked-devices list page** — admins can only see/manage blocks via an order that
   carries the device hash; there is no `findMany` on `BlockedDevice` anywhere.
2. **Hardcoded reason** (`'Blocked from order detail page'`) — no input for a real reason.
3. **No audit trail** — no "blocked by admin X" field, no history.
4. **No IP blocking** — the captured IP is display-only.
5. **Client-side bypass is trivial** — a different browser/incognito profile produces a new
   fingerprint; the redirect to google.com is JS-only (the server 403 is the real wall).
6. **No expiry/TTL** — blocks last until manually removed.
7. **`orderNo` on the block is a loose string** — no FK; deleting the order leaves a dangling
   reference.
8. **One-pending-order guard is device-scoped only** — same phone number from a different
   device is not limited.

---

## 9. Laravel porting checklist

- [ ] `blocked_devices` migration (`device_hash` unique, `reason`, `order_no`, `blocked_at`)
      + `ip_address` / `device_hash` columns on `order_details` (§2)
- [ ] `BlockedDevice` model + `isBlocked()` helper (§2)
- [ ] Client fingerprinting: FingerprintJS via CDN, cached in `localStorage['device-hash']`
      (§3)
- [ ] Public `GET /checkout/check-blocked` endpoint (§4.3)
- [ ] Checkout guards: blocked → 403 *"You have been blocked from placing orders."*, and
      one-pending-order-per-device → 403 (§4.4)
- [ ] Admin endpoints `block` (409 on duplicate, exact messages) / `unblock` (idempotent)
      behind `auth` + `role:admin` middleware (§4.1–4.2, §4.5)
- [ ] Checkout page: block check on load → external redirect; red error banner for 403s (§5,
      §7)
- [ ] Order show page: "Device & Block" card (hash/IP/status pill, Block/Unblock buttons,
      confirm dialogs with the exact message text, hardcoded reason if you want exact parity)
      (§6)
- [ ] Decide & improve: blocked-devices index page, editable reason, `blocked_by` audit,
      IP blocking, block expiry (§8)
