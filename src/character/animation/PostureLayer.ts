import * as T from "three";
import { damp, smoothstep } from "../../config";
import type { Rig } from "../model/buildArmor";
export type PostureMode = "neutral" | "weary";
/** The canonical rig owns body offsets. Only unmapped native clavicles/neck translation need a native adjustment. */
export class PostureLayer {
  weight: number;
  targetWeight = 0;
  private run = 0;
  private pelvisPitch = 0;
  private lowerPitch = 0;
  private upperPitch = 0;
  private headPitch = 0;
  private headPosition: T.Vector3;
  private armPositions: T.Vector3[];
  private chestZ: number;
  private up = new T.Vector3(0, 1, 0);
  private axis = new T.Vector3();
  private q = new T.Quaternion();
  private parent = new T.Quaternion();
  private world = new T.Quaternion();
  private point = new T.Vector3();
  constructor(
    private rig: Rig,
    readonly mode: PostureMode = "neutral",
  ) {
    this.weight = mode === "weary" ? 1 : 0;
    this.headPosition = rig.head.position.clone();
    this.armPositions = rig.arms.map((b) => b.position.clone());
    this.chestZ = rig.chest.position.z;
  }
  update(dt: number, speed: number, rest: number | null) {
    this.run = damp(this.run, smoothstep(1.7, 3.3, speed), 6, dt);
    this.targetWeight =
      this.mode === "weary"
        ? (1 - smoothstep(1, 7, rest ?? 0)) * (1 - 0.14 * this.run)
        : 0;
    this.weight = damp(this.weight, this.targetWeight, 6, dt);
    this.pelvisPitch = -0.022 * this.weight;
    this.lowerPitch = (0.062 + 0.078 * this.run) * this.weight;
    this.upperPitch = (0.088 - 0.032 * this.run) * this.weight;
    this.headPitch = (0.078 - 0.044 * this.run) * this.weight;
  }
  applyTorso() {
    const r = this.rig,
      w = this.weight;
    r.hips.position.y -= (0.008 - 0.002 * this.run) * w;
    r.hips.position.z -= 0.012 * w;
    r.hips.rotateX(this.pelvisPitch);
    r.hips.rotateZ(0.009 * w);
    r.spine.rotateX(this.lowerPitch);
    r.chest.rotateX(this.upperPitch);
    r.chest.position.z = this.chestZ + 0.008 * w;
    r.head.rotateX(this.headPitch);
    r.head.position.copy(this.headPosition);
    r.head.position.z += 0.018 * w;
    r.head.position.y -= 0.004 * w;
    r.arms.forEach((b, i) => {
      b.position.z = this.armPositions[i].z + 0.018 * w;
    });
  }
  applyArms() {
    const w = this.weight;
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      this.rig.arms[i].position.y -= 0.006 * w;
      this.rig.arms[i].rotateX(-0.035 * w * (1 - 0.45 * this.run));
      this.rig.arms[i].rotateZ(side * 0.014 * w);
      this.rig.forearms[i].rotateX(-0.025 * w * (1 - 0.35 * this.run));
    }
  }
  nativeShoulder(
    bone: T.Bone,
    bind: T.Quaternion,
    index: number,
    actor: T.Quaternion,
  ) {
    bone.parent!.getWorldQuaternion(this.parent);
    this.world.copy(this.parent).multiply(bind);
    this.axis.copy(this.up).applyQuaternion(actor);
    this.q
      .setFromAxisAngle(this.axis, (index === 0 ? 1 : -1) * 0.085 * this.weight)
      .multiply(this.world);
    bone.quaternion.copy(this.parent.invert()).multiply(this.q);
    bone.updateWorldMatrix(false, true);
  }
  nativeNeck(bone: T.Bone, bind: T.Vector3, actor: T.Quaternion) {
    this.point.copy(bind);
    bone.parent!.localToWorld(this.point);
    this.axis
      .set(0, -0.004, 0.018)
      .applyQuaternion(actor)
      .multiplyScalar(this.weight);
    this.point.add(this.axis);
    bone.parent!.worldToLocal(this.point);
    bone.position.copy(this.point);
    bone.updateWorldMatrix(false, true);
  }
  get diagnostics() {
    return {
      mode: this.mode,
      weight: this.weight,
      targetWeight: this.targetWeight,
      run: this.run,
      pelvisPitch: this.pelvisPitch,
      lowerSpinePitch: this.lowerPitch,
      chestPitch: this.upperPitch,
      headPitch: this.headPitch,
      neckForward: 0.018 * this.weight,
      shoulderProtraction: 0.085 * this.weight,
    };
  }
}
