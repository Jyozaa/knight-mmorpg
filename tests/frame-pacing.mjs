/** Clean active-play timing: no screenshots, video encoder, interpolation or artificial simulation time. */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  results = [];
try {
  for (const camera of ["legacy", "2p5d"]) {
    const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`http://localhost:4173/?diagnostics&camera=${camera}`);
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
    await page.waitForTimeout(5000);
    await page.keyboard.press("Backquote");
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      const began = performance.now();
      window.pacing = {
        began,
        stage: "idle",
        frames: [],
        longTasks: [],
        performance: [],
      };
      window.timingObserver = new PerformanceObserver((list) => {
        for (const e of list.getEntries())
          window.pacing.longTasks.push({
            time: e.startTime - began,
            duration: e.duration,
            name: e.name,
          });
      });
      window.timingObserver.observe({ type: "longtask", buffered: false });
      let previous = 0;
      function sample(now) {
        const p = window.pacing;
        if (p.done) return;
        if (previous)
          p.frames.push({
            time: now - began,
            ms: now - previous,
            stage: p.stage,
          });
        previous = now;
        requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
      window.pacingTimer = setInterval(
        () =>
          window.pacing.performance.push(
            window.__lastBell.snapshot().performance,
          ),
        1000,
      );
    });
    const stage = async (name, key, ms, run = false) => {
      await page.evaluate((name) => (window.pacing.stage = name), name);
      if (run) await page.keyboard.down("Shift");
      if (key) await page.keyboard.down(key);
      await page.waitForTimeout(ms);
      if (key) await page.keyboard.up(key);
      if (run) await page.keyboard.up("Shift");
    };
    const forward = camera === "legacy" ? "w" : "d",
      back = camera === "legacy" ? "s" : "a";
    await stage("idle", null, 3000);
    await stage("walk", forward, 4000);
    await stage("run", forward, 3000, true);
    await stage("stop", null, 1200);
    await stage("turn", back, 4500);
    await stage("return-facing", forward, 1500);
    await stage("stop", null, 1200);
    assert.equal(
      (await page.evaluate(() => window.__lastBell.snapshot())).restAvailable,
      true,
    );
    await page.keyboard.press("e");
    await stage("sit/recline", null, 11000);
    const data = await page.evaluate(() => {
      window.pacing.done = true;
      clearInterval(window.pacingTimer);
      window.timingObserver.disconnect();
      return window.pacing;
    });
    const summarize = (frames) => {
      const s = frames.map((f) => f.ms).sort((a, b) => a - b),
        q = (p) => s[Math.ceil(s.length * p) - 1];
      return {
        frames: s.length,
        p50: q(0.5),
        p95: q(0.95),
        p99: q(0.99),
        max: q(1),
        over25: s.filter((x) => x > 25).length,
        over33: s.filter((x) => x > 33.34).length,
        over50: s.filter((x) => x > 50).length,
      };
    };
    const stats = summarize(data.frames),
      stages = Object.fromEntries(
        [...new Set(data.frames.map((x) => x.stage))].map((stage) => [
          stage,
          summarize(data.frames.filter((x) => x.stage === stage)),
        ]),
      );
    const result = {
      camera,
      stats,
      stages,
      longTasks: data.longTasks,
      outliers: data.frames.filter((x) => x.ms > 25),
      submission: data.performance,
      errors,
    };
    results.push(result);
    console.log(camera, stats, "long tasks", data.longTasks);
    assert.deepEqual(errors, []);
    assert.ok(stats.p95 < 25);
    assert.ok(stats.p99 < 34);
    await page.close();
  }
  mkdirSync("test-results/v07", { recursive: true });
  writeFileSync(
    "test-results/v07/frame-pacing.json",
    JSON.stringify(results, null, 2),
  );
} finally {
  await browser.close();
}
