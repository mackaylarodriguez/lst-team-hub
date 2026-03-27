const { test, expect } = require("@playwright/test");

const E2E_EMAIL = process.env.E2E_EMAIL || "";
const E2E_PASSWORD = process.env.E2E_PASSWORD || "";
const E2E_TRIP_ID = process.env.E2E_TRIP_ID || "";

async function loginIfConfigured(page) {
  if (!E2E_EMAIL || !E2E_PASSWORD) {
    test.skip(true, "Set E2E_EMAIL and E2E_PASSWORD to run authenticated smoke tests.");
  }

  await page.goto("/login");
  await page.locator('input[type="email"]').first().fill(E2E_EMAIL);
  await page.locator('input[type="password"]').first().fill(E2E_PASSWORD);
  await page.getByRole("button", { name: /sign in|log in|login/i }).first().click();
  await page.waitForLoadState("networkidle");
}

test("tab deep-link: travel-safety", async ({ page }) => {
  await loginIfConfigured(page);
  test.skip(!E2E_TRIP_ID, "Set E2E_TRIP_ID to run trip deep-link smoke test.");

  await page.goto(`/trips/${E2E_TRIP_ID}?tab=travel-safety`);
  await expect(page.getByRole("button", { name: "Travel & Safety" })).toBeVisible();
  await expect(page.getByText("Travel & Safety", { exact: false })).toBeVisible();
});

test("travel & safety ack flow", async ({ page }) => {
  await loginIfConfigured(page);
  test.skip(!E2E_TRIP_ID, "Set E2E_TRIP_ID to run travel/safety smoke test.");

  await page.goto(`/trips/${E2E_TRIP_ID}?tab=travel-safety`);
  const ackButton = page.getByRole("button", { name: /I have read and understand this/i }).first();

  if (await ackButton.isVisible()) {
    await ackButton.click();
    await expect(page.getByText(/acknowledg|already acknowledged/i)).toBeVisible();
  } else {
    await expect(page.getByText(/Travel & Safety/i)).toBeVisible();
  }
});

test("roster-only references editing smoke", async ({ page }) => {
  await loginIfConfigured(page);
  test.skip(!E2E_TRIP_ID, "Set E2E_TRIP_ID to run references smoke test.");

  await page.goto(`/trips/${E2E_TRIP_ID}?tab=team`);
  await expect(page.getByText("Reference Emails")).toBeVisible();

  const firstReferenceName = page.locator('input[placeholder="Reference name"]').first();
  await expect(firstReferenceName).toBeVisible();
  await firstReferenceName.fill("Smoke Test Reference");
});

test("delete trip confirmation opens", async ({ page }) => {
  await loginIfConfigured(page);
  test.skip(!E2E_TRIP_ID, "Set E2E_TRIP_ID to run delete-trip smoke test.");

  await page.goto(`/trips/${E2E_TRIP_ID}`);
  const deleteButton = page.getByRole("button", { name: /delete trip/i }).first();
  await expect(deleteButton).toBeVisible();
  await deleteButton.click();
  await expect(page.getByText(/delete this trip/i)).toBeVisible();
});
