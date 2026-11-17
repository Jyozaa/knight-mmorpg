import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as T from "three";
import { Knight } from "../src/character/Knight.ts";
import { heightAt } from "../src/world/terrain.ts";
import { populateRocks } from "../src/world/rockPlacement.ts";
import { random } from "../src/config.ts";
import { grassTemplate, WIND_GLSL } from "../src/world/Grass.ts";
import {
  mapLuminance,
  historyAccepted,
  stableLuminance,
} from "../src/rendering/AsciiMath.ts";
import { CameraController } from "../src/camera/CameraController.ts";

const knight = new Knight();
const temp = new T.Vector3();
function reset() {
  knight.root.position.set(0, heightAt(0, 7), 7);
  knight.root.rotation.set(0, Math.PI, 0);
}
test("all rendered rock matrices agree with collision footprints, including after GPU upload flag", () => {
  const mesh = new T.InstancedMesh(
      new T.DodecahedronGeometry(1),
      new T.MeshBasicMaterial(),
      200,
    ),
    obstacles: { x: number; z: number; radius: number; height?: number }[] = [];
  populateRocks(mesh, random(9218), obstacles);
  const matrix = new T.Matrix4(),
    scale = new T.Vector3(),
    q = new T.Quaternion();
  assert.equal(obstacles.length, 200);
  assert.ok(mesh.instanceMatrix.version > 0);
  for (let i = 0; i < 200; i++) {
    mesh.getMatrixAt(i, matrix);
    matrix.decompose(temp, q, scale);
    assert.ok(Math.abs(temp.x - obstacles[i].x) < 0.00001);
    assert.ok(Math.abs(temp.z - obstacles[i].z) < 0.00001);
    assert.ok(Math.abs(scale.x * 0.8 - obstacles[i].radius) < 0.00001);
    assert.ok(
      Math.abs(temp.y - heightAt(temp.x, temp.z) - scale.x * 0.16) < 0.00002,
    );
  }
});
test("original GLB contains skin weights, five armor materials and a complete 18-joint skeleton", () => {
  const bytes = readFileSync("public/models/nameless-knight.glb");
  assert.equal(bytes.toString("ascii", 0, 4), "glTF");
  const length = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.toString("utf8", 20, 20 + length));
  assert.equal(gltf.skins[0].joints.length, 18);
  const armor = gltf.meshes.find(
    (m: { primitives: { attributes: Record<string, number> }[] }) =>
      m.primitives[0].attributes.JOINTS_0 !== undefined,
  );
  assert.equal(armor.primitives.length, 5);
  assert.ok(
    armor.primitives.every(
      (p: { attributes: Record<string, number> }) =>
        p.attributes.JOINTS_0 !== undefined &&
        p.attributes.WEIGHTS_0 !== undefined,
    ),
  );
});
test("grass has five distinct bent templates and fixed planted roots", () => {
  const signatures = [];
  for (let i = 0; i < 5; i++) {
    const g = grassTemplate(i),
      p = g.attributes.position;
    let roots = 0,
      maxY = 0;
    for (let j = 0; j < p.count; j++) {
      assert.ok(p.getY(j) >= 0);
      if (p.getY(j) === 0) roots++;
      maxY = Math.max(maxY, p.getY(j));
    }
    assert.ok(roots >= 14);
    assert.ok(maxY > 0.32);
    signatures.push(p.count);
  }
  assert.equal(new Set(signatures).size, 5);
  assert.ok(WIND_GLSL.includes("pow(anchor,1.65)"));
  assert.ok(WIND_GLSL.includes("dot(p,windDirection)"));
});
test("black stays zero, highlights remain ordered and temporal rejection handles disocclusion", () => {
  assert.equal(mapLuminance(0), 0);
  assert.equal(mapLuminance(0.003), 0);
  assert.ok(mapLuminance(0.02) < 0.04);
  assert.ok(mapLuminance(0.8) > mapLuminance(0.2));
  assert.equal(historyAccepted(0.2, 0.5, 0, 0.1, 0.1), false);
  assert.equal(historyAccepted(0.2, 0.2, 12, 0.1, 0.1), false);
  assert.equal(historyAccepted(0.2, 0.2, 0, 0.8, 0.1), false);
  assert.equal(stableLuminance(0.305, 0.3, 1 / 60, true), 0.3);
  assert.equal(stableLuminance(0, 0.8, 1 / 60, false), 0);
  const result = [30, 60, 144].map((hz) => {
    let value = 0;
    for (let i = 0; i < hz; i++)
      value = stableLuminance(0.8, value, 1 / hz, true);
    return value;
  });
  assert.ok(Math.max(...result) - Math.min(...result) < 0.012);
});
test("walking stance targets remain planted and actual ankles reach them on sloping terrain", () => {
  reset();
  let maxError = 0,
    maxSlip = 0;
  const old = [new T.Vector3(), new T.Vector3()],
    contact = [false, false];
  for (let i = 0; i < 360; i++) {
    knight.root.position.z -= 1.65 / 60;
    knight.root.position.y = heightAt(
      knight.root.position.x,
      knight.root.position.z,
    );
    knight.update(1 / 60, i / 60, 1.65, null, 0);
    for (let side = 0; side < 2; side++) {
      const f = knight.animator.feet[side];
      knight.rig.feet[side].getWorldPosition(temp);
      if (f.contact && i > 60) {
        maxError = Math.max(maxError, temp.distanceTo(f.target));
        if (contact[side])
          maxSlip = Math.max(maxSlip, f.target.distanceTo(old[side]));
      }
      old[side].copy(f.target);
      contact[side] = f.contact;
    }
  }
  console.log({ maxAnkleError: maxError, maxStanceSlip: maxSlip });
  assert.ok(maxSlip < 1e-6);
  assert.ok(maxError < 0.035);
});
test("rest and reverse use the spine and keep ankles, knee centers and helmet clear of terrain at 30/60/144 Hz", () => {
  for (const hz of [30, 60, 144]) {
    reset();
    let lastY = knight.hips.position.y;
    let biggestJump = 0,
      minClearance = Infinity;
    for (let i = 0; i <= hz * 20; i++) {
      const rest = i <= hz * 10 ? i / hz : 20 - i / hz;
      knight.update(1 / hz, i / hz, 0, rest, 0);
      if (i > 2)
        biggestJump = Math.max(
          biggestJump,
          Math.abs(knight.hips.position.y - lastY),
        );
      lastY = knight.hips.position.y;
      for (const bone of [
        ...knight.rig.feet,
        ...knight.rig.shins,
        knight.rig.head,
      ]) {
        bone.getWorldPosition(temp);
        minClearance = Math.min(
          minClearance,
          temp.y - heightAt(temp.x, temp.z),
        );
      }
    }
    console.log({ hz, biggestJump, minClearance });
    assert.ok(biggestJump < 0.03);
    assert.ok(minClearance > 0.035);
    assert.ok(Math.abs(knight.rig.spine.rotation.x) < 0.01);
  }
});
test("run is a distinct pose with flight, rather than a sped-up walk", () => {
  reset();
  let flights = 0;
  for (let i = 0; i < 180; i++) {
    knight.root.position.z -= 4.4 / 60;
    knight.root.position.y = heightAt(0, knight.root.position.z);
    knight.update(1 / 60, i / 60, 4.4, null, 0);
    if (knight.animator.feet.every((f) => !f.contact)) flights++;
  }
  assert.ok(knight.diagnostics.runBlend > 0.99);
  assert.ok(flights > 15);
  assert.ok(knight.rig.forearms[0].rotation.x < -0.6);
});
test("camera blending never teleports on cinematic entry", () => {
  const global = globalThis as typeof globalThis & {
    innerWidth: number;
    innerHeight: number;
  };
  global.innerWidth = 1440;
  global.innerHeight = 900;
  const p = new T.Vector3(0, heightAt(0, 7), 7),
    camera = new CameraController(p);
  const before = camera.camera.position.clone();
  camera.cinematic(1 / 144, new T.Vector3(3, p.y + 0.7, 7), p);
  assert.ok(camera.camera.position.distanceTo(before) < 0.15);
});

