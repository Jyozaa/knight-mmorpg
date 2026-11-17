import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("test-results", { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || "chrome",
  headless: true,
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const errors = [],
  messages = [],
  result = {};
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
const snapshot = () => page.evaluate(() => window.__lastBell.snapshot());
const wait = (ms) => page.waitForTimeout(ms);
const key = async (code, ms) => {
  await page.keyboard.down(code);
  await wait(ms);
  await page.keyboard.up(code);
};
const log = (message) => {
  messages.push(message);
  console.log(message);
};
try {
  await page.goto(process.env.TEST_URL || "http://localhost:5173/?diagnostics");
  await page.waitForFunction(() => window.__lastBell?.snapshot().drawCalls > 0);
  await wait(1800);
  assert.equal((await snapshot()).screen, "menu");
  await page.screenshot({ path: "test-results/menu.png" });
  await page
    .getByRole("button", { name: "Settings", exact: true })
    .first()
    .click();
  await page.locator("#density").selectOption("1.4");
  assert.ok((await snapshot()).columns > 350);
  await page.locator("#quality").selectOption("0.5");
  await page.locator("#master").fill("0.45");
  await page.getByRole("button", { name: "Close settings" }).click();
  await page.getByRole("button", { name: "Credits", exact: true }).click();
  assert.ok(
    await page
      .getByText("The five-chapter story is still to come.", { exact: false })
      .isVisible(),
  );
  await page.getByRole("button", { name: "Close credits" }).click();
  await page.getByRole("button", { name: "Begin Journey" }).click();
  await wait(1000);
  assert.equal((await snapshot()).screen, "playing");
  assert.equal((await snapshot()).audioContextState, "running");
  assert.ok(await page.evaluate(() => !!document.pointerLockElement));
  const start = await snapshot();
  assert.ok(start.audio.rms > 0.000001);
  await key("w", 1200);
  const walk = await snapshot();
  assert.ok(walk.position[2] < start.position[2] - 2);
  assert.ok(walk.speed > 2.5);
  await page.keyboard.down("Shift");
  await key("w", 700);
  await page.keyboard.up("Shift");
  const run = await snapshot();
  assert.ok(run.speed > 5);
  await wait(450);
  assert.ok((await snapshot()).speed < 0.2);
  assert.equal((await snapshot()).restAvailable, true);
  await page.screenshot({ path: "test-results/hilltop.png" });
  log(
    "PASS menu, settings, credits, audio unlock, pointer lock, walking, running, deceleration, rest proximity",
  );
  await page.keyboard.press("e");
  await wait(2000);
  assert.equal((await snapshot()).screen, "cinematic");
  await page.screenshot({ path: "test-results/sitting.png" });
  await page.keyboard.press("Escape");
  await wait(200);
  const paused = await snapshot();
  assert.equal(paused.screen, "paused");
  await wait(400);
  assert.equal((await snapshot()).cinematicTime, paused.cinematicTime);
  await page.getByRole("button", { name: "Continue Journey" }).click();
  await wait(6500);
  const lying = await snapshot();
  assert.ok(lying.hipsRotation < -1.3);
  assert.ok(lying.hipsY < 0.4);
  await page.screenshot({ path: "test-results/resting.png" });
  result.close = lying;
  log(
    "PASS rest, sitting, lying, cinematic camera, pause freezes timeline, resume",
  );
  await wait(33000);
  const wide = await snapshot();
  assert.ok(wide.cinematicTime > 38);
  assert.ok(
    Math.hypot(
      wide.camera[0] - wide.position[0],
      wide.camera[2] - wide.position[2],
    ) > 45,
  );
  await page.screenshot({ path: "test-results/landscape.png" });
  result.wide = wide;
  assert.ok(wide.audio.breathing < lying.audio.breathing);
  assert.ok(wide.audio.wind > lying.audio.wind);
  await wait(15500);
  assert.equal((await snapshot()).cinematicTime, 55);
  await page.screenshot({ path: "test-results/final-panorama.png" });
  log("PASS landscape pullback and closing quote");
  await page.getByRole("button", { name: "Return to the fields" }).click();
  await wait(4000);
  assert.equal((await snapshot()).screen, "playing");
  assert.ok(Math.abs((await snapshot()).hipsRotation) < 0.01);
  const still = await snapshot();
  await key("Space", 180);
  await wait(500);
  const dodged = await snapshot();
  assert.ok(
    Math.hypot(
      dodged.position[0] - still.position[0],
      dodged.position[2] - still.position[2],
    ) > 2,
  );
  await page.evaluate(() => document.exitPointerLock());
  await page.mouse.move(900, 500);
  await page.mouse.down();
  await page.mouse.move(1100, 550, { steps: 12 });
  await page.mouse.up();
  await wait(700);
  const orbited = await snapshot();
  assert.ok(Math.abs(orbited.camera[0] - dodged.camera[0]) > 1);
  await page.keyboard.press("f");
  await wait(300);
  assert.ok(await page.evaluate(() => !!document.fullscreenElement));
  await page.keyboard.press("f");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.locator("#density").selectOption("1");
  await page.locator("#quality").selectOption("0.8");
  await page.getByRole("button", { name: "Close settings" }).click();
  await page.getByRole("button", { name: "Return to title" }).click();
  for (const width of [1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await wait(400);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({ path: `test-results/menu-${width}.png` });
  }
  await page.reload();
  await page.waitForFunction(() => window.__lastBell);
  assert.equal((await snapshot()).settings.master, 0.45);
  log(
    "PASS stand up, evade, drag orbit, fullscreen, return to title, resize, persisted settings",
  );
  assert.deepEqual(errors, []);
  result.errors = errors;
  result.checks = messages;
  writeFileSync(
    "test-results/browser-results.json",
    JSON.stringify(result, null, 2),
  );
} finally {
  await browser.close();
}
