import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const baseUrl = process.env.LIFE_CHAT_E2E_BASE_URL;
const email = process.env.LIFE_CHAT_E2E_EMAIL;
const password = process.env.LIFE_CHAT_E2E_PASSWORD;

test.skip(baseUrl === undefined || email === undefined || password === undefined, "Explicit disposable authenticated runtime is required.");

test("authenticated shell preserves context and enabled-app navigation across desktop and mobile", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${baseUrl}/sign-in`);
  await page.getByLabel("Email address").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(`${baseUrl}/today`);
  await expect(page.getByLabel("Current household context")).toContainText("Shell Test Home");
  await expect(page.getByRole("link", { name: "Today", exact: true }).first()).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "Shared Lists", exact: true })).toHaveCount(0);
  let results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);

  await page.getByRole("link", { name: "Apps", exact: true }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Household apps");
  const sharedLists = page.getByRole("listitem").filter({ has: page.getByText("Shared lists", { exact: true }) });
  await sharedLists.getByRole("button", { name: "Review enable" }).click();
  await expect(sharedLists.getByRole("group", { name: "Confirm enable Shared lists" })).toBeVisible();
  await Promise.all([page.waitForEvent("load"), sharedLists.getByRole("button", { name: "Confirm" }).click()]);
  await expect(page.getByRole("link", { name: "Shared Lists", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open" })).toBeVisible();

  await page.getByRole("link", { name: "Family", exact: true }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("People and access, made clear");
  const childMember = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Alex Child" }) });
  await childMember.getByRole("button", { name: "Review suspend" }).click();
  await expect(childMember.getByRole("group", { name: "Confirm suspended Alex Child" })).toBeVisible();
  await childMember.getByRole("button", { name: "Confirm" }).click();
  await expect(childMember).toContainText("child · suspended");
  await expect(childMember.getByRole("button", { name: "Review suspend" })).toHaveCount(0);
  results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);

  await page.getByRole("link", { name: "Calendar", exact: true }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("A calm view of the day");
  await expect(page.getByLabel("Choose agenda date")).toBeVisible();
  await expect(page.getByRole("heading", { name: "School break" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Family dinner" })).toBeVisible();
  await expect(page.getByText("America/Toronto", { exact: true }).last()).toBeVisible();
  results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);

  await page.setViewportSize({ width: 375, height: 812 });
  const primaryTargets = page.getByRole("navigation", { name: "Mobile primary navigation" }).locator("a:visible, span:visible, button:visible");
  await expect(primaryTargets).toHaveCount(5);
  const targetHeights = await primaryTargets.evaluateAll((targets) => targets.map((target) => target.getBoundingClientRect().height));
  expect(targetHeights.every((height) => height >= 44)).toBe(true);
  await expect(page.getByRole("link", { name: "Calendar", exact: true }).last()).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "More" }).click();
  await expect(page.getByRole("dialog", { name: "More" })).toBeVisible();
  results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);
});
