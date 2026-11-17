import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as T from "three";
import { prepareArmor } from "../src/character/model/buildArmor.ts";
import { Knight } from "../src/character/Knight.ts";
import { springStep } from "../src/character/animation/kinematics.ts";
import { heightAt } from "../src/world/terrain.ts";
import { FOLEY_FILES } from "../src/audio/GrassFoley.ts";
import { historyAccepted } from "../src/rendering/AsciiMath.ts";
await prepareArmor(
  Uint8Array.from(readFileSync("public/models/nameless-knight.glb")).buffer,
);
test("temporal history rejects foreground depth changes rather than retaining stale hero pixels", () => {
  assert.equal(historyAccepted(0.3, 0.31, 0, 0.3, 0.3), false);
  assert.equal(historyAccepted(0.3, 0.301, 0, 0.3, 0.3), true);
});
test("foot contact releases remain continuous at 30, 60 and 144 Hz, through walk/run changes", () => {
  for (const hz of [30, 60, 144]) {
    const k = new Knight();
    k.root.position.set(0, heightAt(0, 7), 7);
    k.root.rotation.y = Math.PI;
    let releases = 0,
      maxRelease = 0;
    const positions = k.animator.feet.map(() => new T.Vector3()),
      prior = [false, false];
    for (let frame = 0; frame < hz * 10; frame++) {
      const t = frame / hz,
        speed = t < 4 ? 1.35 : t < 8 ? 3.6 : 1.35;
      k.root.position.z -= speed / hz;
      k.root.position.y = heightAt(0, k.root.position.z);
      k.update(1 / hz, t, speed, null, 0);
      k.animator.feet.forEach((f, i) => {
        if (frame > hz && prior[i] && !f.contact) {
          releases++;
          maxRelease = Math.max(maxRelease, positions[i].distanceTo(f.target));
        }
        positions[i].copy(f.target);
        prior[i] = f.contact;
      });
    }
    assert.ok(releases > 12);
    assert.ok(
      maxRelease < 0.045 * (60 / hz),
      `${hz} Hz release: ${maxRelease}`,
    );
  }
});
test("spring response matches across 30, 60 and 144 Hz without frame-rate smoothing artifacts", () => {
  const final = [30, 60, 144].map((hz) => {
    let p = 0.1,
      v = 0.3;
    for (let i = 0; i < hz; i++) [p, v] = springStep(p, v, 95, 16, 1 / hz);
    return [p, v];
  });
  for (const state of final)
    state.forEach((v, i) => assert.ok(Math.abs(v - final[0][i]) < 1e-12));
});
test("supplied export retains PBR maps, cloth/armor bones and no weapon meshes", () => {
  const b = readFileSync("public/models/imported-knight/knight.glb"),
    json = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString());
  assert.ok(json.skins[0].joints.length >= 40);
  assert.equal(json.animations?.length ?? 0, 0);
  assert.ok(
    json.nodes.some((n: { name?: string }) => n.name === "armor_shoulder.L"),
  );
  const meshes = json.nodes.filter(
    (n: { mesh?: number }) => n.mesh !== undefined,
  );
  assert.ok(meshes.length >= 2);
  assert.ok(
    meshes.every(
      (n: { name: string }) => !/sword|shield|dagger|sheath/i.test(n.name),
    ),
  );
  for (const m of json.materials) {
    assert.ok(m.pbrMetallicRoughness.baseColorTexture);
    assert.ok(m.pbrMetallicRoughness.metallicRoughnessTexture);
    assert.ok(m.normalTexture);
    assert.ok(m.occlusionTexture);
  }
  const inspection = JSON.parse(
    readFileSync("public/models/imported-knight/inspection.json", "utf8"),
  );
  const triangles = json.meshes.reduce(
    (sum: number, mesh: { primitives: { indices: number }[] }) =>
      sum +
      mesh.primitives.reduce(
        (count: number, primitive: { indices: number }) =>
          count + json.accessors[primitive.indices].count / 3,
        0,
      ),
    0,
  );
  assert.equal(
    triangles,
    inspection.triangles,
    "Export must include the evaluated shoulder bevel",
  );
  assert.ok(inspection.removed.includes("74 embedded scabbard/hilt vertices"));
});
test("every foley variation is a bundled OGG matching its provenance hash", async () => {
  const { createHash } = await import("node:crypto"),
    hashes = JSON.parse(
      readFileSync("public/licenses/grass-audio-sha256.json", "utf8"),
    );
  for (const name of Object.values(FOLEY_FILES).flat()) {
    const bytes = readFileSync(`public/audio/grass/${name}`);
    assert.equal(bytes.subarray(0, 4).toString(), "OggS");
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      hashes[name],
    );
  }
});
