# Trinity Christian Gift Shop QA Plan

## Project and Scope

**Project:** Trinity Christian Gift Shop V2

**Stack observed:** Next.js 16, React 19, TypeScript, Tailwind CSS, Motion, Supabase Auth/SSR, Supabase PostgreSQL, Supabase Storage, RLS. The repository has no Playwright, Cypress, Vitest, or Jest configuration. The existing automated test is a dependency-free Node smoke test (`smoke-test.mjs`).

This plan covers the public storefront, admin workspace, APIs, Supabase schema/migrations, Storage, authentication/RBAC, responsive behavior, accessibility, performance investigation, SEO, and complete V2 user journeys.

**Out of scope:** feature implementation, redesign, refactoring, production-data mutation, destructive security testing, and any unapproved application fix.

## Objectives

- Verify public routes render real content and preserve navigation.
- Verify admin authentication, permission-aware navigation, and server-side authorization.
- Verify product, gallery, occasion, event, gift finder, orders, customers, wishlist, settings, and CMS workflows.
- Detect regressions in completed V2 features.
- Exercise unauthenticated API boundaries without mutating data.
- Identify tests requiring authenticated roles, Supabase data, Storage, or real browser engines.

## Test Levels and Types

| Level/type | Coverage | Method |
|---|---|---|
| Static | Type safety and lint | `npx tsc --noEmit`, `npm run lint` |
| Build | Production compilation and route generation | `npm run build` |
| HTTP smoke | Public pages, public APIs, unauthenticated API boundaries | `npm run test:qa` |
| Existing smoke | Baseline route/API smoke | `npm test` |
| Integration | Supabase CRUD, RPCs, Storage, RLS | Requires isolated Supabase test project and credentials; not executed here |
| E2E | Authenticated admin and storefront journeys | Requires Playwright/Cypress setup and test accounts; not installed |
| Accessibility | Keyboard, semantics, focus, labels, accordion state | Browser/axe execution required; not executed here |
| Performance | LCP, CLS, INP, TTFB, image/video/network | Lighthouse/DevTools execution required; not executed here |

## Environments and Data

- Local development URL: `http://localhost:3000` when an existing server is available.
- Override with `TEST_BASE_URL`.
- Required local environment values are Supabase URL/anon key and server service key as used by the application.
- Test data must be created only in an isolated Supabase project or clearly temporary records.
- Required admin accounts for full execution: Super Admin, Admin, Product Manager, Order Manager, Content Manager, Editor, Viewer.
- Never use or report real passwords. Never use production customer/order data for destructive tests.

## Browser and Viewport Matrix

| Browser | 320x568 | 375x667 | 390x844 | 414x896 | 768x1024 | 1024x768 | 1280x720 | 1440x900 | 1920x1080 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Chromium | Not executed | Not executed | Browser spot checks only | Not executed | Not executed | Not executed | Not executed | Browser spot checks only | Not executed |
| Firefox | Not executed | Not executed | Not executed | Not executed | Not executed | Not executed | Not executed | Not executed | Not executed |
| WebKit | Not executed | Not executed | Not executed | Not executed | Not executed | Not executed | Not executed | Not executed | Not executed |

## Risks, Criteria, and Definitions

**Risks:** no browser automation dependency, no authenticated test session, external Supabase state, intro overlay intercepting clicks, Storage and RLS requiring live credentials, large gallery/performance behavior unmeasured.

**Entry criteria:** local dependencies installed, `.env.local` available for public data, local server running, isolated test data/accounts available for authenticated suites.

**Exit criteria:** static/build checks pass, smoke checks executed, all failures triaged, authenticated/database/browser gaps explicitly reported.

**Regression criteria:** any completed V2 feature route, API boundary, permission check, or persistence behavior differs from its documented expectation.

**Severity:** Critical = data/security loss or unusable core system; High = major workflow/security failure; Medium = important feature impairment with workaround; Low = cosmetic, copy, or minor usability defect.

**Priority:** P0 immediate blocker/security; P1 next release; P2 planned; P3 opportunistic.

**Defect lifecycle:** New -> Triaged -> In Progress -> Fixed -> Retest -> Closed, or Rejected/Duplicate/Deferred with rationale.

## Project Map

