import * as T from "three";
import { buildArmor } from "./model/buildArmor";
import { SheathedSword } from "./model/SheathedSword";
import { Cape } from "./model/Cape";
import { KnightAnimator } from "./animation/KnightAnimator";
import { WindSystem } from "../environment/WindSystem";
import { smoothstep } from "../config";
import { ImportedAvatar } from "./model/ImportedAvatar";
import type { PostureMode } from "./animation/PostureLayer";
export class Knight {
  readonly root = new T.Group();
  readonly rig;
  readonly mesh;
  readonly animator;
  readonly hips: T.Bone;
  readonly cape: Cape;
  readonly sword?: SheathedSword;
  readonly imported?: ImportedAvatar;
  constructor(
    readonly wind: WindSystem = new WindSystem(),
    readonly appearance: "authored" | "imported" = "authored",
    posture: PostureMode = "neutral",
    illustrated = false,
  ) {
    this.root.name = "Nameless knight — Gothic harness";
    const model = buildArmor(this.root, wind);
    this.rig = model.rig;
    this.mesh = model.mesh;
    this.hips = this.rig.hips;
    this.cape = new Cape(this.rig, wind);
    if (appearance === "imported") {
      this.mesh.visible = false;
      this.imported = new ImportedAvatar(
        this.root,
        this.rig,
        wind,
        illustrated,
      );
    } else this.sword = new SheathedSword(this.rig, model.materials);
    this.animator = new KnightAnimator(this.root, this.rig, posture);
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
    this.imported?.update(
      dt,
      speed,
      this.animator.feet,
      smoothstep(0.6, 3.5, restTime ?? 0),
      this.animator.posture,
    );
    this.sword?.update(time, speed, smoothstep(0.6, 3.5, restTime ?? 0));
    this.root.updateMatrixWorld(true);
    this.cape.update(time, speed, smoothstep(4, 9, restTime ?? 0));
  }
  consumeFootfalls() {
    return this.animator.consumeFootfalls();
  }
  get diagnostics() {
    return {
      ...this.animator.diagnostics,
      scarf: this.cape.diagnostics,
      sword: {
        drawn: this.sword?.drawn ?? false,
        mount: this.sword?.mount.parent?.name ?? null,
      },
      appearance: this.imported?.diagnostics ?? { kind: "authored" },
      triangles:
        this.imported?.diagnostics.triangles ??
        (this.mesh.geometry.index?.count ??
          this.mesh.geometry.attributes.position.count) / 3,
      joints: this.imported?.bones.length ?? this.mesh.skeleton.bones.length,
    };
  }
}
