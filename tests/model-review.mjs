/** Comparable views use real camera controls and the same production scene. */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || "chrome",
  headless: true,
});
const output = "test-results/v06";
mkdirSync(output, { recursive: true });
const results = [];
try {
  for (const knight of ["authored", "imported"])
    for (const render of ["shaded", "ascii"]) {
      const page = await browser.newPage({
          viewport: { width: 1440, height: 900 },
        }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
      });
      await page.goto(
        `${process.env.TEST_ORIGIN || "http://localhost:5173"}/?diagnostics&compare&camera=legacy&posture=neutral&knight=${knight}&render=${render}`,
      );
      await page.waitForFunction(
        () => window.__lastBell?.snapshot().drawCalls > 0,
      );
      await page
        .getByRole("button", { name: "Settings", exact: true })
        .first()
        .click();
      await page.locator("#density").selectOption("1.4");
      await page.locator("#quality").selectOption("0.8");
      await page.getByRole("button", { name: "Close settings" }).click();
      await page
        .getByRole("button", { name: "Begin Journey", exact: true })
        .click();
      await page.evaluate(() => document.exitPointerLock());
      const orbit = async (dx) => {
        const start = dx < 0 ? 1250 : 100;
        await page.mouse.move(start, 450);
        await page.mouse.down({ button: "right" });
        await page.mouse.move(start + dx, 450, { steps: 30 });
        await page.mouse.up({ button: "right" });
        await page.waitForTimeout(1400);
      };
      await orbit(1150);
      await page.mouse.wheel(0, -300);
      await page.waitForTimeout(1200);
      await page.screenshot({
        path: `${output}/${knight}-${render}-front.png`,
      });
      await orbit(-575);
      await page.screenshot({ path: `${output}/${knight}-${render}-side.png` });
      await page.mouse.wheel(0, 850);
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${output}/${knight}-${render}-wide.png` });
      assert.deepEqual(
        errors,
        [],
        `${knight}/${render} console and page errors`,
      );
      results.push({
        knight,
        render,
        errors,
        snapshot: await page.evaluate(() => window.__lastBell.snapshot()),
      });
      await page.close();
    }
  writeFileSync(
    `${output}/model-review.json`,
    JSON.stringify(results, null, 2),
  );
  console.log(
    results.map(({ knight, render, errors }) => ({ knight, render, errors })),
  );
} finally {
  await browser.close();
}
