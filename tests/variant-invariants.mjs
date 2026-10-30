import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/20261020000000_product_variants_stock_status.sql", import.meta.url), "utf8");
const adminProducts = await readFile(new URL("../app/api/admin/products/[id]/route.ts", import.meta.url), "utf8");
const adminProductsCreate = await readFile(new URL("../app/api/admin/products/route.ts", import.meta.url), "utf8");
const adminForm = await readFile(new URL("../app/admin/products/page.tsx", import.meta.url), "utf8");
const productCard = await readFile(new URL("../components/product-card.tsx", import.meta.url), "utf8");
const imageAvailabilityMigration = await readFile(new URL("../supabase/migrations/20261025000000_product_variant_image_availability.sql", import.meta.url), "utf8");
const imageRoute = await readFile(new URL("../app/api/admin/products/[id]/images/route.ts", import.meta.url), "utf8");
const uploadRoute = await readFile(new URL("../app/api/admin/upload/route.ts", import.meta.url), "utf8");
const catalog = await readFile(new URL("../lib/catalog.ts", import.meta.url), "utf8");
const productDetail = await readFile(new URL("../components/product-detail.tsx", import.meta.url), "utf8");
const stripeCheckout = await readFile(new URL("../app/api/stripe/create-checkout-session/route.ts", import.meta.url), "utf8");
const manualCheckout = await readFile(new URL("../app/api/orders/route.ts", import.meta.url), "utf8");
const imageUpload = await readFile(new URL("../lib/image-upload.ts", import.meta.url), "utf8");
const checkoutValidation = await readFile(new URL("../lib/checkout-validation.ts", import.meta.url), "utf8");

function section(name, callback) {
  callback();
  console.log(`PASS ${name}`);
}

section("variant price is selected server-side", () => {
  assert.match(migration, /line_total := variant_row\.price \* quantity/);
  assert.match(migration, /unit_price, quantity, line_total/);
  assert.doesNotMatch(migration, /item->>'price'/);
});

section("variant stock is locked and bounded", () => {
  assert.match(migration, /from public\.product_variants where id = selected_variant and product_id = product_row\.id for update/);
  assert.match(migration, /variant_row\.stock < quantity/);
  assert.match(migration, /check \(stock >= 0\)/);
});

section("Stripe variant reservation lifecycle is exactly once", () => {
  assert.match(migration, /update public\.product_variants set stock = stock - quantity/);
  assert.match(migration, /if item\.variant_id is not null then/);
  assert.match(migration, /update public\.product_variants set stock = stock \+ item\.quantity/);
  assert.match(migration, /stock_reservation_status = 'consumed'/);
  assert.match(migration, /stock_reservation_status <> 'reserved' then return false/);
});

section("variant edits preserve retained IDs and galleries", () => {
  assert.match(adminProducts, /from\('product_variants'\)\.select\('id'\)/);
  assert.match(adminProducts, /upsert\(variant, \{ onConflict: 'id' \}\)/);
  assert.doesNotMatch(adminProducts, /product_variants'\)\.delete\(\)\.eq\('product_id', id\)/);
  assert.match(adminProducts, /product_variants: savedVariants/);
  assert.match(adminForm, /saved\.id === id/);
});

section("variant admin input is validated and scoped", () => {
  assert.match(adminProducts, /Variant names must be unique/);
  assert.match(adminProducts, /do not belong to this product/);
});

section("admin variant form exposes the mapped fields", () => {
  for (const label of ["Size / Design Name", "L / Length", "W / Width", "H / Height", "Price (AUD)", "Stock / Quantity"]) {
    assert.match(adminForm, new RegExp(label.replace(/[()\/]/g, "\\$&")));
  }
  for (const field of ["length", "width", "height", "price", "stock"]) {
    assert.match(adminProductsCreate, new RegExp(`variant\\.${field}`));
    assert.match(adminProducts, new RegExp(`variant\\.${field}`));
  }
});

section("product cards require option selection for variant products", () => {
  assert.match(productCard, /product\.variants\?\.length/);
  assert.match(productCard, /Choose options/);
});

section("image availability has its own non-negative per-image field", () => {
  assert.match(imageAvailabilityMigration, /add column if not exists available_quantity integer not null default 0/);
  assert.match(imageAvailabilityMigration, /check \(available_quantity >= 0\)/);
  assert.doesNotMatch(migration, /available_quantity/);
});

section("existing gallery images are assigned by URL without storage uploads", () => {
  assert.match(imageRoute, /from\("product_images"\)/);
  assert.match(imageRoute, /from\("product_variant_images"\)\.upsert/);
  assert.match(imageRoute, /onConflict: "variant_id,image_url"/);
  assert.match(imageRoute, /not in this product's shared gallery/);
  assert.match(imageRoute, /galleryUrls\.has\(image\.image_url\) && !selectedUrls\.has\(image\.image_url\)/);
  assert.match(adminForm, /selectedGalleryImageIds\.map\(\(id\) => \(\{ id \}\)\)/);
  assert.match(adminForm, /variant\.images \?\? variant\.product_variant_images \?\? \[\]/);
  assert.match(adminForm, /isPersistedVariant\(variant\.id\)/);
});

section("assigned image quantities are validated and returned on reload", () => {
  assert.match(imageRoute, /Number\.isInteger\(item\.available_quantity\)/);
  assert.match(imageRoute, /One or more assigned images do not belong to this option/);
  assert.match(imageRoute, /select\("id, variant_id, image_url, alt_text, sort_order, available_quantity"\)/);
  assert.match(adminForm, /Save image availability/);
  assert.match(adminForm, /image\.image_url/);
});

section("storefront filters option galleries by positive image availability", () => {
  assert.match(catalog, /product_variant_images\(id, variant_id, image_url, alt_text, sort_order, available_quantity\)/);
  assert.match(productDetail, /image\.available_quantity \?\? 0\) > 0/);
  assert.match(productDetail, /image: optionImages\[0\]\?\.image_url \?\? ""/);
});

section("catalog uses authoritative product stock status and checkout explains stock conflicts", () => {
  assert.match(catalog, /\.select\("id, slug, name, description, meaning, price, category, stock, stock_status,/);
  assert.match(stripeCheckout, /diagnoseCheckoutFailure/);
  assert.match(checkoutValidation, /failure === "stock_conflict"/);
  assert.match(manualCheckout, /diagnoseCheckoutFailure/);
  assert.match(checkoutValidation, /normalizeCheckoutItems/);
  assert.match(checkoutValidation, /failure === "invalid_variant"/);
  assert.doesNotMatch(stripeCheckout, /Please refresh your cart/);
});

section("uploads enforce the documented image limit and inspect file signatures", () => {
  assert.match(imageUpload, /8 \* 1024 \* 1024/);
  assert.match(imageUpload, /file\.size > MAX_IMAGE_UPLOAD_BYTES/);
  assert.match(imageUpload, /The file contents do not match/);
  assert.match(uploadRoute, /await validateImageFile\(file\)/);
  assert.match(imageRoute, /await validateImageFile\(file\)/);
});

section("specification values use variant fields and compact vector icons", () => {
  for (const field of ["length", "width", "height", "weight"]) {
    assert.match(productDetail, new RegExp(`displayProduct\\.${field}`));
  }
  assert.match(productDetail, /sm:grid-cols-4/);
  assert.match(productDetail, /type === "weight"/);
  assert.match(productDetail, /KG/);
});

console.log("BLOCKED runtime checks: checkout stock transitions require an isolated disposable database and controlled fixtures; no real orders were created.");
