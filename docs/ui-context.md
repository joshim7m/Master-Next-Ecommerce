# UI Context & Design System

This document defines the visual design language, component library, and user experience guidelines for the Eghuri ecommerce application.

## Design System Foundation

### Color Palette

The new palette is Material Design 3–inspired, replacing the original purple theme.

**Primary palette:**
| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#ae2f34` | CTAs, buttons, links, accents |
| `secondary` | `#684fa6` | Secondary actions, tags, badges |
| `editorial-ink` | `#1A0A3E` | Footer bg, text headings, dark sections |
| `warm-sand` | `#F9F7F2` | Page background |

**Surface & state colors:**
| Token | Hex | Usage |
|-------|-----|-------|
| `surface` | `#fdf7ff` | Card backgrounds |
| `on-surface` | `#201144` | Primary text |
| `on-background` | `#201144` | Body text |
| `muted` | `#6b7280` | Secondary/muted text |
| `border` | `#e5e7eb` | Default borders |
| `ring` | `#ae2f34` | Focus rings |

**Containers & accents:**
| Token | Hex | Usage |
|-------|-----|-------|
| `primary-container` | `#ff6b6b` | Light red backgrounds |
| `secondary-container` | `#ba9ffd` | Light purple backgrounds |
| `on-primary` | `#ffffff` | Text on primary |
| `on-secondary` | `#ffffff` | Text on secondary |
| `on-primary-container` | `#3b0000` | Text on primary-container |
| `on-secondary-container` | `#22005d` | Text on secondary-container |

**Badge & status colors:**
| Token | Hex | Usage |
|-------|-----|-------|
| `badge-sale` | `#dc2626` | Sale badges |
| `badge-new` | `#2563eb` | New arrival badges |
| `badge-out-of-stock` | `#6b7280` | Out-of-stock badges |
| `success` | `#16a34a` | Success states |
| `warning` | `#ca8a04` | Warning states |
| `destructive` | `#dc2626` | Destructive actions |

**Dark mode overrides:**
| Token | Hex | Usage |
|-------|-----|-------|
| `dark-bg` | `#0f172a` | Dark mode page background |
| `dark-card` | `#1e293b` | Dark mode card background |
| `dark-border` | `#334155` | Dark mode borders |
| `dark-text` | `#e2e8f0` | Dark mode primary text |
| `dark-muted` | `#94a3b8` | Dark mode muted text |

Defined in `tailwind.config.js` (theme.extend.colors); CSS variables mirrored in `app/globals.css`.

### Typography

- **Font Families:**
  - **Headings/Display:** Playfair Display (serif) — loaded via Google Fonts in root layout
  - **Body/UI:** Inter (sans-serif) — loaded via Google Fonts in root layout
- **Icons:** Material Symbols Outlined — loaded via Google Fonts in root layout
- **Type Scale:**
  - `display-xl`: 3.5rem/4rem, tracking-tight, font-display (Playfair Display)
  - `headline-lg`: 2rem/2.5rem, font-display
  - `headline-md`: 1.5rem/2rem, font-display
  - `body-lg`: 1.125rem/1.75rem
  - `body-md`: 1rem/1.5rem (default body text)
  - `body-sm`: 0.875rem/1.25rem
  - `label-caps`: 0.75rem, uppercase, tracking-widest (nav/footer labels)
- **Semantic Styling:** Bold for prices (with ৳ symbol), muted for secondary info

### Spacing

Tailwind spacing scale with consistent padding/margin rhythm across components.

**Custom tokens:**
| Token | Value | Usage |
|-------|-------|-------|
| `page-margin-mobile` | `1.25rem` | Horizontal page margin on mobile |
| `page-margin-desktop` | `2.5rem` | Horizontal page margin on desktop |
| `gutter` | `0.5rem` | Tight element spacing |
| `section-gap` | `4rem` | Gap between major page sections |
| `stack-sm` | `0.5rem` | Small vertical stack |
| `stack-md` | `1rem` | Medium vertical stack |
| `stack-lg` | `2rem` | Large vertical stack |

### Icon System

Material Symbols Outlined loaded via Google Fonts. Used consistently across Header, Footer, and interactive elements.

| Icon | Usage |
|------|-------|
| `search` | Search trigger |
| `person` | Account |
| `favorite_border` / `favorite` | Wishlist |
| `shopping_bag` | Cart |
| `menu` | Mobile hamburger |
| `close` | Close overlays |
| `phone` | Contact phone |
| `mail` | Contact email |
| `chevron_right` | Breadcrumbs |
| `remove` / `add` | Quantity controls |

**Icon sizing tokens:**
| Token | Size | Usage |
|-------|------|-------|
| `icon-touch-target` | 44px (11×11) | Minimum touch target for interactive icons |
| `icon-sm` | 20px | Small inline icons |
| `icon-md` | 24px | Default icon size |

### Visual Style

**Shadows:**
- `ambient-shadow`: `0 1px 3px rgba(0,0,0,0.08)` — default card/container shadow
- `ambient-shadow-lg`: `0 4px 12px rgba(0,0,0,0.1)` — elevated card shadow

**Borders:**
- `editorial-border`: `1px solid var(--border)` — standard section dividers
- `editorial-border-subtle`: `1px solid var(--border)` at 50% opacity — subtle dividers

**Hover effects:**
- `image-hover-zoom`: `transform: scale(1.03)` on image containers (overflow hidden, transition 0.4s)

## Dark Mode

