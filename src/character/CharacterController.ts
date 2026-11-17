import * as T from "three";
import { damp } from "../config";
import { heightAt, resolveObstacles, type Obstacle } from "../world/terrain";
import type { Input } from "../systems/Input";
export class CharacterController {
  readonly position = new T.Vector3(0, heightAt(0, 7), 7);
  readonly velocity = new T.Vector3();
  rotation = Math.PI;
  speed = 0;
  dodge = 0;
  private dodgeCooldown = 0;
  private direction = new T.Vector3();
  update(dt: number, input: Input, yaw: number, obstacles: Obstacle[]) {
    let x = Number(input.keys.has("KeyD")) - Number(input.keys.has("KeyA"));
    let z = Number(input.keys.has("KeyS")) - Number(input.keys.has("KeyW"));
    const length = Math.hypot(x, z);
    if (length > 0) {
      x /= length;
      z /= length;
    }
    const running = input.keys.has("ShiftLeft") || input.keys.has("ShiftRight");
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt);
    if (input.consume("Space") && this.dodgeCooldown <= 0) {
      this.dodge = 0.65;
      this.dodgeCooldown = 1.2;
      if (!length) {
        x = -Math.sin(this.rotation);
        z = -Math.cos(this.rotation);
      }
    }
    this.dodge = Math.max(0, this.dodge - dt);
    if (this.dodge > 0 && length === 0) {
      this.direction.set(Math.sin(this.rotation), 0, Math.cos(this.rotation));
    } else {
      this.direction.set(
        x * Math.cos(yaw) + z * Math.sin(yaw),
        0,
        -x * Math.sin(yaw) + z * Math.cos(yaw),
      );
    }
    const target = this.dodge > 0 ? 8 : running ? 5.6 : 2.9;
    this.velocity.x = damp(this.velocity.x, this.direction.x * target, 9, dt);
    this.velocity.z = damp(this.velocity.z, this.direction.z * target, 9, dt);
    const nextX = this.position.x + this.velocity.x * dt,
      nextZ = this.position.z + this.velocity.z * dt;
    const [nx, nz] = resolveObstacles(nextX, nextZ, obstacles);
    this.position.set(nx, heightAt(nx, nz), nz);
    this.speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (this.speed > 0.1) {
      const angle = Math.atan2(this.velocity.x, this.velocity.z);
      const delta = Math.atan2(
        Math.sin(angle - this.rotation),
        Math.cos(angle - this.rotation),
      );
      this.rotation += delta * (1 - Math.exp(-12 * dt));
    }
  }
  stop() {
    this.velocity.set(0, 0, 0);
    this.speed = 0;
    this.dodge = 0;
  }
}
