import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/20261020000000_product_variants_stock_status.sql", import.meta.url), "utf8");
const adminProducts = await readFile(new URL("../app/api/admin/products/[id]/route.ts", import.meta.url), "utf8");
const adminProductsCreate = await readFile(new URL("../app/api/admin/products/route.ts", import.meta.url), "utf8");
const adminForm = await readFile(new URL("../app/admin/products/page.tsx", import.meta.url), "utf8");
const productCard = await readFile(new URL("../components/product-card.tsx", import.meta.url), "utf8");

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

console.log("BLOCKED runtime checks: concurrent final-unit purchase and exactly-once DB transitions require the unapplied DEV migration and an isolated disposable database.");
