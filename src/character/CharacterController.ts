import * as T from "three";
import { damp } from "../config";
import { heightAt, resolveObstacles, type Obstacle } from "../world/terrain";
import type { Input } from "../systems/Input";
import type { CameraMode } from "../camera/CameraController";
export const DEPTH_CORRIDOR = 3.5;
export class CharacterController {
  readonly position = new T.Vector3(0, heightAt(0, 7), 7);
  readonly velocity = new T.Vector3();
  rotation = Math.PI;
  speed = 0;
  turnRate = 0;
  dodge = 0;
  private dodgeCooldown = 0;
  private direction = new T.Vector3();
  constructor(readonly mode: CameraMode = "legacy") {}
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
      if (this.mode === "2p5d") this.direction.set(z * 0.5, 0, -x);
      else
        this.direction.set(
          x * Math.cos(yaw) + z * Math.sin(yaw),
          0,
          -x * Math.sin(yaw) + z * Math.cos(yaw),
        );
    }
    let target = this.dodge > 0 ? 8 : running ? 3.6 : 1.35;
    if (this.mode === "2p5d" && length > 0 && this.dodge <= 0)
      target *= this.direction.length();
    if (length > 0) {
      const desired = Math.atan2(this.direction.x, this.direction.z),
        error = Math.atan2(
          Math.sin(desired - this.rotation),
          Math.cos(desired - this.rotation),
        );
      const turn = Math.max(
        -3.5 * dt,
        Math.min(3.5 * dt, error * (1 - Math.exp(-8 * dt))),
      );
      this.rotation += turn;
      this.turnRate = damp(this.turnRate, turn / Math.max(dt, 0.001), 10, dt);
      target *= Math.max(0, Math.cos(error * 0.5)) ** 2;
      this.direction.set(Math.sin(this.rotation), 0, Math.cos(this.rotation));
    } else this.turnRate = damp(this.turnRate, 0, 10, dt);
    this.velocity.x = damp(
      this.velocity.x,
      this.direction.x * target,
      length ? 6 : 7.5,
      dt,
    );
    this.velocity.z = damp(
      this.velocity.z,
      this.direction.z * target,
      length ? 6 : 7.5,
      dt,
    );
    const nextX = this.position.x + this.velocity.x * dt,
      nextZ = this.position.z + this.velocity.z * dt;
    let [nx, nz] = resolveObstacles(nextX, nextZ, obstacles);
    if (this.mode === "2p5d") {
      nx = T.MathUtils.clamp(nx, -DEPTH_CORRIDOR, DEPTH_CORRIDOR);
      // A wall projection may not push the knight back into a solid rock.
      if (
        obstacles.some(
          (o) => Math.hypot(nx - o.x, nz - o.z) < o.radius + 0.4199,
        )
      ) {
        nx = this.position.x;
        nz = this.position.z;
      }
      this.velocity.set(
        (nx - this.position.x) / dt,
        0,
        (nz - this.position.z) / dt,
      );
    }
    this.position.set(nx, heightAt(nx, nz), nz);
    this.speed = Math.hypot(this.velocity.x, this.velocity.z);
  }

  stop() {
    this.velocity.set(0, 0, 0);
    this.speed = 0;
    this.dodge = 0;
    this.turnRate = 0;
  }
}
