# Product Description & Specification — Rich-Text Admin Editor

> Reference implementation: this Next.js project (eghuri). This document describes the
> **existing** description + specification feature on the admin product create/edit pages
> **exactly as it behaves today**, so it can be replicated 1:1 in another **Next.js App Router +
> Tailwind** project.
>
> This document is **self-sufficient**: every code block needed for the port is complete and
> verbatim. You do not need to read any file in this repo to implement the feature elsewhere.
>
> Source of truth files (this repo):
> - `prisma/schema.prisma` — `Product.description`, `Product.specification` (both `String?` / `TEXT`)
> - `src/actions/products.js` — `createProduct()` / `updateProduct()` persist both fields
> - `src/components/admin/TipTapEditor.jsx` — the rich-text editor (TipTap v3)
> - `src/components/admin/RichEditorSection.jsx` — the collapsible section wrapper
> - `app/admin/products/create/page.jsx` — create page wiring
> - `app/admin/products/edit/page.jsx` + `partials/product-info.jsx` — edit page wiring
> - `src/components/storefront/partials/ProductTabs.jsx` — storefront output

---

## 0. Quick start — the five files to copy

Ordered by dependency. Steps 1–3 are verbatim copies; 4–5 are small edits to files you already have.

| # | Action | File | Detail |
|---|---|---|---|
| 1 | `npm i` the editor deps | `package.json` | §11 step 1 |
| 2 | Register the typography plugin | `tailwind.config.js` | §11 step 2 — required, or `prose` does nothing |
| 3 | **Copy both component files verbatim** | `src/components/admin/TipTapEditor.jsx`, `src/components/admin/RichEditorSection.jsx` | Full source in §5 and §4 |
| 4 | Add the two fields | schema + `createProduct`/`updateProduct` + your form state | §3, §8, §6, §7 |
| 5 | Render them | create page + edit page/partial | §6, §7 |

Two DB columns, two form fields, two components. No API route, no migration beyond the two
columns, no new endpoint. Full ordered walkthrough with commands: **§11**.

---

## 1. What the feature actually is

Two **independent HTML fields** per product — `description` and `specification` — each edited
with a full rich-text editor, each wrapped in its own **collapsible section**.

| Concern | Decision in this repo |
|---|---|
| Storage format | Raw **HTML string** (not Markdown, not plain text) in a nullable `TEXT` column |
| Editor | TipTap v3 (`StarterKit` + `Underline` + `Link` + `Image`) |
| Wrapper | `RichEditorSection` — collapsible, open/closed state persisted in `localStorage` |
| Save model | No separate "save content" button. HTML lives in the **existing product form state** and is persisted by the existing `createProduct` / `updateProduct` calls |
| Default state | **Collapsed**, so two long-form fields don't push prices/images/categories off-screen |
| Storefront output | `ProductTabs` → "Description" and "Specifications" tabs, `dangerouslySetInnerHTML` inside a `prose` wrapper |

Key point for the port: **there is no new endpoint, no new API, and no new table.** The feature is
(a) two DB columns, (b) two form fields, (c) one reusable editor component, (d) one collapsible
wrapper component. Everything else already existed.

---

## 2. UX anatomy

```
/admin/products/create   (and /admin/products/edit?id=<id>)
│
├── Title  ······  Slug [Generate]
│
├── DESCRIPTION & SPECIFICATIONS                 <- full-width row (sm:col-span-2)
│   │
│   ├── ▸ DESCRIPTION  ·······························
│   │      collapsed header shows one of:
│   │        (a) [ Empty ]                        when the field is blank
│   │        (b) plain text preview, 90 chars + "…"   e.g. "Fabric: 100% cotton…"
│   │      click -> chevron rotates 90deg, editor mounts, section expands
│   │
│   └── ▸ SPECIFICATIONS  [ Empty ]                  same behaviour, own storage key
│
├── YouTube Video URL
├── Meta Description
├── Tags / Keywords
└── … prices, SKU, stock, status, featured, images, categories
```

Expanded state of a section:

```
│ ▾ DESCRIPTION                                    │  <- chevron rotated, open
├───────────────────────────────────────────────────┤
│ [B][I][U] | [H1][H2][H3] | [•][1.] | [❝][</>] | [🔗][🖼]   <- TipTap toolbar
│                                                   │
│   (writing area, min-h 300px, `prose` typography)  │
│                                                   │
├───────────────────────────────────────────────────┤
```

Behaviour worth copying verbatim:

- **Collapsed by default.** `useState(false)` then a `useEffect` restores the stored preference.
  Server render and first client render both show *closed*, so there is no hydration mismatch.
- **Open state is remembered** per browser, per field, in
  `localStorage['productEditor:description']` and `localStorage['productEditor:specification']`
  (values `'open'` / `'closed'`). Once a merchandiser opens the Specification box it stays open.
- **Collapsed header doubles as a summary row**: a rotating chevron, the uppercase label, and
  either an `Empty` pill or a plain-text preview truncated to 90 characters.
- **Children are lazily mounted** — `{open && <div>…{children}</div>}`. The TipTap instance
  therefore never exists (and never renders) while the section is closed, and it is created fresh
  with the current form value the first time the section is opened.
- Collapsing **never loses content**: the HTML already lives in the parent form state; the editor
  instance is simply unmounted.

---

## 3. Data model

```prisma
model Product {
  id             String  @id @default(uuid())
  title          String
  slug           String  @unique
  description    String?   // ← HTML from TipTap
  specification  String?   // ← HTML from TipTap
  // …
}
```

Migration SQL (`prisma/migrations/20260924100811_init/migration.sql`):

```sql
"description"   TEXT,
"specification" TEXT,
```

Notes:

- Both columns are plain nullable `TEXT` — in PostgreSQL that is unlimited length, so no
  `@db.Text` / `longtext` annotation is needed. On MySQL use `String? @db.LongText`.
- The value is **HTML**, so never render it as text and never treat it as Markdown.
- `specification` was added in the same `init` migration as `description`; it is a plain sibling
  column, not a table.

---

## 4. Component 1 — `RichEditorSection` (the collapsible wrapper)

`src/components/admin/RichEditorSection.jsx` — copy this file verbatim:

```jsx
'use client';

import { useEffect, useState } from 'react';

const storageKey = (id) => `productEditor:${id}`;

function readOpen(id) {
  try {
    return typeof window !== 'undefined' && localStorage.getItem(storageKey(id)) === 'open';
  } catch {
    return false;
  }
}

export default function RichEditorSection({ id, label, content, children }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(readOpen(id));
  }, [id]);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey(id), next ? 'open' : 'closed');
      } catch {}
      return next;
    });
  };

  const plainText = (content || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  const empty = plainText.length === 0;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700/30"
      >
        <svg
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>

        <span className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
          {label}
        </span>

        {open ? null : empty ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-400 dark:bg-slate-700 dark:text-slate-500">
            Empty
          </span>
        ) : (
          <span className="min-w-0 flex-1 truncate text-xs text-slate-400 dark:text-slate-500" title={plainText}>
            {plainText.slice(0, 90)}…
          </span>
        )}
      </button>
      {open && <div className="border-t border-slate-200 p-2 dark:border-slate-700">{children}</div>}
    </div>
  );
}
```

API: `<RichEditorSection id label content>{children}</RichEditorSection>`

| Prop | Type | Purpose |
|---|---|---|
| `id` | string | Storage key suffix — `description` / `specification`. Not a DOM id. |
| `label` | string | Uppercase header text shown in the collapsed row |
| `content` | string (HTML) | Used **only** to render the collapsed preview / `Empty` pill |
| `children` | node | The editor; mounted only while `open` |

Two details that make it robust:

1. **All `localStorage` access is wrapped in `try/catch`.** Private-mode Safari and cookie-blocked
   browsers throw on `localStorage`, and this component must never crash the form because of a
   UI preference.
2. **The preview strips tags with a naive regex** rather than rendering HTML. It is a summary
   row, not content — `dangerouslySetInnerHTML` here would be both a styling problem and an
   unnecessary XSS surface.

---

## 5. Component 2 — `TipTapEditor` (the rich-text editor)

