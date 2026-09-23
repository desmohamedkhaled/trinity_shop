# Frontend QA Report — Trinity

**Date:** 2026-09-12  
**Scope:** Local Next.js storefront at `http://localhost:3000`; source review; unauthenticated admin experience.  
**Method:** Browser interaction and accessibility-tree checks, direct-route HTTP checks, desktop visual inspection, console inspection, and frontend code review. No data was created, submitted, or deleted.

## Scope discovered

### Storefront pages

| Route | Result |
| --- | --- |
| `/` | Loaded; catalog-dependent sections empty because catalog calls fail. |
| `/shop` | Loaded; empty state and search no-result state verified. |
| `/products/[slug]` | Dynamic route discovered; blocked because no published product was available locally. |
| `/occasions` | Loaded; empty state verified. |
| `/occasions/[slug]` | Dynamic route discovered; blocked because no occasion was available locally. |
| `/gift-finder` | Loaded, but remained in loading state during the test. |
| `/gift-list` | Empty state verified. |
| `/cart` | Empty state verified. |
| `/checkout` | Empty-cart redirect/state verified. |
| `/checkout/success` | Direct route loaded; populated-order state blocked. |
| `/contact` | Loaded; native required-field validation verified. |
| `/our-story` | Direct route returned 200. |
| `/journal` | Direct route returned 200. |
| `/journal/[slug]` | Dynamic route discovered; blocked because no journal record was available. |

### Admin pages

`/admin`, `/admin/login`, dashboard, products, inventory, occasions, media, orders, customers, gift lists, content, gift finder, settings, and gift-finder request detail routes were discovered. Unauthenticated `/admin` redirected to `/admin/login`; authenticated page functionality was not tested because no test admin account was supplied.

### Shared/frontend features discovered

Site header and mobile menu, search, footer, cards, product zoom modal, product gallery, cart, gift list, checkout, WhatsApp request modal, contact form, Gift Finder, admin guard/nav, loading/empty/error states, and motion-based card transitions.

## Test matrix

| Feature | Test | Expected | Actual | Status | Severity |
| --- | --- | --- | --- | --- | --- |
| Route availability | Direct-load fixed storefront and login routes | 200/loadable page | 12 fixed routes returned 200 | PASS | — |
| Invalid route | Open unknown path | Clear error UI | Next 404 page rendered | PASS | — |
| Header search | Open then submit special-character query | Search UI opens; no-results state | Worked; `/shop?search=%25%25%25` displayed no-results UI | PASS | — |
| Header nav | Desktop links rendered | All primary routes available | Links present and destinations correct in AX tree | PASS | — |
| Footer | Link destinations match labels | Dedicated/help destinations | Shipping & Returns and FAQ both route to Contact | FAIL | Medium |
| Shop | Empty catalog state | Informative empty state | “No products match your search” displayed | PASS | — |
| Occasions | Empty state | Informative empty state | “No occasions available yet” displayed | PASS | — |
| Cart / gift list | Empty states | Clear CTA and no broken UI | Both states rendered with shop CTA | PASS | — |
| Contact | Required validation | Invalid blank input blocked | Browser validation focused first field | PASS | — |
| Contact accessibility | Form fields have programmatic labels | Fields announced by label | Fields exposed only as generic text fields; placeholders are not labels | FAIL | Medium |
| Gift Finder | Initial data load | Ends in flow or displays error | Spinner remained after repeated inspection | FAIL | High |
| Homepage video | Autoplay portable across browsers | Muted autoplay/fallback | `muted` is absent; browser autoplay is not dependable | FAIL | Medium |
| Homepage hero | Image fills intended visual area | No distracting gutters | Desktop screenshot showed black side gutters from `object-contain` | FAIL | Medium |
| Product gallery | 1–100 images, add-to-cart, wishlist | Dynamic interaction works | Blocked: no published product/gallery data in local environment | BLOCKED | — |
| Product modal | Keyboard dialog behavior | Escape, focus handling, semantics | No Escape handler, `role=dialog`, `aria-modal`, or focus trap | FAIL | Medium |
| Gallery mobile | Swipe main image | Touch swipe changes image | No swipe/pointer handler implemented | FAIL | Medium |
| Mobile header | Mobile search is discoverable | Search reachable from mobile UI | Search button is hidden below `sm`; menu contains no search | FAIL | Medium |
| Admin access | Anonymous visit | Redirect to sign-in | `/admin` redirected to `/admin/login` | PASS | — |
| Console | No runtime errors | Clean console | Product and occasion loads fail; image performance warning present | FAIL | High |
| Responsive/browser matrix | 320–1920 and Chrome/Firefox/Edge/Safari | Layout verified | Only desktop Chromium surface was available; other widths/browsers not available in this environment | NOT TESTED | — |