### Public routes

`/`, `/shop`, `/products/[slug]`, `/occasions`, `/occasions/[slug]`, `/events`, `/events/[slug]`, `/gift-finder`, `/gift-list`, `/cart`, `/checkout`, `/checkout/success`, `/contact`, `/faq`, `/shipping-returns`, `/our-story`, `/journal`, `/journal/[slug]`.

### Admin routes

`/admin/login`, `/admin`, `/admin/products`, `/admin/inventory`, `/admin/occasions`, `/admin/events`, `/admin/media`, `/admin/orders`, `/admin/customers`, `/admin/gift-lists`, `/admin/content`, `/admin/gift-finder`, `/admin/gift-finder/requests`, `/admin/gift-finder/requests/[id]`, `/admin/settings`.

### API inventory

| Area | Endpoints |
|---|---|
| Public catalog/content | `/api/catalog/products`, `/api/catalog/gift-finder`, `/api/content/public`, `/api/settings/public` |
| Public submissions | `/api/requests`, `/api/orders` |
| Auth | `/api/auth/logout` |
| Settings | `/api/settings` |
| Admin access/stats | `/api/admin/access`, `/api/admin/stats` |
| Products/media | `/api/admin/products`, `/api/admin/products/[id]`, `/api/admin/products/[id]/images`, `/api/admin/upload` |
| Occasions | `/api/admin/occasions`, `/api/admin/occasions/[id]` |
| Events | `/api/admin/events`, `/api/admin/events/[id]` |
| Requests/orders | `/api/admin/requests`, `/api/admin/requests/[id]`, `/api/admin/orders`, `/api/admin/orders/[id]` |
| Customers/gift lists | `/api/admin/customers`, `/api/admin/customers/[id]`, `/api/admin/gift-lists` |
| Gift finder | `/api/admin/gift-finder`, `/api/admin/gift-finder/requests`, `/api/admin/gift-finder/requests/[id]`, recommendations endpoints |
| Users | `/api/admin/users` |

### Major implementation surfaces

- `components/store-provider.tsx`: cart and browser-persisted Gift List/Wishlist state.
- `components/product-card.tsx`, `product-actions.tsx`, `product-gallery.tsx`: storefront product interactions.
- `components/video-intro-overlay.tsx`: intro overlay/video.
- `components/admin-guard.tsx`, `admin-access.ts`, `admin-navigation.ts`, `admin-mobile-nav.tsx`: admin auth, access state, route and navigation filtering.
- `lib/admin.ts`: roles, permission defaults, `requirePermission`, effective access.
- `lib/supabase.ts`, `components/supabase-browser.ts`: Supabase clients.
- `components/contact-experience.tsx`: Contact form and public WhatsApp/phone display.
- `components/faq-accordion.tsx`: semantic FAQ accordion.

### Database and storage

Core tables include `products`, `product_images`, `occasions`, `events`, `customers`, `requests`, `request_items`, `orders`, `order_items`, `gift_lists`, `gift_list_items`, `site_settings`, `admin_users`, permissions tables, gift finder tables, and media tables. Existing Storage uses bucket `trinity-media`; admin upload supports `products`, `events`, and `occasions` folders. Migrations include product metadata/gallery, events, orders/customers, permissions/RBAC, and admin phone.

## Test Scenarios

