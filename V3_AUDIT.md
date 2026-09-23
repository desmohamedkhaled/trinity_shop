# Trinity Christian Gift Shop — V3 Audit

## 1. Executive Summary

This repository already contains the core V1/V2 storefront and admin foundation: shop/catalog, product details, occasions, events, admin CRUD, checkout flow, gift list and gift finder experiences, permissions, and Supabase-backed storage and RBAC scaffolding. The current implementation is mature in several areas, but the V3 audit shows a clear split:

- The storefront and admin experience already include many warm neutral design elements, but they still use blue as a primary accent in multiple places, so a full V3 brown/beige conversion is not yet complete.
- Mobile category navigation exists in concept but is not implemented as a V3-style horizontal touch navigation; it currently wraps on smaller screens.
- Checkout order summary is already present and functional at the cart/checkout UI level.
- The highest-priority bug is the checkout subtotal issue in the SQL RPC: `subtotal` is used both as a PL/pgSQL variable and as the `public.orders.subtotal` field, which makes the update statement ambiguous.
- The major V3 gaps are the admin products grid redesign and the missing occasion-based filtering in admin products/inventory.
- The remaining major V3 work is concentrated in admin UX and the product/occasion controls rather than in core catalog or order processing.

## 2. V3 Requirement Status

| V3 Feature | Status | Existing Implementation | Files | DB/API | Required Future Work | Risk |
|---|---|---|---|---|---|---|
| V3.1 Global Brown/Beige Visual System | 🟡 PARTIAL | Warm beige/ivory palette exists in public storefront with blue accents still active in CTAs and admin shells | app/(store)/page.tsx, app/(store)/shop/page.tsx, app/admin/page.tsx, components/site-header.tsx, components/product-card.tsx | site_settings, product data, no dedicated visual theme table | Complete brown/beige visual conversion where required; reduce blue usage in active states and admin surfaces | Medium |
| V3.2 Mobile Category Navigation | 🟡 PARTIAL | Category chips exist and remain active, but current mobile layout wraps instead of using a touch-friendly horizontal scroller | app/(store)/shop/page.tsx, components/site-header.tsx | Public catalog query | Replace wrap-based category bar with V3 mobile horizontal nav while preserving desktop behavior | Medium |
| V3.3 Checkout Order Summary | ✅ EXISTING | Cart and checkout summary already render item image, name, price, quantity, and totals | app/(store)/cart/page.tsx, app/(store)/checkout/page.tsx | /api/orders, create_checkout_order | None required in current project; validate against PDF for any visual refinement only | Low |
| V3.4 Checkout subtotal Bug | ⚠️ BROKEN | SQL RPC calculates subtotal and then updates orders using `subtotal = subtotal` | app/api/orders/route.ts, supabase/migrations/20260911_orders_checkout.sql, 20260911_v1_schema_repair.sql, 20260911_live_production_repair.sql, 20260916_orders_customers_v2.sql | public.create_checkout_order, public.orders, public.order_items | Correct the SQL variable/column conflict and confirm the final total values | High |
| V3.5 Admin Dashboard Visual Redesign | 🟡 PARTIAL | Dashboard already has card-based stats and warm neutral styling, but still uses blue accents and functional table/list patterns rather than a full V3 redesign | app/admin/page.tsx | /api/admin/stats, /api/admin/products, /api/admin/requests | Redesign admin shell, stat blocks, empty states, and filters to the V3 brown/beige directional style | Medium |
| V3.6 Products Grid | 🔴 MISSING | Admin products page is a CRUD table with modal editing; no card grid or product board layout exists | app/admin/products/page.tsx | /api/admin/products, /api/admin/products/[id], products, product_images | Build full admin products grid layout, statuses, filters, and card actions per V3 | High |
| V3.7 Products & Inventory Occasion Filter | 🔴 MISSING | Product form supports occasion selections, but no admin product/inventory filtering by occasion exists | app/admin/products/page.tsx, app/admin/inventory/page.tsx, lib/data.ts, lib/catalog.ts | products.occasion, occasions table, /api/admin/occasions | Add occasion filters to products and inventory, including `All Occasions` and specific examples like Wedding | High |
| V3.8 Occasions | ✅ EXISTING | Admin CRUD supports image upload to storage, stored as `image_url`, and the storefront reads it into occasion cards | app/admin/occasions/page.tsx, app/(store)/occasions/page.tsx, app/(store)/occasions/[slug]/page.tsx, components/occasion-card.tsx | public.occasions, storage bucket `trinity-media`, /api/admin/upload | None required unless V3 adds visual design adjustments | Low |
| V3.9 Events | ✅ EXISTING | Event page has a working admin table and public event cards with image, date, place, and status | app/admin/events/page.tsx, app/(store)/events/page.tsx, components/event-card.tsx | public.events, /api/admin/events | None required unless design polish is requested | Low |
| V3.10 View All Gifts Performance | ⚠️ BROKEN | View All Gifts loads the entire full catalog on /shop; no pagination or loading optimization; performance likely feels slow or hangs with large lists | app/(store)/page.tsx, app/(store)/shop/page.tsx, lib/catalog.ts, components/product-card.tsx | /api/catalog/products, public.products, product_images | Separate large catalog handling, reduce server work, and/or paginate or lazy-load | High |
| V3.11 Gift Lists | ✅ EXISTING | Gift list exists in storefront local state and admin DB records; add/remove patterns and admin views are present | app/(store)/gift-list/page.tsx, components/store-provider.tsx, app/admin/gift-lists/page.tsx, app/api/admin/gift-lists/route.ts | public.gift_lists, public.gift_list_items, customers | None required at the feature level; only confirm whether V3 expects a persistent user-linked version | Medium |
| V3.12 Gift Finder | ✅ EXISTING | Full question flow, matching logic, result cards, and admin management already exist | app/(store)/gift-finder/page.tsx, app/api/catalog/gift-finder/route.ts, app/admin/gift-finder/page.tsx, supabase/seed.sql | public.gift_questions, public.gift_options, public.products, /api/requests | Only design or content tweaks if PDF demands alternate presentation | Medium |

