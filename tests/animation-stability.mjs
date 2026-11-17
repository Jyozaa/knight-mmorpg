/** Browser-loaded source rig, real imported skeleton, controlled numerical time steps. Not a video capture. */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || "chrome",
  headless: true,
});
try {
  const page = await browser.newPage();
  await page.goto("http://localhost:5173/?diagnostics");
  await page.waitForFunction(() => window.__lastBell?.snapshot().drawCalls > 0);
  const result = await page.evaluate(async () => {
    const { Knight } = await import("/src/character/Knight.ts"),
      { heightAt } = await import("/src/world/terrain.ts");
    const results = [];
    for (const hz of [30, 60, 144]) {
      const k = new Knight(undefined, "imported", "weary", true);
      k.root.position.set(0, heightAt(0, 7), 7);
      k.root.rotation.y = Math.PI;
      let maxFootError = 0,
        maxJointVelocity = 0,
        minTerrain = Infinity,
        previous = null,
        maxArmorAngle = 0;
      for (let i = 0; i < hz * 10; i++) {
        const t = i / hz,
          speed =
            t < 4 ? 1.35 : t < 8 ? 3.6 : Math.max(0, 3.6 * (1 - (t - 8) * 2));
        k.root.position.z -= speed / hz;
        k.root.position.y = heightAt(0, k.root.position.z);
        k.update(1 / hz, t, speed, null, 0);
        const s = k.imported.diagnostics;
        if (i > hz) {
          maxFootError = Math.max(maxFootError, ...s.footErrors);
          if (previous)
            s.jointPositions.forEach((v, j) => {
              maxJointVelocity = Math.max(
                maxJointVelocity,
                Math.hypot(...v.map((x, a) => x - previous[j][a])) * hz,
              );
            });
        }
        previous = s.jointPositions;
        maxArmorAngle = Math.max(maxArmorAngle, ...s.armorAngles.map(Math.abs));
        if (i % Math.round(hz * 0.25) === 0)
          minTerrain = Math.min(
            minTerrain,
            k.imported.inspectSurfaces().minimumTerrainClearance,
          );
      }
      const posture = k.animator.posture.diagnostics;
      const native = {
        shoulders: k.imported.diagnostics.shoulders,
        neckOffset: k.imported.diagnostics.neckOffset,
      };
      let minRestTerrain = Infinity,
        worstRest = null;
      for (let i = 0; i < hz * 10; i++) {
        k.update(1 / hz, 10 + i / hz, 0, i / hz, 0);
        if (i % Math.round(hz * 0.25) === 0) {
          const surface = k.imported.inspectSurfaces();
          if (surface.minimumTerrainClearance < minRestTerrain) {
            minRestTerrain = surface.minimumTerrainClearance;
            worstRest = { time: i / hz, ...surface };
          }
        }
      }
      results.push({
        hz,
        posture,
        native,
        minRestTerrain,
        worstRest,
        maxFootError,
        maxJointVelocity,
        minTerrain,
        maxArmorAngle,
      });
    }
    return results;
  });
  mkdirSync("test-results/v07", { recursive: true });
  writeFileSync(
    "test-results/v07/animation-stability.json",
    JSON.stringify(result, null, 2),
  );
  console.log(result);
  for (const r of result) {
    assert.ok(
      r.maxFootError < 0.035,
      `${r.hz} Hz ankle reach ${r.maxFootError}`,
    );
    assert.ok(r.minTerrain > -0.04, `${r.hz} Hz terrain ${r.minTerrain}`);
    assert.ok(
      r.minRestTerrain > -0.04,
      `${r.hz} Hz rest terrain ${r.minRestTerrain}`,
    );
    assert.ok(r.maxArmorAngle < 0.03);
    assert.ok(r.posture.weight > 0.8);
    assert.ok(r.native.shoulders.every((x) => x > 0.06 && x < 0.1));
    assert.ok(r.native.neckOffset > 0.012);
    assert.ok(
      r.maxJointVelocity < 20,
      `${r.hz} Hz joint spike ${r.maxJointVelocity}`,
    );
  }
} finally {
  await browser.close();
}