| Scenario ID | Module | Scenario | Preconditions | Expected result | Priority | Type |
|---|---|---|---|---|---|---|
| S-PUB-001 | Homepage | Load homepage and intro overlay | Server and public data available | Brand, hero, collection, story, footer render; intro behavior follows config | P1 | E2E |
| S-PUB-002 | Navigation/logo | Use logo, desktop nav, mobile menu, footer links | Public route loaded | Links route correctly; no overflow; logo behavior preserved | P1 | Browser |
| S-PUB-003 | Shop/listing | Load products, categories, search/filter/sort if present | Published products exist | Only published catalog data renders; filters do not leak stale data | P1 | HTTP/E2E |
| S-PUB-004 | Product detail | Open valid and missing slugs | Product exists / does not exist | Correct details/gallery/cart controls; missing product is handled | P1 | E2E |
| S-PUB-005 | Gallery | Product with 1, multiple, 22, 100+ images; missing/broken image | Isolated fixture data | Gallery remains usable, ordered, responsive, and handles failures | P1 | Integration |
| S-PUB-006 | Occasions | Open listing/detail and occasion product links | Published occasions exist | Correct image, subtitle, products, and missing-image behavior | P1 | E2E |
| S-PUB-007 | Events | Draft/published/archived, featured, dates, location, image, CTA | Event fixtures | Public visibility and event details match status/data | P1 | Integration |
| S-PUB-008 | Gift Finder | Complete questionnaire and open result | Active questions/options/rules | Valid results route to products; invalid/network states are clear | P1 | E2E |
| S-PUB-009 | Wishlist/Gift List | Toggle add/remove, refresh, open empty/non-empty page | Browser storage available | No duplicate, state persists, removal is immediate, empty CTA works | P1 | Browser |
| S-PUB-010 | Cart | Add/remove/change quantity/refresh | Published product exists | Totals and quantities remain correct; no overflow | P1 | E2E |
| S-PUB-011 | Checkout | Submit valid/invalid order | Isolated product stock and Supabase RPC | Validation works, order persists, success route works | P0 | Integration |
| S-PUB-012 | WhatsApp checkout | Enabled/disabled and configured/unconfigured number | Settings fixture | Existing behavior remains separate from phone setting | P1 | Integration |
| S-PUB-013 | Contact | Submit valid/invalid request; phone/WhatsApp cards | Public settings and request API | Labels/errors/success work; configured links use correct destinations | P1 | E2E |
| S-PUB-014 | FAQ | Open/close by mouse and keyboard | FAQ route loaded | `aria-expanded`/`aria-controls` update; answer visibility and focus work | P1 | Accessibility |
| S-PUB-015 | Shipping | Read policy and Contact CTA | Route loaded | Content is neutral, readable, and CTA routes to Contact | P2 | Browser |
| S-PUB-016 | Footer/SEO | Inspect titles/descriptions and footer routes | Public routes loaded | Metadata and links match route implementation | P2 | HTTP |
| S-ADM-001 | Login/session | Login, logout, refresh, expired session | Test admin accounts | Session redirects and access state are correct | P0 | E2E/API |
| S-ADM-002 | Dashboard/sidebar | Inspect desktop/mobile nav and direct URLs | Role accounts | Only permitted sections show; unauthorized URL remains denied | P0 | E2E/API |
| S-ADM-003 | Products | Create/edit/delete/status/featured/image | Product permission | Server validates changes; public storefront reflects published state | P1 | Integration |
| S-ADM-004 | Inventory | Adjust stock and availability | Inventory permission | Stock persists and storefront availability is correct | P1 | Integration |
| S-ADM-005 | Occasion upload | Upload PNG/JPG/WebP, preview, save, replace, invalid/oversize | Occasion/media permissions | `trinity-media/occasions` upload is authorized and URL persists | P1 | Storage |
| S-ADM-006 | Events | CRUD, status, date/time, featured, image, order | Event permissions | Public published visibility follows saved data | P1 | Integration |
| S-ADM-007 | Media | Upload/preview/delete/storage failure/unauthorized | Media permissions | MIME/size/auth checks work; no service key exposure | P1 | Storage |
| S-ADM-008 | Orders/requests | Read/update all six statuses and notes | Read/update permission | Server validates status; unauthorized update is 403 | P0 | API/E2E |
| S-ADM-009 | Customers | History, totals, requests, orders, safe delete | Customer/order/request permissions | Data visibility is permission-scoped; delete preserves related records | P0 | Integration |
| S-ADM-010 | Gift Lists | Read authorized lists and deny unauthorized access | Gift list permission | API and UI respect permission | P1 | API |
| S-ADM-011 | Homepage CMS | Hero save; Occasion and Featured Gifts controls | Content/admin access | Hero persists; other controls route to existing managers | P1 | E2E |
| S-ADM-012 | Gift Finder admin | Question/request/recommendation management | Gift finder permissions | CRUD and unauthorized paths behave correctly | P1 | Integration |
| S-ADM-013 | Settings | Phone/WhatsApp values, empty/international/invalid, persistence | Settings permission | Phone and WhatsApp remain separate; public allowlist only | P1 | API/E2E |
| S-ADM-014 | User management | Create Editor/Viewer, persistence, activation, custom permissions | Super Admin and temporary test user | Auth user created server-side; passwords never displayed; restrictions hold | P0 | Integration |
| S-ADM-015 | RBAC | Super Admin, Admin, Product Manager, Order Manager, Content Manager, Editor, Viewer | Seven role accounts | Effective permissions match role/custom grants across UI and API | P0 | API/E2E |
| S-SEC-001 | Negative inputs | Empty, long, HTML/script, SQL-like, invalid UUID/URL/MIME | Test environment | Validation rejects safely; no stored executable content | P0 | API |
| S-SEC-002 | RLS | Anonymous and role-based table/storage reads/writes | Isolated Supabase project | RLS prevents cross-user/unauthorized access | P0 | Integration |
| S-PERF-001 | Performance | Video, image-heavy gallery, Supabase calls | Lighthouse/DevTools available | Measure LCP/CLS/INP/TTFB; report findings without auto-fix | P2 | Performance |