## 3. Detailed Audit

### V3.1 — Global Brown/Beige Visual System

Status: 🟡 PARTIAL

Current implementation:
The project uses a warm, beige/ivory foundation in many public storefront sections (`#fffaf3`, `#f3e9dc`, `#eadfce`, and neutral off-white surfaces). Several public pages also use a premium brown accent, such as `#b48d55`. However, the site still relies on blue as a primary action and link color (`#083b68`, `#1267a8`) across key UI elements, especially storefront CTAs and admin surfaces. This is not a full brown/beige-only system and is not consistently applied everywhere.

Relevant files:
- app/(store)/page.tsx
- app/(store)/shop/page.tsx
- app/admin/page.tsx
- components/site-header.tsx
- components/product-card.tsx
- app/(store)/cart/page.tsx

Database/API:
- No theme table or visual settings model exists for a V3 design system override.
- The project is using direct CSS classes and hardcoded color values in component markup.

What V3 requires:
- Strong, consistent brown/beige visual direction in the relevant storefront and admin areas.
- Blue to be reduced or used only where it genuinely remains necessary.
- Visual identity should be applied consistently to active states, hover states, category states, buttons, cards, and backgrounds.

What is already complete:
- The foundation palette is warm and premium.
- Brown/gold accent usage is already present in heading and eyebrow text.

What remains:
- Convert remaining blue-primary actions and active states into the V3 palette where the PDF requires it.
- Harmonize blue usage in admin and storefront, rather than mixed beige/blue styling.

Regression risks:
- A broad CSS or class rewrite would affect admin actions, product cards, CTAs, and other shared UI blocks.

### V3.2 — Mobile Category Navigation

Status: 🟡 PARTIAL

Current implementation:
The store category nav exists as a set of pills rendered with `flex flex-wrap gap-2` in app/(store)/shop/page.tsx. Active states are clearly visible and desktop behavior is preserved. On mobile, the pills wrap instead of remaining in a clear horizontal scrollable rail, which does not match a V3 touch-optimized mobile category nav.

Relevant files:
- app/(store)/shop/page.tsx
- components/site-header.tsx

Database/API:
- None specific to mobile navigation; category data is built directly from product `category` values.

What V3 requires:
- Horizontal scrolling or a dedicated touch-friendly row on mobile.
- Clear active category styling.
- No wrapping on narrow screens.
- Correct spacing and preserved desktop UX.

What is already complete:
- Category values are computed and active state logic is present.
- Desktop category rows exist and work.

