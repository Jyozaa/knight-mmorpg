import * as T from "three";
import data from "./clips/locomotion.json";
import { wrapPhase } from "./kinematics";
interface Frame {
  q: number[];
  hip: number;
  hipOffset?: number[];
  feet: number[][];
  contacts?: boolean[];
}
interface Clip {
  duration: number;
  frames: Frame[];
}
/** Full-body human capture. Foot IK only corrects contact and terrain after this pose. */
export class LocomotionClips {
  readonly rotations = Array.from({ length: 18 }, () => new T.Quaternion());
  readonly feet = [new T.Vector3(), new T.Vector3()];
  readonly contacts = [true, true];
  readonly hipOffset = new T.Vector3();
  hipHeight = 1.01;
  readonly walkDistance = data.walk.distance;
  readonly runDistance = data.run.distance;
  private a = new T.Quaternion();
  private b = new T.Quaternion();
  private c = new T.Quaternion();
  private idle = new T.Quaternion();
  private frame(clip: Clip, phase: number, loop = true) {
    const p =
        (loop ? wrapPhase(phase) : T.MathUtils.clamp(phase, 0, 0.999999)) *
        (clip.frames.length - 1),
      i = Math.floor(p);
    return { a: clip.frames[i], b: clip.frames[i + 1], t: p - i };
  }
  private q(
    frame: ReturnType<LocomotionClips["frame"]>,
    bone: number,
    out: T.Quaternion,
  ) {
    out.fromArray(frame.a.q, bone * 4);
    this.c.fromArray(frame.b.q, bone * 4);
    return out.slerp(this.c, frame.t);
  }
  update(
    phase: number,
    run: number,
    stride: number,
    time: number,
    turn = 0,
    stop = -1,
    wasRunning = false,
  ) {
    const w = this.frame(data.walk, phase),
      r = this.frame(data.run, phase),
      turning = this.frame(data.turn, phase),
      stopped = this.frame(
        wasRunning ? data.stop : data.walkStop,
        Math.max(0, stop),
        false,
      );
    const idleFrame = data.stop.frames.at(-1)!;
    for (let i = 0; i < 18; i++) {
      this.q(w, i, this.a);
      this.q(r, i, this.b);
      this.a.slerp(this.b, run);
      if (turn > 0) {
        this.q(turning, i, this.b);
        this.a.slerp(this.b, turn * 0.32);
      }
      if (stop >= 0) {
        this.q(stopped, i, this.b);
        this.a.slerp(
          this.b,
          T.MathUtils.smoothstep(stop, 0, 0.15) *
            (1 - T.MathUtils.smoothstep(stop, 0.82, 1)),
        );
      }
      this.idle.fromArray(idleFrame.q, i * 4);
      this.rotations[i].copy(this.idle).slerp(this.a, stride);
    }
    const scalar = (f: typeof w, get: (a: Frame) => number) =>
      T.MathUtils.lerp(get(f.a), get(f.b), f.t);
    this.hipHeight =
      1.01 +
      T.MathUtils.lerp(
        scalar(w, (f) => f.hip) - 1.01,
        scalar(r, (f) => f.hip) - 1.01,
        run,
      ) *
        stride;
    for (let axis = 0; axis < 3; axis++)
      this.hipOffset.setComponent(
        axis,
        T.MathUtils.lerp(
          scalar(w, (f) => f.hipOffset?.[axis] ?? 0),
          scalar(r, (f) => f.hipOffset?.[axis] ?? 0),
          run,
        ) * stride,
      );
    for (let i = 0; i < 2; i++) {
      for (let axis = 0; axis < 3; axis++)
        this.feet[i].setComponent(
          axis,
          T.MathUtils.lerp(
            scalar(w, (f) => f.feet[i][axis]),
            scalar(r, (f) => f.feet[i][axis]),
            run,
          ),
        );
      const c = (f: typeof w) =>
        f.t < 0.5 ? f.a.contacts?.[i] : f.b.contacts?.[i];
      this.contacts[i] = run > 0.5 ? !!c(r) : !!c(w);
      if (stop >= 0) {
        const amount =
          T.MathUtils.smoothstep(stop, 0, 0.15) *
          (1 - T.MathUtils.smoothstep(stop, 0.82, 1));
        for (let axis = 0; axis < 3; axis++)
          this.feet[i].setComponent(
            axis,
            T.MathUtils.lerp(
              this.feet[i].getComponent(axis),
              scalar(stopped, (f) => f.feet[i][axis]),
              amount,
            ),
          );
        this.contacts[i] = this.feet[i].y < 0.14;
      }
    }
    // Idle breathing is small and independent of gait generation.
    this.hipHeight += Math.sin(time * 1.65) * 0.002 * (1 - stride);
  }
}
