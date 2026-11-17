/** CMU ASF/AMC -> original knight. Raw database takes are not bundled.
 * Usage: npx tsx scripts/retarget-locomotion.ts /directory/with/16.asf-and-AMC-files
 * https://mocap.cs.cmu.edu/ — product use permitted, data resale prohibited.
 */
import { readFileSync, writeFileSync } from "node:fs";
import * as T from "three";
import { prepareArmor, buildArmor } from "../src/character/model/buildArmor";
import { aimBone } from "../src/character/animation/kinematics";
const dir = process.argv[2],
  rad = Math.PI / 180,
  scale = 0.0254 / 0.45;
const asf = readFileSync(`${dir}/16.asf`, "utf8");
interface SourceBone {
  name: string;
  direction: T.Vector3;
  length: number;
  axis: T.Quaternion;
  dof: string[];
  children: string[];
}
const source: Record<string, SourceBone> = {};
for (const block of asf
  .split(":bonedata")[1]
  .split(":hierarchy")[0]
  .matchAll(/begin([\s\S]*?)end/g)) {
  const text = block[1],
    name = /name\s+(\S+)/.exec(text)![1],
    nums = (key: string) =>
      new RegExp(`${key}\\s+([-\\d.e+]+)\\s+([-\\d.e+]+)\\s+([-\\d.e+]+)`)
        .exec(text)!
        .slice(1)
        .map(Number);
  source[name] = {
    name,
    direction: new T.Vector3(...nums("direction")),
    length: Number(/length\s+(\S+)/.exec(text)![1]) * scale,
    axis: new T.Quaternion().setFromEuler(
      new T.Euler(
        ...(nums("axis").map((n) => n * rad) as [number, number, number]),
        "ZYX",
      ),
    ),
    dof: /dof\s+([^\r\n]+)/.exec(text)?.[1].trim().split(/\s+/) ?? [],
    children: [],
  };
}
source.root = {
  name: "root",
  direction: new T.Vector3(),
  length: 0,
  axis: new T.Quaternion(),
  dof: [],
  children: [],
};
for (const line of asf.split(":hierarchy")[1].split(/\r?\n/)) {
  const names = line.trim().split(/\s+/);
  if (source[names[0]]) source[names[0]].children = names.slice(1);
}
function readAMC(name: string) {
  const frames: Record<string, number[]>[] = [];
  let f: Record<string, number[]> = {};
  for (const line of readFileSync(`${dir}/${name}.amc`, "utf8").split(
    /\r?\n/,
  )) {
    if (/^\d+$/.test(line.trim())) {
      f = {};
      frames.push(f);
    } else {
      const [n, ...v] = line.trim().split(/\s+/);
      if (source[n]) f[n] = v.map(Number);
    }
  }
  return frames;
}
interface Pose {
  start: Record<string, T.Vector3>;
  end: Record<string, T.Vector3>;
  rotation: Record<string, T.Quaternion>;
  root: T.Vector3;
}
function evaluate(f: Record<string, number[]>): Pose {
  const start: Pose["start"] = {},
    end: Pose["end"] = {},
    rotation: Pose["rotation"] = {},
    root = new T.Vector3(...f.root.slice(0, 3)).multiplyScalar(scale);
  rotation.root = new T.Quaternion().setFromEuler(
    new T.Euler(f.root[3] * rad, f.root[4] * rad, f.root[5] * rad, "ZYX"),
  );
  start.root = root;
  end.root = root;
  const visit = (name: string) => {
    const p = source[name];
    for (const child of p.children) {
      const b = source[child],
        values = f[child] ?? [],
        angles = [0, 0, 0];
      b.dof.forEach(
        (axis, i) =>
          (angles[{ rx: 0, ry: 1, rz: 2 }[axis] ?? 0] = values[i] * rad),
      );
      const q = new T.Quaternion().setFromEuler(
        new T.Euler(...(angles as [number, number, number]), "ZYX"),
      );
      q.premultiply(b.axis).multiply(b.axis.clone().invert());
      rotation[child] = rotation[name].clone().multiply(q);
      start[child] = end[name].clone();
      end[child] = b.direction
        .clone()
        .multiplyScalar(b.length)
        .applyQuaternion(rotation[child])
        .add(start[child]);
      visit(child);
    }
  };
  visit("root");
  return { start, end, rotation, root };
}
await prepareArmor(
  Uint8Array.from(readFileSync("public/models/nameless-knight.glb")).buffer,
);
const root = new T.Group(),
  { rig } = buildArmor(root),
  canonical = [
    rig.hips,
    rig.spine,
    rig.chest,
    rig.head,
    ...rig.arms,
    ...rig.forearms,
    ...rig.hands,
    ...rig.thighs,
    ...rig.shins,
    ...rig.feet,
    ...rig.toes,
  ];
