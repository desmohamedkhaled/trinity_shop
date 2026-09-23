# Trinity Christian Gift Shop - Project Map

This document describes the repository as inspected on 2026-09-15. It records current code and SQL only. It does not describe an assumed production state. Where the repository does not establish a fact, the value is `Unknown`.

## 1. Project Overview

| Item | Current value | Evidence |
|------|---------------|----------|
| Project name | Trinity Christian Gift Shop | `package.json`, root metadata |
| Framework | Next.js 16 App Router | `package.json`, `app/` route structure |
| Language | TypeScript, TSX; JavaScript/MJS utility scripts | `*.ts`, `*.tsx`, `*.mjs`, `FINAL_REPORT.js` |
| Styling system | Tailwind CSS v4 through PostCSS plus global CSS in `app/globals.css`; some inline Tailwind classes | `postcss.config.mjs`, `app/globals.css` |
| Database | Supabase PostgreSQL | `@supabase/supabase-js`, `supabase/schema.sql`, migrations |
| Authentication | Supabase Auth email/password for admins, checked against `public.admin_users` | `app/admin/login/page.tsx`, `components/admin-guard.tsx`, `lib/admin.ts` |
| Storage | Supabase Storage bucket `trinity-media`, public bucket in SQL | `supabase/schema.sql`, `app/api/admin/upload/route.ts`, product image API |
| Deployment platform | Unknown. No deployment configuration or platform declaration was found. | `next.config.ts`, `package.json` |
| Package manager | Unknown. `package.json` exists; no lockfile was included in the inspected source list. | root inventory |
| Payments | No online payment provider; checkout creates an order/request and may open WhatsApp | `README.md`, `app/api/orders/route.ts`, `components/whatsapp-checkout.tsx` |

## 2. Complete Folder Structure

Important source and configuration structure, recursively:

```text
Trinity/
|-- .env.example
|-- .gitignore
|-- AGENTS.md
|-- CLAUDE.md
|-- README.md
|-- package.json
|-- eslint.config.mjs
|-- next.config.ts
|-- next-env.d.ts
|-- postcss.config.mjs
|-- tsconfig.json
|-- tsconfig.tsbuildinfo
|-- create_v1_audit_report.py
|-- FINAL_REPORT.js
|-- FRONTEND_QA_REPORT.md
|-- IMPLEMENTATION_COMPLETE.md
|-- QA_REPORT.md
|-- smoke-test.mjs
|-- web tr.png
|-- Trinity_V1_Final_Audit_Report.docx
|
|-- app/
|   |-- globals.css
|   |-- layout.tsx
|   |-- (store)/
|   |   |-- page.tsx                         # / home
|   |   |-- shop/page.tsx                    # /shop
|   |   |-- products/[slug]/page.tsx         # /products/:slug
|   |   |-- occasions/page.tsx               # /occasions
|   |   |-- occasions/[slug]/page.tsx        # /occasions/:slug
|   |   |-- events/ is outside this group
|   |   |-- gift-finder/page.tsx              # /gift-finder
|   |   |-- gift-list/page.tsx                # /gift-list
|   |   |-- cart/page.tsx                     # /cart
|   |   |-- checkout/page.tsx                 # /checkout
|   |   |-- checkout/success/page.tsx         # /checkout/success
|   |   |-- journal/page.tsx                  # /journal
|   |   |-- journal/[slug]/page.tsx           # /journal/:slug
|   |   |-- our-story/page.tsx                # /our-story
|   |   |-- contact/page.tsx                  # /contact
|   |
|   |-- events/page.tsx                       # /events
|   |-- events/[slug]/page.tsx                # /events/:slug
|   |
|   |-- admin/
|   |   |-- layout.tsx
|   |   |-- page.tsx                          # /admin
|   |   |-- login/page.tsx                    # /admin/login
|   |   |-- products/page.tsx                 # /admin/products
|   |   |-- inventory/page.tsx                # /admin/inventory
|   |   |-- occasions/page.tsx                # /admin/occasions
|   |   |-- events/page.tsx                   # /admin/events
|   |   |-- media/page.tsx                    # /admin/media
|   |   |-- orders/page.tsx                   # /admin/orders
|   |   |-- customers/page.tsx                # /admin/customers
|   |   |-- gift-lists/page.tsx               # /admin/gift-lists
|   |   |-- content/page.tsx                  # /admin/content
|   |   |-- gift-finder/page.tsx              # /admin/gift-finder
|   |   |-- gift-finder/requests/page.tsx
|   |   `-- gift-finder/requests/[id]/page.tsx
|   |
|   |-- api/
|       |-- auth/logout/route.ts
|       |-- catalog/products/route.ts
|       |-- catalog/gift-finder/route.ts
|       |-- content/public/route.ts
|       |-- settings/route.ts
|       |-- settings/public/route.ts
|       |-- requests/route.ts
|       |-- orders/route.ts
|       `-- admin/
|           |-- customers/route.ts
|           |-- events/route.ts
|           |-- events/[id]/route.ts
|           |-- gift-finder/route.ts
|           |-- gift-finder/requests/route.ts
|           |-- gift-finder/requests/[id]/route.ts
|           |-- gift-finder/requests/[id]/recommendations/route.ts
|           |-- gift-finder/requests/[id]/recommendations/[recommendationId]/route.ts
|           |-- gift-lists/route.ts
|           |-- occasions/route.ts
|           |-- occasions/[id]/route.ts
|           |-- orders/route.ts
|           |-- orders/[id]/route.ts
|           |-- products/route.ts
|           |-- products/[id]/route.ts
|           |-- products/[id]/images/route.ts
|           |-- requests/route.ts
|           |-- requests/[id]/route.ts
|           |-- stats/route.ts
|           `-- upload/route.ts
|
|-- components/
|   |-- add-gift-button.tsx
|   |-- add-to-cart-button.tsx
|   |-- admin-guard.tsx
|   |-- admin-mobile-nav.tsx
|   |-- button.tsx
|   |-- event-card.tsx
|   |-- icon-button.tsx
|   |-- occasion-card.tsx
|   |-- product-actions.tsx
|   |-- product-card.tsx
|   |-- product-gallery.tsx
|   |-- section-title.tsx
|   |-- site-footer.tsx
|   |-- site-header.tsx
|   |-- store-provider.tsx
|   |-- supabase-browser.ts
|   |-- video-intro-overlay.tsx
|   `-- whatsapp-checkout.tsx
|
|-- lib/
|   |-- admin.ts
|   |-- catalog.ts
|   |-- data.ts
|   |-- events.ts
|   |-- intro-config.ts
|   `-- supabase.ts
|
|-- public/
|   |-- brand/TRINTY LOGO.png
|   |-- brand/trinity-logo.svg
|   |-- brand/trinity-mark.svg
|   |-- images/Asset 1.png
|   |-- images/cross-pattern.png
|   |-- video/Hero_Vid.mp4
|   `-- video/PUT-HERO-VIDEO-HERE.txt
|
`-- supabase/
    |-- schema.sql
    |-- seed.sql
    `-- migrations/
        |-- 20260911_add_product_metadata.sql
        |-- 20260911_gift_finder.sql
        |-- 20260911_gift_questions_rls.sql
        |-- 20260911_live_production_repair.sql
        |-- 20260911_orders_checkout.sql
        |-- 20260911_v1_schema_repair.sql
        |-- 20260912_events.sql
        |-- 20260912_product_gallery.sql
        `-- events.sql
