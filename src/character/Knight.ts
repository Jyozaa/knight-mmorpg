import * as T from "three";
import { buildArmor } from "./model/buildArmor";
import { Cape } from "./model/Cape";
import { KnightAnimator } from "./animation/KnightAnimator";
import { smoothstep } from "../config";
export class Knight {
  readonly root = new T.Group();
  readonly rig;
  readonly mesh;
  readonly animator;
  readonly hips: T.Bone;
  private cape: Cape;
  constructor() {
    this.root.name = "Nameless knight — Gothic harness";
    const model = buildArmor(this.root);
    this.rig = model.rig;
    this.mesh = model.mesh;
    this.hips = this.rig.hips;
    this.cape = new Cape(this.rig);
    this.animator = new KnightAnimator(this.root, this.rig);
  }
  update(
    dt: number,
    time: number,
    speed: number,
    restTime: number | null,
    dodge: number,
    turnRate = 0,
  ) {
    this.animator.update(dt, time, speed, restTime, dodge, turnRate);
    this.cape.update(time, speed, smoothstep(4, 9, restTime ?? 0));
  }
  get diagnostics() {
    return {
      ...this.animator.diagnostics,
      triangles:
        (this.mesh.geometry.index?.count ??
          this.mesh.geometry.attributes.position.count) / 3,
      joints: this.mesh.skeleton.bones.length,
    };
  }
}