What remains:
- Convert the mobile category layout to a dedicated horizontal slide/swipe-friendly nav.

Regression risks:
- Category bar behavior is tied to a lightweight query-string based filter; changing layout should not break desktop routing.

### V3.3 — Checkout Order Summary

Status: ✅ EXISTING

Current implementation:
The checkout flow already includes the order summary. In app/(store)/checkout/page.tsx, the summary renders the order item list with quantity and totals, and the cart item view in app/(store)/cart/page.tsx includes product image, name, price, and quantity selectors. The checkout API then builds an order. This satisfies the requirement that each product in the summary is visible with image, name, price, and quantity where applicable.

Relevant files:
- app/(store)/cart/page.tsx
- app/(store)/checkout/page.tsx
- app/api/orders/route.ts

Database/API:
- /api/orders
- public.create_checkout_order
- public.orders and public.order_items

What V3 requires:
- Each line item should show product image, product name, price, and quantity.

What is already complete:
- This is already implemented in the current code and likely matches the V3 expectation as a functional summary block.

What remains:
- Possibly only a visual refinement if the V3 PDF calls for a specific styling treatment.

Regression risks:
- Low, because the product list summary is based on the persisted cart state and the data payload sent to the API.

### V3.4 — Checkout subtotal Bug

Status: ⚠️ BROKEN

Current implementation:
The issue originates in the SQL RPC used by the app. The checkout API in app/api/orders/route.ts calls `supabase.rpc("create_checkout_order", { customer, items })`. The SQL function is created in multiple migrations: `supabase/migrations/20260911_orders_checkout.sql`, `supabase/migrations/20260911_v1_schema_repair.sql`, `supabase/migrations/20260911_live_production_repair.sql`, and `supabase/migrations/20260916_orders_customers_v2.sql`.

The direct problem is the assignment pattern inside PL/pgSQL:

- `subtotal numeric(10,2) := 0;`
- `update public.orders set subtotal = subtotal, total = subtotal, updated_at = now() where id = order_id`

In PostgreSQL, this is ambiguous because the column name `subtotal` and the PL/pgSQL variable `subtotal` share the same identifier. The SQL engine cannot reliably distinguish the local variable from the table column inside the `SET` clause without qualification or renaming.

Relevant files:
- app/api/orders/route.ts
- supabase/migrations/20260911_orders_checkout.sql
- supabase/migrations/20260911_v1_schema_repair.sql
- supabase/migrations/20260911_live_production_repair.sql
- supabase/migrations/20260916_orders_customers_v2.sql

Database/API:
- public.create_checkout_order(customer jsonb, items jsonb)
- public.orders
- public.order_items

Why it is ambiguous:
- The variable and the table column share the same name.
- Postgres resolves the update target and the local variable in the same scope without differentiation in that statement.

What would likely need to change:
- Rename the PL/pgSQL variable to something like `order_subtotal` or `running_total`.
- Or qualify the target column explicitly (for example, `public.orders.subtotal` in the assignment expression, if the statement is rewritten in a safe form).
- Confirm whether the intended calculation is the same as the cart subtotal or a different order-level total depending on discounts/shipping.

This is a database-side bug, not a frontend bug.

### V3.5 — Admin Dashboard Visual Redesign

Status: 🟡 PARTIAL

Current implementation:
The admin dashboard in app/admin/page.tsx already includes a set of stat cards, warm accent colors, and a clean card layout. It uses a light neutral background with cream/beige panels and some blue accents, particularly in product and action states. The page includes request counts, product counts, customer counts, and gift list counts; there are filters and refresh logic. However, it is not yet a fully V3-consistent brown/beige redesign and still uses blue in several important UI elements.

Relevant files:
- app/admin/page.tsx
- app/admin/layout.tsx
- lib/admin.ts

Database/API:
- /api/admin/stats
- /api/admin/products
- /api/admin/requests

What V3 requires:
- A clearly redesigned admin dashboard according to the V3 visual direction.
- Stronger premium, warm, meaningful-moment visual treatment.
- Consistent card styling, empty state patterns, filters, and button treatments.

What is already complete:
- The structure is present and data loads correctly.
- The dashboard already has the right content blocks and a warm neutral base.

What remains:
- Full alignment with the specific V3 brown/beige visual system, especially for admin surfaces and active states.

