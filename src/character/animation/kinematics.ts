import * as T from "three";
const axis = new T.Vector3(),
  bend = new T.Vector3(),
  vector = new T.Vector3(),
  parentQ = new T.Quaternion(),
  worldQ = new T.Quaternion();
const down = new T.Vector3(0, -1, 0);
/** Analytic two-bone IK; the pole is a direction, not a point. No iterative solver or allocations. */
export function solveKnee(
  origin: T.Vector3,
  target: T.Vector3,
  pole: T.Vector3,
  upper: number,
  lower: number,
  out: T.Vector3,
) {
  axis.subVectors(target, origin);
  const distance = Math.max(
    0.0001,
    Math.min(upper + lower - 0.00001, axis.length()),
  );
  axis.normalize();
  const along =
    (upper * upper - lower * lower + distance * distance) / (2 * distance);
  const height = Math.sqrt(Math.max(0, upper * upper - along * along));
  bend.copy(pole).addScaledVector(axis, -pole.dot(axis));
  if (bend.lengthSq() < 0.00001) bend.set(1, 0, 0);
  bend.normalize();
  return out
    .copy(origin)
    .addScaledVector(axis, along)
    .addScaledVector(bend, height);
}
export function aimBone(bone: T.Bone, from: T.Vector3, to: T.Vector3) {
  vector.subVectors(to, from).normalize();
  worldQ.setFromUnitVectors(down, vector);
  bone.parent!.getWorldQuaternion(parentQ);
  bone.quaternion.copy(parentQ.invert()).multiply(worldQ);
  bone.updateMatrixWorld(true);
}
export const wrapPhase = (phase: number) => ((phase % 1) + 1) % 1;
export function swingProgress(phase: number, stance: number) {
  return Math.max(0, Math.min(1, (phase - stance) / (1 - stance)));
}
export const smoother = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * t * (t * (t * 6 - 15) + 10);
};
