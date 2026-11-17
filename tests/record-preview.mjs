/** Records actual rendered frames and the live master bus at the canvas's native 60 Hz.
 * All locomotion segments are uninterrupted, and no simulation time is advanced artificially. */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const folder = "test-results/v05";
mkdirSync(folder, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || "chrome",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }),
  errors = [],
  marks = {};
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const wait = (ms) => page.waitForTimeout(ms),
  snap = () => page.evaluate(() => window.__lastBell.snapshot());
let began = 0;
const mark = (n) => {
  marks[n] = (Date.now() - began) / 1000;
  console.log(n, marks[n]);
};
const shot = (n) => page.screenshot({ path: `${folder}/${n}.png` });
const orbit = async (dx, zoom = 0) => {
  await page.mouse.move(dx > 0 ? 150 : 1250, 440);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(dx > 0 ? 150 + dx : 1250 + dx, 440, { steps: 30 });
  await page.mouse.up({ button: "right" });
  if (zoom) await page.mouse.wheel(0, zoom);
  await wait(1300);
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
  await wait(1500);
  await page.evaluate(() => {
    const stream = window.__lastBell.captureStream(),
      mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm;codecs=vp8,opus";
    const recorder = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: 12500000,
        audioBitsPerSecond: 128000,
      }),
      chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    window.__recording = {
      recorder,
      chunks,
      settings: stream.getVideoTracks()[0].getSettings(),
      mime,
    };
    recorder.start(1000);
  });
  began = Date.now();
  mark("standing");
  await shot("back");
  await shot("grassy-hillside");
  await page.screenshot({
    path: `${folder}/grass-closeup.png`,
    clip: { x: 80, y: 510, width: 480, height: 340 },
  });
  await wait(3000);
  mark("standingEnd");
  // At least eight consecutive walking cycles, then multiple full running cycles from the side.
  mark("walk");
  await page.keyboard.down("d");
  await wait(4200);
  await shot("walking");
  await wait(4800);
  mark("walkEnd");
  mark("run");
  await page.keyboard.down("Shift");
  await wait(4000);
  await shot("running");
  await wait(3500);
  mark("runEnd");
  mark("turn");
  await page.keyboard.down("w");
  await wait(1300);
  await page.keyboard.up("d");
  await wait(1300);
  await shot("turning");
  await page.keyboard.down("a");
  await wait(1300);
  await page.keyboard.up("w");
  await wait(1000);
  await page.keyboard.up("a");
  await page.keyboard.up("Shift");
  await wait(1500);
  mark("turnEnd");
  // Camera-relative real input navigation back to the waystone; no teleporting.
  const held = new Set();
  for (let i = 0; i < 650; i++) {
    const s = await snap(),
      dx = -s.position[0],
      dz = -3 - s.position[2];
    if (Math.hypot(dx, dz) < 1.2) break;
    const desired = new Set(["Shift"]);
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
    await wait(70);
  }
  for (const k of held) await page.keyboard.up(k);
  await wait(1000);
  assert.equal((await snap()).restAvailable, true);
  // Set a consistent rear-facing pose with normal movement, before portrait orbits.
  await page.keyboard.down("w");
  await wait(800);
  await page.keyboard.up("w");
  await wait(700);
  await orbit(1100, -170);
  mark("portrait");
  await shot("front-closeup");
  await page.screenshot({
    path: `${folder}/armor-details.png`,
    clip: { x: 410, y: 180, width: 650, height: 590 },
  });
  await wait(1600);
  await orbit(-380);
  await shot("side-closeup");
  await shot("sheathed-sword");
  await wait(1200);
  mark("portraitEnd");
  await orbit(-720, 170);
  await shot("scarf");
  await page.keyboard.press("e");
  mark("restStart");
  await wait(3300);
  await shot("sitting");
  await wait(7400);
  mark("lying");
  await shot("resting");
  await wait(4000);
  mark("lyingEnd");
  await wait(22000);
  mark("wide");
  await shot("panorama");
  await wait(5000);
  mark("wideEnd");
  await wait(14000);
  assert.equal((await snap()).cinematicTime, 55);
  const capture = await page.evaluate(async () => {
    const r = window.__recording;
    await new Promise((resolve) => {
      r.recorder.onstop = resolve;
      r.recorder.stop();
    });
    const blob = new Blob(r.chunks, { type: r.mime });
    const encoded = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",").at(-1));
      reader.readAsDataURL(blob);
    });
    return { encoded, settings: r.settings, mime: r.mime };
  });
  writeFileSync(`${folder}/raw.webm`, Buffer.from(capture.encoded, "base64"));
  delete capture.encoded;
  writeFileSync(
    `${folder}/metrics.json`,
    JSON.stringify({ marks, capture, snapshot: await snap(), errors }, null, 2),
  );
  assert.deepEqual(errors, []);
} finally {
  writeFileSync(`${folder}/marks.json`, JSON.stringify(marks, null, 2));
  await browser.close();
}