Regression risks:
- Moderate; changing dashboard styling may affect admin workflows and permission gating if the page structure is altered too heavily.

### V3.6 — Products Grid

Status: 🔴 MISSING

Current implementation:
The admin products page in app/admin/products/page.tsx is a CRUD table with modal editing and does not implement a V3 product grid or card board. Product records are loaded, edited, and saved from a table-based list with supporting forms; there are no card-based product tiles, no grid board layout, and no grid-driven status/action area.

Relevant files:
- app/admin/products/page.tsx
- app/api/admin/products/route.ts
- app/api/admin/products/[id]/route.ts
- lib/data.ts

Database/API:
- public.products
- public.product_images
- /api/admin/products
- /api/admin/upload

What V3 requires:
- An admin product management grid or card-style layout with product image, name, price, status, and edit action, plus supporting filters and states.

What is already complete:
- CRUD functionality exists.
- Product data, gallery, metadata, and publication state are already present.

What remains:
- Replace the table-heavy management pattern with the V3 product grid design.

Regression risks:
- High: product management is strongly tied to the existing CRUD and API contracts; a visual redesign alone is manageable, but a grid layout will need careful compatibility with current editing flows.

### V3.7 — Products & Inventory Occasion Filter

Status: 🔴 MISSING

Current implementation:
The product form includes an occasion multi-select (`occasionOptions` in app/admin/products/page.tsx) and the product schema uses `occasion text[]` in lib/data.ts and in the database migrations. That relationship is present and can be saved on the product record. However, the admin product list and the inventory screen do not expose an occasion filter UI. Inventory in app/admin/inventory/page.tsx only filters by stock (`all`, `out`, `low`, `in`).

Relevant files:
- app/admin/products/page.tsx
- app/admin/inventory/page.tsx
- lib/data.ts
- lib/catalog.ts
- supabase/migrations/20260911_add_product_metadata.sql

Database/API:
- public.products.occasion
- public.occasions
- /api/admin/occasions

What V3 requires:
- Occasion filtering at the admin product and inventory levels.
- Support for `All Occasions` and specific filters such as Wedding.

What is already complete:
- The data model already supports product-to-occasion values.
- Occasion rows exist in the admin and storefront pipeline.

What remains:
- Build the admin filter controls and query logic.

Regression risks:
- Medium: no filter exists today, but the underlying data model is ready, so the change is mostly UI and query logic rather than schema work.

### V3.8 — Occasions

Status: ✅ EXISTING

Current implementation:
The admin occasions page in app/admin/occasions/page.tsx allows creating and editing occasions, uploading an image via the upload endpoint, and saving the public `image_url` into the `occasions` table. The storefront reads `occasions` via lib/catalog.ts using `getOccasions()`, then renders them as `OccasionCard` items. That pipeline already exists and is functional: upload → storage → `image_url` → data fetch → public occasion card.

Relevant files:
- app/admin/occasions/page.tsx
- app/api/admin/occasions/route.ts
- app/api/admin/upload/route.ts
- app/(store)/occasions/page.tsx
- app/(store)/occasions/[slug]/page.tsx
- components/occasion-card.tsx
- lib/catalog.ts

Database/API:
- public.occasions
- storage bucket `trinity-media`
- /api/admin/upload

What V3 requires:
- The product/occasion pipeline should work from admin upload through storage, database, and storefront display.

What is already complete:
- The current project already performs this flow.

What remains:
- Possibly only styling refinements if the PDF calls for a new visual treatment.

Regression risks:
- Low, because the data lifecycle is straightforward and already implemented.

### V3.9 — Events

Status: ✅ EXISTING

Current implementation:
The admin events page in app/admin/events/page.tsx contains a working table/list interface with image, title, date, start/end time, status, featured field, and edit/delete actions. The public storefront surfaces event cards in the home page and event list page using the events data model and card component. This is already implemented and functional.

Relevant files:
- app/admin/events/page.tsx
- app/(store)/events/page.tsx
- components/event-card.tsx
- lib/events.ts

Database/API:
- public.events
- /api/admin/events

What V3 requires:
- Events management and storefront display with the expected image, date, status, and location/metadata.

What is already complete:
- The current implementation satisfies the basic event-management and display flow.

What remains:
- Only visual polish if the V3 design calls for a different card treatment.

