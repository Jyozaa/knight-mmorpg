/** Production presentation gates. Real input/time; no actor teleport or cinematic clock override. */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import * as T from "three";
import { verifyGpuWind, verifyGrassContact } from "./windGpu.mjs";
import { WIND_GLSL } from "../src/world/Grass.ts";
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || "chrome",
  headless: true,
});
const origin = process.env.TEST_ORIGIN || "http://localhost:4173",
  folder = "test-results/v07";
mkdirSync(folder, { recursive: true });
const results = [];
try {
  for (const variant of [
    {
      camera: "2p5d",
      posture: "weary",
      projection: "orthographic",
      render: "ascii",
    },
    { camera: "2p5d", posture: "neutral", projection: "weak", render: "ascii" },
    { camera: "legacy", posture: "weary", render: "shaded" },
  ]) {
    const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    const snap = () => page.evaluate(() => window.__lastBell.snapshot()),
      wait = (ms) => page.waitForTimeout(ms);
    await page.goto(
      `${origin}/?diagnostics&compare&${new URLSearchParams(variant)}`,
    );
    await page.waitForFunction(
      () => window.__lastBell?.snapshot().drawCalls > 0,
    );
    assert.equal(
      await page
        .getByRole("link", { name: "Neutral posture", exact: true })
        .count(),
      1,
    );
    await page
      .getByRole("button", { name: "Settings", exact: true })
      .first()
      .click();
    await page.locator("#density").selectOption("1.4");
    await page.getByRole("button", { name: "Close settings" }).click();
    await wait(1000);
    await page.screenshot({
      path: `${folder}/${variant.camera}-${variant.posture}-${variant.render}-menu.png`,
    });
    await page
      .getByRole("button", { name: "Begin Journey", exact: true })
      .click();
    await page.evaluate(() => document.exitPointerLock());
    await wait(1800);
    const start = await snap();
    assert.equal(start.cameraMode, variant.camera);
    assert.equal(start.postureMode, variant.posture);
    assert.equal(start.audio.foley.loaded, 14);
    assert.equal(start.audioContextState, "running");
    assert.equal(start.sharedWind, true);
    const posture = start.animation.posture;
    assert.ok(
      variant.posture === "weary"
        ? posture.weight > 0.99
        : posture.weight === 0,
    );
    assert.ok(start.animation.appearance.footErrors.every((x) => x < 0.035));
    assert.ok(
      start.animation.appearance.shoulders.every((x) =>
        variant.posture === "weary" ? x > 0.08 : x < 1e-5,
      ),
    );
    const image = PNG.sync.read(
      await page.screenshot({
        path: `${folder}/${variant.camera}-${variant.posture}-${variant.render}-idle.png`,
      }),
    );
    if (variant.render === "ascii") {
      let dark = 0,
        red = 0,
        white = 0;
      for (let y = 170; y < 850; y++)
        for (let x = 0; x < 1440; x++) {
          const i = (y * 1440 + x) * 4,
            [r, g, b] = image.data.subarray(i, i + 3);
          if (Math.max(r, g, b) < 12) dark++;
          if (r > 40 && r > g * 2 && r > b * 1.5) red++;
          if (r > 180 && g > 180 && b > 180) white++;
        }
      results.push({
        variant,
        image: { darkFraction: dark / (1440 * 680), red, white },
      });
      assert.ok(dark / (1440 * 680) > 0.72);
      assert.ok(red > 100);
      assert.ok(white > 900);
    }
    if (variant.camera === "2p5d") {
      if (variant.projection === "orthographic")
        results.push({
          wind: await verifyGpuWind(page),
          grassContact: await verifyGrassContact(page, WIND_GLSL),
        });
      const before = start.history.resets;
      await page.setViewportSize({ width: 768, height: 900 });
      await wait(350);
      assert.ok((await snap()).history.resets > before);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.setViewportSize({ width: 390, height: 844 });
      await wait(350);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.setViewportSize({ width: 1440, height: 900 });
      await wait(350);
      await page.mouse.move(100, 450);
      await page.mouse.down({ button: "right" });
      await page.mouse.move(1350, 800, { steps: 20 });
      await page.mouse.up({ button: "right" });
      const orbit = await snap();
      assert.ok(Math.abs(orbit.composition.yaw - 2) <= 0.05501);
      await page.mouse.move(1350, 800);
      await page.mouse.down({ button: "right" });
      await page.mouse.move(100, 450, { steps: 20 });
      await page.mouse.up({ button: "right" });
      await page.keyboard.down("d");
      await wait(3500);
      const walk = await snap();
      assert.ok(walk.position[2] < start.position[2] - 3);
      assert.ok(walk.speed > 1.25);
      assert.ok(
        variant.posture === "neutral"
          ? walk.animation.posture.weight === 0
          : walk.animation.posture.weight > 0.95,
      );
      await page.keyboard.down("Shift");
      await wait(700);
      const run = await snap();
      assert.ok(run.speed > 3.3);
      if (variant.posture === "weary")
        assert.ok(run.animation.posture.weight > 0.83);
      await page.keyboard.up("Shift");
      await page.keyboard.up("d");
      await wait(600);
      assert.ok((await snap()).speed < 0.1);
      assert.equal((await snap()).restAvailable, true);
      assert.ok((await snap()).audio.foley.brushes > 2);
      if (variant.projection === "orthographic") {
        await page.keyboard.press("e");
        await wait(3200);
        const sit = await snap();
        assert.equal(sit.screen, "cinematic");
        assert.ok(sit.animation.posture.weight < 0.85);
        await page.screenshot({ path: `${folder}/sitting.png` });
        await page.keyboard.press("Escape");
        await wait(150);
        const pause = await snap();
        await wait(400);
        assert.equal((await snap()).wind.time, pause.wind.time);
        assert.equal((await snap()).cinematicTime, pause.cinematicTime);
        await page.getByRole("button", { name: "Continue Journey" }).click();
        await page.waitForFunction(
          () => window.__lastBell.snapshot().cinematicTime > 10,
        );
        const lie = await snap();
        assert.ok(lie.chestRotation < -1.5);
        assert.ok(lie.animation.posture.weight < 0.001);
        const surface = await page.evaluate(() =>
          window.__lastBell.inspectCharacter(),
        );
        assert.ok(surface.minimumTerrainClearance > -0.01);
        await page.screenshot({ path: `${folder}/reclining.png` });
        await page.waitForFunction(
          () => window.__lastBell.snapshot().cinematicTime === 55,
          {},
          { timeout: 65000 },
        );
        const wide = await snap();
        assert.ok(wide.composition.viewHeight > 15.5);
        assert.equal(wide.environment.grass.tiles, 729);
        const wideImage = PNG.sync.read(
          await page.screenshot({ path: `${folder}/wide.png` }),
        );
        // Locate the actual reclining body through the same orthographic projection, then require lit glyphs there.
        const cam = new T.OrthographicCamera(
          -wide.composition.viewHeight * 0.8,
          wide.composition.viewHeight * 0.8,
          wide.composition.viewHeight / 2,
          -wide.composition.viewHeight / 2,
          0.1,
          450,
        );
        cam.position.fromArray(wide.camera);
        cam.lookAt(new T.Vector3().fromArray(wide.composition.target));
        cam.updateMatrixWorld();
        const center = new T.Vector3().fromArray(wide.position);
        center.y += 0.3;
        const uv = center.project(cam),
          px = (uv.x * 0.5 + 0.5) * 1440,
          py = (0.5 - uv.y * 0.5) * 900;
        let bodyPixels = 0;
        for (let y = Math.floor(py - 20); y < py + 20; y++)
          for (let x = Math.floor(px - 30); x < px + 30; x++) {
            if (x < 0 || y < 0 || x >= 1440 || y >= 900) continue;
            const i = (y * 1440 + x) * 4;
            if (Math.max(...wideImage.data.subarray(i, i + 3)) > 65)
              bodyPixels++;
          }
        assert.ok(
          bodyPixels > 100,
          `wide body glyphs ${bodyPixels} at ${px},${py}`,
        );
        const beforeReturn = wide.camera;
        await page
          .getByRole("button", { name: "Return to the fields" })
          .click();
        await wait(100);
        const first = await snap();
        assert.ok(
          Math.hypot(...first.camera.map((v, i) => v - beforeReturn[i])) < 15,
          "return must ease translation, not teleport from the wide shot",
        );
        await wait(6800);
        const returned = await snap();
        assert.equal(returned.screen, "playing");
        assert.ok(returned.composition.viewHeight < 4.8);
        assert.ok(returned.animation.posture.weight > 0.99);
        assert.ok(returned.hipsY > 0.8);
        await page.screenshot({ path: `${folder}/returned.png` });
        results.push({
          variant,
          start,
          walk,
          run,
          sit,
          lie,
          surface,
          wide,
          bodyPixels,
          returned,
        });
      }
      const beforeEvade = await snap();
      await page.keyboard.press("Space");
      await wait(120);
      assert.ok(
        Math.hypot(
          ...(await snap()).position.map((v, i) => v - beforeEvade.position[i]),
        ) > 0.1,
      );
      await page.keyboard.down("w");
      await wait(8000);
      await page.keyboard.up("w");
      await wait(400);
      assert.ok(Math.abs((await snap()).position[0]) <= 3.50001);
    }
    assert.deepEqual(errors, []);
    results.push({ variant, errors, final: await snap() });
    await page.close();
  }
  writeFileSync(
    `${folder}/browser-results.json`,
    JSON.stringify(results, null, 2),
  );
  console.log(
    "PASS 2.5D/weak/legacy, independent posture/render, real-input route, rest 55 s, return, resize, audio/wind, image guards",
  );
} finally {
  await browser.close();
}