const raw: Record<string, ReturnType<typeof capture>> = {};
function capture(name: string) {
  const inputs = readAMC(name),
    poses = inputs.map(evaluate),
    heading = Math.atan2(
      poses.at(-1)!.root.x - poses[0].root.x,
      poses.at(-1)!.root.z - poses[0].root.z,
    ),
    align = new T.Quaternion().setFromAxisAngle(
      new T.Vector3(0, 1, 0),
      -heading,
    );
  const frames = [];
  for (const p of poses) {
    if (name === "16_17") {
      const yaw = new T.Euler().setFromQuaternion(p.rotation.root, "YXZ").y;
      align.setFromAxisAngle(new T.Vector3(0, 1, 0), -yaw);
    }
    const v = (name: string, end = false) =>
      (end ? p.end[name] : p.start[name])
        .clone()
        .sub(p.root)
        .applyQuaternion(align);
    const q = (name: string) => align.clone().multiply(p.rotation[name]);
    rig.hips.quaternion.copy(q("root"));
    rig.spine.quaternion.copy(
      p.rotation.root.clone().invert().multiply(p.rotation.lowerback),
    );
    rig.chest.quaternion.copy(
      p.rotation.lowerback.clone().invert().multiply(p.rotation.thorax),
    );
    rig.head.quaternion.copy(
      p.rotation.thorax.clone().invert().multiply(p.rotation.head),
    );
    root.updateMatrixWorld(true);
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? "r" : "l";
      aimBone(rig.arms[i], v(`${side}humerus`), v(`${side}humerus`, true));
      aimBone(rig.forearms[i], v(`${side}radius`), v(`${side}radius`, true));
      rig.hands[i].quaternion.identity();
      aimBone(rig.thighs[i], v(`${side}femur`), v(`${side}femur`, true));
      aimBone(rig.shins[i], v(`${side}tibia`), v(`${side}tibia`, true));
      const forward = v(`${side}toes`, true)
          .sub(v(`${side}toes`))
          .normalize(),
        yaw = Math.atan2(forward.x, forward.z),
        pitch = -Math.atan2(forward.y, Math.hypot(forward.x, forward.z));
      rig.feet[i].parent!.getWorldQuaternion(new T.Quaternion());
      const parent = rig.feet[i]
        .parent!.getWorldQuaternion(new T.Quaternion())
        .invert();
      rig.feet[i].quaternion
        .copy(parent)
        .multiply(
          new T.Quaternion().setFromEuler(new T.Euler(pitch, yaw, 0, "YXZ")),
        );
      rig.toes[i].quaternion.identity();
    }
    // FK transfers complete human joint rotations onto the knight's segment lengths.
    rig.hips.position.set(0, 1.01, 0);
    root.updateMatrixWorld(true);
    const feet = rig.feet.map((b) =>
      b.getWorldPosition(new T.Vector3()).toArray(),
    );
    frames.push({
      q: canonical.flatMap((b) =>
        b.quaternion.toArray().map((v) => +v.toFixed(5)),
      ),
      hip: p.root.y,
      feet,
      root: p.root.clone().applyQuaternion(align).toArray(),
    });
  }
  return { source: name, frames };
}
for (const [key, take] of [
  ["walk", "16_15"],
  ["run", "16_35"],
  ["turn", "16_17"],
  ["stop", "16_08"],
  ["walkStop", "16_33"],
])
  raw[key] = capture(take);