Regression risks:
- Low: event data is already structured and managed in a stable way.

### V3.10 — View All Gifts Performance

Status: ⚠️ BROKEN

Current implementation:
The homepage has a “View all gifts” link that goes to `/shop` on app/(store)/page.tsx. The `/shop` page in app/(store)/shop/page.tsx calls `getProductsResult()` from lib/catalog.ts, which fetches the full published products set and related gallery images. There is no pagination, no partial loading, and no lazy loading. This can feel slow or appear to hang when the catalog grows because the user is effectively loading the whole product catalog and rendering all product cards at once.

Relevant files:
- app/(store)/page.tsx
- app/(store)/shop/page.tsx
- lib/catalog.ts
- components/product-card.tsx

Database/API:
- /api/catalog/products
- public.products
- public.product_images

What V3 requires:
- The “View All Gifts” flow should be performant and smooth, without hanging or over-fetching product data.

What is already complete:
- The route, link, and shop page exist and function.

What remains:
- Optimization or data-scope reduction is not yet in place.

Regression risks:
- High for the user experience, because the performance issue appears before the product grid even renders fully. The bottleneck is the full-catalog fetch and rendering path rather than a single broken page.

### V3.11 — Gift Lists

Status: ✅ EXISTING

Current implementation:
Gift Lists already exist in two forms:

1. Storefront-level gift list: client-side state using the app-wide store in components/store-provider.tsx; the public page is app/(store)/gift-list/page.tsx.
2. Admin-level stored lists: app/admin/gift-lists/page.tsx reads from the `gift_lists` and `gift_list_items` tables via app/api/admin/gift-lists/route.ts.

The database schema includes `gift_lists` and `gift_list_items` in supabase/schema.sql. There are add/remove controls in the storefront, and admin records are readable. The storefront flow is browser-local rather than server-persisted for a logged-in user, but the feature definitely exists.

Relevant files:
- app/(store)/gift-list/page.tsx
- components/store-provider.tsx
- app/admin/gift-lists/page.tsx
- app/api/admin/gift-lists/route.ts
- supabase/schema.sql

Database/API:
- public.gift_lists
- public.gift_list_items
- public.customers
- /api/requests

What V3 requires:
- A working gift list feature should exist in the project if the PDF expects it.

What is already complete:
- The feature is already present in the project.

What remains:
- Only check whether V3 expects a different persistence model or user-linked account integration not currently implemented.

Regression risks:
- Medium: the storefront version is local state rather than database-backed auth state, so there is some difference between browser-local and server-backed lists.

### V3.12 — Gift Finder

Status: ✅ EXISTING

Current implementation:
The Gift Finder already exists as a customer-facing flow at app/(store)/gift-finder/page.tsx. It loads public products and question data from app/api/catalog/gift-finder/route.ts, calculates product matching scores, and renders shortlisted products. The admin page app/admin/gift-finder/page.tsx allows management of the questions. The database schema includes `gift_questions`, `gift_options`, and the relevant request tables.

Relevant files:
- app/(store)/gift-finder/page.tsx
- app/api/catalog/gift-finder/route.ts
- app/admin/gift-finder/page.tsx
- app/admin/gift-finder/requests/page.tsx
- supabase/seed.sql
- supabase/migrations/20260911_gift_finder.sql

Database/API:
- public.gift_questions
- public.gift_options
- public.requests
- /api/requests
- /api/catalog/gift-finder

What V3 requires:
- A complete Gift Finder experience with questions, answers, scoring, and results.

What is already complete:
- The full feature is implemented in the repository.

What remains:
- Only visual or content tweaks, if the official V3 PDF explicitly requires them.

Regression risks:
- Low to medium: the logic depends on product metadata arrays like `occasion` and `gift_for` and on the actual administered question set.

## 4. Checkout subtotal Investigation

The root cause is in the SQL migration creating the checkout function, not in the application layer.

Trace:

1. The storefront checkout form posts the cart to `/api/orders`:
   - app/(store)/checkout/page.tsx
   - app/api/orders/route.ts

2. The API calls the database function:
   - `supabase.rpc("create_checkout_order", { customer, items })`

3. The relevant SQL is created in:
   - supabase/migrations/20260911_orders_checkout.sql
   - supabase/migrations/20260911_v1_schema_repair.sql
   - supabase/migrations/20260911_live_production_repair.sql
   - supabase/migrations/20260916_orders_customers_v2.sql

