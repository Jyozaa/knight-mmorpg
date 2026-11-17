import * as T from "three";

import { heightAt } from "../world/terrain";
import { smoothstep } from "../config";
import { SIDE_YAW } from "../camera/Cinematic25DCamera";
import type { CameraMode } from "../camera/CameraController";
export interface CameraKey {
  time: number;
  offset: T.Vector3;
  lookHeight: number;
}
export class CinematicSystem {
  time = 0;
  active = false;
  readonly position = new T.Vector3();
  readonly target = new T.Vector3();
  viewHeight = 4.65;
  constructor(readonly mode: CameraMode = "legacy") {}
  private origin = new T.Vector3();
  private yaw = 0;
  readonly keys: CameraKey[] = [
    { time: 0, offset: new T.Vector3(-2.5, 1.35, 2.5), lookHeight: 1 },
    { time: 10, offset: new T.Vector3(-2.7, 0.55, 0.2), lookHeight: 0.35 },
    { time: 15, offset: new T.Vector3(-5, 1.8, 3), lookHeight: 0.3 },
    { time: 26, offset: new T.Vector3(-18, 8, 15), lookHeight: 1 },
    { time: 40, offset: new T.Vector3(-42, 22, 40), lookHeight: 2 },
    { time: 55, offset: new T.Vector3(-72, 35, 68), lookHeight: 3 },
  ];
  private curve = new T.CatmullRomCurve3(
    this.keys.map((key) => key.offset),
    false,
    "centripetal",
  );
  start(origin: T.Vector3, yaw: number) {
    this.origin.copy(origin);
    this.yaw = yaw;
    this.time = 0;
    this.active = true;
  }
  update(dt: number) {
    this.time = Math.min(55, this.time + dt);
    if (this.mode === "2p5d") {
      const reveal = smoothstep(11, 55, this.time),
        settle = smoothstep(0, 10, this.time);
      this.viewHeight = 4.65 + (16 - 4.65) * reveal;
      this.target
        .copy(this.origin)
        .add(
          new T.Vector3(
            Math.cos(SIDE_YAW),
            0,
            -Math.sin(SIDE_YAW),
          ).multiplyScalar(0.25 + 5.75 * reveal),
        );
      this.target.y += 1.02 - 0.64 * settle + 3.0 * reveal;
      this.position
        .copy(this.target)
        .add(
          new T.Vector3(
            Math.sin(SIDE_YAW) * 24,
            Math.tan(0.3) * 24,
            Math.cos(SIDE_YAW) * 24,
          ),
        );
      return;
    }
    let i = 0;
    while (i < this.keys.length - 2 && this.time > this.keys[i + 1].time) i++;
    const a = this.keys[i],
      b = this.keys[i + 1],
      t = Math.max(0, Math.min(1, (this.time - a.time) / (b.time - a.time)));
    this.curve.getPoint((i + t) / (this.keys.length - 1), this.position);
    this.position
      .applyAxisAngle(T.Object3D.DEFAULT_UP, this.yaw)
      .add(this.origin);
    this.position.y = Math.max(
      this.position.y,
      heightAt(this.position.x, this.position.z) + 0.28,
    );
    this.target.copy(this.origin);
    this.target.y += a.lookHeight + (b.lookHeight - a.lookHeight) * t;
  }
  stop() {
    this.active = false;
  }
}