test("resting armor surface samples do not disappear below the terrain", () => {
  reset();
  knight.update(1 / 60, 10, 0, 10, 0);
  knight.root.updateMatrixWorld(true);
  knight.mesh.skeleton.update();
  const position = knight.mesh.geometry.attributes.position;
  let minimum = Infinity;
  const minima: Record<string, number> = {};
  for (let i = 0; i < position.count; i += 17) {
    temp.fromBufferAttribute(position, i);
    knight.mesh.applyBoneTransform(i, temp);
    knight.mesh.localToWorld(temp);
    const margin = temp.y - heightAt(temp.x, temp.z);
    minimum = Math.min(minimum, margin);
    const name =
      knight.mesh.skeleton.bones[
        knight.mesh.geometry.attributes.skinIndex.getX(i)
      ].name;
    minima[name] = Math.min(minima[name] ?? Infinity, margin);
  }
  console.log({ minimumRestingArmorClearance: minimum });
  assert.ok(minimum > -0.025);
});

test("armor clears the ground during idle and forward traversal", () => {
  reset();
  let minimum = Infinity;
  for (let frame = 0; frame < 120; frame++) {
    const speed = frame < 30 ? 0 : 1.65;
    knight.root.position.z -= speed / 60;
    knight.root.position.y = heightAt(0, knight.root.position.z);
    knight.update(1 / 60, frame / 60, speed, null, 0);
    knight.root.updateMatrixWorld(true);
    knight.mesh.skeleton.update();
    if (frame % 10 === 0)
      for (
        let i = 0;
        i < knight.mesh.geometry.attributes.position.count;
        i += 29
      ) {
        temp.fromBufferAttribute(knight.mesh.geometry.attributes.position, i);
        knight.mesh.applyBoneTransform(i, temp);
        knight.mesh.localToWorld(temp);
        minimum = Math.min(minimum, temp.y - heightAt(temp.x, temp.z));
      }
  }
  console.log({ minimumWalkingSurfaceClearance: minimum });
  assert.ok(minimum > -0.025);
});