```

`node_modules/` and generated/build folders are not application source and are intentionally excluded from the map. The root also contains reports and audit artifacts listed above; their contents are not runtime dependencies unless separately referenced.

## 3. Complete File Inventory

### Root and configuration files

| File | Path | Type | Purpose | Important dependencies |
|------|------|------|---------|------------------------|
| `package.json` | `/package.json` | JSON | Project metadata, scripts, runtime and development packages. | Next.js, React, Supabase, Tailwind/PostCSS, Motion, Lucide, Zod |
| `next.config.ts` | `/next.config.ts` | TypeScript config | Allows `next/image` remote images from Unsplash and `*.supabase.co`. | Next config |
| `tsconfig.json` | `/tsconfig.json` | TypeScript config | TypeScript compiler settings and path alias configuration. | TypeScript |
| `next-env.d.ts` | `/next-env.d.ts` | Type declarations | Next-generated type references. | Next.js |
| `postcss.config.mjs` | `/postcss.config.mjs` | PostCSS config | Enables Tailwind CSS PostCSS integration. | `@tailwindcss/postcss` |
| `eslint.config.mjs` | `/eslint.config.mjs` | ESLint config | Repository lint configuration. | ESLint and Next ESLint config |
| `.env.example` | `/.env.example` | Environment template | Names Supabase URL, anon key, and service-role key; values are placeholders. | Runtime environment |
| `.gitignore` | `/.gitignore` | Git config | Ignores files from version control. | Git |
| `AGENTS.md` | `/AGENTS.md` | Agent instructions | Next-generated project instruction block; says relevant Next docs in `node_modules/next/dist/docs/` must be read before code changes. | Next.js |
| `CLAUDE.md` | `/CLAUDE.md` | Agent pointer | References `AGENTS.md`. | Agent tooling |
| `README.md` | `/README.md` | Markdown | Setup, feature, Supabase, WhatsApp, and hero-video notes. | Project source |
| `smoke-test.mjs` | `/smoke-test.mjs` | Node script | Smoke-tests a running app using `TEST_BASE_URL`, defaulting to `http://localhost:3000`. | Node fetch |
| `create_v1_audit_report.py` | `/create_v1_audit_report.py` | Python script | Generates the V1 audit report; not part of the app runtime. | Python; exact runtime behavior not otherwise used |
| `FINAL_REPORT.js` | `/FINAL_REPORT.js` | JavaScript report artifact | V1/reporting artifact, not imported by the app. | Unknown beyond file contents |
| `IMPLEMENTATION_COMPLETE.md` | `/IMPLEMENTATION_COMPLETE.md` | Markdown report | Historical implementation/setup report. | None at runtime |
| `FRONTEND_QA_REPORT.md` | `/FRONTEND_QA_REPORT.md` | Markdown report | Historical frontend QA observations. | None at runtime |
| `QA_REPORT.md` | `/QA_REPORT.md` | Markdown report | Historical QA observations and environment notes. | None at runtime |
| `Trinity_V1_Final_Audit_Report.docx` | `/Trinity_V1_Final_Audit_Report.docx` | Word report | V1 audit artifact. | None at runtime |
| `web tr.png` | `/web tr.png` | Raster asset | Root-level image; no runtime usage was found. | Unknown |

### Runtime libraries and shared components

| File | Path | Type | Purpose | Important dependencies |
|------|------|------|---------|------------------------|
| `data.ts` | `/lib/data.ts` | Types | Defines `Product`, `ProductImage`, and `Occasion` UI types. | None |
| `catalog.ts` | `/lib/catalog.ts` | Server/shared data functions | Reads published products and occasions from Supabase, loads product galleries, maps DB fields to UI types, and converts errors to empty results. | `@supabase/supabase-js`, `lib/data` |
| `events.ts` | `/lib/events.ts` | Server/shared data functions | Reads published/upcoming event records and defines `SiteEvent`. | `@supabase/supabase-js` |
| `admin.ts` | `/lib/admin.ts` | Server auth utility | Creates a service-role client and checks the logged-in user against active `admin_users`; role helper supports named roles. | `lib/supabase`, Supabase JS |
| `supabase.ts` | `/lib/supabase.ts` | Supabase clients | Provides browser/server Supabase clients and configuration checks. | `@supabase/ssr`, `@supabase/supabase-js`, Next cookies |
| `intro-config.ts` | `/lib/intro-config.ts` | Config module | Parses `NEXT_PUBLIC_SHOW_INTRO_MODE`; default is `every-visit`. | Environment variable |
| `store-provider.tsx` | `/components/store-provider.tsx` | Client component/context | Stores cart, cart quantities, gift list, and gift quantities in React state and localStorage. | React, `lib/data` |
| `supabase-browser.ts` | `/components/supabase-browser.ts` | Client helper | Creates a browser Supabase client from public environment variables. | Supabase JS |
| `site-header.tsx` | `/components/site-header.tsx` | Client component | Sticky storefront header, logo, navigation, mobile menu, search, cart count, and gift-list count. | Next Link/Image, Lucide, StoreProvider, IconButton |
| `site-footer.tsx` | `/components/site-footer.tsx` | Server component | Shared footer with brand image, Explore links, Help links, and copyright. | Next Link/Image |
| `video-intro-overlay.tsx` | `/components/video-intro-overlay.tsx` | Client component | Full-screen intro video overlay; supports first/session/every-visit display modes, body scroll lock, manual start, and close-on-ended. | React, `intro-config`, `/public/video/Hero_Vid.mp4` |
| `product-card.tsx` | `/components/product-card.tsx` | Client component | Product tile with image, featured/status information, wishlist toggle, product link, and cart action; has an image/dialog interaction. | Next Link/Image, Lucide, StoreProvider, AddToCartButton |
| `product-gallery.tsx` | `/components/product-gallery.tsx` | Client component | Main product image plus responsive thumbnail gallery, arrows, keyboard navigation, and touch swiping. | Next Image, Lucide, Product types |
| `product-actions.tsx` | `/components/product-actions.tsx` | Client component | Product detail cart and gift-list controls. | StoreProvider, product types |
| `add-to-cart-button.tsx` | `/components/add-to-cart-button.tsx` | Client component | Adds a product to cart and briefly changes its label/state; optional compact mode. | StoreProvider, Lucide |
| `add-gift-button.tsx` | `/components/add-gift-button.tsx` | Client component | Adds/removes a product from local gift list. | StoreProvider, Lucide |
| `event-card.tsx` | `/components/event-card.tsx` | Server/component | Displays an event summary and link. | Next Link/Image, `SiteEvent` |
| `occasion-card.tsx` | `/components/occasion-card.tsx` | Server/component | Displays an occasion image, name, subtitle, and link. | Next Link/Image |
| `section-title.tsx` | `/components/section-title.tsx` | Component | Shared section heading treatment. | React/CSS |
| `button.tsx` | `/components/button.tsx` | Component | Reusable button with variants and loading state. | React/CSS |
| `icon-button.tsx` | `/components/icon-button.tsx` | Component | Accessible icon-only button with required label and optional active state. | React/CSS |
| `admin-guard.tsx` | `/components/admin-guard.tsx` | Client component | On non-login admin routes, checks Supabase user and active `admin_users` row, then redirects unauthorized users to login. | Supabase browser client, Next navigation |
| `admin-mobile-nav.tsx` | `/components/admin-mobile-nav.tsx` | Client component | Mobile admin menu with links and open/close state. | Next Link, Lucide |
| `whatsapp-checkout.tsx` | `/components/whatsapp-checkout.tsx` | Client component | Loads public WhatsApp settings, collects customer details, posts a request, and optionally opens a prefilled WhatsApp message. | React, `/api/settings/public`, `/api/requests`, Lucide |

### Page files

All page files are included in the route sections below. Each is a Next App Router page; pages that use browser state are client components, while catalog/event loaders may be server components.

### API files

All API route files are included in the API section below, including their methods, authentication checks, tables, bodies, responses, and likely errors.

### SQL files

| File | Path | Type | Purpose | Important dependencies |
|------|------|------|---------|------------------------|
| `schema.sql` | `/supabase/schema.sql` | SQL | Base schema, tables, RLS, public settings, admin role model, and `trinity-media` bucket/policies. | Supabase PostgreSQL/Auth/Storage |
| `seed.sql` | `/supabase/seed.sql` | SQL seed | Demo products, occasions, Gift Finder questions/options, and admin-user insertion instructions. | Base schema |
| `20260911_add_product_metadata.sql` | `/supabase/migrations/20260911_add_product_metadata.sql` | SQL migration | Adds product occasion/gift-for metadata. | `products` |
| `20260911_gift_finder.sql` | `/supabase/migrations/20260911_gift_finder.sql` | SQL migration | Adds Gift Finder request metadata and `request_recommendations`. | `requests`, `products` |
| `20260911_gift_questions_rls.sql` | `/supabase/migrations/20260911_gift_questions_rls.sql` | SQL migration | Adds public active Gift Finder reads and admin writes. | `gift_questions`, `gift_options`, `admin_users` |
| `20260911_live_production_repair.sql` | `/supabase/migrations/20260911_live_production_repair.sql` | SQL migration | Repair/production schema changes for live data; exact applied order is Unknown. | Existing production schema |
| `20260911_orders_checkout.sql` | `/supabase/migrations/20260911_orders_checkout.sql` | SQL migration | Adds `orders`, `order_items`, checkout RPC, status/payment status, and admin RLS. | `products`, `customers`, `admin_users` |
| `20260911_v1_schema_repair.sql` | `/supabase/migrations/20260911_v1_schema_repair.sql` | SQL migration | V1 schema repair; overlaps some request/order/recommendation responsibilities. | Existing schema |
| `20260912_events.sql` | `/supabase/migrations/20260912_events.sql` | SQL migration | Adds `events`, indexes, public published read policy, and admin management policy. | `admin_users` |
| `events.sql` | `/supabase/migrations/events.sql` | SQL migration | Another events migration file with overlapping purpose. Applied order/state is Unknown. | `events` |
| `20260912_product_gallery.sql` | `/supabase/migrations/20260912_product_gallery.sql` | SQL migration | Adds `product_images`, indexes, published-gallery read policy, and admin management policy. | `products`, `admin_users` |