4. The function declares a PL/pgSQL variable named `subtotal`:
   - `subtotal numeric(10,2) := 0;`

5. Later, the function does this update:
   - `update public.orders set subtotal = subtotal, total = subtotal, updated_at = now() where id = order_id`

6. Because the variable and the column both use the same identifier, PostgreSQL treats the expression as ambiguous. The problem is not a missing field; it is a naming collision between the local variable and the table column.

7. The server-side result is that creating a checkout order can fail with a database error referencing the ambiguous column name, which matches the user-reported issue.

Likely fix area:
- Rename the PL/pgSQL variable, for example to `order_subtotal`, `running_total`, or `total_subtotal`.
- Then rewrite the update and any intermediate aggregate logic to use the renamed variable while retaining the correct `public.orders.subtotal` target.
- Verify the value is the order subtotal before any discount or shipping logic is applied.

Important note:
- The code should not blindly assume the correct fix is `orders.subtotal` in every statement. The real fix is to resolve the naming conflict while preserving the actual business logic already implied by the function.

## 5. V1/V2 Protected Features

The following features are part of the existing project foundation and should remain untouched while V3 work proceeds:

| Feature | Current implementation | Important files | V3 dependency | Risk of regression |
|---|---|---|---|---|
| Authentication | Supabase auth is present through admin access checks and server-side admin gating | lib/admin.ts, app/admin/login, app/admin/layout.tsx | None; V3 visual work must not break login flow | High if admin guard is touched |
| Admin login | Login is an active admin entry point using access checks | app/admin/login, components/admin-access.ts, lib/admin.ts | Admin roles and permission gates must stay intact | High |
| Admin roles and permissions | RBAC is defined in lib/admin.ts with role defaults and explicit permission checks | lib/admin.ts, supabase/migrations/20260915_admin_permissions.sql | V3 visual work should not alter authorization logic | High |
| Products CRUD | Product creation, editing, persistent fields, gallery uploads, stock updates | app/admin/products/page.tsx, app/api/admin/products/route.ts, app/api/admin/products/[id]/route.ts | V3 grid redesign must preserve CRUD contracts | High |
| Product gallery | Gallery upload and reorder logic exists | app/admin/products/page.tsx, app/api/admin/products/[id]/images | V3 grid work should not break gallery functions | Medium |
| Inventory | Stock tracking and low-stock filters exist | app/admin/inventory/page.tsx | V3 occasion filter will be added without removing stock logic | Medium |
| Orders | Order data and admin order review flow are in place | app/admin/orders/page.tsx, app/api/admin/orders/route.ts | V3 checkout subtotal fix should preserve order record flow | High |
| Customers | Customer records and request history exist | app/admin/customers/page.tsx, app/api/admin/customers/route.ts | V3 features should not break customer lookups | Medium |
| Wishlist | Local store-based wishlist exists and is used in the storefront | components/store-provider.tsx, app/(store)/gift-list/page.tsx | V3 work should not disturb local state logic | Medium |
| Checkout | Full checkout flow exists with cart, form, order creation, WhatsApp link, and success page | app/(store)/checkout/page.tsx, app/api/orders/route.ts, app/(store)/checkout/success/page.tsx | V3 subtotal bug fix must not alter checkout UX except the bug resolution | High |
| Occasions | Occasion data and storefront presentation exist | app/admin/occasions/page.tsx, app/(store)/occasions/page.tsx, components/occasion-card.tsx | V3 design may change the layout but not the data model | Medium |
| Events | Event admin and storefront display exist | app/admin/events/page.tsx, components/event-card.tsx | V3 work should not break published events | Medium |
| Contact | Contact form and page exist | app/(store)/contact/page.tsx | V3 scope is not about contact redesign | Low |
| FAQ | FAQ page exists | app/(store)/faq/page.tsx | Keep as is | Low |
| Shipping & Returns | Public policy page exists | app/(store)/shipping-returns/page.tsx | Do not modify unless explicitly requested | Low |
| Phone + WhatsApp settings | Public settings are fetched and used across checkout and request flows | app/api/settings/public/route.ts, app/api/settings/route.ts, components/whatsapp-checkout.tsx | V3 should not change this unless required by the PDF | Medium |
| Homepage controls | Content settings and homepage content exist | app/admin/content/page.tsx, app/api/settings/route.ts | V3 visual changes must not break homepage management | Medium |
| Intro/video behavior | Intro overlay and hero video are part of the storefront | app/(store)/page.tsx, components/video-intro-overlay.tsx | Keep stable unless explicitly modified | Medium |
| Responsive behavior | Main storefront components are already responsive in layout and cards | components/site-header.tsx, components/product-card.tsx, app/(store)/shop/page.tsx | V3 changes must preserve responsive behavior | High |

