# Incomplete Checkout / Abandoned Checkout — Final Approach

## সিদ্ধান্ত (Decision)

কোনো নতুন migration বা নতুন table নেই। Existing `Order` / `OrderDetails` / `OrderItem` system-ই reuse করা হয়েছে, শুধু একটি নতুন order status যোগ হয়েছে: **`incomplete`**।

- কেউ Checkout page-এ গিয়ে form-এর কিছু তথ্য পূরণ করে কিন্তু order complete না করে চলে গেলে সেটি `orderStatus: 'incomplete'` দিয়ে একটি Order হিসেবে save হয়।
- সবচেয়ে গুরুত্বপূর্ণ শর্ত: **Customer mobile number না দিলে বা invalid হলে কোনো incomplete order save করা যাবে না।**
  - শুধু Checkout page open করলে → কিছু save হবে না
  - Name/address দিলেও mobile না দিলে → কিছু save হবে না
  - Valid BD mobile number দিলে → draft order save হবে
- Server-side validation বাধ্যতামূলক (`MOBILE_REGEX = /^(013|014|015|016|017|018|019)\d{8}$/`)।

## Session ID — `orderNo` ব্যবহার

একই checkout session-এর জন্য duplicate incomplete order তৈরি হয় না। এজন্য mobile number দিয়ে নয়, **draft order-এর `orderNo`** দিয়ে identify করা হয়:

1. প্রথমবার valid mobile দিলে server একটি `incomplete` Order তৈরি করে এবং তার `orderNo` ফেরত দেয়।
2. Client সেই `orderNo` টি `sessionStorage` (`incomplete-checkout-orderNo`) এ রাখে।
3. এরপর name/address/cart quantity পরিবর্তন হলে একই `orderNo` দিয়ে **একই draft order update** হয় (new order তৈরি হয় না)।
4. Cross-session dedup: নতুন session-এ একই `deviceHash` + mobile number দিয়ে নতুন draft হলে পুরনো `incomplete` draft গুলো delete হয়ে যায়।
5. Order successfully complete হলে সংশ্লিষ্ট draft delete হয়ে যায়।

## Performance

- প্রতিটি keystroke-এ database request হয় না — **debounced autosave (~1.2s)**।
- Mobile number valid না হলে কোনো request পাঠানো হয় না।

## API

### `POST /api/checkout/incomplete`
- Body: `{ orderNo?, name?, mobile, address?, shippingArea?, items, deviceHash? }`
- Server-side mobile validation; invalid/empty হলে `400`।
- `orderNo` দিলে সেই existing `incomplete` order update (transaction-এ Order + OrderDetails update, OrderItem replace), না দিলে নতুন তৈরি (collision-retry সহ random 6-digit `orderNo`)।
- Total/delivery calculation `/api/checkout` এর মতোই (Inside Dhaka 50, Outside Dhaka 120)।

### `DELETE /api/checkout/incomplete?orderNo=...`
- Draft order delete।

### `POST /api/checkout` (modified)
- Optional `orderNo` গ্রহণ করে; order সফলভাবে তৈরি হলে সেই draft (এবং একই `deviceHash` + `phoneNumber` এর অন্য draft) delete হয়।

## Admin Panel

- **Main Orders list** (`/admin/orders`): `incomplete` order গুলো সাধারণ order এর সাথেই দেখা যায়, আলাদা badge সহ। Status filter dropdown এবং status select এও `incomplete` আছে (admin চাইলে customer-কে call করে draft কে `pending` এ convert করতে পারে)।
- **Dedicated section** `/admin/incomplete-orders`: শুধু `incomplete` order — Customer Name, Mobile Number, Products (expandable), Total, last updated + Delete action।
- **Dashboard** (`getDashboardStats`): order count ও revenue থেকে `incomplete` order বাদ — draft cart যেন business metrics inflate না করে।
- Order search API-তেও `incomplete` order আসে (উভয় জায়গায় দেখানো হয় বলে)।

## যা পরিবর্তন হয়নি

- Prisma schema ও database — কোনো migration নেই (`orderStatus` একটি String field, তাই `'incomplete'` নতুন value হিসেবে কাজ করে)।
- Pending-order duplicate block check (শুধু `pending` status match করে) এবং Telegram alert (draft-এর জন্য পাঠানো হয় না) — অপরিবর্তিত।
- `OrderDetails.shippingAddress` / `shippingArea` NOT NULL — draft-এ খালি থাকলে `''` save হয়।