## 4. Public Storefront Pages

The root layout wraps the storefront and admin trees with `StoreProvider` and mounts `VideoIntroOverlay`. Store pages use `SiteHeader`/`SiteFooter` where implemented. Public catalog reads use the anon Supabase key and RLS; forms use server API routes.

| Route | File path | Displays/data | Main components and interactions | DB/API/mobile notes |
|------|------|------|------|------|
| `/` | `/app/(store)/page.tsx` | Hero section/video, editable hero title/subtitle, Shop by Occasion, featured gifts, Trinity story, Gift Finder CTA, and upcoming events. | `SiteHeader`, `SiteFooter`, `OccasionCard`, `ProductCard`, `EventCard`, `SectionTitle`, intro overlay. Product/occasion/event links are interactive. | Reads products/occasions through `lib/catalog.ts`, events through `lib/events.ts`, and hero content through `/api/content/public` where used. Tables: `products`, `product_images`, `occasions`, `events`, `site_settings`. Responsive hero/video and card grids. |
| `/shop` | `/app/(store)/shop/page.tsx` | Published product grid with query search and category filters. | `SiteHeader`, `SiteFooter`, `ProductCard`; filter/search state and product links. | `getProducts()` -> `products` and `product_images`. Query can be supplied by header as `/shop?search=...`; no separate search API. Responsive grid. |
| `/products/[slug]` | `/app/(store)/products/[slug]/page.tsx` | Published product detail, price, description/meaning, gallery, and purchase/gift-list actions. | `ProductGallery`, `ProductActions`, `SiteHeader`, `SiteFooter`. | `getProduct(slug)` -> `products`, then `product_images`; `notFound()` when absent. Browser cart/gift-list state. Gallery uses responsive thumbnails, keyboard arrows, and touch swipe. |
| `/occasions` | `/app/(store)/occasions/page.tsx` | Published occasions listing. | `OccasionCard`, `SiteHeader`, `SiteFooter`. | `getOccasions()` -> `occasions`; links to `/occasions/[slug]`. Responsive card grid. |
| `/occasions/[slug]` | `/app/(store)/occasions/[slug]/page.tsx` | Occasion heading and matching published products. | `SiteHeader`, `SiteFooter`, `ProductCard`, likely `SectionTitle`. | Reads occasion metadata and products; exact filter implementation is page-local. Tables: `occasions`, `products`, `product_images`. Responsive product grid. |
| `/events` | `/app/events/page.tsx` | Published event listing sorted by date/time. | `SiteHeader`, `SiteFooter`, `EventCard`. | `getPublishedEvents()` -> `events`. Responsive event cards. |
| `/events/[slug]` | `/app/events/[slug]/page.tsx` | Published event detail with date/time/location/description/button. | `SiteHeader`, `SiteFooter`; event detail UI. | `getEventBySlug(slug)` -> `events`, not found when absent. Button destination is event data. Responsive image/detail layout. |
| `/gift-finder` | `/app/(store)/gift-finder/page.tsx` | Database-driven questionnaire, client-side recommendations/scoring, and request-for-help form. | Page-local client controls plus product cards and request form. | Questions/options from `/api/catalog/gift-finder` -> `gift_questions`, `gift_options`; product list from catalog -> `products`; optional request posts `/api/requests` -> `customers`, `requests`, `request_items`. Uses responsive step/question controls. |
| `/gift-list` | `/app/(store)/gift-list/page.tsx` | Local saved products, quantities, estimated total, request/WhatsApp flow. | `SiteHeader`, `SiteFooter`, `WhatsAppCheckout`, StoreProvider controls. | No persistent DB list is created by the storefront flow; uses localStorage keys `trinity-gift-list` and `trinity-gift-quantities`. Submission uses `/api/requests` and optionally WhatsApp. Responsive list and form modal. |
| `/cart` | `/app/(store)/cart/page.tsx` | Local cart items, quantities, subtotal, empty state, and checkout action. | `SiteHeader`, `SiteFooter`, StoreProvider, likely `WhatsAppCheckout` or checkout link. | Browser localStorage keys `trinity-cart` and `trinity-cart-quantities`; checkout link goes to `/checkout`. Responsive line-item layout. |
| `/checkout` | `/app/(store)/checkout/page.tsx` | Customer/address form and cart order submission. | `SiteHeader`, `SiteFooter`, StoreProvider; page-local checkout form. | Posts `/api/orders`, which calls `create_checkout_order` using `products`, `customers`, `orders`, `order_items`; successful order stores confirmation for success page and clears cart. Validates required address/customer fields and stock server-side. Mobile form must remain usable. |
| `/checkout/success` | `/app/(store)/checkout/success/page.tsx` | Confirmation after checkout using browser `sessionStorage`. | Page-local confirmation and links. | No direct DB read; depends on checkout page/session storage. Missing confirmation data behavior is page-local. Responsive confirmation state. |
| `/contact` | `/app/(store)/contact/page.tsx` | Customer contact/request form. | `SiteHeader`, `SiteFooter`, page-local form. | Posts `/api/requests` and creates `customers`, `requests`, optional `request_items`. Contact details are not currently shown as an admin-editable content model in the inspected page/API. Responsive form. |
| `/our-story` | `/app/(store)/our-story/page.tsx` | Static Faith/Hope/Love or Trinity story content. | `SiteHeader`, `SiteFooter`; page-local layout. | No database/API dependency found. Responsive content layout. |
| `/journal` | `/app/(store)/journal/page.tsx` | Static journal page/empty state. | `SiteHeader`, `SiteFooter`; page-local content. | No journal table/API was found. Responsive empty/static state. |
| `/journal/[slug]` | `/app/(store)/journal/[slug]/page.tsx` | No article implementation; always calls `notFound()`. | No article component currently implemented. | No DB/API route. This route is intentionally unavailable in current code. |

Pages requested in the V2 brief that do not exist as separate public routes: FAQ, Shipping & Returns, and a separate wishlist page. Footer currently links FAQ and Shipping & Returns to `/contact`; the local wishlist is represented by `/gift-list` and local state.

## 5. Admin Dashboard

`/app/admin/layout.tsx` wraps all admin pages with `AdminGuard`, a fixed desktop sidebar, and `AdminMobileNav`. The guard checks an authenticated Supabase user and an active `admin_users` row. API authorization is additionally checked per role in `lib/admin.ts`/route handlers.

