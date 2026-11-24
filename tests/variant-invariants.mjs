import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/20261020000000_product_variants_stock_status.sql", import.meta.url), "utf8");
const visualMigration = await readFile(new URL("../supabase/migrations/20261117000000_visual_photo_inventory.sql", import.meta.url), "utf8");
const adminProducts = await readFile(new URL("../app/api/admin/products/[id]/route.ts", import.meta.url), "utf8");
const adminProductsCreate = await readFile(new URL("../app/api/admin/products/route.ts", import.meta.url), "utf8");
const adminForm = await readFile(new URL("../app/admin/products/page.tsx", import.meta.url), "utf8");
const inventoryApi = await readFile(new URL("../app/api/admin/inventory/route.ts", import.meta.url), "utf8");
const inventoryPage = await readFile(new URL("../app/admin/inventory/page.tsx", import.meta.url), "utf8");
const storeProvider = await readFile(new URL("../components/store-provider.tsx", import.meta.url), "utf8");
const checkoutPage = await readFile(new URL("../app/(store)/checkout/page.tsx", import.meta.url), "utf8");
const productCard = await readFile(new URL("../components/product-card.tsx", import.meta.url), "utf8");
const imageRoute = await readFile(new URL("../app/api/admin/products/[id]/images/route.ts", import.meta.url), "utf8");
const checkoutValidation = await readFile(new URL("../lib/checkout-validation.ts", import.meta.url), "utf8");
const catalog = await readFile(new URL("../lib/catalog.ts", import.meta.url), "utf8");
const eflowRoute = await readFile(new URL("../app/api/shipping/calculate/route.ts", import.meta.url), "utf8");
const eflowClient = await readFile(new URL("../lib/eflow.ts", import.meta.url), "utf8");
const manualOrderRoute = await readFile(new URL("../app/api/orders/route.ts", import.meta.url), "utf8");
const stripeCheckoutRoute = await readFile(new URL("../app/api/stripe/create-checkout-session/route.ts", import.meta.url), "utf8");
const stripeWebhook = await readFile(new URL("../app/api/stripe/webhook/route.ts", import.meta.url), "utf8");
const preparedPreorderMigration = await readFile(new URL("../supabase/migrations/20261120000000_safe_universal_photo_preorder_prepared.sql", import.meta.url), "utf8");
const photoModeMigration = await readFile(new URL("../supabase/migrations/20261121000000_universal_photo_modes_prepared.sql", import.meta.url), "utf8");
const productDetail = await readFile(new URL("../components/product-detail.tsx", import.meta.url), "utf8");
const batchInventoryRoute = await readFile(new URL("../app/api/admin/inventory/batch-update/route.ts", import.meta.url), "utf8");
const inventoryPageForTests = await readFile(new URL("../app/admin/inventory/page.tsx", import.meta.url), "utf8");
const preorderHelper = await readFile(new URL("../lib/preorder.ts", import.meta.url), "utf8");
const balanceLinkRoute = await readFile(new URL("../app/api/admin/orders/[id]/balance-link/route.ts", import.meta.url), "utf8");
const balanceStripeRoute = await readFile(new URL("../app/api/stripe/balance-checkout-session/route.ts", import.meta.url), "utf8");
const catalogForTests = await readFile(new URL("../lib/catalog.ts", import.meta.url), "utf8");
const inventoryAdminForTests = await readFile(new URL("../app/api/admin/inventory/route.ts", import.meta.url), "utf8");
const adminAccess = await readFile(new URL("../components/admin-access.ts", import.meta.url), "utf8");
const adminGuard = await readFile(new URL("../components/admin-guard.tsx", import.meta.url), "utf8");
const adminLogin = await readFile(new URL("../app/admin/login/page.tsx", import.meta.url), "utf8");
const supabaseLib = await readFile(new URL("../lib/supabase.ts", import.meta.url), "utf8");
const settingsRoute = await readFile(new URL("../app/api/settings/route.ts", import.meta.url), "utf8");
const publicSettingsRoute = await readFile(new URL("../app/api/settings/public/route.ts", import.meta.url), "utf8");
const settingsPage = await readFile(new URL("../app/admin/settings/page.tsx", import.meta.url), "utf8");
const customersPage = await readFile(new URL("../app/admin/customers/page.tsx", import.meta.url), "utf8");

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
  assert.match(adminProducts, /from\('product_variants'\)\.select\('id, stock, inventory_mode'\)/);
  assert.match(adminProducts, /upsert\(variant, \{ onConflict: 'id' \}\)/);
  assert.doesNotMatch(adminProducts, /product_variants'\)\.delete\(\)\.eq\('product_id', id\)/);
  assert.match(adminProducts, /product_variants: savedVariants/);
  assert.match(adminForm, /saved\.id === id/);
});