## Bugs

### BUG #001 — Gift Finder can remain indefinitely on its loading screen

**Severity:** High  
**Priority:** P1  
**Page/component:** `/gift-finder`, `GiftFinder`  
**Viewport:** Desktop Chromium

**Steps to reproduce:**

1. Open `/gift-finder` in the local environment.
2. Wait through repeated UI inspections.

**Expected:** The questionnaire, an empty state, or a recoverable error appears.  
**Actual:** “Finding gifts with meaning...” remained visible; no retry or timeout UI appeared.

**Root cause:** Initial requests have no timeout/abort strategy. The screen only exits loading when both request promises settle.  
**Recommended fix:** Add a request timeout and user-visible retry/error state; ensure a failed or stalled optional questions request cannot hold the entire page hostage.

### BUG #002 — Catalog failure empties core storefront content and logs runtime errors

**Severity:** High  
**Priority:** P1  
**Pages/components:** Home, Shop, Occasions; `lib/catalog.ts` consumers  
**Viewport:** Desktop Chromium

**Steps to reproduce:**

1. Open `/`, `/shop`, or `/occasions` locally.
2. Inspect content and console.

**Expected:** Published catalog data, or a clear error/retry state when the catalog is unavailable.  
**Actual:** Console logged “Failed to load products” and “Failed to load occasions”; Home silently rendered missing product/occasion sections and Shop treated the outage as “No products match your search.”

**Root cause:** `getProducts`/`getOccasions` return empty arrays on fetch failures, conflating outage and legitimate empty data.  
**Recommended fix:** Return a distinguishable failure result and render a retry-capable error state.

### BUG #003 — Hero video is not muted and is pillarboxed

**Severity:** Medium  
**Priority:** P2  
**Page/component:** `/`, hero `<video>`  
**Viewport:** Desktop Chromium

**Steps to reproduce:**

1. Open `/` at desktop width.

**Expected:** Reliable muted autoplay and a full-bleed hero presentation or a deliberate visual background.  
**Actual:** The video has `autoPlay`, `loop`, and `playsInline` but no `muted`; the screenshot also showed black side gutters because `object-contain` preserves the video frame inside a black section.

**Root cause:** Missing `muted` and incompatible fit/background choices.  
**Recommended fix:** Add `muted`, choose `object-cover` if cropping is acceptable, or supply a purposeful non-black background/fallback.

### BUG #004 — Contact inputs lack accessible labels; stray semicolon is rendered

**Severity:** Medium  
**Priority:** P2  
**Page/component:** `/contact`  
**Viewport:** Desktop Chromium

**Steps to reproduce:**

1. Open `/contact` with an accessibility tree/screen reader.

**Expected:** Fields are announced as Name, Phone, Email, and Message; no stray content is rendered.  
**Actual:** Inputs are exposed as generic text fields (placeholder-only), and a visible/accessible `;` appears after the footer.

**Root cause:** No `<label>`/`aria-label` association; the component return ends with a literal semicolon.  
**Recommended fix:** Add visible labels or `aria-label`s and remove the stray text node.

### BUG #005 — Footer help links are mislabeled destinations

**Severity:** Medium  
**Priority:** P2  
**Component:** `SiteFooter`  
**Viewport:** Desktop Chromium

**Steps to reproduce:**

1. Inspect/click Shipping & Returns and FAQ in the footer.

**Expected:** Dedicated relevant content or clearly labelled Contact links.  
**Actual:** Both links route to `/contact` without matching FAQ or shipping content.