| Route | File path | Purpose/components/actions | API/tables/auth/limitations |
|------|------|------|------|
| `/admin` | `/app/admin/page.tsx` | Dashboard counts and recent requests. | Calls `/api/admin/stats` and request data routes as implemented. Tables: `products`, `requests`, `customers`, `gift_lists`. Active admin required. V2 asks to remove the Manage store button. |
| `/admin/login` | `/app/admin/login/page.tsx` | Email/password login form using Supabase Auth. | Uses browser Supabase auth; redirects into admin after login. Does not itself create an `admin_users` record. Requires public Supabase URL/anon key; active membership is checked after login. |
| `/admin/products` | `/app/admin/products/page.tsx` | Product CRUD, slug/category/price/stock/metadata editing, publish/featured flags, cover upload and product gallery upload/order/delete. | `/api/admin/products`, `/api/admin/products/[id]`, `/api/admin/products/[id]/images`, occasions endpoint for options, upload endpoint as used. Tables: `products`, `product_images`, Storage `trinity-media`. Product/content role checks. Saving status and gallery are V2 risk areas. |
| `/admin/inventory` | `/app/admin/inventory/page.tsx` | Stock/inventory editing for products. | Uses product admin API and `products`; exact controls are page-local. Product-manager/admin authorization is required server-side. |
| `/admin/occasions` | `/app/admin/occasions/page.tsx` | Occasion CRUD, publication/order fields and currently an image URL field. | `/api/admin/occasions`, `/api/admin/occasions/[id]`; `occasions` table. Content/product role checks. V2 asks to replace URL text with direct upload. |
| `/admin/events` | `/app/admin/events/page.tsx` | Event CRUD, publish/status/featured/order, image URL/upload behavior as implemented. | `/api/admin/events`, `/api/admin/events/[id]`; `events`; content roles. |
| `/admin/media` | `/app/admin/media/page.tsx` | Lists/uploads/deletes product media in Storage. | `/api/admin/upload`; bucket `trinity-media`, generally `products/` paths. Product/content roles. Media metadata table usage is not fully established. |
| `/admin/orders` | `/app/admin/orders/page.tsx` | Combined requests/orders management; views order/request details and edits statuses/notes. | `/api/admin/orders`, `/api/admin/orders/[id]`, `/api/admin/requests`, `/api/admin/requests/[id]`; `orders`, `order_items`, `requests`, `request_items`, `customers`, products. Order/admin role checks. Current order DB status enum is `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`, which does not match the V2 requested labels exactly. |
| `/admin/customers` | `/app/admin/customers/page.tsx` | Customer list/profile view. | `/api/admin/customers` GET; `customers`. Admin/order role. Current route is GET-only; merge, totals, and delete behavior are not present in the inspected API. |
| `/admin/gift-lists` | `/app/admin/gift-lists/page.tsx` | Lists persisted gift lists and related items/customers. | `/api/admin/gift-lists` GET; `gift_lists`, `gift_list_items`, `customers`, products. Admin/order role. Storefront local gift list does not automatically create a `gift_lists` row. |
| `/admin/content` | `/app/admin/content/page.tsx` | Homepage & Pages screen; reads/updates hero title and subtitle; displays nonfunctional section list for Hero, Shop by Occasion, Featured Gifts, Story, Gift Finder, Final CTA. | `/api/settings` GET/PATCH; `site_settings`; content-manager role. V2 click-state fixes likely concern this page and/or its missing section controls. `pages`/`page_sections` exist in SQL but are not wired here. |
| `/admin/gift-finder` | `/app/admin/gift-finder/page.tsx` | Gift Finder question management. | `/api/admin/gift-finder` GET/PATCH; `gift_questions` and likely options. Content-manager role. |
| `/admin/gift-finder/requests` | `/app/admin/gift-finder/requests/page.tsx` | Lists/filter Gift Finder requests. | `/api/admin/gift-finder/requests`; `requests`, `customers`. Admin/order role. |
| `/admin/gift-finder/requests/[id]` | `/app/admin/gift-finder/requests/[id]/page.tsx` | Request details, status/admin notes, and product recommendations. | Request detail/update and recommendation add/delete APIs; `requests`, `request_items`, `products`. Admin/order role. `request_recommendations` exists in SQL but current recommendation APIs use `request_items`. |
| `/admin/settings` | `/app/admin/settings/page.tsx` | WhatsApp checkout enabled toggle and business number settings. | `/api/settings`; `site_settings`; content-manager role. V2 user management and editable contact details are not currently represented by this page/API. |

Admin buttons/actions observed across these screens include create/edit/delete, save/publish, status/notes updates, upload/remove/reorder media, question editing, recommendation add/remove, and logout/navigation controls. Exact form fields are defined in each page file; no separate admin component folder exists.

## 6. Components

| File/component | Client/server | Props | State | Renders/uses/interactions |
|------|------|------|------|------|
| `/components/site-header.tsx` `SiteHeader` | Client | None | `searchOpen`, `menuOpen`, `query`; reads StoreProvider | Sticky logo/nav/actions; logo links to `/`; search redirects to `/shop?search=...`; mobile menu; cart and gift-list counters. |
| `/components/site-footer.tsx` `SiteFooter` | Server-compatible | None | None | Logo, Explore, Help links. FAQ and Shipping links currently point to `/contact`. |
| `/components/video-intro-overlay.tsx` `VideoIntroOverlay` | Client | None | show/closing/error/started, refs for video and scroll | Full-screen video overlay with click-to-start, end-to-close, body scroll lock, first/session/every-visit storage mode. Mounted globally in root layout, including admin. |
| `/components/store-provider.tsx` `StoreProvider` / `useStore` | Client | `children` | cart/list arrays, quantity maps | Global localStorage-backed cart and gift list; quantity clamp 1-99; no server-backed wishlist. |
| `/components/product-card.tsx` `ProductCard` | Client | `{ product: Product }` | Wishlist/dialog/focus-related local state | Product image/card, favorite toggle, detail link, add-to-cart, image/dialog interaction. Current favorite is local gift-list behavior. |
| `/components/product-gallery.tsx` `ProductGallery` | Client | `{ product: Product }` | selected image, refs, touch start | Cover plus deduplicated gallery, thumbnails, arrows, keyboard left/right, mobile swipe, thumbnail scrolling. |
| `/components/product-actions.tsx` `ProductActions` | Client | `{ product: Product }` | Local action feedback through child/store | Product detail add-to-cart and add-to-gift-list actions. |
| `/components/add-to-cart-button.tsx` `AddToCartButton` | Client | `{ product: Product; compact?: boolean }` | transient added state | Adds product; shows compact/full feedback. |
| `/components/add-gift-button.tsx` `AddGiftButton` | Client | `{ product: Product }` | Uses StoreProvider membership | Adds/removes product from local gift list; likely V2 wishlist target. |
| `/components/occasion-card.tsx` `OccasionCard` | Server-compatible | occasion-like `{ slug,name,subtitle,image }` | None | Linked occasion image/card. |
| `/components/event-card.tsx` `EventCard` | Server-compatible | `{ event: SiteEvent }` | None | Event summary/link. |
| `/components/whatsapp-checkout.tsx` `WhatsAppCheckout` | Client | `{ items: {product,quantity}[]; onClear?: () => void }` | settings, customer fields, modal open/loading | Loads `/api/settings/public`; validates name/phone; posts `/api/requests`; opens WhatsApp if enabled; clears items on success. Modal responsive via scrollable max-height. |
| `/components/admin-guard.tsx` `AdminGuard` | Client | `{ children }` | checking/alive lifecycle | Client-side user and active admin membership gate; redirects to `/admin/login`. |
| `/components/admin-mobile-nav.tsx` `AdminMobileNav` | Client | None | open/close | Mobile admin nav; links are static and omit `/admin/events` compared with desktop layout. |
| `/components/button.tsx` `Button` | Component | Native button props plus `variant`, `loading` | None | Styled reusable button. |
| `/components/icon-button.tsx` `IconButton` | Component | Native props, required `label`, optional `active` | None | Accessible icon button. |
| `/components/section-title.tsx` `SectionTitle` | Component | Page-local heading props; exact shape defined in file | None | Reusable section heading. |
| `/components/supabase-browser.ts` `browserSupabase` | Client helper | None | None | Browser Supabase client from public env values. |

No standalone `Wishlist`, `Cart`, `Checkout`, `Upload`, or modal component files were found. Those behaviors are page-local or implemented by the components above.

## 7. API Routes

All routes are under `/app/api`. Admin routes call `requireAdminRole` or `requireAdmin`; public routes do not require a user. Exact error text can change with Supabase/runtime errors, so this section gives the observed contract and likely failures.

### Public/customer routes

| Methods | Route/file | Auth/admin | Request/query | Response/data/errors |
|------|------|------|------|------|
| GET | `/api/catalog/products` -> `/app/api/catalog/products/route.ts` | No | Optional `q` search query. | Published products, with product image data as implemented; reads `products`/`product_images`. 503 if public Supabase config absent; DB errors become error response/empty behavior depending handler. |
| GET | `/api/catalog/gift-finder` -> `/app/api/catalog/gift-finder/route.ts` | No | None. | Active Gift Finder questions/options from `gift_questions`, `gift_options`; 503 when config absent; Supabase errors possible. |
| GET | `/api/content/public` -> `/app/api/content/public/route.ts` | No | None. | Selected `site_settings` content, specifically hero keys in current implementation. 503 when config absent. |
| GET | `/api/settings/public` -> `/app/api/settings/public/route.ts` | No | None. | Public `site_settings` values for WhatsApp checkout/number/store settings. 503 when config absent. |
| POST | `/api/requests` -> `/app/api/requests/route.ts` | No browser auth; server uses service-role key | JSON: customer `{name,email?,phone}`, occasion, notes, requestType, giftFor, budgetMin, budgetMax, category, preferences, recipient, and optional `items[]` with product id/quantity/price. | Validates published products and inserts `customers`, `requests`, optional `request_items`; returns request id/status. 503 missing server credentials; 400 validation/DB error. Uses service-role Supabase client. |
| POST | `/api/orders` -> `/app/api/orders/route.ts` | No browser auth; service role only | JSON customer/address fields and `items[]` with ids/quantities. | Calls service-role-only `create_checkout_order` RPC; creates customer/order/order items, validates stock, decrements stock, returns order data/confirmation. Errors include missing fields, empty cart, invalid quantity, unavailable/out-of-stock product, missing credentials. |
| POST | `/api/auth/logout` -> `/app/api/auth/logout/route.ts` | Current Supabase session if present | No body. | Signs out server session and returns route response; session/cookie errors possible. |

