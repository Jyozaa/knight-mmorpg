/** Matched A/B route: real keyboard controls, simulation time and master-bus audio. */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";
const folder = "test-results/v07";
mkdirSync(folder, { recursive: true });
const modes = process.env.CAPTURE_MODE
  ? [process.env.CAPTURE_MODE]
  : ["legacy", "2p5d"];
for (const camera of modes) {
  const browser = await chromium.launch({ channel: "chrome", headless: true }),
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const snap = () => page.evaluate(() => window.__lastBell.snapshot()),
    wait = (ms) => page.waitForTimeout(ms),
    marks = {},
    checkpoints = {};
  try {
    await page.goto(
      `http://localhost:4173/?diagnostics&camera=${camera}&posture=${camera === "legacy" ? "neutral" : "weary"}&render=${process.env.RENDER || "ascii"}`,
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
    await page.waitForFunction(
      () => window.__lastBell.snapshot().wind.time >= 6,
    );
    assert.equal((await snap()).audio.foley.loaded, 14);
    await page.evaluate(() => {
      const stream = window.__lastBell.captureStream(),
        recorder = new MediaRecorder(stream, {
          mimeType: "video/webm;codecs=vp8,opus",
          videoBitsPerSecond: 9000000,
        });
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      window.recording = { recorder, chunks, began: performance.now() };
      recorder.start();
    });
    const mark = async (name) => {
      marks[name] = await page.evaluate(
        () => (performance.now() - window.recording.began) / 1000,
      );
      checkpoints[name] = await snap();
      console.log(
        camera,
        name,
        checkpoints[name].position.map((x) => x.toFixed(3)),
        checkpoints[name].cinematicTime.toFixed(2),
      );
    };
    const forward = camera === "legacy" ? "w" : "d",
      back = camera === "legacy" ? "s" : "a";
    await mark("idle");
    await wait(2000);
    await mark("walk");
    await page.keyboard.down(forward);
    await wait(4000);
    await mark("walkEnd");
    await mark("run");
    await page.keyboard.down("Shift");
    await wait(3000);
    await page.keyboard.up("Shift");
    await page.keyboard.up(forward);
    await mark("runEnd");
    await wait(1200);
    await mark("stop");
    await mark("turn");
    await page.keyboard.down(back);
    await wait(4500);
    await page.keyboard.up(back);
    await mark("turnEnd");
    await page.keyboard.down(forward);
    await wait(1500);
    await page.keyboard.up(forward);
    await wait(1200);
    await mark("beforeRest");
    assert.equal((await snap()).restAvailable, true);
    await page.keyboard.press("e");
    await mark("rest");
    await wait(3200);
    await mark("sit");
    await wait(7000);
    await mark("lie");
    await page.waitForFunction(
      () => window.__lastBell.snapshot().cinematicTime === 55,
      {},
      { timeout: 65000 },
    );
    await mark("wide");
    await wait(1800);
    await page.getByRole("button", { name: "Return to the fields" }).click();
    await mark("return");
    await wait(6800);
    await mark("end");
    assert.equal((await snap()).screen, "playing");
    assert.deepEqual(errors, []);
    const data = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const { recorder, chunks } = window.recording;
          recorder.onstop = () => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(",").at(-1));
            reader.readAsDataURL(new Blob(chunks, { type: recorder.mimeType }));
          };
          recorder.stop();
        }),
    );
    const name = `${camera}-${process.env.RENDER || "ascii"}`;
    writeFileSync(`${folder}/${name}.webm`, Buffer.from(data, "base64"));
    writeFileSync(
      `${folder}/${name}.json`,
      JSON.stringify({ camera, marks, checkpoints, errors }, null, 2),
    );
  } finally {
    await browser.close();
  }
}
if (modes.length === 2) {
  const a = JSON.parse(readFileSync(`${folder}/legacy-ascii.json`)),
    b = JSON.parse(readFileSync(`${folder}/2p5d-ascii.json`));
  const route = {};
  for (const name of Object.keys(a.checkpoints)) {
    const distance = Math.hypot(
      ...a.checkpoints[name].position.map(
        (x, i) => x - b.checkpoints[name].position[i],
      ),
    );
    route[name] = distance;
    assert.ok(distance < 0.25, `${name}: world-route mismatch ${distance} m`);
  }
  writeFileSync(`${folder}/matched-route.json`, JSON.stringify(route, null, 2));
  console.log("Matched route deltas (m)", route);
}