## Detailed Test Case Register

The executable test cases below are the minimum release register. `Status`, `Actual Result`, `Evidence`, and `Bug ID` are updated in `docs/TEST-EXECUTION-REPORT.md` after execution.

| Test ID | Module | Feature | Test Case | Preconditions | Test Data | Steps | Expected Result | Priority | Severity | Type | Automation | Tool | Status | Actual Result | Evidence | Bug ID |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| TC-PUBLIC-001 | Homepage | Homepage/intro | Load homepage | Local server | None | GET `/` | 200 and expected hero/collection/story content | P1 | High | Smoke | Automated | Node fetch | PASS | 200 and homepage marker found | Console output | None |
| TC-PUBLIC-002 | Catalog | Product listing | Open `/shop` | Published product | Valid route | GET `/shop` | Product listing renders | P1 | High | Smoke | Automated | Node fetch | PASS | 200 and shop marker found | Console output | None |
| TC-PRODUCT-001 | Products | Detail/gallery | Open valid product | Published slug | Product slug | Open `/shop`, select product, verify title/price/image/gallery/cart | Data and controls match source | P1 | High | E2E | Not available | Browser | Blocked | Browser framework not installed | None | None |
| TC-PRODUCT-002 | Products | Dynamic gallery | Test 0/1/2/22/100+ images | Isolated fixtures | Image fixtures | Open detail, cycle images, resize viewport | No broken controls/overflow | P1 | High | Integration | Not available | Supabase/browser | Not executed | Fixture not available | None | None |
| TC-PRODUCT-003 | Admin Products | CRUD/status/featured | Super Admin session | Temporary product | Create/edit/delete/toggle status/featured | Server validates and public state follows | P1 | High | Integration | Not available | Browser/API | Blocked | Auth/test data required | None | None |
| TC-OCC-001 | Admin Occasions | Upload | Authorized admin uploads valid image | Admin + media permission | PNG/JPG/WebP <=8MB | Select, upload, preview, save, refresh | URL persists and public occasion displays | P1 | High | Storage | Not available | Browser/Supabase | Blocked | Auth/Storage test required | None | None |
| TC-OCC-002 | Admin Occasions | Negative upload | Authorized admin | Invalid MIME/oversize/empty | Upload each file | Server rejects and no bad URL is stored | P1 | High | Negative | Not available | API/Storage | Blocked | Fixture/auth required | None | None |
| TC-AUTH-001 | Auth | Login/logout/session | Test accounts exist | Seven roles | Login, reload, logout, revisit admin | Correct session and redirect behavior | P0 | Critical | E2E | Not available | Supabase/browser | Blocked | Credentials unavailable | None | None |
| TC-RBAC-001 | Authorization | Viewer restrictions | Viewer account | Viewer | Open direct admin URLs and call APIs | UI hides; server returns 401/403 | P0 | Critical | Security | Partial | Node/API | Blocked | Auth unavailable | None | None |
| TC-RBAC-002 | Authorization | Product Manager | Product Manager account | Role grants | Test sidebar, `/admin/settings`, product API | Only effective permissions work; forbidden API remains denied | P0 | Critical | Security | Partial | Browser/API | Blocked | Auth unavailable | None | None |
| TC-ORD-001 | Orders | Status | Authorized update role | Request/order fixture | Six valid statuses + invalid | PATCH each status, refresh | Valid statuses persist; invalid returns 400; unauthorized returns 403 | P0 | Critical | API | Not available | API/Supabase | Blocked | Isolated data required | None | None |
| TC-CUST-001 | Customers | Merge by email/phone | Request/order endpoint available | Same normalized email/phone | Submit duplicate identities | One customer reused; history retained | P0 | Critical | Integration | Not available | API/Supabase | Blocked | Isolated data required | None | None |
| TC-CUST-002 | Customers | History/delete | Customer/order/request fixtures | Temporary dummy customer | Open history, verify totals, delete with confirmation | Permission-scoped history; related records preserved | P0 | Critical | Integration | Not available | Browser/API | Blocked | Auth/data required | None | None |
| TC-WISH-001 | Wishlist | Toggle/persistence | Browser storage | Published product | Heart add, refresh, remove, open wishlist | No duplicates; removal immediate; empty state works | P1 | High | E2E | Not available | Browser | Blocked | Playwright not installed | None | None |
| TC-CHECK-001 | Checkout | Cart/order | Stock fixture | Valid customer/items | Cart -> checkout -> submit | Order and success route persist | P0 | Critical | E2E | Not available | Browser/Supabase | Blocked | Must not mutate production | None | None |
| TC-FAQ-001 | FAQ | Accordion | `/faq` loaded | None | Click and keyboard-toggle first question | Semantic state and answer visibility update | P1 | Medium | Accessibility | Browser spot check | Browser | PASS | Verified control state and 320px overflow in prior session | Browser page | None |
| TC-CONTACT-001 | Contact | Form/phone | `/contact` loaded | Existing settings | Verify labels, phone/WhatsApp links, submit validation | Existing request endpoint and links work | P1 | High | E2E | Not available | Browser/API | Partial | Route/responsive checked; submit not run | Browser page | None |
| TC-SET-001 | Settings | Phone/WhatsApp | Admin account | Temporary international phone | Save, refresh, clear, public GET | Separate settings persist; empty phone hides card | P1 | High | E2E/API | Not available | Browser/API | Blocked | Auth/test data required | None | None |
| TC-CMS-001 | CMS | Homepage click states | Authorized content admin | None | Click Hero, Shop by Occasion, Featured Gifts | Hero editor works; other controls route to managers | P1 | High | E2E | Not available | Browser | Blocked | Auth unavailable | None | None |
| TC-EVENT-001 | Events | CRUD/public | Content admin + fixtures | Draft/published/archived | Create, edit status/date/image/order, open public page | Public only shows allowed statuses/data | P1 | High | Integration | Not available | API/Supabase | Blocked | Auth/data required | None | None |
| TC-API-001 | APIs | Unauthenticated matrix | No session | GET protected endpoints | Call all protected GETs | 401/403/redirect; no sensitive data | P0 | Critical | API | Automated | Node fetch | PASS | 13/13 protected endpoints returned 401 | Console output | None |
| TC-API-002 | APIs | Public matrix | Server available | Public endpoints | Call catalog/content/settings | JSON 200 and safe allowlist | P1 | High | API | Automated | Node fetch | PASS | 4/4 public endpoints returned JSON 200 | Console output | None |
| TC-RLS-001 | Database | RLS | Isolated Supabase project | Anonymous/role clients | Read/write each sensitive table/storage object | RLS denies unauthorized operations | P0 | Critical | Security | Not available | Supabase | Not executed | Requires project credentials | None | None |
| TC-RESP-001 | Responsive | Required widths | Routes available | 320..1920 matrix | Inspect overflow, clipping, controls | No horizontal overflow and usable touch targets | P1 | Medium | Responsive | Not available | Browser | Partial | Contact/FAQ/policy spot checks only | Browser | None |
| TC-SEO-001 | SEO | Metadata | Public routes available | None | GET route titles/descriptions | Metadata matches implemented route purpose | P2 | Low | SEO | Partial | Node/browser | PARTIAL | Routes built successfully; complete metadata audit not executed | Build output | None |
| TC-PERF-001 | Performance | Core web vitals | Browser tooling available | Public pages | Run Lighthouse and inspect network/video/images | Record LCP/CLS/INP/TTFB and payloads | P2 | Medium | Performance | Not available | Lighthouse | Not executed | Lighthouse unavailable | None | None |

