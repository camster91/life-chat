import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const prototypeUrl = pathToFileURL(resolve("docs/design/first-shell-prototype.html")).href;
const viewports = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
] as const;

for (const viewport of viewports) {
  test(`${viewport.name} shell has no automated WCAG A/AA violations or horizontal overflow`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(prototypeUrl);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Today");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const visibleNavigationTargets = await page.locator("nav button:visible").evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height));
    expect(visibleNavigationTargets.every((height) => height >= 44)).toBe(true);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations).toEqual([]);
  });
}

test("keyboard skip link reaches main content and proposal actions announce outcomes", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(prototypeUrl);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#content")).toBeFocused();

  await page.getByRole("button", { name: "Chat" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Chat");
  await page.getByRole("button", { name: "Prepare a sample change" }).click();
  await expect(page.getByText("Proposed action — review before confirming")).toBeVisible();
  await page.getByRole("button", { name: "Confirm change" }).click();
  await expect(page.getByRole("status")).toContainText("re-check permission");
});

test("mobile overflow keeps Family and Settings keyboard-accessible", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(prototypeUrl);
  await expect(page.locator("nav").getByRole("button", { name: "Family" })).toBeHidden();
  await page.getByRole("button", { name: "More" }).click();
  const dialog = page.getByRole("dialog", { name: "More" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Family" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Family");
  await expect(page.getByRole("button", { name: "More" })).toHaveAttribute("aria-current", "page");
});

test("all visual direction hypotheses retain automated contrast", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(prototypeUrl);
  for (const direction of ["strong-fit", "conservative", "notebook"] as const) {
    await page.getByLabel("Visual direction").selectOption(direction);
    await expect(page.locator("body")).toHaveAttribute("data-direction", direction);
    const results = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
    expect(results.violations, direction).toEqual([]);
  }
});
