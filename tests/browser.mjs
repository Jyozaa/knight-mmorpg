import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, readFileSync, renameSync } from "node:fs";
import { verifyGpuWind } from "./windGpu.mjs";
import { PNG } from "pngjs";
mkdirSync("test-results", { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || "chrome",
  headless: true,
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  recordVideo: {
    dir: "test-results/video",
    size: { width: 1440, height: 900 },
  },
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
  assert.equal(start.sharedWind, true);
  result.gpuWind = await verifyGpuWind(page);
  await page.evaluate(() => {
    window.__windReview = { samples: [] };
    const began = performance.now();
    const timer = setInterval(() => {
      const s = window.__lastBell.snapshot();
      window.__windReview.samples.push({
        gust: s.wind.actor.gust,
        target: s.wind.audio.gain,
        actual: s.audio.wind,
        filterTarget: s.wind.audio.cutoff,
        filter: s.audio.windFilter,
        rustleTarget: s.wind.audio.rustleGain,
        rustle: s.audio.rustle,
      });
      if (performance.now() - began > 22000) clearInterval(timer);
    }, 100);
  });
  assert.ok(start.audio.rms > 0.000001);
  await page.screenshot({ path: "test-results/standing.png" });
  await page.screenshot({
    path: "test-results/grassy-hillside.png",
    clip: { x: 0, y: 210, width: 430, height: 570 },
  });
  const standing = PNG.sync.read(readFileSync("test-results/standing.png"));
  let black = 0,
    visible = 0;
  for (let y = 120; y < 850; y++)
    for (let x = 0; x < 1440; x++) {
      const index = (y * 1440 + x) * 4;
      const value = Math.max(...standing.data.subarray(index, index + 3));
      if (value < 12) black++;
      if (value > 60) visible++;
    }
  result.image = {
    blackFraction: black / (1440 * 730),
    visibleFraction: visible / (1440 * 730),
  };
  assert.ok(result.image.blackFraction > 0.72);
  assert.ok(visible > 3000);
  let red = 0,
    whiteArmor = 0;
  for (let y = 250; y < 800; y++)
    for (let x = 530; x < 950; x++) {
      const i = (y * 1440 + x) * 4,
        r = standing.data[i],
        g = standing.data[i + 1],
        b = standing.data[i + 2];
      if (r > 40 && r > g * 2 && r > b * 1.5) red++;
      if (r > 180 && g > 180 && b > 180) whiteArmor++;
    }
  result.image.redClothPixels = red;
  result.image.brightArmorPixels = whiteArmor;
  assert.ok(red > 220, `red scarf pixels ${red}`);
  assert.equal(start.animation.sword.drawn, false);
  assert.equal(start.animation.sword.mount, "pelvis");
  assert.equal(start.animation.scarf.tips.length, 3);
  assert.equal(start.animation.scarf.garments.tips.length, 4);
  assert.ok(start.audio.wind < 0.08);
  assert.deepEqual(
    [
      start.environment.trees,
      start.environment.lamps,
      start.environment.shield,
    ],
    [0, 0, false],
  );
  assert.equal(start.environment.grass.tiles, 729);
  assert.match(start.animation.source, /CMU full-body/);
  assert.ok(whiteArmor > 2500);
  await wait(180);
  const later = PNG.sync.read(await page.screenshot());
  let changed = 0;
  for (let i = 0; i < standing.data.length; i += 4)
    if (Math.abs(standing.data[i] - later.data[i]) > 35) changed++;
  result.image.changedPixelFraction = changed / (1440 * 900);
  assert.ok(result.image.changedPixelFraction < 0.14);
  // Real drag and wheel controls produce the close portrait, then restore the gameplay view.
  await page.evaluate(() => document.exitPointerLock());
  await page.mouse.move(150, 450);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(1300, 450, { steps: 30 });
  await page.mouse.up({ button: "right" });
  await page.mouse.wheel(0, -600);
  await wait(1700);
  await page.screenshot({ path: "test-results/knight-closeup.png" });
  await page.screenshot({
    path: "test-results/sheathed-sword.png",
    clip: { x: 400, y: 240, width: 580, height: 630 },
  });
  await page.screenshot({
    path: "test-results/ragged-scarf.png",
    clip: { x: 400, y: 180, width: 700, height: 460 },
  });
  await page.screenshot({
    path: "test-results/grass-closeup.png",
    clip: { x: 980, y: 520, width: 420, height: 340 },
  });
  await page.mouse.move(1300, 450);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(150, 450, { steps: 30 });
  await page.mouse.up({ button: "right" });
  await page.mouse.wheel(0, 600);
  await wait(800);
  await page.keyboard.down("w");
  await wait(3500);
  await page.screenshot({ path: "test-results/walking.png" });
  const walk = await snapshot();
  assert.ok(walk.position[2] < start.position[2] - 3);
  assert.ok(walk.speed > 1.25);
  assert.ok(walk.animation.fatigueLean > 0.025);
  await page.keyboard.down("Shift");
  await wait(700);
  await page.screenshot({ path: "test-results/running.png" });
  const run = await snapshot();
  await page.keyboard.up("w");
  await page.keyboard.up("Shift");
  result.walk = walk;
  result.run = run;
  assert.ok(run.speed > 3.3);
  await wait(450);
  assert.ok((await snapshot()).speed < 0.2);
  assert.equal((await snapshot()).restAvailable, true);
  assert.ok((await snapshot()).audio.footfallCount >= 6);
  await page.screenshot({ path: "test-results/hilltop.png" });
  log(
    "PASS menu, settings, credits, audio unlock, pointer lock, walking, running, deceleration, rest proximity",
  );
  await page.keyboard.press("e");
  await wait(3300);
  assert.equal((await snapshot()).screen, "cinematic");
  await page.screenshot({ path: "test-results/sitting.png" });
  await page.keyboard.press("Escape");
  await wait(200);
  const paused = await snapshot();
  assert.equal(paused.screen, "paused");
  await wait(400);
  assert.equal((await snapshot()).cinematicTime, paused.cinematicTime);
  assert.equal((await snapshot()).wind.time, paused.wind.time);
  await page.getByRole("button", { name: "Continue Journey" }).click();
  await wait(7500);
  const lying = await snapshot();
  assert.ok(lying.chestRotation < -1.5);
  assert.ok(lying.hipsY < 0.4);
  await page.screenshot({ path: "test-results/resting.png" });
  result.close = lying;
  log(
    "PASS rest, sitting, lying, cinematic camera, pause freezes timeline, resume",
  );
  await wait(29000);
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
  await page.keyboard.press("Backquote");
  await wait(2300);
  result.performance = (await snapshot()).performance;
  await page.keyboard.press("Backquote");
  assert.ok(wide.audio.breathing < lying.audio.breathing);
  assert.equal(wide.audio.windTarget, wide.wind.audio.gain);
  assert.equal(wide.audio.windFilterTarget, wide.wind.audio.cutoff);
  const windSamples = await page.evaluate(() => window.__windReview.samples);
  const correlate = (a, b) => {
    const ma = a.reduce((s, v) => s + v, 0) / a.length,
      mb = b.reduce((s, v) => s + v, 0) / b.length;
    let ab = 0,
      aa = 0,
      bb = 0;
    for (let i = 0; i < a.length; i++) {
      const da = a[i] - ma,
        db = b[i] - mb;
      ab += da * db;
      aa += da * da;
      bb += db * db;
    }
    return ab / Math.sqrt(aa * bb);
  };
  result.windCorrelation = {
    samples: windSamples.length,
    gustToAudibleGain: correlate(
      windSamples.map((s) => s.gust),
      windSamples.map((s) => s.actual),
    ),
    gainTracking: correlate(
      windSamples.map((s) => s.target),
      windSamples.map((s) => s.actual),
    ),
    filterTracking: correlate(
      windSamples.map((s) => s.filterTarget),
      windSamples.map((s) => s.filter),
    ),
    rustleTracking: correlate(
      windSamples.map((s) => s.rustleTarget),
      windSamples.map((s) => s.rustle),
    ),
  };
  assert.ok(result.windCorrelation.samples > 100);
  assert.ok(result.windCorrelation.gustToAudibleGain > 0.8);
  assert.ok(result.windCorrelation.gainTracking > 0.95);
  assert.ok(result.windCorrelation.filterTracking > 0.95);
  assert.ok(result.windCorrelation.rustleTracking > 0.94);
  log(
    "PASS shared GPU/CPU wind, visible gust/audio correlation, red cloth, silver readability and wind pause",
  );
  await wait(16500);
  assert.equal((await snapshot()).cinematicTime, 55);
  await page.screenshot({ path: "test-results/final-panorama.png" });
  log("PASS landscape pullback and closing quote");
  await page.getByRole("button", { name: "Return to the fields" }).click();
  await wait(6700);
  assert.equal((await snapshot()).screen, "playing");
  assert.ok((await snapshot()).hipsY > 0.95);
  assert.equal((await snapshot()).animation.state, "idle");
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
  const video = page.video();
  await browser.close();
  if (video)
    renameSync(await video.path(), "test-results/overhaul-motion.webm");
}
