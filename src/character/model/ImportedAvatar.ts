import * as T from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { AssetLoader } from "../../systems/AssetLoader";
import { tagAsciiSurface, SURFACE_TAG } from "../../rendering/SurfaceStyle";
import { WindSystem } from "../../environment/WindSystem";
import { heightAt } from "../../world/terrain";
import { solveKnee } from "../animation/kinematics";
import type { Rig } from "./buildArmor";
let asset: GLTF | undefined;
export async function prepareImportedAvatar() {
  asset = await new AssetLoader().loadGLTF(
    `${import.meta.env.BASE_URL}models/imported-knight/knight.glb`,
  );
}
interface Mapping {
  bone: T.Bone;
  driver: T.Bone;
  rest: T.Quaternion;
  local?: boolean;
  direction?: T.Vector3;
  child?: T.Bone;
  driverChild?: T.Bone;
}
interface Cloth {
  bone: T.Bone;
  rest: T.Quaternion;
  length: number;
  tip: T.Vector3;
  previous: T.Vector3;
  ready: boolean;
  supports: T.Vector3[];
}
/** Anatomical direction retargeting preserves the supplied bind axes and original skin weights. */
export class ImportedAvatar {
  readonly group: T.Object3D;
  readonly bones: T.Bone[] = [];
  readonly meshes: T.SkinnedMesh[] = [];
  private mappings: Mapping[] = [];
  private cloth: Cloth[] = [];
  private armor: {
    bone: T.Bone;
    rest: T.Quaternion;
    angle: number;
    velocity: number;
  }[] = [];
  private targetRig: {
    hips: T.Bone;
    thighs: T.Bone[];
    shins: T.Bone[];
    feet: T.Bone[];
    arms: T.Bone[];
    forearms: T.Bone[];
    hands: T.Bone[];
  };
  private rootQ = new T.Quaternion();
  private q = new T.Quaternion();
  private parentQ = new T.Quaternion();
  private deltaQ = new T.Quaternion();
  private from = new T.Vector3();
  private to = new T.Vector3();
  private direction = new T.Vector3();
  private restDirection = new T.Vector3();
  private knee = new T.Vector3();
  private goal = new T.Vector3();
  private pole = new T.Vector3();
  private anchor = new T.Vector3();
  private neutralTip = new T.Vector3();
  private movement = new T.Vector3();
  private previousRoot = new T.Vector3();
  private torsoCenter = new T.Vector3();
  private footOrientation = new T.Quaternion();
  private hingeAxis = new T.Vector3(1, 0, 0);
  private sample = { strength: 0, gust: 0, turbulence: 0, rustle: 0 };
  private accumulator = 0;
  private previousSpeed = 0;
  private reachCorrection = 0;
  private footErrors = [0, 0];
  private bootSamples: T.Vector3[][] = [[], []];
  private handSamples: T.Vector3[][] = [[], []];
  private footGoals = [new T.Vector3(), new T.Vector3()];
  private initialized = false;
  constructor(
    private root: T.Group,
    private driver: Rig,
    private wind: WindSystem,
  ) {
    if (!asset)
      throw new Error(
        "Call prepareImportedAvatar before selecting the supplied knight",
      );
    this.group = clone(asset.scene);
    this.group.name =
      "Supplied knight — weapon-free, PBR and original articulated skeleton";
    this.group.scale.multiplyScalar(0.93);
    root.add(this.group);
    const materialCache = new Map<T.Material, T.Material>();
    const prepareMaterial = (source: T.Material) => {
      const existing = materialCache.get(source);
      if (existing) return existing;
      const m = source.clone();
      materialCache.set(source, m);
      if (m instanceof T.MeshStandardMaterial) {
        m.fog = false;
        m.side = T.DoubleSide;
        // A black world has no environment reflections. Retain map detail with a restrained diffuse share.
        m.metalness *= 0.3;
        m.onBeforeCompile = (shader) => {
          shader.vertexShader =
            "varying vec3 bindPosition;\n" + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace(
            "#include <begin_vertex>",
            "#include <begin_vertex>\n bindPosition=position;",
          );
          shader.fragmentShader =
            "varying vec3 bindPosition;\n" + shader.fragmentShader;
        };
        m.customProgramCacheKey = () => "supplied-knight-bind-family-v06";
        const cloth = m.name.includes("cloth");
        tagAsciiSurface(
          m,
          cloth ? SURFACE_TAG.cloth : SURFACE_TAG.armor,
          cloth
            ? undefined
            : ".14+.10*fract(sin(dot(floor(bindPosition*31.),vec3(12.9898,78.233,37.719)))*43758.5453)",
        );
      }
      return m;
    };
    this.group.traverse((o) => {
      if (o instanceof T.Bone) this.bones.push(o);
      if (o instanceof T.SkinnedMesh) {
        this.meshes.push(o);
        o.frustumCulled = false;
        o.castShadow = true;
        o.receiveShadow = true;
        o.material = Array.isArray(o.material)
          ? o.material.map(prepareMaterial)
          : prepareMaterial(o.material);
      }
    });
    root.updateMatrixWorld(true);
    const get = (name: string) => {
      const b = this.bones.find(
        (b) => b.name.replace(/[.:]/g, "") === name.replace(/[.:]/g, ""),
      );
      if (!b) throw new Error(`Supplied skeleton is missing ${name}`);
      return b;
    };
    const map = (
      name: string,
      bone: T.Bone,
      child?: string,
      driverChild?: T.Bone,
    ) => {
      const target = get(name),
        m: Mapping = {
          bone: target,
          driver: bone,
          rest: target.getWorldQuaternion(new T.Quaternion()),
        };
      if (child && driverChild) {
        m.child = get(child);
        m.driverChild = driverChild;
        m.direction = m.child
          .getWorldPosition(new T.Vector3())
          .sub(target.getWorldPosition(new T.Vector3()))
          .normalize();
      }
      this.mappings.push(m);
    };
    map("spine", driver.hips);
    map("stomach", driver.spine);
    map("chest", driver.chest);
    map("head", driver.head);
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? "R" : "L";
      map(
        `upper_arm.${side}`,
        driver.arms[i],
        `forearm.${side}`,
        driver.forearms[i],
      );
      map(
        `forearm.${side}`,
        driver.forearms[i],
        `hand.${side}`,
        driver.hands[i],
      );
      map(`hand.${side}`, driver.hands[i]);
      this.mappings.at(-1)!.local = true;
      this.mappings.at(-1)!.rest.copy(get(`hand.${side}`).quaternion);
      map(`thigh.${side}`, driver.thighs[i], `shin.${side}`, driver.shins[i]);
      map(`shin.${side}`, driver.shins[i], `foot.${side}`, driver.feet[i]);
      map(`foot.${side}`, driver.feet[i]);
    }
    this.targetRig = {
      hips: get("spine"),
      thighs: [get("thigh.R"), get("thigh.L")],
      shins: [get("shin.R"), get("shin.L")],
      feet: [get("foot.R"), get("foot.L")],
      arms: [get("upper_arm.R"), get("upper_arm.L")],
      forearms: [get("forearm.R"), get("forearm.L")],
      hands: [get("hand.R"), get("hand.L")],
    };
    for (let side = 0; side < 2; side++) {
      const foot = this.targetRig.feet[side],
        toe = get(side === 0 ? "toe.R" : "toe.L"),
        origin = foot.getWorldPosition(new T.Vector3()),
        inverse = foot.getWorldQuaternion(new T.Quaternion()).invert();
      for (const mesh of this.meshes) {
        mesh.skeleton.update();
        const indices = mesh.geometry.attributes.skinIndex,
          weights = mesh.geometry.attributes.skinWeight;
        for (let v = 0; v < indices.count; v++) {
          let influence = 0;
          for (let slot = 0; slot < 4; slot++) {
            const bone = mesh.skeleton.bones[indices.getComponent(v, slot)];
            if (bone === foot || bone === toe)
              influence += weights.getComponent(v, slot);
          }
          if (influence > 0.6) {
            const p = new T.Vector3().fromBufferAttribute(
              mesh.geometry.attributes.position,
              v,
            );
            mesh.applyBoneTransform(v, p);
            mesh.localToWorld(p);
            this.bootSamples[side].push(p.sub(origin).applyQuaternion(inverse));
          }
        }
      }
    }
    for (let side = 0; side < 2; side++) {
      const hand = this.targetRig.hands[side],
        suffix = side === 0 ? "R" : "L",
        family = this.bones.filter(
          (b) =>
            b === hand ||
            (/fingers|thumb/.test(b.name) && b.name.endsWith(suffix)),
        );
      const origin = hand.getWorldPosition(new T.Vector3()),
        inverse = hand.getWorldQuaternion(new T.Quaternion()).invert();
      for (const mesh of this.meshes) {
        mesh.skeleton.update();
        const indices = mesh.geometry.attributes.skinIndex,
          weights = mesh.geometry.attributes.skinWeight;
        for (let v = 0; v < indices.count; v++) {
          let influence = 0;
          for (let slot = 0; slot < 4; slot++)
            if (
              family.includes(
                mesh.skeleton.bones[indices.getComponent(v, slot)],
              )
            )
              influence += weights.getComponent(v, slot);
          if (influence > 0.6) {
            const p = new T.Vector3().fromBufferAttribute(
              mesh.geometry.attributes.position,
              v,
            );
            mesh.applyBoneTransform(v, p);
            mesh.localToWorld(p);
            this.handSamples[side].push(p.sub(origin).applyQuaternion(inverse));
          }
        }
      }
    }
    for (const bone of this.bones) {
      if (/cape|skirt|chaimail/.test(bone.name))
        this.cloth.push({
          bone,
          rest: bone.quaternion.clone(),
          length: Number(bone.userData.clothLength) || 0.22,
          tip: new T.Vector3(),
          previous: new T.Vector3(),
          ready: false,
          supports: [],
        });
      if (/armor_shoulder|big.?belt/.test(bone.name))
        this.armor.push({
          bone,
          rest: bone.quaternion.clone(),
          angle: 0,
          velocity: 0,
        });
    }
    for (const c of this.cloth) {
      const origin = c.bone.getWorldPosition(new T.Vector3()),
        inverse = c.bone.getWorldQuaternion(new T.Quaternion()).invert();
      for (const mesh of this.meshes) {
        mesh.skeleton.update();
        const indices = mesh.geometry.attributes.skinIndex,
          weights = mesh.geometry.attributes.skinWeight;
        for (let v = 0; v < indices.count; v++) {
          let influence = 0;
          for (let slot = 0; slot < 4; slot++)
            if (mesh.skeleton.bones[indices.getComponent(v, slot)] === c.bone)
              influence += weights.getComponent(v, slot);
          if (influence > 0.6) {
            const p = new T.Vector3().fromBufferAttribute(
              mesh.geometry.attributes.position,
              v,
            );
            mesh.applyBoneTransform(v, p);
            mesh.localToWorld(p);
            c.supports.push(p.sub(origin).applyQuaternion(inverse));
          }
        }
      }
    }
  }
  private aim(bone: T.Bone, child: T.Bone, goal: T.Vector3) {
    bone.getWorldPosition(this.from);
    child.getWorldPosition(this.to);
    this.direction.subVectors(this.to, this.from).normalize();
    this.restDirection.subVectors(goal, this.from).normalize();
    bone.getWorldQuaternion(this.q);
    this.deltaQ
      .setFromUnitVectors(this.direction, this.restDirection)
      .multiply(this.q);
    bone.parent!.getWorldQuaternion(this.parentQ);
    bone.quaternion.copy(this.parentQ.invert()).multiply(this.deltaQ);
    bone.updateWorldMatrix(false, true);
  }
  update(
    dt: number,
    speed: number,
    targets: readonly { target: T.Vector3 }[],
    seated = 0,
  ) {
    this.root.getWorldQuaternion(this.rootQ);
    this.driver.hips.getWorldPosition(this.to);
    // Match hip-joint height, shorter native legs, and the supplied boot's lower ankle socket.
    this.to.y -= T.MathUtils.lerp(0.12, 0.045, seated);
    this.targetRig.hips.parent!.worldToLocal(this.to);
    this.targetRig.hips.position.copy(this.to);
    this.root.updateMatrixWorld(true);
    for (const m of this.mappings) {
      if (m.local) {
        m.bone.quaternion.copy(m.rest).multiply(m.driver.quaternion);
        m.bone.updateWorldMatrix(false, true);
        continue;
      }
      if (m.direction && m.child && m.driverChild) {
        m.driver.getWorldPosition(this.from);
        m.driverChild.getWorldPosition(this.to);
        this.direction.subVectors(this.to, this.from).normalize();
        this.restDirection.copy(m.direction).applyQuaternion(this.rootQ);
        this.deltaQ.setFromUnitVectors(this.restDirection, this.direction);
        this.q.copy(this.rootQ).multiply(m.rest).premultiply(this.deltaQ);
      } else m.driver.getWorldQuaternion(this.q).multiply(m.rest);
      m.bone.parent!.getWorldQuaternion(this.parentQ);
      m.bone.quaternion.copy(this.parentQ.invert()).multiply(this.q);
      m.bone.updateWorldMatrix(false, true);
    }
    let requiredLowering = 0;
    for (let i = 0; i < 2; i++) {
      const goal = this.footGoals[i];
      goal.copy(targets[i].target);
      goal.y -= 0.037;
      this.targetRig.feet[i].getWorldQuaternion(this.footOrientation);
      let lift = 0;
      for (const sample of this.bootSamples[i]) {
        this.to.copy(sample).applyQuaternion(this.footOrientation).add(goal);
        lift = Math.max(
          lift,
          heightAt(this.to.x, this.to.z) + 0.004 - this.to.y,
        );
      }
      goal.y += lift;
    }
    for (let i = 0; i < 2; i++) {
      this.targetRig.thighs[i].getWorldPosition(this.from);
      this.targetRig.shins[i].getWorldPosition(this.knee);
      this.targetRig.feet[i].getWorldPosition(this.to);
      const reach =
        this.from.distanceTo(this.knee) + this.knee.distanceTo(this.to) - 0.006;
      const goal = this.footGoals[i],
        horizontal = Math.hypot(this.from.x - goal.x, this.from.z - goal.z);
      requiredLowering = Math.max(
        requiredLowering,
        this.from.y -
          (goal.y +
            Math.sqrt(
              Math.max(0.001, reach * reach - horizontal * horizontal),
            )),
      );
    }
    this.reachCorrection = T.MathUtils.lerp(
      this.reachCorrection,
      T.MathUtils.clamp(requiredLowering, 0, 0.12),
      1 - Math.exp(-20 * dt),
    );
    this.targetRig.hips.getWorldPosition(this.to);
    this.to.y -= this.reachCorrection;
    this.targetRig.hips.parent!.worldToLocal(this.to);
    this.targetRig.hips.position.copy(this.to);
    this.targetRig.hips.updateWorldMatrix(false, true);
    for (let i = 0; i < 2; i++) {
      const thigh = this.targetRig.thighs[i],
        shin = this.targetRig.shins[i],
        foot = this.targetRig.feet[i];
      thigh.getWorldPosition(this.from);
      shin.getWorldPosition(this.knee);
      foot.getWorldPosition(this.to);
      const upper = this.from.distanceTo(this.knee),
        lower = this.knee.distanceTo(this.to),
        footQ = foot.getWorldQuaternion(this.footOrientation);
      this.pole.subVectors(this.knee, this.from);
      this.goal.copy(this.footGoals[i]);
      solveKnee(this.from, this.goal, this.pole, upper, lower, this.knee);
      this.aim(thigh, shin, this.knee);
      this.aim(shin, foot, this.goal);
      foot.parent!.getWorldQuaternion(this.parentQ);
      foot.quaternion.copy(this.parentQ.invert()).multiply(footQ);
      foot.updateWorldMatrix(false, true);
      foot.getWorldPosition(this.to);
      this.footErrors[i] = this.to.distanceTo(this.goal);
    }
    // Native fingers extend farther than the canonical wrist. Let the arm chain
    // support the real gauntlet surface during sitting instead of burying its fingertips.
    for (let i = 0; i < 2; i++) {
      const hand = this.targetRig.hands[i],
        arm = this.targetRig.arms[i],
        forearm = this.targetRig.forearms[i];
      hand.getWorldPosition(this.goal);
      hand.getWorldQuaternion(this.footOrientation);
      let lift = 0;
      for (const sample of this.handSamples[i]) {
        this.to
          .copy(sample)
          .applyQuaternion(this.footOrientation)
          .add(this.goal);
        lift = Math.max(
          lift,
          heightAt(this.to.x, this.to.z) + 0.004 - this.to.y,
        );
      }
      if (lift > 0.001) {
        arm.getWorldPosition(this.from);
        forearm.getWorldPosition(this.knee);
        const upper = this.from.distanceTo(this.knee),
          lower = this.knee.distanceTo(this.goal);
        this.pole.subVectors(this.knee, this.from);
        this.goal.y += lift;
        solveKnee(this.from, this.goal, this.pole, upper, lower, this.knee);
        this.aim(arm, forearm, this.knee);
        this.aim(forearm, hand, this.goal);
        hand.parent!.getWorldQuaternion(this.parentQ);
        hand.quaternion
          .copy(this.parentQ.invert())
          .multiply(this.footOrientation);
        hand.updateWorldMatrix(false, true);
      }
    }
    this.movement
      .copy(this.root.position)
      .sub(this.previousRoot)
      .divideScalar(Math.max(dt, 0.001));
    if (!this.initialized) this.movement.set(0, 0, 0);
    this.previousRoot.copy(this.root.position);
    this.initialized = true;
    this.accumulator += Math.min(dt, 0.05);
    const acceleration = T.MathUtils.clamp(
      (speed - this.previousSpeed) / Math.max(dt, 0.001),
      -6,
      6,
    );
    this.previousSpeed = speed;
    while (this.accumulator >= 1 / 120) {
      this.secondary(1 / 120, speed, acceleration);
      this.accumulator -= 1 / 120;
    }
  }
  private secondary(dt: number, speed: number, acceleration: number) {
    for (const a of this.armor) {
      const goal = T.MathUtils.clamp(
        -acceleration * 0.002 +
          Math.sin(this.wind.uniforms.windTime.value * 1.3) * speed * 0.001,
        -0.018,
        0.018,
      );
      a.velocity += ((goal - a.angle) * 180 - a.velocity * 25) * dt;
      a.angle += a.velocity * dt;
      a.bone.quaternion
        .copy(a.rest)
        .multiply(this.q.setFromAxisAngle(this.hingeAxis, a.angle));
      a.bone.updateWorldMatrix(false, true);
    }
    for (const c of this.cloth) {
      c.bone.quaternion.copy(c.rest);
      c.bone.updateWorldMatrix(false, true);
      c.bone.getWorldPosition(this.anchor);
      this.neutralTip.set(0, c.length, 0).applyMatrix4(c.bone.matrixWorld);
      const length = this.neutralTip.distanceTo(this.anchor);
      if (!c.ready) {
        c.tip.copy(this.neutralTip);
        c.previous.copy(c.tip);
        c.ready = true;
      }
      this.wind.sample(this.anchor.x, this.anchor.z, this.sample);
      this.direction.subVectors(c.tip, c.previous).multiplyScalar(0.975);
      c.previous.copy(c.tip);
      c.tip.add(this.direction);
      c.tip.x +=
        (this.wind.parameters.directionX * this.sample.strength * 2.8 -
          this.movement.x * 0.65) *
        dt *
        dt;
      c.tip.z +=
        (this.wind.parameters.directionZ * this.sample.strength * 2.8 -
          this.movement.z * 0.65) *
        dt *
        dt;
      c.tip.y -= 5.5 * dt * dt;
      // A weighted hinge retains the modeled drape; gravity/inertia do not unfold it into a flag.
      this.direction.subVectors(c.tip, this.anchor).normalize();
      this.restDirection.subVectors(this.neutralTip, this.anchor).normalize();
      const angle = this.direction.angleTo(this.restDirection);
      if (angle > 0.48)
        this.direction.lerp(this.restDirection, 1 - 0.48 / angle).normalize();
      c.tip.copy(this.anchor).addScaledVector(this.direction, length);
      this.driver.chest.getWorldPosition(this.torsoCenter);
      this.pole
        .copy(c.tip)
        .sub(this.torsoCenter)
        .applyQuaternion(this.parentQ.copy(this.rootQ).invert());
      this.pole.divide(this.to.set(0.2, 0.22, 0.17));
      const torsoDistance = this.pole.length();
      if (torsoDistance < 1) {
        this.pole
          .multiplyScalar(1 / Math.max(0.001, torsoDistance))
          .multiply(this.to)
          .applyQuaternion(this.rootQ)
          .add(this.torsoCenter);
        c.tip.copy(this.pole);
      }
      for (let i = 0; i < 2; i++) {
        this.targetRig.thighs[i].getWorldPosition(this.from);
        this.targetRig.shins[i].getWorldPosition(this.to);
        this.direction.subVectors(this.to, this.from);
        const t = T.MathUtils.clamp(
          this.pole.subVectors(c.tip, this.from).dot(this.direction) /
            this.direction.lengthSq(),
          0,
          1,
        );
        this.from.addScaledVector(this.direction, t);
        this.direction.subVectors(c.tip, this.from);
        const d = this.direction.length();
        if (d < 0.105)
          c.tip
            .copy(this.from)
            .addScaledVector(this.direction, 0.105 / Math.max(d, 0.001));
      }
      c.tip.y = Math.max(c.tip.y, heightAt(c.tip.x, c.tip.z) + 0.025);
      this.direction.subVectors(c.tip, this.anchor).normalize();
      this.deltaQ.setFromUnitVectors(this.restDirection, this.direction);
      c.bone.getWorldQuaternion(this.q);
      this.q.premultiply(this.deltaQ);
      c.bone.parent!.getWorldQuaternion(this.parentQ);
      c.bone.quaternion.copy(this.parentQ.invert()).multiply(this.q);
      c.bone.updateWorldMatrix(false, true);
      // Contact uses the modeled hem, not only the bone tip: a reclining skirt
      // can intersect terrain even when its skeletal endpoint is above ground.
      for (let pass = 0; pass < 3; pass++) {
        c.bone.getWorldQuaternion(this.q);
        let lift = 0;
        for (const sample of c.supports) {
          this.to.copy(sample).applyQuaternion(this.q).add(this.anchor);
          const penetration =
            heightAt(this.to.x, this.to.z) + 0.004 - this.to.y;
          if (penetration > lift) {
            lift = penetration;
            this.pole.copy(this.to);
          }
        }
        if (lift < 0.001) break;
        this.from.subVectors(this.pole, this.anchor).normalize();
        this.to.subVectors(this.pole, this.anchor);
        this.to.y += lift + 0.003;
        this.to.normalize();
        this.deltaQ.setFromUnitVectors(this.from, this.to);
        this.q.premultiply(this.deltaQ);
        c.bone.parent!.getWorldQuaternion(this.parentQ);
        c.bone.quaternion.copy(this.parentQ.invert()).multiply(this.q);
        c.bone.updateWorldMatrix(false, true);
        c.tip.set(0, c.length, 0).applyMatrix4(c.bone.matrixWorld);
        c.previous.lerp(c.tip, 0.35);
      }
    }
  }
  get diagnostics() {
    return {
      kind: "supplied",
      bones: this.bones.length,
      triangles: this.meshes.reduce(
        (n, m) =>
          n +
          (m.geometry.index?.count ?? m.geometry.attributes.position.count) / 3,
        0,
      ),
      clothBones: this.cloth.length,
      rigidArmor: this.armor.length,
      armorAngles: this.armor.map((a) => a.angle),
      footErrors: [...this.footErrors],
      jointPositions: [
        this.targetRig.hips,
        ...this.targetRig.shins,
        ...this.targetRig.feet,
      ].map((b) =>
        b.getWorldPosition(new T.Vector3()).sub(this.root.position).toArray(),
      ),
      weapons: 0,
      textures: this.meshes.every((m) =>
        (Array.isArray(m.material) ? m.material : [m.material]).every(
          (x) =>
            x instanceof T.MeshStandardMaterial &&
            !!x.map &&
            !!x.normalMap &&
            !!x.roughnessMap &&
            !!x.metalnessMap &&
            !!x.aoMap,
        ),
      ),
    };
  }
  inspectSurfaces() {
    let minimum = Infinity;
    const point = new T.Vector3();
    let meshName = "";
    let boneName = "";
    for (const mesh of this.meshes) {
      mesh.skeleton.update();
      for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
        point.fromBufferAttribute(mesh.geometry.attributes.position, i);
        mesh.applyBoneTransform(i, point);
        mesh.localToWorld(point);
        const clearance = point.y - heightAt(point.x, point.z);
        if (clearance < minimum) {
          minimum = clearance;
          meshName = mesh.name;
          const indices = mesh.geometry.attributes.skinIndex,
            weights = mesh.geometry.attributes.skinWeight;
          let strongest = 0;
          for (let slot = 1; slot < 4; slot++)
            if (
              weights.getComponent(i, slot) > weights.getComponent(i, strongest)
            )
              strongest = slot;
          boneName =
            mesh.skeleton.bones[indices.getComponent(i, strongest)].name;
        }
      }
    }
    return {
      minimumTerrainClearance: minimum,
      mesh: meshName,
      bone: boneName,
      footErrors: [...this.footErrors],
    };
  }
}
