/** Deterministic source-level still studies; controlled pose time is never used in gameplay recordings. */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
try {
  await page.goto("http://localhost:5173/?diagnostics");
  await page.waitForFunction(() => window.__lastBell?.snapshot().drawCalls > 0);
  const result = await page.evaluate(async () => {
    const { World } = await import("/src/world/World.ts"),
      { Knight } = await import("/src/character/Knight.ts"),
      { WindSystem } = await import("/src/environment/WindSystem.ts"),
      { Cinematic25DCamera } =
        await import("/src/camera/Cinematic25DCamera.ts"),
      { CinematicSystem } = await import("/src/cinematic/CinematicSystem.ts"),
      { AsciiRenderer } = await import("/src/rendering/AsciiRenderer.ts"),
      { defaults } = await import("/src/config.ts"),
      { heightAt } = await import("/src/world/terrain.ts");
    const element = document.createElement("div");
    element.style.cssText = "position:fixed;inset:0;z-index:1000";
    document.body.append(element);
    const wind = new WindSystem(),
      world = new World(wind, true),
      knight = new Knight(wind, "imported", "weary", true);
    knight.root.position.set(0.808, heightAt(0.808, -5.022), -5.022);
    knight.root.rotation.y = Math.PI;
    world.scene.add(knight.root);
    const camera = new Cinematic25DCamera(
        knight.root.position.clone().set(0, heightAt(0, 7), 7),
      ),
      cinema = new CinematicSystem("2p5d");
    cinema.start(knight.root.position, 0);
    for (let i = 0; i < 60 * 56; i++) {
      cinema.update(1 / 60);
      wind.update(1 / 60, knight.root.position, camera.listeningPosition);
      knight.update(1 / 60, i / 60, 0, i / 60, 0);
      camera.cinematic(
        1 / 60,
        cinema.position,
        cinema.target,
        cinema.viewHeight,
      );
    }
    world.update(56, knight.root.position, camera.camera.position, {
      ...camera.composition,
      rest: 1,
      heading: Math.PI,
    });
    const shaded = new AsciiRenderer(
      element,
      { ...defaults, density: 1.4 },
      true,
      true,
    );
    shaded.render(
      world.scene,
      camera.camera,
      1 / 60,
      world.grass.group,
      knight.root,
    );
    window.study = {
      world,
      knight,
      camera,
      element,
      shaded,
      AsciiRenderer,
      defaults,
      Cinematic25DCamera,
      wind,
    };
    return {
      camera: camera.diagnostics,
      position: knight.root.position.toArray(),
      surface: knight.imported.inspectSurfaces(),
    };
  });
  mkdirSync("test-results/v07", { recursive: true });
  await page.screenshot({ path: "test-results/v07/study-wide-shaded.png" });
  await page.evaluate(() => {
    const s = window.study;
    s.shaded.renderer.domElement.style.display = "none";
    s.ascii = new s.AsciiRenderer(
      s.element,
      { ...s.defaults, density: 1.4 },
      false,
      true,
    );
    for (let i = 0; i < 10; i++)
      s.ascii.render(
        s.world.scene,
        s.camera.camera,
        1 / 60,
        s.world.grass.group,
        s.knight.root,
      );
  });
  await page.screenshot({ path: "test-results/v07/study-wide-ascii.png" });
  const history = await page.evaluate(() => {
    const s = window.study,
      before = s.ascii.historyDiagnostics.resets;
    const weak = new s.Cinematic25DCamera(s.knight.root.position, "weak");
    for (let i = 0; i < 120; i++)
      weak.cinematic(
        1 / 60,
        s.camera.camera.position,
        s.camera.target,
        s.camera.viewHeight,
      );
    s.world.update(56, s.knight.root.position, weak.camera.position, {
      ...weak.composition,
      rest: 1,
      heading: Math.PI,
    });
    s.ascii.render(
      s.world.scene,
      weak.camera,
      1 / 60,
      s.world.grass.group,
      s.knight.root,
    );
    return { before, ...s.ascii.historyDiagnostics };
  });
  assert.equal(history.resets, history.before + 1);
  assert.equal(history.reason, "camera");
  assert.deepEqual(errors, []);
  writeFileSync(
    "test-results/v07/composition-study.json",
    JSON.stringify({ result, errors, history }, null, 2),
  );
  console.log(result, errors);
} finally {
  await browser.close();
}
