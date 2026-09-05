# Data Model

This document mirrors the actual Prisma schema (`prisma/schema.prisma`). The database is PostgreSQL and the schema contains **17 models**. Status fields are plain `String`s (no Prisma enums). Schema changes are managed through 14 migrations under `prisma/migrations/`.

## Catalog

### Category
Hierarchical product categories (self-referential).
- `id` (UUID), `name`, `slug` (unique), `image?`, `description?`
- `parentId?` → self-relation `"CategoryHierarchy"` (parent / children)
- M2M `products` via implicit join table `"ProductCategories"`
- Indexes: parentId, name, slug

### Product
- `id` (UUID), `title`, `slug` (unique), `sku` (unique)
- `description?`, `metaDescription?` (SEO), `tags?`
- `unite_price` (Decimal, required) — base price used when product has no variants
- `sale_price` (Decimal?) — base sale price used when no variants
- `quantity` (Int?) — base inventory for non-variant products
- `status` (String: `publish` | `draft`)
- Relations: M2M categories; 1-M `images`; 1-M `variants`
- Indexes: (status, createdAt), title, slug

### ProductImage
- `id` (UUID), `productId` → Product, `image_path`, `altText?`
- 1-M `variants` (variants can reference an image)

### ProductVariant
- `id` (UUID), `productId` → Product
- `sku?`, `size?` (e.g., S/M/L), `color?` (e.g., Black/Oak)
- `unite_price` (Decimal?), `sale_price` (Decimal?) — override product base pricing when present
- `imageId?` → optional ProductImage link (variant-specific image)
- `quantity` (Int, required), `isDefault` (Boolean, default false)
- Indexes: productId, imageId

### Pricing & selection behavior
- If a product has one or more `ProductVariant` records, the storefront shows a variant selector — customers choose size/color before adding to cart.
- Varianted products display the selected variant's `unite_price` (or `sale_price` when present); non-varianted products use the base `Product.unite_price` / `sale_price`.
- Discount display: amount = `price - sale_price`; percent = `((price - sale_price) / price) * 100` (guard against division by zero).

## Users & Orders

### User
Admin/customer accounts in one table.
- `id` (UUID), `name`, `email` (unique), `passwordHash` (bcrypt), `role` (String: `admin` | others)
- Relations: 1-1 `details` (UserDetails), 1-M `orders`

### UserDetails
- `id` (UUID), `userId` (unique FK → User), `shippingAddress`, `phoneNumber?`

### Order
- `id` (UUID), `orderNo` (unique, 6-digit generated at checkout)
- `userId?` → nullable User (guest checkout supported)
- `total` (Decimal), `orderStatus` (String: pending → processing → completed / cancelled)
- Relations: 1-1 `details`, 1-M `items`
- Indexes: userId, orderNo, orderStatus

### OrderDetails
Shipping snapshot attached to each order.
- `orderId` (unique FK → Order)
- `customerName?`, `shippingAddress`, `phoneNumber?`
- `shippingArea` (String: "Inside Dhaka" | "Outside Dhaka"), `deliveryCharge` (Decimal: 50 or 120 BDT)
- `ipAddress?`, `deviceHash?` — captured at checkout for fraud prevention

### OrderItem
Line items snapshot (decoupled from live catalog data).
- `orderId` → Order, `productTitle`, `sku?`, `itemImagePath`
- `purchasePrice` (Decimal), `quantity` (Int)
- `variantName?`, `variantId?` — variant snapshot when applicable
- Indexes: orderId, productTitle

### BlockedDevice
Fraud-prevention blocklist keyed by FingerprintJS visitor ID.
- `id` (cuid), `deviceHash` (unique), `reason?`, `orderNo?`, `blockedAt`
- Checkout rejects orders from blocked hashes; also rejects duplicate pending orders per device hash.

## Site Configuration

### SiteSetting
Singleton row (`id` fixed to `"singleton"`) holding all site-wide configuration.
- Identity: `siteName?`, `logo?`, `favicon?`
- Contact: `mobile?`, `email?`, `address?`, `copyrightText?`
- Content: `announcementText?`, `aboutCompany?`, `aboutCompanyBn?` (column `aboutCompany_bn`)
- Integrations: `telegramBotToken?`, `telegramChatId?` (order alerts), `gtmId?` (analytics), `whatsappNumber?` (WhatsApp ordering)

### HeroSlider
Homepage carousel slides.
- `id` (cuid), `title?`, `subtitle?`, `buttonText?`, `buttonLink?`, `image?`
- `order` (Int, default 0), `isActive` (Boolean, default true)

### SocialLink
Footer social links.
- `id` (cuid), `name`, `url`, `icon?`, `order` (default 0), `isActive` (default true)

## Blog CMS

### BlogCategory
- `id` (UUID), `title`, `slug` (unique), `image?`, `authorName?`
- `status` (String, default `"draft"`)
- 1-M `posts`

### BlogPost
- `id` (UUID), `title`, `slug` (unique)
- `content` (HTML from Tiptap editor), `bannerImage?`, `tags?`, `metaDescription?`
- `categoryId` → BlogCategory, `status` (String, default `"draft"`)
- M2M `advertisements` via explicit join table
- Indexes: (categoryId, createdAt), (status, createdAt), title

### Advertisement
Product ads injected into blog post content.
- `id` (UUID), `title`, `image?`, `text?`, `price?` (Decimal), `productLink?`
- M2M `blogPosts`

### BlogPostAdvertisement
Explicit join table with composite PK (`blogPostId`, `advertisementId`).

## Migration History (summary)

14 migrations: init → category/product/variant refinements → site settings singleton → hero sliders → social links → announcement text → SKU/quantity fields → notification settings (telegram/GTM) → whatsapp number.