## Edge, Negative, and Security Cases

- Product: 0, 1, 2, 22, 100+ images; long name; empty description; missing/zero/large price; invalid/deleted/broken image; duplicate image.
- Occasion/event: missing image, invalid MIME, empty file, oversize file, event with no end time, past date, draft, archived.
- Input: empty required fields, 501+ character settings, HTML/script strings, SQL-like strings, invalid UUID/slug/URL, malformed JSON, duplicate submission, double-click, refresh during save.
- Customer/order: duplicate normalized email, duplicate normalized phone, unrelated near-match, invalid status, invalid stock, stale session.
- Auth/RBAC: anonymous, Viewer, Editor, Super Admin, direct URLs, protected GET/POST/PATCH/DELETE, expired session, disabled user.
- Settings: empty phone, international phone, invalid characters, public allowlist, WhatsApp independence.
- Network: slow response, 4xx/5xx Supabase, Storage upload failure, broken public URL.

## API Test Matrix

| API | Methods | Auth | Valid input | Invalid input | Expected status | Authorization |
|---|---|---|---|---|---|---|
| `/api/catalog/products` | GET | Public | Optional `q` | Malformed query | 200/500 | Published products only |
| `/api/catalog/gift-finder` | GET | Public | None | DB failure | 200/500 | Active public data |
| `/api/content/public` | GET | Public | None | DB failure | 200/500 | Public settings only |
| `/api/settings/public` | GET | Public | None | DB failure | 200/500 | Allowlisted keys only |
| `/api/requests` | POST | Public submission | Valid customer/items/notes | Missing fields, invalid item/quantity | 201/400/503 | Server validates and merges customer |
| `/api/orders` | POST | Public checkout | Valid customer/items | Missing fields/RPC failure | 201/400/503 | Service-side RPC |
| `/api/settings` | GET/PATCH | `settings.read/update` | Allowlisted settings | Unknown key, invalid phone/type | 200/400/401/403 | `requirePermission` |
| `/api/admin/access` | GET | Admin | Active admin | Anonymous/inactive | 200/401/403 | Current access |
| `/api/admin/products` | GET/POST | Product permissions | Valid product | Invalid slug/price/stock | 200/201/400/401/403 | Permission + server validation |
| `/api/admin/products/[id]` | PATCH/DELETE | Product permissions | Valid id/fields | Invalid id/fields | 200/400/401/403 | Permission |
| `/api/admin/products/[id]/images` | GET/POST/DELETE | Media permissions | Valid image/path | Wrong path/MIME/size | 200/400/401/403 | Permission + Storage |
| `/api/admin/upload` | GET/POST/DELETE | Media permissions | Allowed folder/image | Invalid folder/MIME/size | 200/400/401/403 | Permission + Storage |
| `/api/admin/occasions` | GET/POST | Occasion permissions | Valid fields | Invalid slug/name | 200/201/400/401/403 | Permission |
| `/api/admin/occasions/[id]` | PATCH/DELETE | Occasion permissions | Valid id/fields | Invalid id/slug | 200/400/401/403 | Permission |
| `/api/admin/events` | GET/POST/PATCH/DELETE | Event permissions | Valid event | Invalid dates/status/URL | 200/201/400/401/403 | Permission |
| `/api/admin/requests/[id]` | PATCH | `requests.update` | Six valid statuses | Invalid status/notes | 200/400/401/403 | Permission |
| `/api/admin/orders/[id]` | PATCH | `orders.update` | Six valid statuses | Invalid status | 200/400/401/403 | Permission |
| `/api/admin/customers/[id]` | DELETE | `customers.delete` | Existing id | Invalid/missing id | 200/400/401/403/404 | Permission + FK safety |
| `/api/admin/users` | GET/POST/PATCH | `users.*` and Super Admin rules | Valid Auth user/role/grants | Invalid role/email/permission | 200/201/400/401/403/409/422 | Server-side RBAC |
| `/api/admin/gift-finder*` | GET/POST/PATCH/DELETE | Gift finder permissions | Valid question/request/recommendation | Invalid ids/payload | 200/201/400/401/403 | Permission |

