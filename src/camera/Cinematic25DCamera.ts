import * as T from "three";
import { damp } from "../config";

export const SIDE_YAW = 2.0;
export const GAME_VIEW_HEIGHT = 4.65;
export type IllustrationProjection = "orthographic" | "weak";
/** A fixed, shallow side view. Framing follows the controller, never animated joints. */
export class Cinematic25DCamera {
  readonly camera: T.OrthographicCamera | T.PerspectiveCamera;
  readonly direction = new T.Vector2(Math.sin(SIDE_YAW), Math.cos(SIDE_YAW));
  readonly right = new T.Vector3(Math.cos(SIDE_YAW), 0, -Math.sin(SIDE_YAW));
  readonly listeningPosition = new T.Vector3();
  readonly target = new T.Vector3();
  readonly anchor = new T.Vector3();
  readonly composition = { direction: this.direction, travel: 0 };
  viewHeight = GAME_VIEW_HEIGHT;
  private requestedHeight = GAME_VIEW_HEIGHT;
  private zoomHeight = GAME_VIEW_HEIGHT;
  private velocity = new T.Vector3();
  private desired = new T.Vector3();
  private origin = new T.Vector3();
  private offset = new T.Vector3();
  private lookAhead = 0;
  private yawAdjustment = 0;
  private pitchAdjustment = 0;
  private readonly zero = new T.Vector3();
  private cinematicActive = false;
  private returning = false;
  private cinematicTilt = 0;
  constructor(
    position: T.Vector3,
    readonly projection: IllustrationProjection = "orthographic",
  ) {
    this.camera =
      projection === "orthographic"
        ? new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 450)
        : new T.PerspectiveCamera(4.5, innerWidth / innerHeight, 0.1, 700);
    this.anchor.copy(position);
    this.origin.copy(position);
    this.target.copy(position).add(new T.Vector3(0, 1.02, 0));
    this.resize();
  }
  get yaw() {
    return SIDE_YAW + this.yawAdjustment;
  }
  get pitch() {
    return 0.3 + this.pitchAdjustment + this.cinematicTilt;
  }
  get distance() {
    return this.camera.position.distanceTo(this.target);
  }
  zoom(delta: number) {
    this.zoomHeight = T.MathUtils.clamp(
      this.zoomHeight + delta * 0.002,
      3.6,
      6.8,
    );
  }
  orbit(dx: number, dy: number, sensitivity: number) {
    this.yawAdjustment = T.MathUtils.clamp(
      this.yawAdjustment - dx * 0.00022 * sensitivity,
      -0.055,
      0.055,
    );
    this.pitchAdjustment = T.MathUtils.clamp(
      this.pitchAdjustment + dy * 0.00018 * sensitivity,
      -0.025,
      0.035,
    );
  }
  private follow(dt: number, goal: T.Vector3) {
    for (let axis = 0; axis < 3; axis++) {
      const omega = axis === 1 ? 5.5 : 8,
        x = this.anchor.getComponent(axis) - goal.getComponent(axis),
        v = this.velocity.getComponent(axis);
      const decay = Math.exp(-omega * dt),
        term = (v + omega * x) * dt;
      this.anchor.setComponent(
        axis,
        goal.getComponent(axis) + (x + term) * decay,
      );
      this.velocity.setComponent(axis, (v - omega * term) * decay);
    }
  }
  update(
    dt: number,
    position: T.Vector3,
    menu = false,
    _time = 0,
    _speed = 0,
    movement = this.zero,
  ) {
    if (this.cinematicActive) this.returning = true;
    this.cinematicActive = false;
    this.cinematicTilt = damp(this.cinematicTilt, 0, 3.5, dt);
    this.desired.copy(position);
    // The narrow dead zone absorbs tiny controller corrections without following gait compression.
    const screenDelta = this.offset
      .subVectors(position, this.anchor)
      .dot(this.right);
    if (Math.abs(screenDelta) < 0.07)
      this.desired.addScaledVector(this.right, -screenDelta);
    this.follow(dt, this.desired);
    this.lookAhead = damp(
      this.lookAhead,
      T.MathUtils.clamp(movement.dot(this.right) * 0.32, -0.72, 0.72),
      3,
      dt,
    );
    this.desired
      .copy(this.anchor)
      .addScaledVector(this.right, menu ? -1.05 : 0.2 + this.lookAhead);
    this.desired.y += menu ? 1.04 : 1.02;
    if (this.returning) {
      this.target.lerp(this.desired, 1 - Math.exp(-3.5 * dt));
      if (this.target.distanceToSquared(this.desired) < 0.000004)
        this.returning = false;
    } else this.target.copy(this.desired);
    this.requestedHeight = damp(
      this.requestedHeight,
      menu ? 4.0 : this.zoomHeight,
      this.returning ? 3.5 : 4,
      dt,
    );
    this.resize();
  }
  cinematic(
    dt: number,
    _position: T.Vector3,
    target: T.Vector3,
    viewHeight = GAME_VIEW_HEIGHT,
  ) {
    this.cinematicActive = true;
    this.cinematicTilt = damp(this.cinematicTilt, 0.15, 3.5, dt);
    this.target.lerp(target, 1 - Math.exp(-3.5 * dt));
    this.requestedHeight = damp(this.requestedHeight, viewHeight, 3.5, dt);
    this.resize();
  }
  private place() {
    const distance =
      this.projection === "weak"
        ? (this.viewHeight * Math.cos(this.pitch)) /
          (2 * Math.tan(T.MathUtils.degToRad(4.5) / 2))
        : 24;
    this.offset
      .set(Math.sin(this.yaw), Math.tan(this.pitch), Math.cos(this.yaw))
      .multiplyScalar(distance);
    this.camera.position.copy(this.target).add(this.offset);
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld();
    this.composition.travel = this.offset
      .subVectors(this.target, this.origin)
      .dot(this.right);
    const earDistance = 3.8 * Math.max(1, this.viewHeight / GAME_VIEW_HEIGHT);
    this.offset
      .set(Math.sin(this.yaw), Math.tan(this.pitch), Math.cos(this.yaw))
      .multiplyScalar(earDistance);
    this.listeningPosition.copy(this.anchor).add(this.offset);
    this.listeningPosition.y += 1.1;
  }
  resize() {
    const aspect = innerWidth / innerHeight;
    this.viewHeight = Math.max(this.requestedHeight, 4.8 / aspect);
    if (this.camera instanceof T.OrthographicCamera) {
      this.camera.left = (-this.viewHeight * aspect) / 2;
      this.camera.right = (this.viewHeight * aspect) / 2;
      this.camera.top = this.viewHeight / 2;
      this.camera.bottom = -this.viewHeight / 2;
    } else this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.place();
  }
  get diagnostics() {
    return {
      mode: "2p5d",
      projection: this.projection,
      viewHeight: this.viewHeight,
      yaw: this.yaw,
      pitch: this.pitch,
      lookAhead: this.lookAhead,
      target: this.target.toArray(),
      anchor: this.anchor.toArray(),
      parallaxTravel: this.composition.travel,
    };
  }
}
