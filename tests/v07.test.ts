import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as T from "three";
import {
  Cinematic25DCamera,
  SIDE_YAW,
} from "../src/camera/Cinematic25DCamera.ts";
import {
  CharacterController,
  DEPTH_CORRIDOR,
} from "../src/character/CharacterController.ts";
import { CinematicSystem } from "../src/cinematic/CinematicSystem.ts";
import { Knight } from "../src/character/Knight.ts";
import { prepareArmor } from "../src/character/model/buildArmor.ts";
import { FramePacing } from "../src/diagnostics/FramePacing.ts";
import type { Input } from "../src/systems/Input.ts";
import { heightAt } from "../src/world/terrain.ts";
Object.assign(globalThis, { innerWidth: 1440, innerHeight: 900 });
await prepareArmor(
  Uint8Array.from(readFileSync("public/models/nameless-knight.glb")).buffer,
);
const input = (...keys: string[]) =>
  ({ keys: new Set(keys), consume: () => false }) as unknown as Input;
test("2.5D controls travel screen-horizontal, constrain depth, and preserve obstacle separation", () => {
  const c = new CharacterController("2p5d"),
    start = c.position.clone();
  for (let i = 0; i < 240; i++) c.update(1 / 60, input("KeyD"), SIDE_YAW, []);
  assert.ok(c.position.z < start.z - 4.5);
  assert.ok(Math.abs(c.position.x) < 0.001);
  assert.ok(Math.abs(c.speed - 1.35) < 0.005);
  for (let i = 0; i < 2000; i++) c.update(1 / 60, input("KeyW"), SIDE_YAW, []);
  assert.ok(Math.abs(c.position.x) <= DEPTH_CORRIDOR);
  assert.ok(c.speed < 0.01);
  const rock = { x: c.position.x, z: c.position.z - 2, radius: 0.8, height: 1 };
  for (let i = 0; i < 400; i++)
    c.update(1 / 60, input("KeyD"), SIDE_YAW, [rock]);
  assert.ok(
    Math.hypot(c.position.x - rock.x, c.position.z - rock.z) >=
      rock.radius + 0.419,
  );
});
test("orthographic and weak projection reconstruct world points; orbit stays bounded and resize updates projection", () => {
  for (const projection of ["orthographic", "weak"] as const) {
    const c = new Cinematic25DCamera(new T.Vector3(0, 12, 7), projection);
    const points = [
      new T.Vector3(0, 13, 7),
      new T.Vector3(-8, 4, -20),
      new T.Vector3(3, 10, 9),
    ];
    for (const p of points)
      assert.ok(
        p.clone().project(c.camera).unproject(c.camera).distanceTo(p) < 1e-9,
      );
    c.orbit(1e7, -1e7, 2);
    assert.ok(Math.abs(c.yaw - SIDE_YAW) <= 0.055001);
    assert.ok(c.pitch >= 0.27499);
    Object.assign(globalThis, { innerWidth: 700, innerHeight: 1000 });
    c.resize();
    for (const p of points)
      assert.ok(
        p.clone().project(c.camera).unproject(c.camera).distanceTo(p) < 1e-9,
      );
    Object.assign(globalThis, { innerWidth: 1440, innerHeight: 900 });
  }
});
test("camera follows controller slopes independently of gait, converges at 30/60/144 Hz, and widens continuously for 55 seconds", () => {
  const finals = [];
  for (const hz of [30, 60, 144]) {
    const p = new T.Vector3(0, heightAt(0, 7), 7),
      c = new Cinematic25DCamera(p),
      v = new T.Vector3(0, 0, -1.35);
    for (let i = 0; i < hz * 8; i++) {
      p.z -= 1.35 / hz;
      p.y = heightAt(0, p.z);
      c.update(1 / hz, p, false, i / hz, 1.35, v);
    }
    finals.push(c.target.clone());
    assert.ok(c.camera.position.distanceTo(c.target) > 20);
    const before = p
        .clone()
        .add(new T.Vector3(0, 1, 0))
        .project(c.camera),
      cinema = new CinematicSystem("2p5d");
    cinema.start(p, 0);
    cinema.update(1 / hz);
    c.cinematic(1 / hz, cinema.position, cinema.target, cinema.viewHeight);
    const after = p
      .clone()
      .add(new T.Vector3(0, 1, 0))
      .project(c.camera);
    assert.ok(
      after.distanceTo(before) < 0.055,
      `${hz} Hz projected entry jump ${after.distanceTo(before)}`,
    );
    let old = cinema.viewHeight;
    for (let i = 0; i < hz * 55; i++) {
      cinema.update(1 / hz);
      assert.ok(cinema.viewHeight >= old - 1e-10);
      old = cinema.viewHeight;
    }
    assert.equal(cinema.time, 55);
    assert.equal(cinema.viewHeight, 16);
  }
  assert.ok(finals[0].distanceTo(finals[2]) < 0.025);
});
test("weary posture distributes flexion without root tipping or accumulated offsets and fades through reclining", () => {
  for (const hz of [30, 60, 144]) {
    const k = new Knight(undefined, "authored", "weary"),
      neutral = new Knight(undefined, "authored", "neutral");
    k.root.position.set(0, heightAt(0, 7), 7);
    neutral.root.position.copy(k.root.position);
    k.root.rotation.y = neutral.root.rotation.y = Math.PI;
    for (let i = 0; i < hz * 2; i++) {
      k.update(1 / hz, 0, 0, null, 0);
      neutral.update(1 / hz, 0, 0, null, 0);
    }
    const initial = k.rig.head.getWorldPosition(new T.Vector3());
    for (let i = 0; i < hz * 4; i++) k.update(1 / hz, 0, 0, null, 0);
    assert.ok(
      k.rig.head.getWorldPosition(new T.Vector3()).distanceTo(initial) < 1e-8,
    );
    assert.equal(k.root.rotation.x, 0);
    const posture = k.animator.posture.diagnostics;
    assert.ok(
      posture.lowerSpinePitch > 0.05 &&
        posture.chestPitch > 0.07 &&
        posture.headPitch > 0.06,
    );
    const headShift = k.rig.head
      .getWorldPosition(new T.Vector3())
      .distanceTo(neutral.rig.head.getWorldPosition(new T.Vector3()));
    console.log({ hz, headShift });
    assert.ok(headShift > 0.06);
    for (let i = 0; i < hz * 10; i++)
      k.update(1 / hz, 6 + i / hz, 0, i / hz, 0);
    assert.ok(k.animator.posture.weight < 1e-7);
  }
});
test("frame pacing reports percentiles and slow frames rather than hiding them behind average FPS", () => {
  const p = new FramePacing();
  for (let i = 0; i < 100; i++) p.observe(0.0167, 2);
  p.observe(0.05, 8);
  p.observe(0.1, 10);
  const d = p.diagnostics;
  assert.equal(d.samples, 102);
  assert.ok(Math.abs(d.p95 - 16.7) < 0.001);
  assert.equal(d.p99, 50);
  assert.equal(d.max, 100);
  assert.equal(d.over25, 2);
  assert.equal(d.over50, 1);
  assert.equal(d.peakCpuSubmission, 10);
});