### Admin routes

| Methods | Route/file | Required role | Request | Response/tables/errors |
|------|------|------|------|------|
| GET, POST | `/api/admin/products` -> `/app/api/admin/products/route.ts` | Product manager role set | GET none. POST product fields including name/slug/category/price/stock/image/description/meaning/occasion/giftFor/is_featured/is_published. | Reads/inserts `products` with `product_images` relation. 401/403, validation/duplicate slug, DB errors. |
| PATCH, DELETE | `/api/admin/products/[id]` -> `.../[id]/route.ts` | Product manager role set | PATCH partial product fields; DELETE id path. | Updates/deletes `products`; errors for auth, missing id/row, DB constraints. |
| POST, PATCH, DELETE | `/api/admin/products/[id]/images` -> `.../[id]/images/route.ts` | Product/content role set | Multipart image upload or JSON/gallery operation depending method; id path; image/order identifiers as implemented. | Uses `products`, `product_images`, Storage `trinity-media`, public URL convention. Errors for invalid product/path/file/storage/DB. |
| GET, POST | `/api/admin/occasions` -> `.../route.ts` | Content/product role set | POST slug/name/subtitle/image_url/sort_order/is_published. | Reads/inserts `occasions`; auth, validation, duplicate slug, DB errors. |
| PATCH, DELETE | `/api/admin/occasions/[id]` -> `.../[id]/route.ts` | Content role set | PATCH occasion fields; DELETE id. | Updates/deletes `occasions`; auth/not-found/DB errors. |
| GET, POST | `/api/admin/events` -> `.../route.ts` | Content role set | POST event fields including title/slug/image/description/date/time/location/button/status/featured/order. | Reads/inserts `events`, generates unique slug candidates; validation/duplicate slug/DB errors. |
| GET, PATCH, DELETE | `/api/admin/events/[id]` -> `.../[id]/route.ts` | Content role set | id path; PATCH event fields; DELETE. | Reads/updates/deletes `events`; auth/not-found/DB errors. |
| GET | `/api/admin/customers` -> `.../route.ts` | Admin/order role set | None observed. | Customer records from `customers`; auth/DB errors. No merge/delete endpoint currently exists. |
| GET | `/api/admin/gift-lists` -> `.../route.ts` | Admin/order role set | None observed. | Gift lists with relations from `gift_lists`, `gift_list_items`, customers/products; auth/DB errors. |
| GET | `/api/admin/orders` -> `.../route.ts` | Admin/order role set | None observed. | Orders with `order_items`; auth/DB errors. |
| PATCH | `/api/admin/orders/[id]` -> `.../[id]/route.ts` | Admin/order role set | JSON `status`, optional `admin_notes`; id path. | Updates `orders`; status currently must align with DB enum (`pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`). |
| GET | `/api/admin/requests` -> `.../route.ts` | Admin/order role set | None observed. | Requests with customer/item/product relations; auth/DB errors. |
| PATCH | `/api/admin/requests/[id]` -> `.../[id]/route.ts` | Admin/order role set | JSON request fields/status/notes; id path. | Updates `requests`; auth/not-found/DB errors. |
| GET | `/api/admin/stats` -> `.../route.ts` | Any active admin | None. | Count totals for `products`, `requests`, `customers`, `gift_lists`; auth/DB errors. |
| GET, POST, DELETE | `/api/admin/upload` -> `.../route.ts` | Product/content role set | GET lists media; POST multipart file/folder; DELETE storage path. | Supabase Storage `trinity-media`, primarily `products/` path; returns uploaded path/public URL/list. Errors for missing credentials/file/invalid path/storage. |
| GET, PATCH | `/api/admin/gift-finder` -> `.../route.ts` | Content role set | PATCH question/options payload as implemented. | Reads/updates `gift_questions` and related options; auth/validation/DB errors. |
| GET | `/api/admin/gift-finder/requests` -> `.../route.ts` | Admin/order role set | None. | Gift Finder `requests` filtered by `request_type`, joined to `customers`. |
| GET, PATCH | `/api/admin/gift-finder/requests/[id]` -> `.../[id]/route.ts` | Admin/order role set | id path; PATCH status/notes/request fields. | Request and `request_items` details; updates `requests`; auth/not-found/DB errors. |
| POST | `/api/admin/gift-finder/requests/[id]/recommendations` -> `.../route.ts` | Admin/order role set | id path; product recommendation id/notes as implemented. | Validates `products`, inserts recommendation as `request_items` in current code; auth/invalid product/DB errors. |
| DELETE | `/api/admin/gift-finder/requests/[id]/recommendations/[recommendationId]` -> `.../[recommendationId]/route.ts` | Admin/order role set | request and recommendation/item path ids. | Deletes current `request_items` recommendation; auth/not-found/DB errors. |
| GET, PATCH | `/api/settings` -> `/app/api/settings/route.ts` | Content role set | PATCH JSON key/value settings; current content page sends `hero_title`, `hero_subtitle`. | Reads/upserts `site_settings`; auth/DB errors. |

Role names defined in `/lib/admin.ts`: `super_admin`, `admin`, `content_manager`, `order_manager`, `product_manager`. Exact role arrays permitted by individual handlers are source-defined; an active row alone is not equivalent to every role at API level.

## 8. Database

### Tables and relationships

| Table | Purpose/important columns | Relationships/foreign keys | RLS and current users |
|------|------|------|------|
| `products` | Catalog: `id`, `slug`, `name`, `description`, `meaning`, `price`, `category`, `stock`, `image_url`, `is_featured`, `is_published`, timestamps, migration fields `occasion[]`, `gift_for[]`. | Referenced by `gift_list_items`, `request_items`, `gift_rules`, `order_items`, `product_images`, `request_recommendations`. | Public select for published products; admin management policy for active admins. Used by catalog, shop/detail, product admin, inventory, order RPC, Gift Finder. |
| `product_images` | Gallery rows: product id, image URL, alt text, sort order. | `product_id -> products.id` cascade. | Public select only when parent product published; active admins manage. Used by catalog/product detail/admin gallery. |
| `occasions` | Published occasion content: slug/name/subtitle/image/sort order. | No declared foreign key to products; product matching uses product `occasion[]`. | Public select published; active admins manage. Used by home, occasion pages, admin. |
| `events` | Event title/slug/image/description/date/time/location/button/status/featured/order/timestamps. | None. | Public select when `status='published'`; active admins manage. Used by home/events/admin. |
| `customers` | Contact/profile records: id/name/email/phone/created_at. | Referenced by gift lists, requests, orders. | RLS enabled; public anon privileges revoked; server/service role creates. Admin route reads. |
| `gift_lists` | Persisted gift-list header: customer, status, notes, created_at. | `customer_id -> customers` set null. | RLS enabled; admin API reads. Storefront local gift list does not itself persist here. |
| `gift_list_items` | Persisted gift-list products and quantities. | `gift_list_id -> gift_lists` cascade; `product_id -> products` cascade. | RLS enabled. Current admin relation usage exists; public local list flow does not insert it. |
| `requests` | Contact/gift request: customer/gift list, occasion, status, notes/admin notes, request type and Gift Finder metadata, timestamps. | customer/gift list set null; request items cascade; recommendation table cascade. | RLS enabled; active admin management. Anonymous request creation is server-side through service role. |
| `request_items` | Requested products with quantity/unit price. | request cascade; product restrict. | RLS enabled; active admins manage. Used by request endpoint, admin request/recommendation APIs. |
| `request_recommendations` | Migration-created recommendation records with request/product/admin notes. | request cascade; product restrict; unique request/product. | Active admin management policy. Current API appears to use `request_items` instead, so usage is legacy/uncertain. |
| `orders` | Checkout order header: number/customer snapshot/address, totals/currency, status/payment status, notes/timestamps. | customer set null; order items cascade. | RLS enabled; active admins manage; checkout RPC is service-role only. |
| `order_items` | Product snapshot/name/image/price/quantity/line total. | order cascade; product set null. | RLS enabled; active admins manage. Used by checkout and admin orders. |
| `site_settings` | Key/value settings, timestamps/updater. Seed values include WhatsApp enabled/number/store name; content uses hero keys. | `updated_by` has no declared FK in base schema. | Public read limited to checkout settings; active admins read/write. |
| `admin_users` | Auth membership/role: auth user id, email, role, active flag, created_at. | `id -> auth.users.id` cascade. | Admin profile select policy for current user; active membership drives application authorization. |
| `pages` | Page metadata: slug/title/SEO/published. | Parent of `page_sections`. | RLS policies are not fully defined in base schema. Runtime usage is Unknown. |
| `page_sections` | JSON content sections, type/order/visibility. | `page_id -> pages.id` cascade. | RLS/runtime usage Unknown. |
| `gift_questions` | Gift Finder questions and active/order flags. | Parent of `gift_options`. | Public active reads and admin writes via migration policies. |
| `gift_options` | Question answer label/value. | `question_id -> gift_questions` cascade. | Public active-question option reads and admin writes as migration policy allows. |
| `gift_rules` | Option-to-product scoring weight. | option cascade; product cascade. | Runtime use Unknown; current client scoring appears based on product metadata. |
| `media` | File metadata: path/alt/type/timestamp. | No FK. | Base schema table; runtime metadata usage is Unknown. Storage APIs mainly operate directly on Storage objects. |

