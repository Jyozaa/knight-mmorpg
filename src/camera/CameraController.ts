import * as T from "three";
import { damp } from "../config";
import { heightAt, type Obstacle } from "../world/terrain";
export class CameraController {
  readonly camera = new T.PerspectiveCamera(
    48,
    innerWidth / innerHeight,
    0.1,
    1000,
  );
  yaw = 0;
  pitch = 0.26;
  distance = 4.8;
  private zoomDistance = 4.5;
  private target = new T.Vector3();
  private desired = new T.Vector3();
  private look = new T.Vector3();
  constructor(
    position: T.Vector3,
    private obstacles: Obstacle[] = [],
  ) {
    this.target.copy(position).add(new T.Vector3(0, 1.3, 0));
    this.camera.position.copy(position).add(new T.Vector3(0, 2.5, 4.8));
    this.camera.lookAt(this.target);
  }
  zoom(delta: number) {
    this.zoomDistance = Math.max(
      1.9,
      Math.min(7.5, this.zoomDistance + delta * 0.004),
    );
  }
  orbit(dx: number, dy: number, sensitivity: number) {
    this.yaw -= dx * 0.0027 * sensitivity;
    this.pitch = Math.max(
      -0.12,
      Math.min(1.05, this.pitch + dy * 0.0027 * sensitivity),
    );
  }
  update(dt: number, position: T.Vector3, menu = false, time = 0, speed = 0) {
    const yaw = menu ? -0.55 + Math.sin(time * 0.06) * 0.08 : this.yaw;
    this.distance = damp(
      this.distance,
      this.zoomDistance + Math.min(1, speed / 4.4) * 0.75,
      2.5,
      dt,
    );
    const distance = menu ? 3.7 : this.distance;
    this.desired.set(
      position.x + Math.sin(yaw) * distance,
      position.y + 1.1 + Math.sin(this.pitch) * distance,
      position.z + Math.cos(yaw) * distance,
    );
    this.desired.y = Math.max(
      this.desired.y,
      heightAt(this.desired.x, this.desired.z) + 0.7,
    );
    // Shorten the camera arm before crossing a solid object. Heights let it look over low rocks.
    const ox = position.x,
      oz = position.z,
      oy = position.y + 1.25;
    const dx = this.desired.x - ox,
      dz = this.desired.z - oz,
      dy = this.desired.y - oy;
    const armSquared = dx * dx + dz * dz;
    let fraction = 1;
    for (const o of this.obstacles) {
      const px = ox - o.x,
        pz = oz - o.z,
        r = o.radius + 0.35;
      const b = 2 * (px * dx + pz * dz),
        c = px * px + pz * pz - r * r,
        discriminant = b * b - 4 * armSquared * c;
      if (discriminant < 0 || armSquared < 0.001) continue;
      const hit = (-b - Math.sqrt(discriminant)) / (2 * armSquared);
      if (
        hit > 0.04 &&
        hit < fraction &&
        oy + dy * hit < heightAt(o.x, o.z) + (o.height ?? o.radius * 2)
      )
        fraction = Math.max(0.12, hit - 0.04);
    }
    if (fraction < 1)
      this.desired.set(
        ox + dx * fraction,
        Math.max(
          oy + dy * fraction,
          heightAt(ox + dx * fraction, oz + dz * fraction) + 0.65,
        ),
        oz + dz * fraction,
      );
    this.camera.position.lerp(this.desired, 1 - Math.exp(-4 * dt));
    this.look.copy(position).add(new T.Vector3(menu ? -0.85 : 0, 1.25, 0));
    this.target.lerp(this.look, 1 - Math.exp(-6 * dt));
    this.camera.lookAt(this.target);
    this.camera.fov = damp(
      this.camera.fov,
      menu ? 42 : 44 + Math.min(1, speed / 4.4) * 3,
      3,
      dt,
    );
    this.camera.updateProjectionMatrix();
  }
  cinematic(dt: number, position: T.Vector3, target: T.Vector3) {
    this.camera.position.lerp(position, 1 - Math.exp(-2.4 * dt));
    this.target.lerp(target, 1 - Math.exp(-3 * dt));
    this.camera.lookAt(this.target);
  }
  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  }
}
