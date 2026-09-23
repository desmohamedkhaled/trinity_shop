#!/usr/bin/env node

const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const results = [];

const publicPages = [
  ["/", "Trinity"],
  ["/shop", "Shop meaningful gifts"],
  ["/contact", "Contact Trinity"],
  ["/faq", "Frequently Asked Questions"],
  ["/shipping-returns", "Shipping"],
  ["/gift-list", "Wishlist"],
  ["/cart", "Your cart"],
  ["/checkout", "Trinity"],
  ["/events", "Events"],
  ["/gift-finder", "Gift Finder"],
  ["/our-story", "Gifts With Meaning"],
  ["/journal", "Trinity Journal"],
  ["/occasions", "Occasions"],
];

const publicApis = [
  "/api/catalog/products",
  "/api/catalog/gift-finder",
  "/api/content/public",
  "/api/settings/public",
];

const protectedApis = [
  "/api/settings",
  "/api/admin/access",
  "/api/admin/stats",
  "/api/admin/users",
  "/api/admin/products",
  "/api/admin/occasions",
  "/api/admin/events",
  "/api/admin/upload",
  "/api/admin/orders",
  "/api/admin/requests",
  "/api/admin/customers",
  "/api/admin/gift-lists",
  "/api/admin/gift-finder",
];

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual", ...options });
  const text = await response.text();
  return { response, text };
}

function record(id, passed, details) {
  results.push({ id, status: passed ? "PASS" : "FAIL", details });
}

async function run() {
  for (const [path, marker] of publicPages) {
    try {
      const { response, text } = await request(path);
      record(`PUBLIC-${path.replace(/[^a-z0-9]+/gi, "-")}`, response.status === 200 && text.includes(marker), `${response.status} ${marker}`);
    } catch (error) {
      record(`PUBLIC-${path.replace(/[^a-z0-9]+/gi, "-")}`, false, error.message);
    }
  }

  for (const path of publicApis) {
    try {
      const { response, text } = await request(path);
      const contentType = response.headers.get("content-type") || "";
      record(`API-PUBLIC-${path.replace(/[^a-z0-9]+/gi, "-")}`, response.status === 200 && contentType.includes("application/json"), `${response.status} ${contentType} ${text.slice(0, 80)}`);
    } catch (error) {
      record(`API-PUBLIC-${path.replace(/[^a-z0-9]+/gi, "-")}`, false, error.message);
    }
  }

  for (const path of protectedApis) {
    try {
      const { response } = await request(path);
      const protectedStatus = [401, 403, 307, 302].includes(response.status);
      record(`API-AUTH-${path.replace(/[^a-z0-9]+/gi, "-")}`, protectedStatus, `${response.status} unauthenticated access`);
    } catch (error) {
      record(`API-AUTH-${path.replace(/[^a-z0-9]+/gi, "-")}`, false, error.message);
    }
  }

  const failures = results.filter((result) => result.status === "FAIL");
  console.table(results);
  console.log(`QA HTTP smoke: ${results.length - failures.length} passed, ${failures.length} failed`);
  if (failures.length) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
