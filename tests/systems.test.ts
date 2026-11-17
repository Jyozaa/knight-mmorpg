import { test } from "node:test";
import assert from "node:assert/strict";
import { Vector3 } from "three";
import { damp, smoothstep, random } from "../src/config.ts";
import { heightAt, resolveObstacles } from "../src/world/terrain.ts";
import { CharacterController } from "../src/character/CharacterController.ts";
import { CinematicSystem } from "../src/cinematic/CinematicSystem.ts";
import { InteractionSystem } from "../src/systems/InteractionSystem.ts";
import type { Input } from "../src/systems/Input.ts";

const input = (keys: string[]): Input =>
  ({ keys: new Set(keys), consume: () => false }) as unknown as Input;
test("damping gives the same result at 30, 60 and 144 Hz", () => {
  const results = [30, 60, 144].map((hz) => {
    let x = 0;
    for (let i = 0; i < hz; i++) x = damp(x, 1, 7, 1 / hz);
    return x;
  });
  assert.ok(Math.max(...results) - Math.min(...results) < 1e-10);
});
test("seeded world generation is repeatable", () => {
  const a = random(9218),
    b = random(9218);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
});
test("smoothstep clamps poses and has smooth endpoints", () => {
  assert.equal(smoothstep(0, 3, -1), 0);
  assert.equal(smoothstep(0, 3, 4), 1);
  assert.ok(smoothstep(0, 3, 0.001) < 1e-6);
});
test("collision resolves penetration including an exact center overlap", () => {
  for (const start of [
    [0, 0],
    [0.3, 0.4],
    [-0.2, 0.8],
  ]) {
    const [x, z] = resolveObstacles(start[0], start[1], [
      { x: 0, z: 0, radius: 1 },
    ]);
    assert.ok(Math.hypot(x, z) >= 1.41999);
  }
  assert.deepEqual(resolveObstacles(999, -999, []), [150, -150]);
});
test("movement follows terrain; diagonal movement does not gain speed; run is faster", () => {
  const simulate = (keys: string[], hz = 60) => {
    const p = new CharacterController();
    for (let i = 0; i < hz; i++) p.update(1 / hz, input(keys), 0, []);
    assert.equal(p.position.y, heightAt(p.position.x, p.position.z));
    return p;
  };
  const walk = simulate(["KeyW"]),
    diag = simulate(["KeyW", "KeyD"]),
    run = simulate(["KeyW", "ShiftLeft"]);
  assert.ok(Math.abs(walk.speed - diag.speed) < 1e-10);
  assert.ok(run.speed > walk.speed * 1.8);
  assert.ok(
    Math.abs(walk.position.z - simulate(["KeyW"], 144).position.z) < 0.03,
  );
});
test("cinematic remains above terrain and reveals the wide landscape", () => {
  const c = new CinematicSystem();
  const origin = new Vector3(0, heightAt(0, -3), -3);
  c.start(origin, Math.PI);
  let maxDistance = 0;
  for (let i = 0; i < 3600; i++) {
    c.update(1 / 60);
    assert.ok(c.position.y >= heightAt(c.position.x, c.position.z) + 0.99);
    assert.ok(c.position.toArray().every(Number.isFinite));
    maxDistance = Math.max(maxDistance, c.position.distanceTo(origin));
  }
  assert.equal(c.time, 55);
  assert.ok(maxDistance > 100);
  c.stop();
  assert.equal(c.active, false);
});
test("interactions pick only the closest reachable target", () => {
  const system = new InteractionSystem();
  let called = "";
  for (const [id, x] of [
    ["far", 3],
    ["near", 1],
  ] as const)
    system.interactions.push({
      id,
      label: id,
      position: new Vector3(x, 0, 0),
      radius: 5,
      action: () => (called = id),
    });
  system.update(new Vector3());
  system.interact();
  assert.equal(called, "near");
  system.update(new Vector3(10, 0, 0));
  assert.equal(system.active, null);
});