test("sword remains in its hip socket, enclosed by a scabbard and clear of terrain through rest", () => {
  const actor = new Knight();
  actor.root.position.set(0, heightAt(0, -3), -3);
  actor.root.rotation.y = Math.PI;
  assert.equal(actor.sword.mount.parent, actor.rig.hips);
  assert.equal(actor.sword.sword.parent, actor.sword.mount);
  assert.equal(actor.sword.drawn, false);
  let minimum = Infinity;
  for (let frame = 0; frame <= 600; frame++) {
    actor.update(1 / 60, frame / 60, 0, frame / 60, 0);
    if (frame % 15 !== 0) continue;
    actor.sword.mount.traverse((o) => {
      if (!(o instanceof T.Mesh)) return;
      const p = o.geometry.attributes.position;
      for (let i = 0; i < p.count; i += 3) {
        temp.fromBufferAttribute(p, i);
        o.localToWorld(temp);
        minimum = Math.min(minimum, temp.y - heightAt(temp.x, temp.z));
      }
    });
  }
  assert.ok(minimum > -0.035, `scabbard clearance ${minimum}`);
});

test("ragged scarf is narrow, follows the neck, moves with shared gusts, and freezes with simulation time", () => {
  const actor = new Knight();
  actor.root.position.set(0, heightAt(0, 7), 7);
  const listener = actor.root.position.clone().add(new T.Vector3(0, 2, 4));
  const tips: T.Vector3[] = [];
  const travel = [0, 0, 0];
  for (let i = 0; i < 300; i++) {
    actor.wind.update(1 / 60, actor.root.position, listener);
    actor.update(1 / 60, (i + 1) / 60, 0, null, 0);
    if (i === 150)
      tips.push(...actor.cape.ribbons.map((r) => r.points.at(-1)!.clone()));
    if (i > 150)
      actor.cape.ribbons.forEach(
        (r, j) =>
          (travel[j] = Math.max(
            travel[j],
            r.points.at(-1)!.distanceTo(tips[j]),
          )),
      );
  }
  assert.equal(actor.cape.ribbons.length, 3);
  for (let i = 0; i < 3; i++) {
    const r = actor.cape.ribbons[i];
    assert.ok(r.width < 0.15 && r.length > 0.7);
    assert.ok(travel[i] > 0.07);
    const root = r.offset.clone();
    actor.rig.chest.localToWorld(root);
    assert.ok(r.points[0].distanceTo(root) < 1e-5);
    for (const p of r.points) assert.ok(p.y >= heightAt(p.x, p.z) + 0.03);
    for (let j = 1; j < r.points.length; j++)
      assert.ok(
        r.points[j].distanceTo(r.points[j - 1]) < (r.length / 18) * 1.3,
      );
  }
  const before = actor.cape.diagnostics;
  actor.update(0, 5, 0, null, 0);
  assert.deepEqual(actor.cape.diagnostics, before);
});

