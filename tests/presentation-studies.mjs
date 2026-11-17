/** Matched live idle comparisons. Real input/time; projection, posture and render remain independent. */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  results = [];
try {
  for (const [posture, projection, render] of [
    ["neutral", "orthographic", "shaded"],
    ["weary", "orthographic", "shaded"],
    ["neutral", "orthographic", "ascii"],
    ["weary", "orthographic", "ascii"],
    ["weary", "weak", "ascii"],
  ]) {
    const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(
      `http://localhost:4173/?diagnostics&camera=2p5d&posture=${posture}&projection=${projection}&render=${render}`,
    );
    await page.waitForFunction(
      () => window.__lastBell?.snapshot().drawCalls > 0,
    );
    await page
      .getByRole("button", { name: "Settings", exact: true })
      .first()
      .click();
    await page.locator("#density").selectOption("1.4");
    await page.getByRole("button", { name: "Close settings" }).click();
    await page
      .getByRole("button", { name: "Begin Journey", exact: true })
      .click();
    await page.evaluate(() => document.exitPointerLock());
    await page.waitForFunction(
      () => window.__lastBell.snapshot().wind.time >= 6,
    );
    mkdirSync("test-results/v07", { recursive: true });
    const name = `study-${posture}-${projection}-${render}`;
    await page.screenshot({ path: `test-results/v07/${name}.png` });
    const snapshot = await page.evaluate(() => window.__lastBell.snapshot());
    assert.deepEqual(errors, []);
    results.push({ name, snapshot, errors });
    await page.close();
  }
  writeFileSync(
    "test-results/v07/presentation-studies.json",
    JSON.stringify(results, null, 2),
  );
} finally {
  await browser.close();
}
