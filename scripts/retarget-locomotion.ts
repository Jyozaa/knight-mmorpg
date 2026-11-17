/** Retarget only motion from KayKit's CC0 Adventurers 1.0. No third-party mesh is shipped.
 * Usage: npx tsx scripts/retarget-locomotion.ts /path/to/KayKit/Knight.glb
 * Source: https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0
 */
import { readFileSync, writeFileSync } from "node:fs";
import * as T from "three";
import { buildArmor } from "../src/character/model/buildArmor";
import { aimBone } from "../src/character/animation/kinematics";
const bytes = readFileSync(process.argv[2]);
const jsonLength = bytes.readUInt32LE(12);
const gltf = JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength));
const bin = bytes.subarray(28 + jsonLength);
const objects: T.Object3D[] = gltf.nodes.map(
  (n: {
    name: string;
    translation?: number[];
    rotation?: number[];
    scale?: number[];
  }) => {
    const o = new T.Object3D();
    o.name = n.name;
    if (n.translation) o.position.fromArray(n.translation);
    if (n.rotation) o.quaternion.fromArray(n.rotation);
    if (n.scale) o.scale.fromArray(n.scale);
    return o;
  },
);
gltf.nodes.forEach((n: { children?: number[] }, i: number) =>
  n.children?.forEach((c) => objects[i].add(objects[c])),
);
const source = new T.Group();
objects.filter((o) => !o.parent).forEach((o) => source.add(o));
const rest = objects.map((o) => ({
  p: o.position.clone(),
  q: o.quaternion.clone(),
  s: o.scale.clone(),
}));
const accessor = (index: number) => {
  const a = gltf.accessors[index],
    b = gltf.bufferViews[a.bufferView];
  const size = ({ SCALAR: 1, VEC3: 3, VEC4: 4 } as Record<string, number>)[
    a.type
  ];
  const data: number[] = [];
  for (let i = 0; i < a.count; i++)
    for (let j = 0; j < size; j++)
      data.push(
        bin.readFloatLE(
          (b.byteOffset ?? 0) +
            (a.byteOffset ?? 0) +
            i * (b.byteStride ?? size * 4) +
            j * 4,
        ),
      );
  return { data, size };
};
const root = new T.Group(),
  { rig } = buildArmor(root);
const named = (name: string) => objects.find((o) => o.name === name)!;
const pos = (name: string) => named(name).getWorldPosition(new T.Vector3());
const bones = [
  rig.hips,
  rig.spine,
  rig.chest,
  rig.head,
  ...rig.arms,
  ...rig.forearms,
  ...rig.hands,
];
const result: Record<string, unknown> = {};
for (const [name, sourceName] of [
  ["idle", "Idle"],
  ["walk", "Walking_A"],
  ["run", "Running_A"],
]) {
  const animation = gltf.animations.find(
    (a: { name: string }) => a.name === sourceName,
  );
  const channels = animation.channels.map(
    (c: { sampler: number; target: { node: number; path: string } }) => {
      const s = animation.samplers[c.sampler];
      return {
        target: c.target,
        times: accessor(s.input).data,
        values: accessor(s.output).data,
      };
    },
  );
  const duration = Math.max(
    ...channels.map((c: { times: number[] }) => c.times.at(-1)!),
  );
  const frames = [];
  for (let frame = 0; frame <= 48; frame++) {
    objects.forEach((o, i) => {
      o.position.copy(rest[i].p);
      o.quaternion.copy(rest[i].q);
      o.scale.copy(rest[i].s);
    });
    const time = (duration * frame) / 48;
    for (const c of channels) {
      const { node, path } = c.target,
        o = objects[node],
        times = c.times;
      let k = 0;
      while (k < times.length - 2 && times[k + 1] < time) k++;
      const n = path === "rotation" ? 4 : 3,
        t = T.MathUtils.clamp(
          (time - times[k]) / Math.max(0.00001, times[k + 1] - times[k]),
          0,
          1,
        );
      if (path === "rotation")
        o.quaternion
          .fromArray(c.values, k * n)
          .slerp(new T.Quaternion().fromArray(c.values, (k + 1) * n), t);
      else
        (path === "translation" ? o.position : o.scale)
          .fromArray(c.values, k * n)
          .lerp(new T.Vector3().fromArray(c.values, (k + 1) * n), t);
    }
    source.updateMatrixWorld(true);
    // Body bones use the source's Y-up local coordinates; arms use child directions
    // to remove the source's T-pose bind axes and fit our hanging-arm bind pose.
    for (const [bone, n] of [
      [rig.hips, "hips"],
      [rig.spine, "spine"],
      [rig.chest, "chest"],
      [rig.head, "head"],
    ] as const)
      bone.quaternion.copy(named(n).quaternion);
    root.updateMatrixWorld(true);
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? "r" : "l";
      aimBone(rig.arms[i], pos(`upperarm.${side}`), pos(`lowerarm.${side}`));
      aimBone(rig.forearms[i], pos(`lowerarm.${side}`), pos(`wrist.${side}`));
      rig.hands[i].quaternion.identity();
    }
    const hip = pos("hips"),
      feet = [pos("foot.r").sub(hip), pos("foot.l").sub(hip)];
    frames.push({
      q: bones.flatMap((b) => b.quaternion.toArray().map((v) => +v.toFixed(5))),
      hip: hip.toArray().map((v) => +v.toFixed(5)),
      feet: feet.map((v) => v.toArray().map((n) => +n.toFixed(5))),
    });
  }
  // Adapt the stylized source's carried-arm stance to free, hanging human arms.
  // Keep its authored timing and elbow/shoulder coordination, reduce lateral flare,
  // and mirror its -Z facing into this game's +Z convention.
  const e = new T.Euler(),
    q = new T.Quaternion();
  for (let b = 0; b < bones.length; b++) {
    const angles = frames.map((f) =>
      new T.Euler().setFromQuaternion(q.fromArray(f.q, b * 4)),
    );
    const meanX = angles.reduce((v, a) => v + a.x, 0) / angles.length;
    for (let f = 0; f < frames.length; f++) {
      e.copy(angles[f]);
      if (b < 4) {
        e.x = -e.x;
        e.y = -e.y;
      } else if (b < 6) {
        e.x = -(e.x - meanX) * (name === "walk" ? 0.85 : 1.1);
        e.y = -e.y * 0.35;
        e.z *= 0.18;
      } else if (b < 8) {
        e.x = -(name === "run" ? 0.9 : 0.25) + (e.x - meanX) * 0.35;
        e.y = 0;
        e.z = 0;
      }
      q.setFromEuler(e).toArray(frames[f].q, b * 4);
      for (let k = 0; k < 4; k++)
        frames[f].q[b * 4 + k] = +frames[f].q[b * 4 + k].toFixed(5);
    }
  }
  result[name] = { source: sourceName, duration, frames };
  console.log(
    `${sourceName}: ${frames.length} frames, ${duration.toFixed(3)}s`,
  );
}
writeFileSync(
  "src/character/animation/clips/locomotion.json",
  JSON.stringify(result),
);
