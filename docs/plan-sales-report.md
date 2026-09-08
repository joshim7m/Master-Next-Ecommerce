# Plan — Admin Sales / Order Report + Courier Excel Export

> Status: **Implemented** · Updated: 2026-09-08
> Implements the **Sales Report** page at `/admin/reports/sales` (sidebar entry + header title already exist). Goal: date-filtered order reporting with a one-click courier-service **Excel (.xlsx)** export.

---

## 1. Requirements

1. **Default view:** last 1 month of orders.
2. **Manual filters:** Today · This Week · This Month · Last 1 Month · Custom (start-date → end-date).
3. **Courier Excel (.xlsx) export** of selected (or all filtered) orders with the exact column layout below.

### Decisions (confirmed by owner)

| Question | Decision |
|---|---|
| `Invoice` column content | **Product name + variant name** (e.g. `Padded Bra L/White`) — one row per order; multi-item orders join items with `", "` |
| `Amount` column content | `order.total` (items subtotal + delivery charge) |
| `Note` / `Lot` columns | `Note` = literal `"null"`, `Lot` = empty (orders have no note field) |
| Status handling on export | **Skip** `cancelled` / `return` / `incomplete` orders (courier dispatch only) |
| Report table itself | Shows **all** statuses with badges (it is a report); only the export filters statuses |
| Export format | **Excel .xlsx** (owner: "for Excel") — phone numbers stored as text cells so leading zeros survive; dashboard/report UI unchanged |

---

## 2. Data Mapping (CSV columns → DB)

Header (tab / comma separated, 9 columns):

```
Invoice, Name, Address, Phone, Amount, Note, Lot, Contact Name, Contact Number
```

| CSV column | Source | Example |
|---|---|---|
| Invoice | `OrderItem.productTitle` + `OrderItem.variantName` (joined, one row per order) | `Padded Bra L/White` |
| Name | `OrderDetails.customerName` | `Nasrin Akter` |
| Address | `OrderDetails.shippingAddress` | `7/d, Sector-7 Uttara Dhaka` |
| Phone | `OrderDetails.phoneNumber` | `1625118673` |
| Amount | `Order.total` (Number) | `660` |
| Note | literal `"null"` | `null` |
| Lot | empty | *(blank)* |
| Contact Name | `SiteSetting.siteName` | `companyname` |
| Contact Number | `SiteSetting.mobile` | `1729200455` |

> `Contact Name` / `Contact Number` come from the existing `GET /api/admin/settings/site` endpoint (already used by the sidebar) — no new settings needed.

---

## 3. Implementation

### 3.1 Data layer — `src/actions/orders.js`

Add one server action (matches existing `getOrders` pattern):

```js
export async function getOrderReport(fromISO, toISO) {
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: new Date(fromISO), lte: new Date(toISO) } },
    include: { details: true, items: true },
    orderBy: { createdAt: 'desc' },
  });
  return serialize(orders);
}
```

- No new API route / no schema change.
- Reads remain server-action based, consistent with `getOrders`, `getIncompleteOrders`.

### 3.2 Page — `app/admin/reports/sales/page.jsx` (rebuild placeholder)

**Layout** (single column, matches admin design system: `SectionCard`-style cards, slate/purple palette, dark-mode paired classes):

1. **Filter bar**
   - Preset chips: `Today` / `This Week` / `This Month` / `Last 1 Month` *(default)* / `Custom`.
   - `Custom` reveals Start date + End date `<input type="date">` pickers.
   - Range computed **client-side in local time** (assumptions: week starts **Sunday** (BD convention); "Last 1 Month" = 30 days back), sent as ISO strings to the server action.
   - Active preset highlighted; changing preset refetches.
2. **Summary cards** — Orders count, Revenue (sum of `total` excluding cancelled/return/incomplete), Items sold (sum of item quantities).
3. **Orders table**
   - Select-all checkbox + per-row checkbox.
   - Columns: checkbox · Order No (link to `/admin/orders/[orderNo]`) · Date · Customer · Phone · Address · Items (count + tooltip/list) · Amount · Status badge (reuse the `orderStatusColors` map from `/admin/orders`).
   - Client-side pagination, 10 rows/page (same pattern as `app/admin/blog/categories/page.jsx`).
   - Empty state when the range has no orders.

### 3.3 Excel export — client-side via `src/lib/xlsx.js`

- New helper `buildXlsx(rows, { sheetName, colWidths })` — dependency-free xlsx writer using the existing `jszip` dependency (all cells are `inlineStr` text cells, so Excel never mangles phone numbers like `01945090085` or evaluates formulas).
- Buttons in a footer bar: **Export Selected (N)** and **Export All (filtered)**; both download `courier-report-YYYY-MM-DD.xlsx` (sheet `Courier Report`, sized columns) via a Blob download.
- Behavior:
  - Export **skips** `cancelled` / `return` / `incomplete` rows — for both buttons; toast reports `X orders skipped (cancelled/return/incomplete)`.
  - `Export Selected` with 0 eligible selected → warning toast.
  - `Invoice` cell = `productTitle + ' ' + variantName` per item; multi-item orders join with `", "`; no items → empty cell.
  - `Note` always `null`, `Lot` always empty, per §1 decisions.

### 3.4 Files touched

| # | File | Change |
|---|---|---|
| 1 | `src/actions/orders.js` | Add `getOrderReport(fromISO, toISO)` |
| 2 | `app/admin/reports/sales/page.jsx` | Full report UI + Excel export |
| 3 | `src/lib/xlsx.js` | New minimal xlsx builder (JSZip-based, browser-safe) |

No sidebar / layout-title changes needed (done previously). No DB migration.

---

## 4. Edge cases handled

- **Empty range** → empty-state UI, export buttons disabled.
- **Order with missing `details`** → fallback `—` / empty strings in table; CSV row still emitted with blanks.
- **Multi-item orders** → one row per order; `Items` column shows count.
- **Timezone** → presets use the admin's browser local time; server compares against stored `createdAt` (UTC) via full ISO instants, so boundary correctness depends on client clock — acceptable for internal reporting.
- **Large ranges** → Custom range capped at 1 year; fetch-all is fine at current volumes (consistent with existing admin pages).
- **Excel data mangling** → every cell is an inline text cell: leading zeros in phones are preserved and strings like `=SUM(...)` are never evaluated.

---

## 5. Testing checklist

1. Default load = last 1 month, correct totals.
2. Each preset returns the expected window; Custom range works (start > end blocked with validation).
3. Selection: select-all / individual toggle / count label; pagination preserves selection.
4. Export Selected → CSV opens in Excel with 9 columns, correct quoting of addresses containing commas/newlines, BOM present.
5. Export All → same, minus cancelled/return/incomplete orders; skip-toast accurate.
6. Dark mode visual pass.
7. `node`-based SWC compile check on both touched files (project has no linter).