## Database, RLS, and Storage Checklist

- Verify foreign keys: requests/orders/gift lists -> customers with intended `SET NULL`; child items cascade/restrict as schema states.
- Verify `product_images` unique ordering/foreign key behavior and public published-gallery policy.
- Verify event/public, gift finder, admin permission, site settings, and storage policies in an isolated Supabase project.
- Verify `trinity-media` public retrieval and admin-only insert/update/delete.
- Verify `site_settings` public allowlist excludes admin-only values.
- Verify service-role key is server-only and absent from browser bundles.

## E2E Journeys

1. Homepage -> Shop -> Product -> Gallery -> Add to Cart -> Cart -> Checkout.
2. Homepage -> Occasion -> Product -> Wishlist.
3. Gift Finder -> Results -> Product -> Cart.
4. Product -> Gift List -> request submission.
5. Contact -> form validation -> request submission.
6. Checkout -> order creation -> WhatsApp when enabled.
7. Super Admin -> create product -> publish -> storefront.
8. Admin -> edit product -> storefront reflects changes.
9. Content admin -> create/publish event -> public Events.
10. Super Admin -> change phone -> Contact card/`tel:` link.

## Automation and Execution Commands

Existing:

```text
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Added QA command:

```text
npm run test:qa
```

`npm run test:qa` uses Node's built-in `fetch` only. It does not mutate data and covers public route markers, public JSON endpoints, and unauthenticated protected API behavior. Full authenticated browser/API/RLS coverage requires a test framework and isolated credentials that are not present in this repository.

## Accessibility, Performance, SEO, and Cross-Browser Plan

- Accessibility: run axe-core against public/admin routes when a browser runner is installed; manually tab through forms, dialogs, intro overlay, FAQ, mobile menu, galleries, and admin tables.
- Performance: run Lighthouse at mobile and desktop, record LCP/CLS/INP/TTFB, inspect hero video preload, Supabase requests, image sizes, and large galleries. No Lighthouse run was available in this environment.
- SEO: verify route titles/descriptions for Contact, FAQ, Shipping & Returns, product/event pages; inspect canonical/robots/sitemap only if implemented.
- Cross-browser: execute Chromium, Firefox, and WebKit with Playwright when installed. Current browser spot checks used the available integrated Chromium-like browser only.

## Final Test Summary

| Metric | Result |
|---|---:|
| Planned detailed test cases | 26 |
| Automated HTTP assertions executed | 40 |
| Automated HTTP assertions passed | 40 |
| Automated HTTP assertions failed | 0 |
| Blocked | Authenticated, Supabase integration, Storage/RLS, and browser suites |
| Not executed | Firefox/WebKit, full responsive matrix, axe, Lighthouse, performance measurements |
| Not applicable | 0 |

**Critical bugs:** 0 application defects observed  
**High bugs:** 0 application defects observed  
**Medium bugs:** 0 newly observed in this execution; prior frontend findings remain documented separately  
**Low bugs:** 1 resolved test-oracle defect (BUG-001)

**Automation coverage:** Node HTTP route/API smoke plus TypeScript, ESLint, and production build gates.  
**Manual coverage:** Limited integrated-browser spot checks documented in `docs/TEST-EXECUTION-REPORT.md`.  
**Browser coverage:** Integrated browser spot checks only; Chromium/Firefox/WebKit matrix not executed.  
**Responsive coverage:** Partial 320px/390px/1440px spot checks; required full matrix not executed.  
**Accessibility coverage:** Manual FAQ/contact checks; axe scan not executed.  
**API coverage:** Public catalog/content/settings and unauthenticated protected endpoints executed.  

**Overall project testing status:** Public HTTP and static/build checks passed. Full V2 QA remains incomplete until authenticated role tests, isolated Supabase/RLS/Storage tests, cross-browser checks, full responsive checks, accessibility scanning, and performance measurement are executed.

## Current Status Summary

This summary is finalized in `docs/TEST-EXECUTION-REPORT.md` after running the commands. No application functionality is fixed by this QA task.
