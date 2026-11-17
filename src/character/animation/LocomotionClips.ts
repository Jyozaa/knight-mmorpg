import * as T from "three";
import clips from "./clips/locomotion.json";
import { wrapPhase } from "./kinematics";
type Clip = typeof clips.walk;
/** Phase-aligned authored motion; terrain contact/IK is layered downstream. */
export class LocomotionClips {
  readonly rotations = Array.from({ length: 10 }, () => new T.Euler());
  hipHeight = 0;
  private a = new T.Quaternion();
  private b = new T.Quaternion();
  private c = new T.Quaternion();
  private sample(clip: Clip, phase: number, bone: number, out: T.Quaternion) {
    const p = wrapPhase(phase) * 48,
      k = Math.floor(p),
      t = p - k;
    out.fromArray(clip.frames[k].q, bone * 4);
    this.c.fromArray(clip.frames[k + 1].q, bone * 4);
    return out.slerp(this.c, t);
  }
  update(phase: number, run: number, stride: number, time: number) {
    const p = phase + 0.5;
    for (let i = 0; i < 10; i++) {
      this.sample(clips.walk, p, i, this.a);
      this.sample(clips.run, p, i, this.b);
      this.a.slerp(this.b, run);
      this.sample(clips.idle, time / clips.idle.duration, i, this.b);
      this.b.slerp(this.a, stride);
      this.rotations[i].setFromQuaternion(this.b);
    }
    const height = (clip: Clip) => {
      const f = wrapPhase(p) * 48,
        k = Math.floor(f);
      return T.MathUtils.lerp(
        clip.frames[k].hip[1],
        clip.frames[k + 1].hip[1],
        f - k,
      );
    };
    // Preserve the authored compression/flight curve without the source's exaggerated proportions.
    this.hipHeight =
      T.MathUtils.lerp(
        (height(clips.walk) - 0.371) * 0.65,
        (height(clips.run) - 0.41) * 0.62,
        run,
      ) * stride;
  }
}
