import * as T from "three";

import { heightAt } from "../world/terrain";
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
