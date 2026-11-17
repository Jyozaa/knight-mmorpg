import * as T from "three";
import { damp, smoothstep } from "../../config";
import { heightAt } from "../../world/terrain";
import type { Rig } from "../model/buildArmor";
import {
  solveKnee,
  aimBone,
  wrapPhase,
  smoother,
  springStep,
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
  planting: boolean;
  transition: number;
  correction: T.Vector3;
}
export class KnightAnimator {
  private phase = 0.08;
  private handLag = [0, 0];
  private handVelocity = [0, 0];
  private armHeights: number[] = [];
  private clips = new LocomotionClips();
  private stopTime = -1;
  private stoppedAtRun = false;
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
  private pelvisCorrection = 0;
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
  private legAxis = new T.Vector3();
  private target = new T.Vector3();
  private q = new T.Quaternion();
  private oldArm = new T.Quaternion();
  private authoredFeet = [new T.Quaternion(), new T.Quaternion()];
  private authoredKnees = [new T.Vector3(), new T.Vector3()];
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
    planting: true,
    transition: 1,
    correction: new T.Vector3(),
  }));
  constructor(
    private root: T.Group,
    readonly rig: Rig,
  ) {
    this.armHeights = rig.arms.map((b) => b.position.y);
  }
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
    this.run = damp(this.run, smoothstep(1.7, 3.3, speed), 6, dt);
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
    const strideLength = T.MathUtils.lerp(
      this.clips.walkDistance,
      this.clips.runDistance,
      this.run,
    );
    if (restTime === null && actualSpeed > 0.04)
      this.phase += (actualSpeed * dt) / strideLength;
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
    if (this.acceleration < -0.5 && this.stopTime < 0 && speed > 0.6) {
      this.stopTime = 0;
      this.stoppedAtRun = this.run > 0.5;
    }
    if (this.stopTime >= 0) this.stopTime += dt;
    if (this.acceleration > 0.5 || this.stopTime > 1.1) this.stopTime = -1;
    this.clips.update(
      this.phase,
      this.run,
      this.stride,
      time,
      Math.min(1, Math.abs(turnRate) * 0.4),
      this.stopTime,
      this.stoppedAtRun,
    );
    const pose = this.clips.rotations;
    [this.impact, this.impactVelocity] = springStep(
      this.impact,
      this.impactVelocity,
      150,
      22,
      dt,
    );
    const planted =
      this.feet[0].contact && !this.feet[1].contact
        ? -1
        : this.feet[1].contact && !this.feet[0].contact
          ? 1
          : 0;
    this.support = damp(this.support, planted, 9, dt);
    const tiredWalk = this.stride * (1 - this.run) * (1 - restWeight);
    for (let i = 0; i < 2; i++) {
      [this.handLag[i], this.handVelocity[i]] = springStep(
        this.handLag[i],
        this.handVelocity[i],
        95,
        16,
        dt,
      );
    }
    const blendRest = (
      bone: T.Bone,
      q: T.Quaternion,
      x: number,
      y: number,
      z: number,
    ) => {
      this.q.setFromEuler(new T.Euler(x, y, z));
      bone.quaternion.copy(q).slerp(this.q, restWeight);
    };
    r.hips.position.set(
      this.clips.hipOffset.x * (1 - restWeight),
      this.clips.hipHeight * (1 - restWeight) +
        1.01 * restWeight +
        this.impact * (1 - restWeight) -
        0.055 * prepare -
        0.69 * sit -
        0.04 * recline,
      this.clips.hipOffset.z * (1 - restWeight) -
        0.07 * prepare -
        0.16 * sit -
        0.12 * recline,
    );
    blendRest(r.hips, pose[0], 0, 0, 0);
    r.spine.position.y = 0.11 - 0.1 * recline;
    blendRest(
      r.spine,
      pose[1],
      0.2 * prepare * (1 - sit) - 1.6 * recline,
      0,
      0,
    );
    r.spine.rotateX(
      T.MathUtils.clamp(this.acceleration * 0.008, -0.035, 0.035) *
        (1 - restWeight),
    );
    blendRest(r.chest, pose[2], -0.08 * sit + 0.04 * recline, 0, 0);
    r.spine.rotateX(0.035 * tiredWalk);
    r.spine.rotateZ(-this.support * 0.009 * tiredWalk);
    r.chest.rotateZ(this.support * 0.004 * tiredWalk);
    r.chest.scale.y = 1 + Math.sin(time * 1.65) * 0.003;
    blendRest(r.head, pose[3], 0.06 * sit - 0.1 * recline, 0, 0);
    r.head.rotateX(0.012 * tiredWalk);
    const limbs = [
      ...r.arms,
      ...r.forearms,
      ...r.hands,
      ...r.thighs,
      ...r.shins,
      ...r.feet,
      ...r.toes,
    ];
    limbs.forEach((bone, i) => bone.quaternion.copy(pose[4 + i]));
    this.root.updateMatrixWorld(true);
    r.feet.forEach((bone, i) => bone.getWorldQuaternion(this.authoredFeet[i]));
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
      for (let i = 0; i < 2; i++) {
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
      this.pelvisCorrection = damp(
        this.pelvisCorrection,
        Math.max(0, Math.min(0.16, lower)),
        20,
        dt,
      );
      r.hips.position.y -= this.pelvisCorrection;
      this.root.updateMatrixWorld(true);
    }
    r.shins.forEach((bone, i) => bone.getWorldPosition(this.authoredKnees[i]));
    for (let i = 0; i < 2; i++) {
      const foot = this.feet[i],
        side = i === 0 ? -1 : 1;
      r.thighs[i].getWorldPosition(this.origin);
      this.pole.copy(this.forward).addScaledVector(this.side, side * 0.1);
      if (restWeight < 1) {
        this.target.copy(this.authoredKnees[i]).sub(this.origin);
        // A nearly straight captured knee has an ill-conditioned bend plane.
        // Resolve the projected plane before IK; never flip the whole hip-to-knee vector.
        this.legAxis.subVectors(foot.target, this.origin).normalize();
        this.target.addScaledVector(
          this.legAxis,
          -this.target.dot(this.legAxis),
        );
        this.pole
          .addScaledVector(this.legAxis, -this.pole.dot(this.legAxis))
          .normalize();
        const confidence = smoothstep(0.015, 0.075, this.target.length());
        this.target.normalize();
        const forwardBend = smoothstep(0.2, 0.7, this.target.dot(this.pole));
        this.pole.lerp(
          this.target,
          confidence * forwardBend * (1 - restWeight),
        );
      }
      solveKnee(this.origin, foot.target, this.pole, 0.445, 0.435, this.knee);
      aimBone(r.thighs[i], this.origin, this.knee);
      aimBone(r.shins[i], this.knee, foot.target);
      // Retain the captured foot pitch/yaw; only the terrain correction changes the leg chain.
      // The captured foot quaternion is local to the uncorrected shin. Recover its
      // world orientation from the authored chain before applying the new IK solution.
      const authoredWorld = this.authoredFeet[i];
      r.feet[i].parent!.getWorldQuaternion(this.q);
      r.feet[i].quaternion.copy(this.q.invert()).multiply(authoredWorld);
      if (restWeight > 0) {
        r.feet[i].quaternion.copy(this.q);
        r.feet[i].rotateY(this.root.rotation.y);
        r.feet[i].rotateX(0.06 * settle);
      }
      r.toes[i].rotation.x = 0;
      r.feet[i].updateMatrixWorld(true);
    }
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      blendRest(r.arms[i], pose[4 + i], 0.15 * recline, 0, side * 0.045);
      blendRest(r.forearms[i], pose[6 + i], -0.12, 0, 0);
      blendRest(r.hands[i], pose[8 + i], 0.02, 0, side * -0.06);
      r.arms[i].position.y =
        this.armHeights[i] -
        0.006 * tiredWalk +
        side * this.support * 0.003 * tiredWalk;
      r.arms[i].rotateX(side * this.support * 0.008 * tiredWalk);
      r.forearms[i].rotateX(side * this.support * 0.006 * tiredWalk);
      r.hands[i].rotateX((0.025 + this.handLag[i]) * tiredWalk);
      r.hands[i].rotateZ((side * 0.025 - this.support * 0.012) * tiredWalk);
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
        this.handVelocity[1 - i] += 0.34 * (1 - this.run);
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
      side = index === 0 ? -1 : 1;
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
        (f.swinging ||
          f.transition < 1 ||
          f.target.distanceTo(this.local) > 0.13) &&
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
          f.planting = true;
          f.transition = 1;
          f.correction.set(0, 0, 0);
        }
      } else {
        f.target.copy(f.anchor);
        f.contact = true;
        f.swinging = false;
      }
      return;
    }
    f.idleStep = false;
    const candidate = this.clips.feet[index];
    this.local.set(
      T.MathUtils.lerp(side * 0.153, candidate.x, this.stride),
      0,
      T.MathUtils.lerp(0.025, candidate.z, this.stride),
    );
    this.root.localToWorld(this.local);
    this.local.y =
      heightAt(this.local.x, this.local.z) +
      T.MathUtils.lerp(0.095, candidate.y, this.stride);
    const contact =
      this.clips.contactWeights[index] > (f.planting ? 0.35 : 0.65);
    if (contact !== f.planting) {
      if (contact) {
        f.anchor.copy(this.local);
        f.anchor.y = heightAt(f.anchor.x, f.anchor.z) + 0.095;
        f.correction.copy(f.target).sub(f.anchor);
      } else f.correction.copy(f.target).sub(this.local);
      f.transition = 0;
      f.planting = contact;
    }
    // Inertialize the correction, not the human swing curve. A released anchor
    // cannot teleport to the captured ankle; its offset decays with zero endpoint slope.
    f.transition = Math.min(1, f.transition + dt / (contact ? 0.065 : 0.14));
    f.target
      .copy(contact ? f.anchor : this.local)
      .addScaledVector(f.correction, 1 - smoother(f.transition));
    f.contact = contact && f.transition === 1;
    f.swinging = !contact;
  }

  get diagnostics() {
    return {
      phase: wrapPhase(this.phase),
      source:
        "CMU full-body human capture 16_15 / 16_35; contact correction IK",
      state: restTimeState(this.lastRest, this.stopTime, this.run, this.stride),
      acceleration: this.acceleration,
      handLag: [...this.handLag],
      fatigueLean: 0.035 * this.stride * (1 - this.run),
      strideBlend: this.stride,
      runBlend: this.run,
      footContacts: this.feet.map((f) => f.contact),
      footTargets: this.feet.map((f) => f.target.toArray()),
    };
  }
}

const restTimeState = (
  rest: number,
  stop: number,
  run: number,
  stride: number,
) =>
  rest > 0
    ? "rest"
    : stop >= 0
      ? "stopping"
      : stride < 0.03
        ? "idle"
        : stride < 0.9
          ? "starting"
          : run > 0.5
            ? "running"
            : "walking";