The base schema does not define `events`, `product_images`, or orders; those are migration-defined. The migration directory includes overlapping repair/event files, so actual production application order/state is Unknown.

## 9. Supabase Storage

| Item | Current behavior |
|------|------------------|
| Bucket | `trinity-media` |
| Public/private | Created with `public=true`; public object select policy exists. |
| Known paths | Product media is validated/used under `products/`; uploaded filenames use a generated UUID plus original extension in the upload route. Product image API also builds public URLs using `/storage/v1/object/public/trinity-media/`. |
| Stores | Product cover/gallery images and general media managed in admin. Exact event/occasion folder conventions are not fully established. |
| Upload UI | `/app/admin/products/page.tsx` for product cover/gallery; `/app/admin/media/page.tsx` for media browser/upload; occasion/event pages may use fields or upload behavior as implemented. |
| API handlers | `/api/admin/upload`; `/api/admin/products/[id]/images`; event/occasion handlers may store image URLs rather than uploading directly. |
| Policies | Public read; active admin insert/update/delete in `schema.sql`. Exact live policies may differ because live migration state is Unknown. |
| Important limitation | `media` table and Storage object metadata are separate concepts; current code does not establish a complete media metadata synchronization flow. |

## 10. Authentication & Authorization

- Provider: Supabase Auth.
- Login: `/admin/login` uses email/password with the browser Supabase client. The authenticated Auth user must also have an active row in `public.admin_users`.
- Logout: `/api/auth/logout` signs out the server session.
- Browser gate: `AdminGuard` skips checking only on `/admin/login`; other admin routes call `auth.getUser()`, query active `admin_users`, and redirect failures to `/admin/login`.
- Server gate: API handlers use `requireAdmin()` or `requireAdminRole()` from `/lib/admin.ts`. `requireAdmin()` reads the server session and active admin membership. `serviceSupabase()` uses `SUPABASE_SERVICE_ROLE_KEY` for server-only operations.
- Roles: `super_admin`, `admin`, `content_manager`, `order_manager`, `product_manager`.
- Protected routes: every `/admin/*` page is wrapped by `app/admin/layout.tsx`; route-level API authorization is separate.
- Server/client split: browser client uses public anon key and SSR client uses cookies; service-role operations are server-only. The code comments explicitly prohibit exposing the service role key to browser code.
- No user-management API, role assignment UI, or password-creation workflow currently exists. V2 user management will require new Auth-admin/server functionality and database/UI changes.

## 11. Global Styling

File: `/app/globals.css`.

- Imports Tailwind v4 with `@import "tailwindcss"`.
- Brand variables include cream `#f6f0e7`, paper `#fffdf8`, ink `#1d2930`, navy `#0b4166`, blue `#2479a8`, gold `#b99055`, red `#b84835`.
- Layout variables: max container `1440px`, product container `1700px`, clamped section/card spacing, radius variables, and a 200ms transition.
- Global reset: `box-sizing:border-box`; html/body/main are width-constrained to 100%, body min-width `320px`, body has fixed cross-pattern background and `overflow-x:hidden`.
- Global font: Arial/Helvetica/sans-serif. `.display-font` uses Georgia/Times New Roman.
- `img` is `display:block; max-width:100%`; `video` is block; inputs/buttons inherit font.
- Focus ring is globally `3px solid #1267a8` with offset.
- `.trinity-container` and `.product-container` set max widths and responsive inline padding.
- Store surfaces/cards/buttons include border, radius, background, hover transform/shadow, and transition rules.
- Intro overlay is fixed at full viewport with maximum z-index, `overflow:hidden`, black background, and body scroll locking from the component. Video is full viewport with `object-fit:contain`; play control is positioned on the right and the overlay can fade out.
- `.admin-shell` is full width/min-height with `overflow-x:hidden`; desktop `.admin-main` is `calc(100vw - 16rem)` with `margin-left:16rem` at `min-width:1024px`.
- `.admin-sidebar-link[aria-current="page"]` currently shares a translucent hover style; distinct active styling is a V2 request.
- Admin tables/media/inputs are max-width constrained; text wraps anywhere to prevent long IDs/emails/URLs from horizontal overflow.
- `.pattern-bg`, `.glass`, `.soft-shadow`, and `.float-slow` are global utility classes.
- Breakpoints are mostly Tailwind responsive classes; the explicit global admin breakpoint is 1024px. Other exact breakpoints are class-driven rather than centralized.
- Potential global layout impacts: fixed body scroll styles from intro overlay, fixed desktop admin sidebar, `overflow-x:hidden`, 100vw intro video, `img max-width:100%`, admin width calculation, fixed background, and `object-fit:contain` video behavior. Changes to these can affect every route.

## 12. Layouts

- Root layout: `/app/layout.tsx` imports `globals.css`, mounts `StoreProvider`, then mounts `VideoIntroOverlay` before `{children}`. Metadata title is Trinity Christian Gift Shop and description is Gifts With Meaning.
- Store layout: There is no separate `app/(store)/layout.tsx`; each storefront page composes `SiteHeader` and `SiteFooter` directly. The route group only organizes URLs.
- Admin layout: `/app/admin/layout.tsx` wraps children with `AdminGuard`, renders fixed desktop sidebar links, mobile nav, and width-safe admin main content. Desktop sidebar is hidden below `lg`; mobile nav is hidden at `lg` and sticky at top.
- Header: `SiteHeader` is a sticky storefront header with brand image, navigation, mobile menu, search, gift-list/cart counters.
- Footer: `SiteFooter` is shared page-local footer with logo and links; it currently has no dynamic settings/contact data.
- Mobile navigation: Store menu is inside `SiteHeader`; admin menu is `AdminMobileNav`. Admin desktop and mobile link lists are not identical: desktop includes Events, while the mobile list currently omits Events.
- Intro video: Because it is mounted in root layout, it currently affects admin and storefront unless its display mode prevents it; V2 explicitly calls for admin-specific behavior.

## 13. Environment Variables

Names found in code or the smoke test; secret values are intentionally omitted:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `NEXT_PUBLIC_SHOW_INTRO_MODE`
- `TEST_BASE_URL` (smoke test only)

There is no inspected `.env.local` value file. Actual values and deployment environment are Unknown.

## 14. Important Assets

- `/public/brand/TRINTY LOGO.png` - primary raster Trinity logo used by header/footer.
- `/public/brand/trinity-logo.svg` - SVG logo asset; runtime usage not fully established.
- `/public/brand/trinity-mark.svg` - SVG mark asset; runtime usage not fully established.
- `/public/images/Asset 1.png` - cross/intro play control image used by `VideoIntroOverlay`.
- `/public/images/cross-pattern.png` - global body/pattern background.
- `/public/video/Hero_Vid.mp4` - actual intro video source used by `VideoIntroOverlay`.
- `/public/video/PUT-HERO-VIDEO-HERE.txt` - placeholder/documentation file; README refers to `hero.mp4`, but current code uses `Hero_Vid.mp4`.
- `/web tr.png` - root-level image not found in runtime references.
- Product and occasion seed images are external Unsplash URLs in `supabase/seed.sql`; remote loading is allowed by `next.config.ts`.
- No font files or icon image folder were found; Lucide React supplies icons.

