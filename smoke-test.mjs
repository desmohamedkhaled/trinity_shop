#!/usr/bin/env node

const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const failures = [];

const pageChecks = [
  {
    path: "/",
    title: "Homepage",
    expect: ["Trinity", "The collection", "The Trinity story"],
    allowedStatus: [200],
  },
  {
    path: "/shop",
    title: "Shop",
    expect: ["Shop meaningful gifts", "Browse the current collection"],
    allowedStatus: [200],
  },
  {
    path: "/gift-finder",
    title: "Gift Finder",
    expect: ["Gift Finder"],
    allowedStatus: [200],
  },
  {
    path: "/events",
    title: "Events listing",
    expect: ["Trinity events", "Events"],
    allowedStatus: [200],
  },
  {
    path: "/contact",
    title: "Contact",
    expect: ["Contact Trinity", "Let&#x27;s find the right gift"],
    allowedStatus: [200],
  },
  {
    path: "/our-story",
    title: "Story",
    expect: ["Our story", "Gifts With Meaning"],
    allowedStatus: [200],
  },
  {
    path: "/admin/login",
    title: "Admin Login",
    expect: ["Welcome back", "Sign in"],
    allowedStatus: [200],
  },
  {
    path: "/admin",
    title: "Admin Dashboard",
    allowedStatus: [200, 307, 302, 401],
  },
];

async function smokeCheck(check) {
  const url = `${baseUrl}${check.path}`;
  try {
    const response = await fetch(url, { redirect: "manual" });
    const html = await response.text();

    if (!check.allowedStatus.includes(response.status)) {
      failures.push(`${check.title} ${check.path} failed with ${response.status}`);
      return;
    }

    const missingText = (check.expect || []).filter((text) => !html.includes(text));
    if (missingText.length > 0) {
      failures.push(`${check.title} ${check.path} missing expected text: ${missingText.join(", ")}`);
    }
  } catch (error) {
    failures.push(`${check.title} ${check.path} request error: ${error.message}`);
  }
}

async function checkApi() {
  const apiTargets = [
    { path: "/api/settings", title: "Settings API", allowedStatus: [200, 401, 403] },
    { path: "/api/admin/events", title: "Admin Events API", allowedStatus: [200, 401, 403] },
  ];

  for (const entry of apiTargets) {
    const url = `${baseUrl}${entry.path}`;
    try {
      const response = await fetch(url, { redirect: "manual" });
      const text = await response.text();

      if (!entry.allowedStatus.includes(response.status)) {
        failures.push(`${entry.title} ${entry.path} failed with ${response.status}`);
        continue;
      }

      if (response.status < 400 && text.trim().length && !text.trim().startsWith("{") && !text.trim().startsWith("[") && !text.trim().startsWith("<")) {
        failures.push(`${entry.title} ${entry.path} did not return a JSON or HTML response`);
      }
    } catch (error) {
      failures.push(`${entry.title} ${entry.path} API error: ${error.message}`);
    }
  }
}

(async function run() {
  for (const check of pageChecks) {
    await smokeCheck(check);
  }

  await checkApi();

  if (failures.length) {
    console.log("SMOKE TEST FAILED");
    for (const failure of failures) {
      console.log(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(`SMOKE TEST PASSED (${pageChecks.length} page checks and ${2} API checks)`);
})();