## 6. Supabase Audit

Relevant tables and structures:

- products
  - id, slug, name, description, meaning, price, category, stock, image_url, is_featured, is_published, created_at, updated_at
  - Optional metadata: occasion text[], gift_for text[]
  - Used by storefront catalog, product detail pages, gift finder, and admin product management

- occasions
  - id, slug, name, subtitle, image_url, sort_order, is_published
  - Used by the public occasion pages and the product metadata filter pipeline

- customers
  - id, name, email, phone, created_at
  - Relationship via orders and request tables

- orders
  - id, order_number, customer_id, customer_name, customer_phone, customer_email, country, governorate, city, address, subtotal, discount, shipping, total, currency, status, payment_status, admin_notes, created_at, updated_at
  - The subtotal is a key issue site for V3.4.

- order_items
  - id, order_id, product_id, product_name, product_image, unit_price, quantity, line_total
  - Linked to orders from the checkout function

- gift_lists
  - id, customer_id, status, notes, created_at

- gift_list_items
  - id, gift_list_id, product_id, quantity

- requests
  - id, customer_id, gift_list_id, occasion, status, admin_notes, notes, created_at, updated_at

- request_items
  - id, request_id, product_id, quantity, unit_price

- gift_questions and gift_options
  - Support the Gift Finder survey and answer choices

- site_settings
  - Stores public settings such as WhatsApp number and checkout enablement values

- admin_users
  - Role-based admin identity model for access control

Storage:
- Storage bucket: `trinity-media`
- Admin upload supports at least products, events, and occasions
- Occasions specifically upload through `/api/admin/upload` with the `folder` value `occasions`

RLS and permissions:
- Public read policies exist for published products and published occasions.
- Admin policies exist for products, occasions, requests, and settings.
- Sensitive tables are intentionally protected and only use service-role or admin roles for management.

Important functions/RPC:
- `public.create_checkout_order(customer jsonb, items jsonb)`
- The function currently calculates totals and updates `public.orders`, but the subtotal assignment uses the ambiguous name pattern documented above.

## 7. File Impact Map

### V3.1 Global Brown/Beige Visual System
Primary files:
- app/(store)/page.tsx
- app/(store)/shop/page.tsx
- app/admin/page.tsx
- components/site-header.tsx
- components/product-card.tsx
Database dependencies:
- None specific; visual style only
API dependencies:
- None specific
Risk:
- Medium

### V3.2 Mobile Category Navigation
Primary files:
- app/(store)/shop/page.tsx
- components/site-header.tsx
Database dependencies:
- products.category
API dependencies:
- /api/catalog/products
Risk:
- Medium

### V3.3 Checkout Order Summary
Primary files:
- app/(store)/cart/page.tsx
- app/(store)/checkout/page.tsx
Database dependencies:
- public.orders, public.order_items
API dependencies:
- /api/orders
Risk:
- Low

### V3.4 Checkout subtotal Bug
Primary files:
- app/api/orders/route.ts
- supabase/migrations/20260911_orders_checkout.sql
- supabase/migrations/20260911_v1_schema_repair.sql
- supabase/migrations/20260911_live_production_repair.sql
- supabase/migrations/20260916_orders_customers_v2.sql
Database dependencies:
- public.orders
- public.order_items
API dependencies:
- /api/orders
Risk:
- High

### V3.5 Admin Dashboard Visual Redesign
Primary files:
- app/admin/page.tsx
- app/admin/layout.tsx
Database dependencies:
- /api/admin/stats
API dependencies:
- /api/admin/products
- /api/admin/requests
Risk:
- Medium

### V3.6 Products Grid
Primary files:
- app/admin/products/page.tsx
- app/api/admin/products/route.ts
- app/api/admin/products/[id]/route.ts
Database dependencies:
- products, product_images
API dependencies:
- /api/admin/products
Risk:
- High

