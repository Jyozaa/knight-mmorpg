import * as T from "three";
import { damp, smoothstep } from "../../config";
import { heightAt } from "../../world/terrain";
import type { Rig } from "../model/buildArmor";
import {
  solveKnee,
  aimBone,
  wrapPhase,
  swingProgress,
  smoother,
} from "./kinematics";
import { LocomotionClips } from "./LocomotionClips";
interface FootState {
  anchor: T.Vector3;
  start: T.Vector3;
  end: T.Vector3;
  target: T.Vector3;
  swinging: boolean;
  contact: boolean;
  phase: number;
  idleTime: number;
  idleStep: boolean;
}
export class KnightAnimator {
  private phase = 0.08;
  private clips = new LocomotionClips();
  private previousSpeed = 0;
  private acceleration = 0;
  private stride = 0;
  private run = 0;
  private initialized = false;
  private lastRest = 0;
  private priorContacts = [true, true];
  private landings = 0;
  private impact = 0;
  private impactVelocity = 0;
  private support = 0;
  consumeFootfalls() {
    const events = this.landings;
    this.landings = 0;
    return events;
  }
  private restStartFeet = [new T.Vector3(), new T.Vector3()];
  private previous = new T.Vector3();
  private velocity = new T.Vector3();
  private direction = new T.Vector3();
  private forward = new T.Vector3();
  private side = new T.Vector3();
  private local = new T.Vector3();
  private origin = new T.Vector3();
  private knee = new T.Vector3();
  private pole = new T.Vector3();
  private target = new T.Vector3();
  private q = new T.Quaternion();
  private oldArm = new T.Quaternion();
  private oldForearm = new T.Quaternion();
  readonly feet: FootState[] = Array.from({ length: 2 }, () => ({
    anchor: new T.Vector3(),
    start: new T.Vector3(),
    end: new T.Vector3(),
    target: new T.Vector3(),
    swinging: false,
    contact: true,
    phase: 0,
    idleTime: 0,
    idleStep: false,
  }));
  constructor(
    private root: T.Group,
    readonly rig: Rig,
  ) {}
  update(
    dt: number,
    time: number,
    speed: number,
    restTime: number | null,
    dodge: number,
    turnRate = 0,
  ) {
    const r = this.rig;
    if (!this.initialized) {
      this.previous.copy(this.root.position);
      this.initialized = true;
      this.initializeFeet();
    }
    this.velocity
      .subVectors(this.root.position, this.previous)
      .divideScalar(Math.max(dt, 0.0001));
    this.velocity.y = 0;
    this.previous.copy(this.root.position);
    const actualSpeed = this.velocity.length();
    if (restTime !== null && this.lastRest === 0)
      for (let i = 0; i < 2; i++)
        this.restStartFeet[i].copy(this.feet[i].target);
    this.stride = damp(this.stride, Math.min(1, speed / 0.65), 9, dt);
    this.run = damp(this.run, smoothstep(2.0, 3.7, speed), 6, dt);
    this.direction.copy(this.velocity);
    if (actualSpeed > 0.04) this.direction.normalize();
    else
      this.direction.set(
        Math.sin(this.root.rotation.y),
        0,
        Math.cos(this.root.rotation.y),
      );
    const rest = restTime ?? 0,
      prepare = smoothstep(0, 0.7, rest),
      sit = smoothstep(0.6, 3.5, rest),
      recline = smoothstep(4.1, 8.8, rest),
      settle = smoothstep(8.5, 10, rest);
    const restWeight = smoothstep(0, 0.4, rest);
    this.forward.set(
      Math.sin(this.root.rotation.y),
      0,
      Math.cos(this.root.rotation.y),
    );
    this.side.set(this.forward.z, 0, -this.forward.x);
    // A resting body follows the tangent plane instead of rotating through the hillside.
    const x = this.root.position.x,
      z = this.root.position.z;
    const slopeForward =
      heightAt(x + this.forward.x * 0.5, z + this.forward.z * 0.5) -
      heightAt(x - this.forward.x * 0.5, z - this.forward.z * 0.5);
    const slopeSide =
      heightAt(x + this.side.x * 0.5, z + this.side.z * 0.5) -
      heightAt(x - this.side.x * 0.5, z - this.side.z * 0.5);
    this.root.rotation.order = "YXZ";
    this.root.rotation.x = -Math.atan(slopeForward) * restWeight;
    this.root.rotation.z = Math.atan(slopeSide) * restWeight;
    const strideLength = T.MathUtils.lerp(1.18, 2.45, this.run);
    if (restTime === null && actualSpeed > 0.04)
      this.phase += (actualSpeed * dt) / strideLength;
    const cycle = Math.PI * 2 * this.phase;
    this.acceleration = damp(
      this.acceleration,
      T.MathUtils.clamp(
        (actualSpeed - this.previousSpeed) / Math.max(dt, 0.001),
        -5,
        5,
      ),
      6,
      dt,
    );
    this.previousSpeed = actualSpeed;
    this.clips.update(this.phase, this.run, this.stride, time);
    const pose = this.clips.rotations;
    const stride = this.stride * (1 - restWeight),
      run = this.run * (1 - restWeight);
    this.impactVelocity += (-this.impact * 150 - this.impactVelocity * 22) * dt;
    this.impact += this.impactVelocity * dt;
    const planted =
      this.feet[0].contact && !this.feet[1].contact
        ? -1
        : this.feet[1].contact && !this.feet[0].contact
          ? 1
          : 0;
    this.support = damp(this.support, planted, 9, dt);
    const bob = this.clips.hipHeight * (1 - restWeight);
    r.hips.position.set(
      Math.sin(cycle) * 0.035 * stride * (1 - restWeight) +
        this.support * 0.012 * stride +
        Math.sin(time * 0.6) * 0.005 * (1 - stride) * (1 - restWeight),
      1.01 +
        this.impact * (1 - restWeight) -
        0.065 * stride -
        0.005 * run +
        bob -
        0.055 * prepare -
        0.69 * sit -
        0.04 * recline,
      0.035 * stride +
        0.055 * run -
        0.07 * prepare -
        0.16 * sit -
        0.12 * recline,
    );
    r.hips.rotation.set(
      (pose[0].x - 0.045 * stride - 0.025 * run) * (1 - restWeight),
      (pose[0].y + Math.sin(cycle) * 0.07 * stride) * (1 - restWeight),
      (pose[0].z +
        Math.sin(cycle) * 0.025 * stride -
        T.MathUtils.clamp(turnRate * 0.025, -0.1, 0.1) * stride) *
        (1 - restWeight),
    );
    r.spine.position.y = 0.11 - 0.1 * recline;
    r.spine.rotation.set(
      (pose[1].x - 0.09 * stride - 0.06 * run - this.acceleration * 0.018) *
        (1 - restWeight) +
        0.2 * prepare * (1 - sit) -
        1.6 * recline,
      (pose[1].y - Math.sin(cycle) * 0.045 * stride) * (1 - restWeight) +
        Math.max(-0.16, Math.min(0.16, turnRate * 0.035)),
      pose[1].z * (1 - restWeight),
    );
    r.chest.rotation.set(
      pose[2].x * (1 - restWeight) - 0.08 * sit + 0.04 * recline,
      (pose[2].y - Math.sin(cycle) * 0.055 * stride) * (1 - restWeight),
      pose[2].z * (1 - restWeight),
    );
    r.chest.scale.y = 1 + Math.sin(time * 1.65) * 0.005;
    r.head.rotation.set(
      0.085 * stride +
        0.045 * run +
        0.06 * sit -
        0.1 * recline +
        Math.sin(time * 0.41) * 0.012 * (1 - restWeight),
      Math.sin(time * 0.29) * 0.035 * (1 - restWeight),
      0,
    );
    this.root.updateMatrixWorld(true);
    // Rest clearance is authored in local terrain-aligned space. Pelvis stays level; spine reclines in two stages.
    for (let i = 0; i < 2; i++) {
      const foot = this.feet[i],
        side = i === 0 ? -1 : 1;
      if (restTime === null && this.lastRest <= 0) {
        this.walkFoot(i, dt, actualSpeed);
      } else {
        const footStep = smoothstep(
          i === 0 ? 0.55 : 1.25,
          i === 0 ? 1.55 : 2.35,
          rest,
        );
        const y = 0.095 + Math.sin(footStep * Math.PI) * 0.05;
        this.local.set(
          side * (0.153 + 0.035 * sit),
          y,
          0.025 + 0.44 * footStep + 0.015 * recline,
        );
        this.root.localToWorld(this.local);
        foot.target
          .copy(this.restStartFeet[i])
          .lerp(this.local, smoother(rest / 0.6));
        foot.contact = y < 0.1;
        if (rest === 0) {
          foot.anchor.copy(foot.target);
          foot.swinging = false;
        }
      }
    }
    if (restTime === null) {
      let lower = 0;
      for (let i = 0; i < 2; i++)
        if (this.feet[i].contact) {
          r.thighs[i].getWorldPosition(this.origin);
          const goal = this.feet[i].target;
          const horizontal = Math.hypot(
            this.origin.x - goal.x,
            this.origin.z - goal.z,
          );
          const maxY =
            goal.y +
            Math.sqrt(Math.max(0.01, 0.876 * 0.876 - horizontal * horizontal));
          lower = Math.max(lower, this.origin.y - maxY);
        }
      r.hips.position.y -= Math.max(0, Math.min(0.16, lower));
      this.root.updateMatrixWorld(true);
    }
    for (let i = 0; i < 2; i++) {
      const foot = this.feet[i],
        side = i === 0 ? -1 : 1;
      r.thighs[i].getWorldPosition(this.origin);
      this.pole.copy(this.forward).addScaledVector(this.side, side * 0.1);
      solveKnee(this.origin, foot.target, this.pole, 0.445, 0.435, this.knee);
      aimBone(r.thighs[i], this.origin, this.knee);
      aimBone(r.shins[i], this.knee, foot.target);
      // Heel strike dorsiflexes; late stance rolls onto the toe. Swing carries
      // that push-off into a lifted toe and returns to a heel-first landing.
      const stance = T.MathUtils.lerp(0.62, 0.36, run);
      const swing = swingProgress(foot.phase, stance),
        contactPhase = foot.phase / stance;
      const heel =
        (restWeight
          ? 0
          : foot.swinging
            ? T.MathUtils.lerp(0.23, -0.13, smoother(swing)) -
              0.1 * Math.sin(swing * Math.PI)
            : -0.13 * (1 - smoothstep(0, 0.22, contactPhase)) +
              0.23 * smoothstep(0.67, 1, contactPhase)) * stride;
      r.feet[i].parent!.getWorldQuaternion(this.q);
      r.feet[i].quaternion.copy(this.q.invert());
      r.feet[i].rotateY(this.root.rotation.y);
      r.feet[i].rotateX(heel + 0.06 * settle);
      r.toes[i].rotation.x = -Math.max(0, heel) * 0.8;
      r.feet[i].updateMatrixWorld(true);
    }
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      const arm = pose[4 + i],
        elbow = pose[6 + i];
      r.arms[i].rotation.set(
        arm.x * (1 - restWeight) + 0.15 * recline,
        (arm.y + T.MathUtils.clamp(turnRate * 0.025, -0.12, 0.12) * stride) *
          (1 - restWeight),
        arm.z * (1 - restWeight) + side * 0.045,
      );
      r.forearms[i].rotation.set(
        elbow.x * (1 - restWeight) - 0.12 * restWeight,
        elbow.y * (1 - restWeight),
        elbow.z * (1 - restWeight),
      );
      r.hands[i].rotation.set(0.02, 0, side * -0.06);
      // Supporting palm and wrist settle behind the body before the back comes down.
      const support =
        smoothstep(1.2, 2.8, rest) * (1 - smoothstep(6.0, 8.8, rest));
      if (i === 0 && support > 0) {
        this.root.updateMatrixWorld(true);
        r.arms[i].getWorldPosition(this.origin);
        this.local.set(-0.34, 0.16, -0.27);
        this.root.localToWorld(this.local);
        this.target.copy(this.local);
        this.pole
          .copy(this.side)
          .multiplyScalar(-1)
          .addScaledVector(this.forward, -0.15);
        solveKnee(this.origin, this.target, this.pole, 0.335, 0.3, this.knee);
        this.oldArm.copy(r.arms[i].quaternion);
        this.oldForearm.copy(r.forearms[i].quaternion);
        aimBone(r.arms[i], this.origin, this.knee);
        aimBone(r.forearms[i], this.knee, this.target);
        r.arms[i].quaternion.slerp(this.oldArm, 1 - support);
        r.forearms[i].quaternion.slerp(this.oldForearm, 1 - support);
        r.hands[i].rotation.x = -1.0 * support;
      }
      r.arms[i].rotation.x += dodge * 0.2;
    }
    for (let i = 0; i < 2; i++) {
      const contact = this.feet[i].contact;
      if (
        contact &&
        !this.priorContacts[i] &&
        restTime === null &&
        speed > 0.35
      ) {
        this.landings |= 1 << i;
        this.impactVelocity -= 0.042 + 0.018 * this.run;
      }
      this.priorContacts[i] = contact;
    }
    this.lastRest = rest;
    this.root.updateMatrixWorld(true);
  }
  private initializeFeet() {
    this.root.updateMatrixWorld(true);
    for (let i = 0; i < 2; i++) {
      const f = this.feet[i];
      this.local.set(i === 0 ? -0.153 : 0.153, 0.095, 0);
      this.root.localToWorld(this.local);
      this.local.y = heightAt(this.local.x, this.local.z) + 0.095;
      f.anchor.copy(this.local);
      f.target.copy(this.local);
    }
  }
  private walkFoot(index: number, dt: number, speed: number) {
    const f = this.feet[index],
      side = index === 0 ? -1 : 1,
      stance = T.MathUtils.lerp(0.62, 0.36, this.run);
    const p = wrapPhase(this.phase + index * 0.5);
    f.phase = p;
    // Reset after a rest transition, without carrying old anchors from before sitting.
    if (speed < 0.1) {
      this.local
        .copy(this.root.position)
        .addScaledVector(this.side, side * 0.153)
        .addScaledVector(this.forward, 0.025);
      this.local.y = heightAt(this.local.x, this.local.z) + 0.095;
      if (
        !f.idleStep &&
        (f.swinging || f.target.distanceTo(this.local) > 0.13) &&
        !this.feet[1 - index].idleStep
      ) {
        f.idleStep = true;
        f.idleTime = 0;
        f.start.copy(f.target);
        f.end.copy(this.local);
      }
      if (f.idleStep) {
        f.idleTime = Math.min(1, f.idleTime + dt / 0.28);
        f.target.copy(f.start).lerp(f.end, smoother(f.idleTime));
        f.target.y += Math.sin(f.idleTime * Math.PI) * 0.065;
        f.contact = false;
        f.swinging = true;
        if (f.idleTime === 1) {
          f.anchor.copy(f.end);
          f.target.copy(f.anchor);
          f.idleStep = false;
          f.swinging = false;
          f.contact = true;
        }
      } else {
        f.target.copy(f.anchor);
        f.contact = true;
        f.swinging = false;
      }
      return;
    }
    f.idleStep = false;
    const inSwing = p >= stance;
    if (inSwing && !f.swinging) {
      f.swinging = true;
      f.start.copy(f.target);
      const strideLength = T.MathUtils.lerp(1.18, 2.45, this.run);
      const lead = strideLength * (0.48 - (p - stance));
      f.end
        .copy(this.root.position)
        .addScaledVector(this.direction, lead)
        .addScaledVector(this.side, side * 0.16);
      f.end.y = heightAt(f.end.x, f.end.z) + 0.095;
    }
    if (!inSwing && f.swinging) {
      f.swinging = false;
      f.anchor.copy(f.end);
    }
    f.contact = !inSwing;
    if (inSwing) {
      const t = swingProgress(p, stance),
        s = t * t * (3 - 2 * t);
      f.target.copy(f.start).lerp(f.end, s);
      f.target.y +=
        Math.pow(Math.sin(Math.PI * t), 0.8) *
        T.MathUtils.lerp(0.13, 0.29, this.run);
    } else f.target.copy(f.anchor);
  }
  get diagnostics() {
    return {
      phase: wrapPhase(this.phase),
      source: "KayKit CC0 Walking_A / Running_A + terrain contact IK",
      acceleration: this.acceleration,
      strideBlend: this.stride,
      runBlend: this.run,
      footContacts: this.feet.map((f) => f.contact),
      footTargets: this.feet.map((f) => f.target.toArray()),
    };
  }
}