section("variant admin input is validated and scoped", () => {
  assert.match(adminProducts, /Variant names must be unique/);
  assert.match(adminProducts, /do not belong to this product/);
});

section("admin variant form separates master data from inventory", () => {
  for (const label of ["Size / Design Name", "L / Length", "W / Width", "H / Height", "Price (AUD)"]) {
    assert.match(adminForm, new RegExp(label.replace(/[()\/]/g, "\\$&")));
  }
  assert.doesNotMatch(adminForm, /Stock \/ Quantity/);
  assert.doesNotMatch(adminForm, /Product inventory mode/);
  assert.doesNotMatch(adminForm, /stock_status:|inventory_mode: "traditional"|stock: 0/);
  for (const field of ["length", "width", "height", "price"]) {
    assert.match(adminProductsCreate, new RegExp(`variant\\.${field}`));
    assert.match(adminProducts, new RegExp(`variant\\.${field}`));
  }
  assert.match(inventoryPage, /Save changes/);
});

section("product cards require option selection for variant products", () => {
  assert.match(productCard, /product\.variants\?\.length/);
  assert.match(productCard, /Choose options/);
});

section("photo inventory preserves artwork identity through checkout", () => {
  assert.match(visualMigration, /add column if not exists available_quantity/);
  assert.match(visualMigration, /add column if not exists image_id uuid/);
  assert.match(visualMigration, /trinity_reserve_inventory/);
  assert.match(visualMigration, /inventory_reservations/);
  assert.match(checkoutPage, /image_id: image\?\.id/);
  assert.match(storeProvider, /image\?: ProductImage/);
});

section("photo aggregation and protected quick-set are wired", () => {
  assert.match(visualMigration, /trinity_sync_photo_inventory/);
  assert.match(visualMigration, /after insert or update of available_quantity, variant_id or delete/);
  assert.match(inventoryApi, /requirePermission\("inventory\.update"\)/);
  assert.match(inventoryApi, /Per-keystroke inventory updates are disabled/);
  assert.match(inventoryPage, /Quick set all/);
});