`src/components/admin/TipTapEditor.jsx` — copy this file verbatim:

```jsx
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { useEffect } from 'react';

function ToolbarButton({ onClick, active, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded p-1.5 text-sm transition ${active ? 'bg-[#2f0f6b]/10 text-[#2f0f6b]' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="h-5 w-px bg-slate-200" />;
}

export default function TipTapEditor({ content, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false, underline: false }),
      Underline,
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: false }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  useEffect(() => {
    return () => editor?.destroy();
  }, [editor]);

  const addLink = () => {
    const url = prompt('Enter URL:');
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    const url = prompt('Enter image URL:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  if (!editor) return null;

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50/80 px-2 py-1.5">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/></svg>
        </ToolbarButton>
        <Divider />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })}>
          <span className="text-xs font-bold">H1</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}>
          <span className="text-xs font-bold">H2</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}>
          <span className="text-xs font-bold">H3</span>
        </ToolbarButton>
        <Divider />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/></svg>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/></svg>
        </ToolbarButton>
        <Divider />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockQuote')}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>
        </ToolbarButton>
        <Divider />
        <ToolbarButton onClick={addLink} active={editor.isActive('link')}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
        </ToolbarButton>
        <ToolbarButton onClick={addImage}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} className="prose prose-sm max-w-none p-4 min-h-[300px] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[280px]" />
    </div>
  );
}
```

The block above is the **complete, verbatim** file — all 12 toolbar buttons and 4 dividers included,
so you can paste it into your other project without consulting this repo.

### Toolbar inventory

| Group | Buttons | Command |
|---|---|---|
| Inline | B, *I*, U | `toggleBold` / `toggleItalic` / `toggleUnderline` |
| Block | H1, H2, H3 | `toggleHeading({ level })` |
| List | bullets, numbers | `toggleBulletList` / `toggleOrderedList` |
| Quote | ❝ | `toggleBlockQuote` |
| Code | `</>` | `toggleCodeBlock` |
| Insert | 🔗, 🖼 | `prompt()` → `setLink({ href })` / `setImage({ src })` |