**Root cause:** Placeholder hrefs retained in the shared footer.  
**Recommended fix:** Create the target content/routes or relabel/remove the links.

### BUG #006 — Product zoom modal is not keyboard-accessible

**Severity:** Medium  
**Priority:** P2  
**Component:** `ProductCard` zoom modal  
**Viewport:** All

**Steps to reproduce:**

1. Open a product card’s Zoom control when catalog data is available.
2. Press Escape or navigate with Tab.

**Expected:** Dialog semantics, focus containment/return, and Escape close.  
**Actual:** The implementation has an overlay and a close button only; it lacks dialog semantics, Escape handling, and focus management.

**Root cause:** Custom modal implementation without accessible-dialog behavior.  
**Recommended fix:** Use a tested dialog primitive or implement focus capture/restore, Escape, and `role="dialog" aria-modal="true"`.

### BUG #007 — Mobile search is unavailable below the `sm` breakpoint

**Severity:** Medium  
**Priority:** P2  
**Component:** `SiteHeader`  
**Viewport:** 320–639px (code-reviewed; viewport automation unavailable)

**Steps to reproduce:**

1. Open the header below 640px.

**Expected:** Search remains discoverable via the header or mobile menu.  
**Actual:** The search control uses `hidden sm:inline-flex`, and the mobile menu contains only navigation links.

**Root cause:** No mobile search entry point.  
**Recommended fix:** Add search to the mobile menu or expose the icon on mobile.

### BUG #008 — Gallery lacks mobile swipe and keyboard navigation

**Severity:** Medium  
**Priority:** P2  
**Component:** `ProductGallery`  
**Viewport:** Mobile/desktop (code-reviewed; runtime product data unavailable)

**Steps to reproduce:**

1. Open a multi-image product.
2. Attempt a swipe on the main image or use keyboard arrows.

**Expected:** The requested touch and keyboard gallery interactions work.  
**Actual:** Only thumbnail clicks and visible previous/next buttons are implemented; no pointer/touch or key handlers exist.

**Root cause:** Interaction support is limited to click handlers.  
**Recommended fix:** Add accessible keyboard controls and a touch-swipe interaction with movement thresholds.

### BUG #009 — Home image emits a Next.js image performance warning

**Severity:** Low  
**Priority:** P3  
**Page/component:** `/`, Trinity Story image  
**Viewport:** Desktop Chromium

**Actual:** Console warns that a `fill` image is missing `sizes`.  
**Recommended fix:** Supply an accurate responsive `sizes` value.

### BUG #010 — Corrupt localStorage can crash cart/gift-list initialization

**Severity:** Low  
**Priority:** P3  
**Component:** `StoreProvider`

**Root cause:** Four raw `JSON.parse` calls have no recovery path.  
**Recommended fix:** Parse defensively, discard invalid values, and report non-sensitive diagnostics.

## Recommended fix order

1. Restore/fix catalog connectivity and make frontend error states distinct from genuine empty states.
2. Fix the Gift Finder loading dead-end and add retry/timeout behavior.
3. Make product/gallery data available in a QA seed environment, then execute the blocked gallery, cart, wishlist, and checkout flows.
4. Correct hero video autoplay/fit and footer destination labels.
5. Address modal, form-label, mobile-search, and gallery keyboard/touch accessibility.
6. Run a visual matrix at 320, 375, 390, 414, 480, 768, 1024, 1280, 1440, and 1920px, plus Chrome/Firefox/Edge/Safari.

## Summary

| Metric | Count |
| --- | ---: |
| Frontend pages discovered | 29 (14 storefront, 15 admin/dynamic) |
| Shared feature groups discovered | 16 |
| Test cases recorded | 20 matrix rows / 54 executed assertions |
| PASS | 8 matrix rows |
| FAIL | 9 matrix rows |
| BLOCKED | 1 matrix row |
| NOT TESTED | 1 matrix row |
| High bugs | 2 |
| Medium bugs | 6 |
| Low bugs | 2 |
| Critical bugs | 0 |

The frontend is **not ready to be described as production-ready**: catalog unavailability currently removes core commerce content, and Gift Finder has a verified loading dead-end.
