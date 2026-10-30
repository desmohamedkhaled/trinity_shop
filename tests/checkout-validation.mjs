import assert from "node:assert/strict";
import {
  diagnoseCheckoutFailure,
  normalizeCheckoutItems,
} from "../lib/checkout-validation.ts";

const productId = "11111111-1111-4111-8111-111111111111";
const variantId = "22222222-2222-4222-8222-222222222222";

function mockSupabase({ products = [], variants = [] }) {
  return {
    from(table) {
      return {
        select() {
          return {
            in(_column, ids) {
              const rows = table === "products" ? products : variants;
              return Promise.resolve({ data: rows.filter((row) => ids.includes(row.id)), error: null });
            },
          };
        },
      };
    },
  };
}

assert.deepEqual(normalizeCheckoutItems([{ id: productId, quantity: 1 }]), [
  { id: productId, quantity: 1, variant_id: undefined },
]);
assert.deepEqual(normalizeCheckoutItems([{ id: productId, variant_id: variantId, quantity: 2 }]), [
  { id: productId, variant_id: variantId, quantity: 2 },
]);
assert.equal(normalizeCheckoutItems([null]), null);
assert.equal(normalizeCheckoutItems([{ id: productId, variant_id: "", quantity: 1 }]), null);
assert.equal(normalizeCheckoutItems([{ id: productId, variant_id: "not-a-uuid", quantity: 1 }]), null);
assert.equal(normalizeCheckoutItems([{ id: productId, quantity: "1" }]), null);

const stockError = new Error("Only 0 items are available");
assert.equal(
  await diagnoseCheckoutFailure(
    mockSupabase({ products: [{ id: productId, is_published: true, stock: 0, stock_status: "In stock" }] }),
    [{ id: productId, quantity: 1 }],
    stockError,
  ),
  "stock_conflict",
);

assert.equal(
  await diagnoseCheckoutFailure(
    mockSupabase({ products: [{ id: productId, is_published: true, stock: 5, stock_status: "In stock" }] }),
    [{ id: productId, variant_id: variantId, quantity: 1 }],
    new Error("Selected option is no longer available"),
  ),
  "invalid_variant",
);

assert.equal(
  await diagnoseCheckoutFailure(
    mockSupabase({}),
    [{ id: productId, quantity: 1 }],
    new Error("Product is unavailable"),
  ),
  "invalid_product",
);

assert.equal(
  await diagnoseCheckoutFailure(
    mockSupabase({
      products: [{ id: productId, is_published: true, stock: 5, stock_status: "In stock" }],
      variants: [{ id: variantId, product_id: productId, stock: 0 }],
    }),
    [{ id: productId, variant_id: variantId, quantity: 1 }],
    new Error("Selected option is no longer available"),
  ),
  "stock_conflict",
);

assert.equal(
  await diagnoseCheckoutFailure(mockSupabase({}), [{ id: productId, quantity: 1 }], new Error("column missing")),
  "technical_failure",
);

console.log("PASS checkout item shape and failure classification");