- Strategy: Tailwind `darkMode: 'class'`
- **Storefront:** `ThemeInit` applies saved `localStorage.theme` or OS preference on load; toggle in Header flips `document.documentElement.classList` and persists
- **Admin:** `ThemeProvider` context (`admin-theme` key, respects OS preference); sun/moon toggle in AdminHeader; all admin components carry paired light/dark classes
- Ensure WCAG AA contrast in both modes
- Dark mode color overrides documented in Color Palette table above

## Component Library

### Storefront Components (JSX + Tailwind)

**Implemented:**
- `Header` — Sticky header with backdrop-blur, centered brand name (Playfair Display), desktop nav links (New Arrivals, Collections, Journal, About — hidden on mobile), Material Symbols icons (search, person, favorite, shopping_bag), mobile hamburger menu, dark mode toggle, search overlay, cart badge count
- `Footer` — `bg-editorial-ink` dark background, 4-column responsive grid (brand/logo, shop links, company links, newsletter + socials), newsletter email form (visual), social SVG icons (Facebook, Twitter, Instagram, LinkedIn, YouTube, WhatsApp, Pinterest, TikTok, GitHub, Telegram), dynamic links from DB
- `AnnouncementBar` — Full-width dark strip (`bg-editorial-ink`), centered uppercase text with letter-spacing, default message "FREE SHIPPING ON ALL ORDERS OVER ৳5,000 | SHOP NEW ARRIVALS", configurable via DB `announcementText`
- `CartDrawer` — Slide-out mini cart synced to localStorage
- `ProductDetailClient` + partials: `ProductInfo` (variants, WhatsApp order button, share, wishlist), `ImageGallery`, `ProductTabs`, `RelatedProducts`
- Homepage partials: `Hero` slider, `FilterSidebar`, `ProductGrid`, `SortBar`, `MobileCategoryChips`
- Blog: `BlogCard`, `AdCard`, `LoadMorePosts`
- `GoogleTagManager`, `PageViewTracker`, `MobileFilter`, `ThemeInit`, `ConfirmDialog`

### Admin Components (JSX + Tailwind)

**Implemented:**
- `ThemeProvider` + `useTheme` — admin dark mode context
- `TipTapEditor` — rich text editor with toolbar (bold/italic/underline/strike/headings/lists/quote/code/link/image)
- `CategoryMultiSelect`, `AdvertisementMultiSelect`
- Shell: `AdminSidebar`, `AdminHeader`

## Visual Patterns

### Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1440px)
- Product grids: 1 column (mobile) → 2 (tablet) → 3–4 (desktop); mobile category chips and filter drawer replace sidebars on small screens
- Header: mobile hamburger menu below `lg`, desktop nav links at `lg`+

### Interactive States
- Hover: subtle color change, shadow, or scale (image-hover-zoom on product cards)
- Focus: clear focus ring using `ring` color
- Active/disabled: distinct background/border, reduced opacity

## Branding & Regional Considerations

### Bangladesh Focus
- English UI with Bengali product/blog content
- Prices displayed in BDT with ৳ symbol
- "Inside Dhaka" vs "Outside Dhaka" shipping shown prominently at checkout
- Contact via phone/WhatsApp emphasized (hotline bar, WhatsApp order buttons)

### Product Presentation
- Consistent aspect-ratio product images (aspect-square cards)
- Pricing hierarchy: original price (strikethrough if on sale), sale price, discount %
- Variant badges (size labels, color names)
- Stock status indicators where applicable

## User Experience Guidelines

### Storefront UX
- **Discovery:** category navigation (sidebar/chips), live search overlay, sort bar
- **Product Detail:** image gallery, variant selection, quantity, add-to-cart / buy-now / WhatsApp order CTAs
- **Cart:** slide-out drawer review, quantity updates, proceed to checkout
- **Checkout:** single-page form with BD phone validation and delivery charge selection
- **Order Confirmation:** order number on thank-you page

### Admin UX
- **Navigation:** sidebar with sections (Dashboard, Products, Categories, Orders, Blog, Settings)
- **Forms:** labeled fields, validation feedback, save/cancel actions
- **Lists:** search and filters, inline edit/delete actions
- **Feedback:** toasts for success/error, loading/skeleton states

## Accessibility

### WCAG 2.1 AA Targets
- Keyboard navigation and visible focus states
- Semantic HTML, ARIA labels where needed
- Color contrast ≥ 4.5:1 for text in light and dark modes
- Alt text for images, proper heading hierarchy
- Minimum 44px touch targets for interactive elements

## Implementation Notes

### Tailwind Configuration
- `tailwind.config.js`: full Material Design 3 color palette, Playfair Display + Inter font families, `darkMode: 'class'`, content paths (`./app`, `./components`, `./src`), `@tailwindcss/typography` plugin (blog prose)
- Custom spacing tokens (`page-margin-mobile`, `gutter`, `section-gap`, etc.)
- Custom border radius tokens (`4xl: 1rem`)
- Custom font size tokens (`display-xl`, `headline-lg`, `body-md`, `label-caps`)

### Performance
- Next.js Image optimization; lazy-loaded images
- Loading skeletons (`loading.js`) on data-heavy routes
- Debounced search API calls

## Future Enhancements
- Homepage section redesign (hero, categories, product grid, promo banner) — Phase 2
- Product detail page redesign
- Blog section redesign
- Bengali localization of UI chrome
- Advanced product filters (price range refinement, ratings)
- Product reviews and recommendations