## 15. Data Flow

### Product creation and display

```text
Admin Products
  -> /api/admin/products
  -> Supabase products
  -> optional /api/admin/products/[id]/images
  -> Storage trinity-media + product_images
  -> lib/catalog.ts
  -> storefront product card/detail
  -> ProductGallery / ProductActions
```

### Order checkout

```text
StoreProvider cart/localStorage
  -> /checkout form
  -> /api/orders
  -> service-role create_checkout_order RPC
  -> customers + orders + order_items
  -> products stock decrement
  -> checkout success/sessionStorage
  -> Admin Orders
```

### Request/WhatsApp flow

```text
Contact, Gift List, or WhatsAppCheckout form
  -> /api/requests
  -> service-role customers + requests + optional request_items
  -> Admin Requests / Gift Finder Requests
  -> optional WhatsApp wa.me redirect
```

### Wishlist/gift-list flow

```text
ProductCard/AddGiftButton/ProductActions
  -> StoreProvider giftList state
  -> localStorage trinity-gift-list and trinity-gift-quantities
  -> /gift-list
  -> request submission or WhatsApp
```

There is no separate persisted wishlist table or favorite API. The current local gift list is the closest implementation of wishlist behavior.

### Gift Finder flow

```text
/gift-finder
  -> /api/catalog/gift-finder
  -> gift_questions + gift_options
  -> catalog products
  -> client-side answer/product scoring
  -> optional /api/requests with request_type=gift_finder
  -> requests + customers + request_items
  -> Admin Gift Finder Requests
  -> optional admin recommendations via request_items APIs
```

### Events flow

```text
Admin Events
  -> /api/admin/events
  -> events
  -> lib/events.ts published/upcoming queries
  -> home/event listing/event detail
```

### Homepage content flow

```text
Admin Content
  -> /api/settings PATCH
  -> site_settings hero_title/hero_subtitle
  -> /api/content/public
  -> homepage hero
```

The UI displays section names but does not currently persist arbitrary `pages/page_sections` section edits.

### Media upload flow

```text
Admin Media or Product gallery
  -> upload endpoint/product image endpoint
  -> Supabase Storage trinity-media
  -> public object URL
  -> product.image_url or product_images.image_url
  -> storefront image/gallery
```

The complete metadata-table synchronization for `media` is Unknown.

## 16. Current Known Issues

These are observations from current source/SQL and existing reports; they are not fixes:

1. `VideoIntroOverlay` is mounted in the root layout and therefore can appear on admin routes. Its default mode is `every-visit` unless configured otherwise. It starts only after a user click, despite the V2 wording referring to autoplay.
2. The header logo uses a normal `Link` to `/`; it does not perform a universal hard refresh, and clicking it navigates rather than explicitly refreshing.
3. Desktop admin active link behavior relies on `aria-current`, but the layout does not visibly set `aria-current` on its links; active styling therefore may not be distinct/persistent.
4. The admin desktop and mobile navigation lists differ; mobile currently omits Events.
5. The dashboard may still contain the V2-requested Manage store button; current code was not changed.
6. Product `is_featured` is mapped to `featured` for UI, but a Featured badge on the live detail page is a V2 requirement and is not guaranteed by current page/component behavior.
7. Product status saving has a reported Gateway Timeout risk; exact cause is not established by static inspection.
8. Occasions currently accept/store `image_url`; direct upload is not the current occasion contract.
9. Settings has WhatsApp configuration only; there is no user management, password creation, workspace role assignment, or contact-details editor.
10. Homepage section rows in Admin Content are display-only in the inspected page; only hero title/subtitle are saved.
11. The order status schema uses `processing`, `shipped`, `delivered`, and `cancelled`, while V2 requests Pending, Contacted, Confirmed, Preparing, Completed, Canceled.
12. Customer admin API is GET-only; automatic merge, delete, join-date/past-request/total-order profile details are not implemented by the current API.
13. Gift list/wishlist is browser-local; there is no favorite field, wishlist table, or wishlist API. The V2 requirement that the wishlist page show only favorites needs a defined persistence/UX decision.
14. Footer FAQ and Shipping & Returns links both point to `/contact`; separate public pages do not exist.
15. `/journal/[slug]` always returns `notFound()`; there is no journal content table/API.
16. `lib/catalog.ts` returns empty arrays/null on configuration or query failures, which can make an outage look like an empty catalog.
17. Gift Finder client matching is position-sensitive and current seed data contains four questions; any expected fifth preference step is not guaranteed.
18. `request_recommendations` exists in SQL, but current recommendation API code uses `request_items`, indicating legacy/overlapping designs.
19. Base schema and migrations overlap. Actual production migration order/state is Unknown.
20. README says to place `public/video/hero.mp4`, while current source uses `/public/video/Hero_Vid.mp4`.
21. Existing QA reports mention historical catalog, Gift Finder, video, footer, accessibility, and mobile-search issues. These reports are historical evidence and were not treated as current runtime test results.

## 17. Version 2 Change Impact Map

| Requested V2 feature | Likely files | API routes | Database tables | Components |
|----------------------|--------------|------------|-----------------|------------|
| Intro: disable video on admin | `/app/layout.tsx`, `/app/admin/layout.tsx`, `/components/video-intro-overlay.tsx`, `/lib/intro-config.ts` | None expected | None | `VideoIntroOverlay`, root/admin layouts |
| Intro: minimize storefront video and keep logo visible | `/app/globals.css`, `/components/video-intro-overlay.tsx`, possibly home page | None | None | `VideoIntroOverlay`, header/logo assets |
| Logo click universally refreshes instead of retriggering intro | `/components/site-header.tsx`, `/components/video-intro-overlay.tsx` | None | None | `SiteHeader`, `VideoIntroOverlay`, `StoreProvider` only if state reset matters |
| Admin active sidebar color/section persistence | `/app/admin/layout.tsx`, `/app/globals.css`, possibly `admin-mobile-nav.tsx` | None | None | `AdminMobileNav` |
| Remove dashboard Manage store button | `/app/admin/page.tsx` | None | None | None or dashboard-local |
| Fix product status Gateway Timeout | `/app/admin/products/page.tsx`, `/app/api/admin/products/route.ts`, `/app/api/admin/products/[id]/route.ts`, possibly `/lib/admin.ts` | `/api/admin/products`, `/api/admin/products/[id]` | `products`, possibly `product_images` | Product admin page |
| Featured badge on live product page | `/components/product-card.tsx`, `/app/(store)/products/[slug]/page.tsx`, possibly `/app/(store)/page.tsx` | Existing catalog reads | `products.is_featured` | `ProductCard`, product detail |
| Occasion image direct upload | `/app/admin/occasions/page.tsx`, `/app/api/admin/occasions/route.ts`, `/app/api/admin/occasions/[id]/route.ts`, `/app/api/admin/upload/route.ts`, `/app/globals.css` if needed | Occasion APIs and `/api/admin/upload` | `occasions`, Storage objects | Admin occasion form; no dedicated upload component |
| User management in Settings with email/password and Editor/Viewer roles | `/app/admin/settings/page.tsx`, new admin API route(s), `/lib/admin.ts`, `/components/admin-guard.tsx`, Supabase SQL/migrations | New user-management API; possibly Supabase Auth Admin API | `admin_users`, Supabase `auth.users` | Settings UI, AdminGuard |
| Homepage editor click states | `/app/admin/content/page.tsx`, likely homepage page file, `/app/api/settings/route.ts`, `/app/api/content/public/route.ts` | Settings/content APIs | `site_settings`; possibly `pages`, `page_sections` | Content editor and homepage section controls |
| Order status options | `/app/admin/orders/page.tsx`, `/app/api/admin/orders/[id]/route.ts`, checkout/status-related page code, migrations | `/api/admin/orders/[id]` | `orders.status`, possibly requests status | Admin orders UI |
| Customer merge by email/phone and profile metrics/delete | `/app/admin/customers/page.tsx`, `/app/api/admin/customers/route.ts`, new customer detail/delete/merge handlers, possibly `/app/api/requests/route.ts`, `/app/api/orders/route.ts` | Existing customers route plus new PATCH/DELETE/merge routes | `customers`, `requests`, `orders`, `order_items`, `request_items` | Customer admin page |
| Wishlist heart toggle and favorites-only page | `/components/add-gift-button.tsx`, `/components/product-card.tsx`, `/components/store-provider.tsx`, `/app/(store)/gift-list/page.tsx`, possibly `site-header.tsx` | None currently; new API only if server persistence selected | None currently; likely new table or localStorage-only design | AddGiftButton, ProductCard, StoreProvider |
| Checkout text white and hover effect | `/app/(store)/checkout/page.tsx`, `/components/whatsapp-checkout.tsx`, `/app/globals.css` if shared class | None | None | Checkout controls/WhatsAppCheckout |
| Shipping & Returns link | `/components/site-footer.tsx`, likely new public page if desired | New content API only if dynamic | Possibly `pages/page_sections`; currently none | SiteFooter |
| FAQ link | `/components/site-footer.tsx`, likely new public page if desired | New content API only if dynamic | Possibly `pages/page_sections`; currently none | SiteFooter |
| Functional Contact page/sidebar | `/app/(store)/contact/page.tsx`, `/components/site-footer.tsx`, `/app/api/requests/route.ts` | `/api/requests`, possibly `/api/settings/public` | `requests`, `customers`, `site_settings` | Contact page, `WhatsAppCheckout` if reused |
| Editable phone/contact details from Admin | `/app/admin/settings/page.tsx`, `/app/api/settings/route.ts`, `/app/api/settings/public/route.ts`, contact/footer pages | Settings public/admin APIs | `site_settings` | Settings, SiteFooter, Contact |