// Find a complete matched-pose cycle in a steady portion, rather than imposing sine timing.
const result: Record<string, unknown> = {};
for (const key of ["walk", "run"]) {
  const take = raw[key],
    f = take.frames;
  let best = Infinity,
    start = 0,
    length = 0;
  const range = key === "walk" ? [105, 140] : [60, 95];
  for (let a = 15; a < f.length - range[1] - 8; a++)
    for (let n = range[0]; n <= range[1]; n++) {
      let error = 0;
      for (let b = 0; b < 18; b++) {
        const qa = new T.Quaternion().fromArray(f[a].q, b * 4),
          qb = new T.Quaternion().fromArray(f[a + n].q, b * 4);
        error += qa.angleTo(qb) ** 2;
      }
      error += Math.abs(f[a].hip - f[a + n].hip) * 4;
      if (error < best) {
        best = error;
        start = a;
        length = n;
      }
    }
  const chosen = f.slice(start, start + length + 1),
    mean = chosen.reduce((s, v) => s + v.hip, 0) / chosen.length;
  const distance = new T.Vector3()
    .fromArray(chosen.at(-1)!.root)
    .sub(new T.Vector3().fromArray(chosen[0].root));
  distance.y = 0;
  // Close tiny capture drift across the seam over a short neighborhood, preserving full-body timing.
  for (let i = 0; i < chosen.length; i++) {
    const frame = chosen[i];
    frame.hip = +(1.01 + (frame.hip - mean) * 1.03).toFixed(5);
    for (const p of frame.feet) p[1] += frame.hip - 1.01;
  }
  // Contact classification uses measured low ankle height and low world-space velocity.
  const minima = [0, 1].map((side) =>
    Math.min(...chosen.map((v) => v.feet[side][1])),
  );
  const frames = chosen.map((frame, i) => ({
    q: frame.q,
    hip: frame.hip,
    hipOffset: [
      frame.root[0] -
        chosen[0].root[0] -
        ((chosen.at(-1)!.root[0] - chosen[0].root[0]) * i) /
          (chosen.length - 1),
      0,
      frame.root[2] -
        chosen[0].root[2] -
        ((chosen.at(-1)!.root[2] - chosen[0].root[2]) * i) /
          (chosen.length - 1),
    ],
    feet: frame.feet.map((p, side) => [
      +p[0].toFixed(5),
      +(p[1] - minima[side] + 0.095).toFixed(5),
      +p[2].toFixed(5),
    ]),
    contacts: frame.feet.map(
      (p, side) => p[1] < minima[side] + (key === "walk" ? 0.045 : 0.055),
    ),
    root: frame.root,
  }));
  for (let i = 0; i < frames.length; i++) {
    const weight = Math.max(0, (i / (frames.length - 1) - 0.86) / 0.14);
    if (weight > 0)
      for (let b = 0; b < 18; b++) {
        const q = new T.Quaternion()
          .fromArray(frames[i].q, b * 4)
          .slerp(new T.Quaternion().fromArray(frames[0].q, b * 4), weight);
        q.toArray(frames[i].q, b * 4);
      }
  }
  const entry = frames.findIndex(
    (f, i) => i > 0 && f.contacts[0] && !frames[i - 1].contacts[0],
  );
  if (entry > 0) {
    const cycle = frames.slice(0, -1);
    const shifted = cycle.slice(entry).concat(cycle.slice(0, entry));
    frames.splice(0, frames.length, ...shifted, structuredClone(shifted[0]));
  }
  frames[frames.length - 1] = structuredClone(frames[0]);
  result[key] = {
    source: take.source,
    startFrame: start + 1,
    frameRate: 120,
    duration: length / 120,
    distance: +distance.length().toFixed(5),
    frames,
  };
  console.log(key, {
    start,
    length,
    distance: distance.length(),
    error: best,
    minima,
  });
}
// A curved walking cycle for coordinated turn steps. It is aligned to instantaneous heading at runtime.
for (const [key, from] of [
  ["turn", 250],
  ["stop", 115],
  ["walkStop", Math.max(0, raw.walkStop.frames.length - 160)],
] as const) {
  const chosen = raw[key].frames.slice(from, key === "turn" ? 380 : undefined),
    mean = chosen.reduce((v, f) => v + f.hip, 0) / chosen.length;
  const min = [0, 1].map((i) =>
    Math.min(...chosen.map((f) => f.feet[i][1] + f.hip - mean)),
  );
  const frames = chosen.map((f) => ({
    q: f.q,
    hip: 1.01 + f.hip - mean,
    feet: f.feet.map((p, i) => [
      p[0],
      p[1] + f.hip - mean - min[i] + 0.095,
      p[2],
    ]),
  }));
  result[key] = {
    source: raw[key].source,
    duration: (chosen.length - 1) / 120,
    frames,
  };
}
// Only retargeted joint curves and calibrated stride metadata are shipped.
for (const clip of Object.values(result) as { frames: { root?: number[] }[] }[])
  for (const frame of clip.frames) delete frame.root;
writeFileSync(
  "src/character/animation/clips/locomotion.json",
  JSON.stringify(result),
);
writeFileSync(
  `${dir}/source-poses.json`,
  JSON.stringify({ walk: raw.walk, run: raw.run, stop: raw.stop }),
);