`StarterKit` also ships `Strike`, `HardBreak`, `HorizontalRule`, `Code`, undo/redo history and
markdown input rules (`# `, `- `, `> `, ` ``` `, `~~text~~`). They work but have **no toolbar
button** — that is deliberate, it keeps the toolbar to one row.

### Configuration decisions (each one matters)

- `StarterKit.configure({ link: false, underline: false })` — StarterKit v3 bundles Link and
  Underline. Disabling them inside StarterKit and adding the standalone packages avoids the
  *"Duplicate extension names found"* warning while letting you configure them.
- `Link.configure({ openOnClick: false })` — without this, clicking a link inside the admin editor
  navigates the admin away mid-edit.
- `Image.configure({ inline: false })` — block images, so they stack and never break line height.
- `content: content || ''` is the **initial** document only. There is deliberately **no**
  `editor.commands.setContent()` effect, so a later change to the `content` prop does *not* clobber
  the user's in-progress typing. This is exactly why the collapsible-lazy-mount design is safe.
- `onUpdate` → `editor.getHTML()` fires on every keystroke and bubbles the **full HTML document**
  to the parent form state. No debounce; the payload is a few KB and the page is admin-only.
- The component renders `null` until the editor instance exists, which also means it is safe to
  server-render.
- `'use client'` is required at the top of the file.
- The **only** brand colour in the file is `#2f0f6b`, hardcoded in one place — the `active` branch
  of `ToolbarButton` (`bg-[#2f0f6b]/10 text-[#2f0f6b]`), which tints the toolbar button of whatever
  format is active under the cursor. Everything else is stock Tailwind palette. Swap those two
  classes for your own theme token on the first commit in the new project.

### Styling requirement

`prose prose-sm` comes from **`@tailwindcss/typography`**:

```js
// tailwind.config.js
plugins: [require('@tailwindcss/typography')],
```

`min-h-[300px]` on `EditorContent` gives the writing area a stable height; the inner
`[&_.ProseMirror]:min-h-[280px]` + `focus:outline-none` kill the double focus ring and the
content-editable baseline offset.

---

## 6. Wiring — create page

`app/admin/products/create/page.jsx`

### 6a. Add the fields to the form shape

```jsx
const emptyForm = {
  title: '', slug: '', description: '', specification: '', metaDescription: '', tags: '',
  unite_price: '', sale_price: '', sku: '', videoUrl: '',
  quantity: '', status: 'draft', featured: false,
};
```

### 6b. Render both editors in one full-width row

Placed directly under Title/Slug, before YouTube / meta description / tags:

```jsx
<div className="sm:col-span-2">
  <label className={labelCls}>Description &amp; Specifications</label>
  <div className="mt-1.5 space-y-3">
    <RichEditorSection id="description" label="Description" content={form.description}>
      <TipTapEditor
        content={form.description}
        onChange={(html) => setForm((prev) => ({ ...prev, description: html }))}
      />
    </RichEditorSection>

    <RichEditorSection id="specification" label="Specifications" content={form.specification}>
      <TipTapEditor
        content={form.specification}
        onChange={(html) => setForm((prev) => ({ ...prev, specification: html }))}
      />
    </RichEditorSection>
  </div>
</div>
```

Imports at the top of the page:

```jsx
import TipTapEditor from '../../../../src/components/admin/TipTapEditor';
import RichEditorSection from '../../../../src/components/admin/RichEditorSection';
```

Nothing else changes — `handleSave()` already spreads the whole `form` into `createProduct({...})`:

```jsx
const product = await createProduct({
  ...form,                                  // ← description + specification ride along here
  categoryIds: selectedCategories.map((c) => c.id),
  imagePaths,
});
router.push(`/admin/products/edit?id=${product.id}`);
```

On success the admin is redirected to the edit page, so the two editors are immediately visible in
their expanded/collapsed stored state.

---

## 7. Wiring — edit page

`app/admin/products/edit/page.jsx` + `app/admin/products/edit/partials/product-info.jsx`

### 7a. Hydrate the form (edit page)

```jsx
useEffect(() => {
  if (!id) { setNotFound(true); setLoading(false); return; }
  Promise.all([getProduct(id), getCategories(), getPublishedProductsLite()]).then(([product, cats, lite]) => {
    if (!product) { setNotFound(true); setLoading(false); return; }
    setForm({
      title: product.title,
      slug: product.slug,
      description: product.description || '',        // ← null-safe
      specification: product.specification || '',    // ← null-safe
      metaDescription: product.metaDescription || '',
      tags: product.tags || '',
      videoUrl: product.videoUrl || '',
      unite_price: product.unite_price.toString(),
      sale_price: product.sale_price?.toString() || '',
      sku: product.sku?.toString() || '',
      quantity: product.quantity?.toString() || '',
      status: product.status,
      featured: Boolean(product.featured),
    });
    …
```

`|| ''` is mandatory: a `null` column would otherwise be handed to TipTap as `content` and the
preview/emptiness check would need to guard it.

### 7b. Render the same pair inside `product-info.jsx`

The edit form is split into partials, so the editors live in `product-info.jsx`:

```jsx
<div className="sm:col-span-2">
  <label className={labelCls}>Description</label>
  <div className="mt-1.5 space-y-3">
    <RichEditorSection id="description" label="Description" content={form.description || ''}>
      <TipTapEditor
        content={form.description}
        onChange={(html) => onChange({ target: { name: 'description', value: html } })}
      />
    </RichEditorSection>

    <RichEditorSection id="specification" label="Specifications" content={form.specification || ''}>
      <TipTapEditor
        content={form.specification || ''}
        onChange={(html) => onChange({ target: { name: 'specification', value: html } })}
      />
    </RichEditorSection>
  </div>
</div>
```

Note the **change-handler adapter**: `product-info.jsx` receives one generic `onChange` that
expects a DOM-ish event, so the editor calls
`onChange({ target: { name, value } })` to reuse the parent's `handleChange`:

```jsx
const handleChange = (e) =>
  setForm((prev) => ({
    ...prev,
    [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
  }));
```

If your form uses a per-field setter instead, drop the adapter and call the setter directly.

`product-info.jsx` has **no** `'use client'` directive because its only importer is the client page
`edit/page.jsx`. If you render it from a server component, add `'use client'`.

### 7c. Save

`handleSave()` in the edit page also spreads the whole form, so no extra wiring:

```jsx
const saved = await updateProduct(id, {
  ...form,                    // ← description + specification included
  categoryIds: selectedCategories.map((c) => c.id),
  imagePaths,
  removeImageIds,
  options: …,
  variants: variantPayload,
  removedVariantIds,
  upsellIds,
});
```

Because TipTap is uncontrolled, saving does **not** reset the editor; the success toast +
`router.refresh()` is all the feedback there is. `setForm` is not re-run, so the HTML you just
saved stays on screen untouched.

---

## 8. Server actions — persistence

`src/actions/products.js` (a `'use server'` module). Both actions destructure the two fields and
write them straight through.

`createProduct()`:

```js
export async function createProduct(data) {
  const { title, slug: rawSlug, description, specification, metaDescription, tags,
          unite_price, sale_price, sku, quantity, status, featured, videoUrl,
          categoryIds, imagePaths, upsellIds } = data;
  const slug = rawSlug?.trim();
  if (!title || !slug) throw new Error('Title and slug are required.');

  const product = await prisma.product.create({
    data: {
      title, slug, description,                          // ← raw HTML
      specification: specification || null,              // ← raw HTML, '' → NULL
      metaDescription: metaDescription || null,
      …
    },
    include: productInclude,
  });
  …
}
```

`updateProduct()` is identical for these two fields:

```js
const product = await prisma.product.update({
  where: { id },
  data: {
    title, slug, description,
    specification: specification || null,
    …
  },
  include: productInclude,
});
```

Rules to preserve:

- **No sanitisation, no HTML parsing, no length check.** Whatever `getHTML()` produced is stored.
  The column is `TEXT` so there is no truncation risk.
- **`specification: specification || null`** — clearing the editor and saving writes `NULL`, not
  `''`. `description` is written raw, so clearing Description stores `''`. Both are falsy, so the
  storefront branches behave identically; the asymmetry is only visible in the DB and in CSV export.
- The actions return `serialize(product)` = `JSON.parse(JSON.stringify(...))` so `Decimal` columns
  and `Date` objects cross the server→client boundary cleanly. The editors are string-in/string-out
  and need no special handling.
- `getProduct(id)` uses the shared `productInclude` (`images`, `variants`, `categories`, `options`,
  `upsells`) and therefore already returns `description` and `specification` — no query change needed.
- Only `revalidatePath('/admin/products')` is called. The storefront product page is dynamic
  (`prisma` read per request, no `revalidateTag`), so the new HTML appears on the product page
  immediately after save.

---

## 9. Storefront rendering

`src/components/storefront/partials/ProductTabs.jsx` — the admin output lands in two of the three
tabs. The two are independent: Description falls back to a placeholder, Specifications renders
nothing when empty (only the SKU / variant blocks below it show).

```jsx
const TABS = ['Description', 'Specifications', 'Reviews'];

const tabs = {
  Description: (
    <div className="prose prose-sm max-w-none text-on-surface/70 dark:text-dark-text/70 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_p]:mb-3 [&_h1,_&_h2,_&_h3]:text-on-surface dark:[&_h1]:text-dark-text dark:[&_h2]:text-dark-text dark:[&_h3]:text-dark-text">
      {product.description ? (
        <div className="overflow-x-hidden" dangerouslySetInnerHTML={{ __html: product.description }} />
      ) : (
        <p className="italic text-muted dark:text-dark-muted">No description available.</p>
      )}
    </div>
  ),
  Specifications: (
    <div className="space-y-4 text-sm">
      {product.specification ? (
        <div
          className="prose prose-sm max-w-none overflow-x-hidden text-on-surface/70 dark:text-dark-text/70 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_p]:mb-2"
          dangerouslySetInnerHTML={{ __html: product.specification }}
        />
      ) : null}
      {selectedVariant?.sku && ( /* …SKU row… */ )}
      {product.variants?.map((v, i) => ( /* …per-variant option/SKU/stock cards… */ ))}
    </div>
  ),
  Reviews: ( /* placeholder */ ),
};
```

Rendering rules to copy:

- `prose prose-sm max-w-none` for typography; the arbitrary variants (`[&_img]:max-w-full`,
  `[&_p]:mb-3`, heading colour tokens) stop the admin's HTML from breaking the storefront grid.
- `overflow-x-hidden` on the wrapper — wide `<pre>`/`<table>` blocks from the code-block button
  otherwise create a horizontal scrollbar on mobile.
- `dark:` variants for text colour, because the storefront is class-based dark mode.
- The Specifications tab appends structured SKU/variant data *after* the free-text HTML, so
  merchandisers keep the spec table in the editor and never have to re-key stock data.

---

## 10. Other consumers of the same HTML (know these before you port)

| Consumer | File | Behaviour |
|---|---|---|
| `<meta name="description">` + OG/Twitter | `app/(storefront)/products/[slug]/page.jsx` (`generateMetadata`) | `product.metaDescription \|\| (product.description + " ৳price — Shop now…")`. **The raw HTML is concatenated into the meta description** when `metaDescription` is empty — tags leak into search snippets. This is existing behaviour, not a bug the editor introduces; always fill in `metaDescription` for products. |
| JSON-LD `Product` | same file | `description: product.description \|\| \`Buy ${product.title} at ${siteName}\`` — raw HTML goes into structured data too. |
| OG image | `app/api/og/route.js` | Uses the product image / generated card, not the description HTML. |
| Catalogue CSV/XLSX **export** | `src/lib/catalog/runExport.js` | Writes `product.description` into the `Description` column. `specification` is **not** exported. HTML goes into the cell as-is (quoted, multi-line). |
| Catalogue **import** | `src/lib/catalog/runImport.js` | `description: clean(row.description)` — trims only, so a CSV round-trip keeps the HTML text but the surrounding CSV quoting is what protects the commas. `specification` is **not** imported; `docs/catalog-import-export.md` lists it as a known drop. |
| Legacy REST admin API | `app/api/admin/products/route.js`, `app/api/admin/products/[id]/route.js` | Handle `description` but **ignore `specification`** — these routes predate the server actions and are not what the create/edit pages call. If your port has both, either update them or delete them. |
| Admin list table | `app/admin/products/page.jsx` | Does not show either field. |
| Blog editor | `app/admin/blog/posts/*` | Reuses the same `TipTapEditor` with `content`/`onChange` → `form.content`. Proof the component is generic, and the reason to keep it free of product-specific props. |

---

## 11. Port checklist — Next.js App Router project

**1. Dependencies**

```bash
npm i @tiptap/react @tiptap/starter-kit @tiptap/extension-underline \
      @tiptap/extension-link @tiptap/extension-image
npm i -D @tailwindcss/typography
```

**2. Tailwind** — register the typography plugin, otherwise `prose` classes do nothing:

```js
// tailwind.config.js
module.exports = { …, plugins: [require('@tailwindcss/typography')] };
```

**3. Database**

```prisma
model Product {
  description   String?
  specification String?
}
```

```bash
npx prisma migrate dev --name add_product_specification
```

**4. Components** — copy both files verbatim:
- `src/components/admin/TipTapEditor.jsx`
- `src/components/admin/RichEditorSection.jsx`

**5. Admin form** (create *and* edit)
- add `description: ''`, `specification: ''` to the form state
- render the two `RichEditorSection` + `TipTapEditor` pairs in a full-width row
- hydrate on edit with `product.description || ''` / `product.specification || ''`

**6. Persistence** — destructure and write both fields on create and update:
`description` raw, `specification: specification || null`.

**7. Storefront** — render both with `dangerouslySetInnerHTML` inside a `prose` wrapper; add an
`Empty`/placeholder branch for description and a `null`-guard for specification.

**8. (Optional but recommended)** set `metaDescription` per product so the raw HTML in
`description` never reaches a search snippet or JSON-LD.

---

## 12. Gotchas, deliberate quirks, and how to handle them in the port

| # | Observation | Why it exists / how to port |
|---|---|---|
| 1 | **The two fields are unrelated.** No shared content, no "copy description to spec" helper, separate `id`s. | Keep them independent; merchandisers use Description for prose and Specifications for a table/list. |
| 2 | **No HTML sanitisation anywhere**, and the storefront uses `dangerouslySetInnerHTML`. | Safe today because the only writers are TipTap (constrained output) and admin-role users. If your port accepts HTML from any other source, sanitise on write (`sanitize-html` / `DOMPurify`) — do not sanitise on read. |
| 3 | **`specification` is dropped by the catalogue import/export pipeline** and by the legacy REST routes. | Either add a `Specification` column to `PRODUCT_COLUMNS` + the importer, or document the drop as this repo does. |
| 4 | **`description` is stored raw but `specification` is normalised to `NULL` when empty** (`specification \|\| null`). | Cosmetic DB inconsistency; both are falsy for the storefront. Harmless — mirror it or not, just be consistent in your port. |
| 5 | **Meta description and JSON-LD consume raw HTML** when `metaDescription` is blank. | Existing behaviour. Cheapest fix in the port: strip tags in `generateMetadata` (`description.replace(/<[^>]+>/g, ' ')`) instead of relying on admins to fill the field. |
| 6 | **The `localStorage` key is `productEditor:description` / `productEditor:specification`** — *not* scoped per product id. | The `id` prop is the field name, so create and edit pages (and every product) share one open/closed preference. That's intentional and desirable; if you want per-product state use `productEditor:${productId}:${field}`. These keys are **not** in the frozen user-persistence list from `docs/ai-workflow-rules.md` (which covers `cabinet-closet-cart`, `cabinet-closet-wishlist`, `device-hash`, `theme`, `admin-theme`), so renaming is safe. |
| 7 | **The label above the pair differs between pages**: create says "Description & Specifications", edit (`product-info.jsx`) says "Description" while still rendering both sections. | Cosmetic inconsistency in this repo. Use one shared label in your port. |
| 8 | **`onUpdate` fires on every keystroke with the whole HTML document, no debounce.** | Fine for admin-scale content. Add `useDebounce`/a dirty flag if you ever add autosave-draft or per-keystroke validation. |
| 9 | **The editor ignores later `content` prop changes** (no `setContent` effect). | Deliberate: it prevents the parent re-render from resetting the caret. The flip side is that the editor will not reflect external changes — always unmount/remount (which the collapsible wrapper does) instead of trying to sync. |
| 10 | **Editor images are URL-only** (`prompt('Enter image URL:')`). There is no in-editor upload. | The product image uploader (`/api/admin/upload`) returns paths; to reuse it, replace `addImage` with a file input that POSTs and then calls `setImage({ src: uploadData.urls[0] })`. |
| 11 | **`TipTapEditor` has no `dark:` variants** — the toolbar and `prose` content keep light-mode colours inside the dark admin theme. | Add `dark:prose-invert` to `EditorContent` and `dark:` classes to `ToolbarButton`/`Divider` in your port if you ship a dark admin. |
| 12 | **Link/image insertion uses `prompt()`** — no URL validation, no modal, and the toolbar button for links has no active-state visual for the image button. | Swap for a small popover with validation in a polish pass; behaviour is otherwise identical. |
| 13 | **`product-info.jsx` has no `'use client'` directive** but imports two client components. | Fine because its importer is a client page. Add the directive if you import it from a server component. |
| 14 | **Editor output is not validated for length**, and meta description is capped at 160 chars by `maxLength` on a separate plain textarea. | `metaDescription` and `description` are independent fields — the 160-char cap applies only to the former. |

---

## 13. Same-stack port: the differences you will actually hit

You are porting to another **Next.js App Router + Tailwind** project, so the copy-paste path in
§11 applies almost 1:1. These are the only realistic divergences, and how to adapt:

| If your other project… | What breaks | Fix |
|---|---|---|
| Uses **Tailwind v4** (CSS-first config) | `plugins: [require('@tailwindcss/typography')]` in `tailwind.config.js` is not read | Tailwind v4 ships the plugin as a CSS import: `@import "tailwindcss"; @plugin "@tailwindcss/typography";` in `globals.css`. Same `prose` classes, no JS config change. |
| Uses **shadcn/ui** or a different accent colour | The editor hardcodes `#2f0f6b` in `ToolbarButton` | It's on a single line — the `active` branch of `ToolbarButton`: `bg-[#2f0f6b]/10 text-[#2f0f6b]`. Swap both class refs for your `--primary` / theme token. Nothing else in the file is brand-coloured. |
| Uses **`react-hook-form`** or another form lib | The `handleChange` adapter in §7b assumes a DOM-ish `{ target: { name, value } }` | Drop the adapter; call `setValue('specification', html)`. `RichEditorSection` and `TipTapEditor` need **no** change — they only need `content` + `onChange`. |
| Uses a **different data layer** (Drizzle, Mongoose, raw SQL) | §3/§8 Prisma snippets | The contract is trivial: two nullable `TEXT` columns, `description` raw and `specification \|\| null` on write, `\|\| ''` on hydrate. Nothing else is ORM-specific. |
| Has **no server actions** (REST-only admin) | §6/§7 spread `...form` into an action | POST the two fields alongside the rest of your existing create/update payload. The admin pages here already call `/api/admin/upload` for images, so a `fetch`-based form is a normal shape for this UI. |
| Ships a **dark admin theme** | `TipTapEditor` has no `dark:` variants (gotcha #11) | Add `dark:prose-invert` to the `EditorContent` className and `dark:` classes to `ToolbarButton` / `Divider`. `RichEditorSection` already has them. |
| Already has a **rich-text editor** (Quill, Lexical, Slate) | Re-adding TipTap is redundant | `RichEditorSection` is editor-agnostic — it only takes `content` (string) and `children`. Reuse it as-is and swap `TipTapEditor` for your editor, as long as your editor is **uncontrolled** (initial content only, no `setContent` sync effect) and exposes an `onChange(html)`. Gotcha #9 explains why that matters. |
| Uses a **different rich-text colour scope** | The storefront wrapper uses design tokens (`text-on-surface`, `dark:text-dark-text`) | Replace with your tokens. Keep `prose prose-sm max-w-none` and the `[&_img]` / `overflow-x-hidden` arbitrary variants — those are the parts that stop admin HTML from breaking the storefront grid. |

Note: an earlier revision of this document carried a Laravel/Blade mapping table here. It was
removed because the target is the same stack. The feature is still 100% client-side UI plus two
columns, so the equivalent mappings are `text` columns, a controller writing the raw HTML without
escaping, and a Blade component + Alpine for the collapse.

---

## 14. Manual test checklist

1. `/admin/products/create` — the "Description & Specifications" row shows two collapsed rows with
   `Empty` pills; other fields (prices, images, categories) are visible without scrolling.
2. Click "Description" → chevron rotates 90°, editor mounts, focus lands in the writing area.
3. Type mixed formatting: `**bold**`, `*italic*`, `<u>underline</u>`, `# H1`, `- item`, `1. item`,
   `> quote`, ```` ```code```` ````, paste an image URL, add a link.
4. Collapse → header now shows the plain-text preview (first 90 chars + `…`), not `Empty`.
5. Reload the page → the section is still open (localStorage), preview still correct.
6. Open both sections, type in both, `Save` → redirected to
   `/admin/products/edit?id=<newId>`; both values are present (open the other one to check).
7. Edit the product, change only the Specification, save → Description unchanged.
8. Clear the Specification entirely and save → `specification` is `NULL` in the DB, and the
   storefront "Specifications" tab shows only the SKU/variant blocks.
9. Open `/products/<slug>` → Description tab renders the HTML (headings, lists, images full-width,
   no horizontal scrollbar on mobile); Specifications tab renders the spec block above the SKU/variant
   cards; both tabs look right in light **and** dark mode.
10. "View in Store" button on the edit page opens the same slug in a new tab.
11. A product with a table-heavy spec (wide `<pre>`) does not create a page-level horizontal
    scrollbar.
12. Reopen the edit page for the same product → the editor shows the saved HTML, not a blank canvas,
    and the caret/undo history is clean.