The V2 impact map identifies likely owners, not changes already made. The actual implementation should first verify current file contents and the live schema/migration state.

## 18. Dependency Inventory

| Package | Version in `package.json` | Use |
|---------|---------------------------|-----|
| `next` | `^16.0.1` | App Router framework, pages, API route handlers, image/link/navigation utilities. |
| `react` | `^19.2.0` | UI/runtime and client state/hooks. |
| `react-dom` | `^19.2.0` | React DOM rendering. |
| `@supabase/supabase-js` | `^2.57.0` | Supabase database, Auth, Storage, RPC clients. |
| `@supabase/ssr` | `^0.7.0` | Cookie-aware server/browser Supabase client support. |
| `lucide-react` | `^0.468.0` | UI icons. |
| `motion` | `^12.23.24` | Animation dependency; direct runtime usage should be verified before relying on it. |
| `zod` | `^4.1.12` | Validation dependency; direct usage in the inspected application surface is not established. |
| `tailwindcss` | `^4.3.3` | Utility CSS system. |
| `@tailwindcss/postcss` | `^4.3.3` | Tailwind/PostCSS plugin. |
| `postcss` | `^8.5.28` | CSS processing. |
| `typescript` | `^5.9.3` | Type checking/transpilation. |
| `eslint` | `^9.39.0` | Linting. |
| `eslint-config-next` | `^16.0.1` | Next-specific ESLint rules. |
| `@types/node` | `^22.15.0` | Node types. |
| `@types/react` | `^19.1.16` | React types. |
| `@types/react-dom` | `^19.1.9` | React DOM types. |
| `array-includes` | `^3.2.0` | Dev dependency; direct app usage Unknown. |
| `es-abstract` | `^1.24.2` | Dev dependency; direct app usage Unknown. |

Scripts: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`, and `npm test` (which runs `node smoke-test.mjs`). No lockfile/package manager can be confirmed from the inspected root inventory.

## 19. Critical Architecture Notes

1. Read the repository `AGENTS.md` and the relevant installed Next.js docs before changing Next.js code; this repository explicitly warns that its Next version has breaking conventions.
2. The root layout mounts both `StoreProvider` and the intro overlay globally. A change there affects every route, including admin.
3. There is no store layout file. Store pages compose header/footer individually, so global storefront changes may need to be applied across page files or shared components.
4. Admin protection has two layers: client `AdminGuard` for pages and server role checks for APIs. Do not rely on the client guard as API authorization.
5. `SUPABASE_SERVICE_ROLE_KEY` is server-only. Do not import service-role helpers into client components or expose the value.
6. Public catalog reads rely on RLS and `is_published`. Product detail and gallery behavior depends on `product_images` migration being applied.
7. Product UI names do not exactly match DB names: `is_featured` maps to `featured`, `image_url` maps to `image`, and `gift_for` maps to `giftFor`.
8. Cart/gift-list state is localStorage-only and initially hydrates in `useEffect`; avoid assuming it exists during server rendering.
9. Checkout uses a service-role RPC that locks/validates products and decrements stock. Do not replace it with an unvalidated client-side insert.
10. Request creation and checkout create customer rows; current code does not deduplicate customers. V2 customer merging must consider both flows and existing relations.
11. Storage object URLs and `product_images` rows are separate. Uploading a file does not automatically imply a gallery row unless the calling API does both.
12. `site_settings` is currently the dynamic content convention for hero/WhatsApp settings. The `pages` and `page_sections` tables are present but not wired into the current editor.
13. API role allowlists and DB RLS are distinct enforcement layers. Keep both aligned when adding a role or new route.
14. Migrations are not a clean single linear design: repair files and duplicated event files exist. Confirm live schema before changing SQL or relying on a new column/table.
15. Do not globally change width/overflow/video rules without checking the fixed admin sidebar, intro overlay, product gallery, mobile layouts, and body scroll lock.
16. Preserve public asset filename casing unless all references are updated; the current video is `Hero_Vid.mp4` and the primary logo is `TRINTY LOGO.png`.
17. No API route for user management, customer delete/merge, favorites, FAQ, Shipping & Returns, or general contact settings currently exists. Those require intentional new contracts rather than assuming an existing endpoint.
18. Current order statuses in SQL are not the V2 business statuses. A status migration and compatibility strategy may be needed before UI-only changes.

## 20. Final Verification

### Files inspected

The inventory was based on inspection of:

- Root configuration and reports: `AGENTS.md`, `CLAUDE.md`, `README.md`, `package.json`, `next.config.ts`, `tsconfig.json`, `next-env.d.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `.env.example`, `.gitignore`, `smoke-test.mjs`.
- All files under `app/`, including all storefront pages, admin pages, layouts, global CSS, and API route handlers listed in Sections 2, 3, 4, 5, and 7.
- All files under `components/` and `lib/` listed in Sections 3 and 6.
- All files under `public/` listed in Section 14.
- `supabase/schema.sql`, `supabase/seed.sql`, and every SQL file under `supabase/migrations/` listed in Sections 3 and 8.
- Existing QA/implementation/audit artifacts were used only as historical context where relevant; their claims were not treated as current runtime verification.

### Information that could not be determined

- Deployment platform and production URL.
- Package manager and lockfile state from the inspected source inventory.
- Actual environment variable values.
- Which SQL migrations have been applied to the live Supabase project and in what order.
- Live RLS policies if they differ from repository SQL.
- Supabase Auth provider settings, email delivery settings, and production user list.
- Exact production Storage contents and policy state.
- Whether external seed image URLs remain available.
- Full intended behavior of `pages`, `page_sections`, `gift_rules`, and `media`, which have schema definitions but limited/unknown runtime usage.
- Exact cause of the reported product-status Gateway Timeout.
- Whether some historical QA issues have already been corrected outside the current repository state.

### High-risk files

- `/app/layout.tsx` and `/components/video-intro-overlay.tsx` - global intro/body-scroll behavior.
- `/app/globals.css` - global width, overflow, video, admin, and responsive rules.
- `/app/admin/layout.tsx`, `/components/admin-guard.tsx`, `/components/admin-mobile-nav.tsx` - every admin screen and authorization presentation.
- `/components/store-provider.tsx` - cart/gift-list state used across storefront pages.
- `/lib/admin.ts` and all `/app/api/admin/**/route.ts` files - server authorization and data mutation.
- `/app/api/orders/route.ts` and `supabase/migrations/20260911_orders_checkout.sql` - checkout transaction, stock, and order creation.
- `/app/api/requests/route.ts` - customer/request creation used by contact, Gift Finder, gift list, and WhatsApp flow.
- `/app/admin/products/page.tsx` and product image API - product and media CRUD.
- `/app/admin/content/page.tsx`, `/app/api/settings/route.ts`, `/app/api/content/public/route.ts` - homepage content path.
- `/components/site-header.tsx` and `/components/site-footer.tsx` - global storefront navigation and support links.
- `/supabase/schema.sql` and all repair/order/event/gallery migrations - database/RLS/storage architecture.

Only this documentation file was created for the requested inventory. No application source, configuration, asset, SQL, or existing documentation file was modified by this inventory task.
