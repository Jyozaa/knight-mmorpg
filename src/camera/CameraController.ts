import * as T from "three";
import type { Obstacle } from "../world/terrain";
import { LegacyCamera } from "./LegacyCamera";
import {
  Cinematic25DCamera,
  type IllustrationProjection,
} from "./Cinematic25DCamera";
export type CameraMode = "legacy" | "2p5d";
/** The legacy controller remains intact; mode selection changes presentation ownership. */
export class CameraController {
  private controller: LegacyCamera | Cinematic25DCamera;
  constructor(
    position: T.Vector3,
    obstacles: Obstacle[] = [],
    readonly mode: CameraMode = "legacy",
    projection: IllustrationProjection = "orthographic",
  ) {
    this.controller =
      mode === "legacy"
        ? new LegacyCamera(position, obstacles)
        : new Cinematic25DCamera(position, projection);
  }
  get camera() {
    return this.controller.camera;
  }
  get yaw() {
    return this.controller.yaw;
  }
  get distance() {
    return this.controller.distance;
  }
  get composition() {
    return this.controller instanceof Cinematic25DCamera
      ? this.controller.composition
      : undefined;
  }
  get listeningPosition() {
    return this.controller instanceof Cinematic25DCamera
      ? this.controller.listeningPosition
      : this.camera.position;
  }
  orbit(dx: number, dy: number, sensitivity: number) {
    this.controller.orbit(dx, dy, sensitivity);
  }
  zoom(delta: number) {
    this.controller.zoom(delta);
  }
  update(
    dt: number,
    position: T.Vector3,
    menu = false,
    time = 0,
    speed = 0,
    velocity?: T.Vector3,
  ) {
    if (this.controller instanceof Cinematic25DCamera)
      this.controller.update(dt, position, menu, time, speed, velocity);
    else this.controller.update(dt, position, menu, time, speed);
  }
  cinematic(
    dt: number,
    position: T.Vector3,
    target: T.Vector3,
    viewHeight?: number,
  ) {
    if (this.controller instanceof Cinematic25DCamera)
      this.controller.cinematic(dt, position, target, viewHeight);
    else this.controller.cinematic(dt, position, target);
  }
  resize() {
    this.controller.resize();
  }
  get diagnostics() {
    return this.controller instanceof Cinematic25DCamera
      ? this.controller.diagnostics
      : {
          mode: "legacy",
          projection: "perspective",
          yaw: this.yaw,
          viewHeight: null,
        };
  }
}