test("authored locomotion blends through acceleration, a run and a stop without arm snapping", () => {
  const actor = new Knight();
  actor.root.position.set(0, heightAt(0, 7), 7);
  actor.root.rotation.y = Math.PI;
  const q = actor.rig.arms.map((b) => b.quaternion.clone());
  let maximum = 0,
    walkLean = 0,
    runLean = 0;
  for (let i = 0; i < 600; i++) {
    const speed =
      i < 120
        ? 1.65 * (1 - Math.exp(-i / 20))
        : i < 360
          ? 4.4
          : 4.4 * Math.exp(-(i - 360) / 15);
    actor.root.position.z -= speed / 60;
    actor.root.position.y = heightAt(0, actor.root.position.z);
    actor.update(1 / 60, i / 60, speed, null, 0, i > 200 && i < 260 ? 0.7 : 0);
    actor.rig.arms.forEach((b, j) => {
      if (i > 1) maximum = Math.max(maximum, b.quaternion.angleTo(q[j]));
      q[j].copy(b.quaternion);
    });
    if (i === 110) walkLean = actor.rig.spine.rotation.x;
    if (i === 350) runLean = actor.rig.spine.rotation.x;
  }
  assert.ok(maximum < 0.2, `arm jump ${maximum}`);
  assert.ok(walkLean < -0.075 && runLean < walkLean - 0.1);
  assert.ok(actor.diagnostics.strideBlend < 0.01);
  assert.match(actor.diagnostics.source, /KayKit/);
});

test("lanterns keep semantic amber tags after material cloning and use only four local lights", async () => {
  const { LampPosts } = await import("../src/world/LampPosts.ts");
  const scene = new T.Scene(),
    obstacles: { x: number; z: number; radius: number }[] = [];
  const lamps = new LampPosts(scene, obstacles);
  assert.equal(obstacles.length, 15);
  assert.equal(
    scene.children.filter((c) => c instanceof T.PointLight).length,
    4,
  );
  for (const flame of lamps.flames) {
    const shader = {
      vertexShader: "",
      fragmentShader: "#include <dithering_fragment>",
      uniforms: {},
    };
    (flame.material as T.Material).onBeforeCompile(
      shader as unknown as T.WebGLProgramParametersWithUniforms,
      {} as T.WebGLRenderer,
    );
    assert.match(shader.fragmentShader, /gl_FragColor.a=0.900/);
  }
  lamps.update(0, new T.Vector3(0, 0, 7));
  const values = lamps.flames.map(
    (f) => (f.material as T.MeshBasicMaterial).color.r,
  );
  lamps.update(0.2, new T.Vector3(0, 0, 7));
  assert.ok(
    lamps.flames.some(
      (f, i) =>
        Math.abs((f.material as T.MeshBasicMaterial).color.r - values[i]) >
        0.01,
    ),
  );
});

test("running creates relative-air trailing even with a following environmental wind", () => {
  const actor = new Knight(),
    listener = new T.Vector3();
  actor.root.position.set(0, heightAt(0, 7), 7);
  actor.root.rotation.y = Math.PI / 2;
  for (let i = 0; i < 240; i++) {
    actor.root.position.x += 4.4 / 60;
    actor.root.position.y = heightAt(actor.root.position.x, 7);
    listener.copy(actor.root.position).add(new T.Vector3(0, 2, 4));
    actor.wind.update(1 / 60, actor.root.position, listener);
    actor.update(1 / 60, (i + 1) / 60, 4.4, null, 0);
  }
  // Long tails must trail; the short torn end is free to curl around the neck.
  for (const r of actor.cape.ribbons.slice(0, 2))
    assert.ok(r.points.at(-1)!.x < r.points[0].x - 0.15);
});