test("meadow layers retain every stratum, use bounded opposing parallax, and restore legacy matrices", async () => {
  const { Grass } = await import("../src/world/Grass.ts");
  const grass = new Grass(new T.Scene()),
    actor = new T.Vector3(0, heightAt(0, 7), 7);
  const direction = new T.Vector2(Math.sin(SIDE_YAW), Math.cos(SIDE_YAW)),
    right = new T.Vector3(direction.y, 0, -direction.x);
  const count = grass.batches.reduce((n, b) => n + b.count, 0),
    matrix = grass.batches[0].instanceMatrix.array.slice();
  grass.update(10, actor, new T.Vector3(22, 20, 0), {
    direction,
    travel: 20,
    rest: 1,
    heading: Math.PI,
  });
  let foreground = 0,
    background = 0;
  for (const b of grass.batches) {
    const c = b.userData.center as T.Vector2,
      depth = (c.x - actor.x) * direction.x + (c.y - actor.z) * direction.y,
      shift = b.position.dot(right);
    assert.ok(Math.hypot(b.position.x, b.position.z) <= 0.650001);
    if (depth > 15) {
      assert.ok(shift < 0);
      foreground++;
    }
    if (depth < -15) {
      assert.ok(shift > 0);
      background++;
    }
  }
  assert.ok(foreground > 100 && background > 100);
  assert.equal(
    grass.batches.reduce((n, b) => n + b.count, 0),
    count,
  );
  assert.deepEqual(grass.batches[0].instanceMatrix.array, matrix);
  grass.update(10, actor, new T.Vector3(0, 13, 10));
  assert.ok(grass.batches.every((b) => b.position.lengthSq() === 0));
});

test("return from the wide composition eases both translation and scale while stationary follow rejects time-driven bob", () => {
  const p = new T.Vector3(0, heightAt(0, -3), -3),
    c = new Cinematic25DCamera(p),
    cinema = new CinematicSystem("2p5d");
  cinema.start(p, 0);
  for (let i = 0; i < 60 * 56; i++) {
    cinema.update(1 / 60);
    c.cinematic(1 / 60, cinema.position, cinema.target, cinema.viewHeight);
  }
  const wide = c.camera.position.clone();
  c.update(1 / 60, p);
  assert.ok(c.camera.position.distanceTo(wide) < 2.5);
  assert.ok(c.viewHeight > 15);
  for (let i = 0; i < 60 * 6; i++) c.update(1 / 60, p, false, i / 60);
  const still = c.camera.position.clone();
  for (let i = 0; i < 60 * 3; i++) c.update(1 / 60, p, false, 6 + i / 60);
  assert.ok(c.camera.position.distanceTo(still) < 0.001);
  assert.ok(c.viewHeight < 4.66);
});