### V3.7 Products & Inventory Occasion Filter
Primary files:
- app/admin/products/page.tsx
- app/admin/inventory/page.tsx
- lib/catalog.ts
Database dependencies:
- products.occasion, occasions
API dependencies:
- /api/admin/occasions
Risk:
- High

### V3.8 Occasions
Primary files:
- app/admin/occasions/page.tsx
- app/(store)/occasions/page.tsx
- app/(store)/occasions/[slug]/page.tsx
- components/occasion-card.tsx
Database dependencies:
- public.occasions
- storage bucket `trinity-media`
API dependencies:
- /api/admin/upload
Risk:
- Low

### V3.9 Events
Primary files:
- app/admin/events/page.tsx
- components/event-card.tsx
- lib/events.ts
Database dependencies:
- public.events
API dependencies:
- /api/admin/events
Risk:
- Low

### V3.10 View All Gifts Performance
Primary files:
- app/(store)/page.tsx
- app/(store)/shop/page.tsx
- lib/catalog.ts
- components/product-card.tsx
Database dependencies:
- public.products, public.product_images
API dependencies:
- /api/catalog/products
Risk:
- High

### V3.11 Gift Lists
Primary files:
- app/(store)/gift-list/page.tsx
- components/store-provider.tsx
- app/admin/gift-lists/page.tsx
- app/api/admin/gift-lists/route.ts
Database dependencies:
- public.gift_lists, public.gift_list_items
API dependencies:
- /api/requests
Risk:
- Medium

### V3.12 Gift Finder
Primary files:
- app/(store)/gift-finder/page.tsx
- app/api/catalog/gift-finder/route.ts
- app/admin/gift-finder/page.tsx
- app/admin/gift-finder/requests/page.tsx
Database dependencies:
- public.gift_questions, public.gift_options, public.products
API dependencies:
- /api/requests
Risk:
- Medium

## 8. Recommended Implementation Order

V3.1
→ V3.2
→ V3.3
→ V3.4
→ V3.5
→ V3.6
→ V3.7
→ V3.8
→ V3.9
→ V3.10
→ V3.11
→ V3.12
→ V3.13
→ V3.14

Reasoning:
- V3.1 and V3.2 are front-end design and navigation foundation tasks and should be done before deeper product/admin work.
- V3.3 and V3.4 are checkout-related and must be stabilized early because checkout success and the data model are central to trust and order creation process.
- V3.5 depends on the visual foundation and is likely easier once the core palette decisions are settled.
- V3.6 and V3.7 are the biggest functional admin gaps; they depend on product and occasion data already in place and should happen before final polish.
- V3.8 and V3.9 are already implemented and only need validation or style alignment.
- V3.10 is a performance-risk area but is mostly independent from admin functions; it should be addressed once the catalog and page structure are stable.
- V3.11 and V3.12 are already implemented and can be preserved or lightly refined without affecting the more critical admin migration work.
- V3.13 and V3.14 are recommended as final QA and regression gates. They were not explicitly defined in the PDF item list, but they are standard final deployment checks after feature work is done.

## 9. Audit Conclusion

What is already implemented:
- Core storefront catalog, occasions, events, gift lists, gift finder, checkout, and admin management foundations are already in the repository.
- Occasion and events pipelines are functioning.
- Gift finder and gift list features exist and are wired into the project.
- The checkout summary and order creation flow exist.

What is partial:
- The brown/beige visual system is partially implemented but still uses blue in multiple primary surfaces.
- Mobile category navigation exists but does not yet match the V3 mobile behavior.
- The admin dashboard has a warm base but is not a full V3 redesign.

What is missing:
- The admin products grid is not present.
- Occasion-based filtering for products and inventory is not implemented.

What is broken:
- The checkout subtotal bug is a clear database-side issue in the SQL RPC update logic.
- The “View All Gifts” path likely feels slow because it loads the entire product catalog instead of a lighter, more scalable flow.

What should remain untouched:
- The existing authentication, permissions, products CRUD, inventory, orders, customers, checkout, wishlist, occasion, event, content, and settings flows should all remain stable while V3 work is planned or executed.
- No policy or admin-role changes should be made casually during the V3 redesign because they could break access control and create regression risk.