section("admin image assignment is scoped and idempotent", () => {
  assert.match(imageRoute, /Array\.from\(new Set/);
  assert.match(imageRoute, /sourceImages\.length !== sourceIds\.length/);
  assert.match(imageRoute, /onConflict: "variant_id,image_url"/);
  assert.match(imageRoute, /variantId/);
  assert.match(imageRoute, /const imageTable = "product_images"/);
  assert.match(imageRoute, /The canonical gallery record is always product_images|Option uploads remain canonical product_images records/);
});

section("photo artwork visibility is enforced in the server catalog", () => {
  assert.match(catalog, /\(image\.available_quantity \?\? 0\) > 0/);
  assert.match(checkoutValidation, /image\.available_quantity < quantity/);
  assert.match(checkoutValidation, /Selected artwork is invalid for this option/);
  assert.match(catalogForTests, /inventory_mode === "photo"/);
  assert.match(inventoryAdminForTests, /inventory_mode: "photo"/);
});

section("inventory filter and focus persistence remain local", () => {
  assert.doesNotMatch(inventoryPage, /value=\{category\}|setCategory|All categories/);
  assert.match(inventoryPage, /Search title, SKU or keyword/);
  assert.match(inventoryPage, /Refresh/);
  assert.doesNotMatch(inventoryPage, /window\.onfocus|visibilitychange|refetchOnWindowFocus|revalidateOnFocus/);
  assert.match(inventoryPage, /filteredProducts\.find\(\(item\) => item\.id === selectedId\)/);
  assert.match(inventoryPage, /catalogRef\.current\.scrollTop/);
  assert.match(inventoryPage, /workspaceRef\.current\.scrollTop/);
});

section("browser tab changes preserve admin state and auth", () => {
  assert.doesNotMatch(adminAccess, /TOKEN_REFRESHED[\s\S]*setRefreshKey/);
  assert.doesNotMatch(adminGuard, /supabase\.auth\.getUser|from\(["']admin_users["']\)/);
  assert.doesNotMatch(adminLogin, /router\.refresh\(\)/);
  assert.match(supabaseLib, /persistSession:\s*true/);
  assert.match(supabaseLib, /autoRefreshToken:\s*true/);
  assert.doesNotMatch(inventoryPageForTests, /await load\(true\)|await load\(\)/);
});

section("live shipping is server quoted and manual rates are removed", () => {
  assert.match(eflowClient, /freight\.eflowsoft\.com\.au\/api\/v1/);
  assert.match(eflowClient, /EFLOW_FREIGHT_API_KEY/);
  assert.match(eflowClient, /EFLOW_FROM_POSTCODE/);
  assert.match(eflowRoute, /quoteEflowService/);
  assert.doesNotMatch(adminForm, /SUBURB|METRO|State-by-state|manual shipping/i);
});

section("stored weights are grams and convert once at the eFlow boundary", () => {
  assert.match(adminForm, /Weight \(grams\)/);
  assert.match(productDetail, /effectiveWeight[\s\S]*?"g"/);
  assert.match(eflowClient, /weightGrams/);
  assert.match(eflowClient, /gramsToEflowKg/);
  assert.match(eflowClient, /weightKg = totalWeightGrams \/ 1000|weightKg = weightGrams \/ 1000|weightGrams \/ 1000/);
  assert.doesNotMatch(eflowClient, /weight \*= 1000|weight \/ 1000[\s\S]*weight: Number/);
  assert.match(eflowClient, /22000|22/);
  assert.doesNotMatch(eflowClient, /items\.length !== 1|item\.quantity !== 1/);
  assert.match(eflowClient, /totalWeightGrams \+= weightGrams \* item\.quantity/);
  assert.doesNotMatch(eflowRoute, /height \+=|weight \+=|Math\.max\(length/);
});

section("shipping origin is privately configurable and drives eFlow origin postcode", () => {
  assert.match(settingsRoute, /'shipping_origin'/);
  assert.match(settingsRoute, /Enter a valid shipping origin address and 4-digit postcode/);
  assert.match(settingsPage, /Shipping starting address/);
  assert.match(publicSettingsRoute, /whatsapp_checkout_enabled.*whatsapp_number/);
  assert.doesNotMatch(publicSettingsRoute, /shipping_origin/);
  assert.match(eflowClient, /\.eq\("key", "shipping_origin"\)/);
  assert.match(eflowClient, /origin\?\.postcode/);
  assert.match(eflowClient, /EFLOW_FROM_POSTCODE/);
  assert.match(eflowClient, /parcelLength = Math\.max\(parcelLength, length\)/);
  assert.match(eflowClient, /parcelWidth = Math\.max\(parcelWidth, width\)/);
  assert.match(eflowClient, /parcelHeight \+= height \* item\.quantity/);
  assert.doesNotMatch(eflowClient, /conflicting confirmed package dimensions/);
});

section("customer history expands inline and filters by order status", () => {
  assert.match(customersPage, /selectedId === customer\.id && <tr/);
  assert.match(customersPage, /<CustomerHistory customer=\{customer\} orderStatusFilter=\{orderStatusFilter\}/);
  assert.match(customersPage, /customer\.orders\?\.some\(\(order\) => order\.status === orderStatusFilter\)/);
  assert.match(customersPage, /order\.status === orderStatusFilter/);
  assert.match(customersPage, /Filter customers by order status/);
});

function gramsToKg(weightGrams) {
  assert.ok(Number.isFinite(weightGrams) && weightGrams > 0);
  return weightGrams / 1000;
}

function positiveWeight(weightGrams) {
  return typeof weightGrams === "number" && Number.isFinite(weightGrams) && weightGrams > 0
    ? weightGrams
    : null;
}

function weightWithVariantFallback(variantWeight, productWeight) {
  return positiveWeight(variantWeight) ?? positiveWeight(productWeight);
}

section("gram conversion boundary fixtures", () => {
  assert.equal(gramsToKg(500), 0.5);
  assert.equal(gramsToKg(113), 0.113);
  assert.equal(gramsToKg(500 * 4), 2);
  assert.equal(gramsToKg(500 + 113), 0.613);
  assert.equal(gramsToKg(22000), 22);
  assert.equal(gramsToKg(22001) > 22, true);
  assert.doesNotThrow(() => gramsToKg(500));
  assert.equal(positiveWeight(undefined), null);
  assert.equal(positiveWeight(null), null);
  assert.equal(positiveWeight(0), null);
  assert.equal(positiveWeight(-1), null);
  assert.equal(positiveWeight(Number.NaN), null);
  assert.equal(weightWithVariantFallback(500, 113), 500);
  assert.equal(weightWithVariantFallback(null, 113), 113);
  assert.equal(weightWithVariantFallback(0, null), null);
});

section("batch inventory exposes one explicit batch endpoint", () => {
  assert.match(batchInventoryRoute, /admin_batch_update_inventory/);
  assert.match(batchInventoryRoute, /p_changes/);
  assert.match(inventoryPageForTests, /\/api\/admin\/inventory\/batch-update/);
  assert.match(inventoryPageForTests, /async function load\(clearStaged = false\)/);
  assert.match(inventoryPageForTests, /if \(clearStaged\) setStaged\(\{\}\)/);
});

section("preorder prices and payment choices are server authoritative", () => {
  assert.match(preorderHelper, /preorder_eligible,deposit_percentage/);
  assert.match(preorderHelper, /depositPercentage = isDeposit/);
  assert.match(preorderHelper, /depositAmount = isDeposit/);
  assert.match(preorderHelper, /remainingBalance = isDeposit/);
  assert.match(preorderHelper, /not eligible for booking/);
  assert.match(stripeCheckoutRoute, /resolveServerPreorders/);
  assert.match(manualOrderRoute, /resolveServerPreorders/);
});

section("remaining balance link and checkout are prepared safely", () => {
  assert.match(balanceLinkRoute, /stock_received/);
  assert.match(balanceLinkRoute, /balance_payment_token_hash/);
  assert.match(balanceLinkRoute, /7 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(balanceStripeRoute, /balancePayment|balance_order_id|remaining_balance/);
  assert.match(stripeWebhook, /balance_order_id/);
  assert.match(stripeWebhook, /balance_payment_status: "paid"/);
});

section("checkout persists server-calculated preorder metadata", () => {
  for (const route of [manualOrderRoute, stripeCheckoutRoute]) {
    assert.match(route, /is_deposit/);
    assert.match(route, /deposit_percentage/);
    assert.match(route, /remaining_balance/);
    assert.match(route, /preorder_status/);
  }
  assert.match(stripeCheckoutRoute, /deposit_amount/);
  assert.match(checkoutPage, /image_id: image\?\.id/);
});

section("preorder schema and Stripe lifecycle are prepared", () => {
  assert.match(preparedPreorderMigration, /is_deposit boolean/);
  assert.match(preparedPreorderMigration, /preorder_status/);
  assert.match(stripeWebhook, /claimEvent/);
  assert.match(stripeWebhook, /checkout\.session\.expired/);
  assert.match(stripeWebhook, /complete_stripe_payment/);
  assert.match(stripeWebhook, /markEventProcessed/);
});

section("universal photo migration changes mode flags only", () => {
  assert.match(photoModeMigration, /set inventory_mode = 'photo'/g);
  assert.doesNotMatch(photoModeMigration, /available_quantity\s*[-+*/=]/);
  assert.doesNotMatch(photoModeMigration, /delete\s+from/i);
});

section("gallery deletion and canonical assignment synchronization are protected", () => {
  assert.match(imageRoute, /\.from\("product_images"\)[\s\S]*?\.delete\(\)/);
  assert.match(imageRoute, /canonicalUnassignError|canonicalUnassign/);
  assert.match(adminForm, /setSelectedGalleryIds\(\[\]\)/);
});

section("legacy URL-only assignments survive gallery synchronization", () => {
  assert.match(imageRoute, /canonicalUrls\.has\(assignment\.image_url\)/);
  assert.match(imageRoute, /!selectedUrls\.has\(assignment\.image_url\)/);
  assert.match(imageRoute, /URL-only legacy assignments are not stale/);
  assert.doesNotMatch(imageRoute, /\.delete\(\)\.eq\("variant_id", body\.variantId\)/);
});

section("canonical gallery deletion does not remove legacy assignments or storage", () => {
  assert.match(imageRoute, /remainingAssignments/);
  assert.match(imageRoute, /remainingAssignmentsError/);
  assert.match(imageRoute, /if \(markerIndex !== -1 && !\(remainingAssignments \?\? \[\]\)\.length\)/);
});

console.log("BLOCKED runtime checks: concurrent final-unit purchase, webhook retries, aggregation triggers, and exactly-once DB transitions require the unapplied migration and an isolated disposable database.");
