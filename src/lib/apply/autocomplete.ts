/**
 * Autocomplete fields on application forms (Lever's location, Google Places, listbox comboboxes).
 * Shared by the runner and its tests.
 */
import type { Page } from "playwright-core";

/**
 * After typing into a text field, some forms open a suggestion list (Lever's location, Google Places
 * widgets, listbox autocompletes). Typed text that is not picked from the list is thrown away on blur,
 * so pick the entry that names what was typed, or the first one. Returns the chosen text, or undefined
 * when no list appeared.
 */
export async function pickSuggestion(page: Page, typed: string, patience = 1300): Promise<string | undefined> {
  const items = page.locator('[role="option"], [role="listbox"] li, [class*="dropdown-location"], [class*="dropdown-results"] > *, .pac-item, [class*="suggestion"] li, [class*="autocomplete"] li, [class*="autocomplete"] [class*="item"]').filter({ visible: true });
  // Place lookups (Lever's location, Google Places) answer over the network and can take seconds:
  // wait for the list rather than a fixed pause, or nothing gets picked and the field stays empty.
  const until = Date.now() + patience;
  await page.waitForTimeout(Math.min(700, patience));
  while (!(await items.count()) && Date.now() < until) await page.waitForTimeout(250);
  const n = await items.count();
  if (!n) return undefined;
  const texts = (await items.allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim());
  const want = typed.toLowerCase();
  let i = texts.findIndex((t) => t.toLowerCase().startsWith(want));
  if (i < 0) i = texts.findIndex((t) => t.toLowerCase().includes(want));
  if (i < 0) i = 0;
  await items.nth(i).click(); await page.waitForTimeout(500);
  return texts[i];
}

/** Lever's location only counts once a suggestion is chosen: it writes the choice into a hidden input. */
export async function leverLocationPicked(page: Page): Promise<boolean> {
  const hidden = page.locator("#selected-location");
  if (!(await hidden.count())) return true; // not a Lever location widget
  return !!(await hidden.inputValue().catch(() => "")).trim();
}

/** Retype the city and choose a suggestion, by click and then by keyboard. Returns what Lever kept, or undefined. */
export async function ensureLeverLocation(page: Page, city: string): Promise<string | undefined> {
  const input = page.locator("#location-input");
  if (!(await input.count()) || !city) return undefined;
  for (const how of ["click", "keyboard"] as const) {
    await input.scrollIntoViewIfNeeded(); await input.fill(""); await input.pressSequentially(city, { delay: 45 + Math.random() * 40 });
    if (how === "click") await pickSuggestion(page, city, 8000);
    else { await page.locator(".dropdown-location").first().waitFor({ state: "visible", timeout: 8000 }).catch(() => {}); await input.press("ArrowDown"); await input.press("Enter"); await page.waitForTimeout(500); }
    if (await leverLocationPicked(page)) return input.inputValue();
  }
  return undefined;
}
