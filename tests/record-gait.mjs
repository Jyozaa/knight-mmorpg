/** Uninterrupted real-input shaded/ASCII gait capture with the actual master audio bus. */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const name = process.env.NAME || "v06-shaded",
  browser = await chromium.launch({ channel: "chrome", headless: true }),
  page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto(
  process.env.TEST_URL || "http://localhost:4173/?diagnostics&render=shaded",
);
await page.waitForFunction(() => window.__lastBell?.snapshot().drawCalls > 0);
await page.getByRole("button", { name: "Begin Journey", exact: true }).click();
await page.evaluate(() => document.exitPointerLock());
await page.waitForTimeout(1300);
await page.evaluate(() => {
  const stream = window.__lastBell.captureStream(),
    r = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp8,opus",
      videoBitsPerSecond: 5500000,
    });
  window.record = { r, chunks: [] };
  r.ondataavailable = (e) => window.record.chunks.push(e.data);
  r.start();
});
await page.keyboard.down("d");
await page.waitForTimeout(7500);
await page.screenshot({ path: `test-results/v06/${name}-walk.png` });
await page.keyboard.down("Shift");
await page.waitForTimeout(6500);
await page.screenshot({ path: `test-results/v06/${name}-run.png` });
await page.keyboard.up("Shift");
await page.keyboard.up("d");
await page.waitForTimeout(2000);
const snapshot = await page.evaluate(() => window.__lastBell.snapshot());
const data = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const { r, chunks } = window.record;
      r.onstop = () => {
        const f = new FileReader();
        f.onload = () => resolve(f.result.split(",").at(-1));
        f.readAsDataURL(new Blob(chunks, { type: r.mimeType }));
      };
      r.stop();
    }),
);
writeFileSync(`test-results/v06/${name}.webm`, Buffer.from(data, "base64"));
writeFileSync(
  `test-results/v06/${name}.json`,
  JSON.stringify({ errors, snapshot }, null, 2),
);
await browser.close();
console.log(name, errors);
assert.deepEqual(errors, []);
