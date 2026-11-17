/** Real inputs and real-time timeline. Raw recording is ignored; compressed review edit is committed. */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, renameSync } from "node:fs";
import assert from "node:assert/strict";
mkdirSync("test-results/preview", { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || "chrome",
  headless: true,
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  recordVideo: {
    dir: "test-results/preview",
    size: { width: 1440, height: 900 },
  },
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const wait = (ms) => page.waitForTimeout(ms),
  snap = () => page.evaluate(() => window.__lastBell.snapshot());
const marks = {};
const began = Date.now();
const mark = (name) => {
  marks[name] = (Date.now() - began) / 1000;
  console.log(name, marks[name]);
};
const orbit = async (dx, zoom = 0) => {
  await page.mouse.move(600, 450);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(600 + dx, 450, { steps: 30 });
  await page.mouse.up({ button: "right" });
  if (zoom) await page.mouse.wheel(0, zoom);
  await wait(1400);
};

try {
  await page.goto(process.env.TEST_URL || "http://localhost:4173/?diagnostics");
  await page.waitForFunction(() => window.__lastBell?.snapshot().drawCalls > 0);
  await wait(1000);
  await page
    .getByRole("button", { name: "Settings", exact: true })
    .first()
    .click();
  await page.locator("#density").selectOption("1.4");
  await page.locator("#quality").selectOption("0.8");
  await page.getByRole("button", { name: "Close settings" }).click();
  await page.getByRole("button", { name: "Begin Journey" }).click();
  await page.evaluate(() => document.exitPointerLock());
  await wait(1300);
  mark("standing");
  await page.screenshot({ path: "test-results/preview/standing.png" });
  await wait(2200);
  // Sideways travel shows a genuine profile gait, followed by diagonal and frontal turns.
  mark("walk");
  await page.keyboard.down("d");
  await wait(2700);
  await page.screenshot({ path: "test-results/preview/walking.png" });
  mark("run");
  await page.keyboard.down("Shift");
  await wait(2600);
  await page.screenshot({ path: "test-results/preview/running.png" });
  mark("turn");
  await page.keyboard.down("w");
  await wait(900);
  await page.keyboard.up("d");
  await wait(900);
  await page.keyboard.down("a");
  await wait(1000);
  await page.keyboard.up("w");
  await wait(800);
  await page.keyboard.up("a");
  await page.keyboard.up("Shift");
  await wait(1600);
  mark("travelEnd");
  // Return to the actual waystone by reading position and pressing real movement keys.
  const held = new Set();
  for (let i = 0; i < 350; i++) {
    const s = await snap(),
      dx = -s.position[0],
      dz = -3 - s.position[2];
    if (Math.hypot(dx, dz) < 1.2) break;
    const desired = new Set();
    if (dx > 0.45) desired.add("d");
    if (dx < -0.45) desired.add("a");
    if (dz > 0.45) desired.add("s");
    if (dz < -0.45) desired.add("w");
    for (const k of held)
      if (!desired.has(k)) {
        await page.keyboard.up(k);
        held.delete(k);
      }
    for (const k of desired)
      if (!held.has(k)) {
        await page.keyboard.down(k);
        held.add(k);
      }
    await wait(60);
  }
  for (const k of held) await page.keyboard.up(k);
  await wait(900);
  assert.equal((await snap()).restAvailable, true);
  // Three-quarter portrait leaves room for the narrow tails and hip sword.
  await orbit(430, -240);
  mark("equipment");
  await page.screenshot({ path: "test-results/preview/equipment.png" });
  await wait(3000);
  mark("equipmentEnd");
  await orbit(-430, 240);
  await page.keyboard.press("e");
  mark("restStart");
  await wait(3300);
  await page.screenshot({ path: "test-results/preview/sitting.png" });
  await wait(7400);
  mark("lying");
  await page.screenshot({ path: "test-results/preview/resting.png" });
  await wait(4200);
  mark("lyingEnd");
  await wait(22000);
  mark("wide");
  await page.screenshot({ path: "test-results/preview/landscape.png" });
  await wait(4800);
  mark("wideEnd");
  await wait(14000);
  assert.equal((await snap()).cinematicTime, 55);
  writeFileSync(
    "test-results/preview/metrics.json",
    JSON.stringify({ marks, snapshot: await snap(), errors }, null, 2),
  );
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  renameSync(await page.video().path(), "test-results/preview/raw.webm");
  writeFileSync(
    "test-results/preview/marks.json",
    JSON.stringify(marks, null, 2),
  );
}
