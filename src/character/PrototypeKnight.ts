import * as T from "three";
import { damp, smoothstep } from "../config";
export class PrototypeKnight {
  readonly root = new T.Group();
  readonly hips = new T.Bone();
  readonly torso = new T.Bone();
  readonly head = new T.Bone();
  readonly leftArm = new T.Bone();
  readonly rightArm = new T.Bone();
  readonly leftElbow = new T.Bone();
  readonly rightElbow = new T.Bone();
  readonly leftLeg = new T.Bone();
  readonly rightLeg = new T.Bone();
  readonly leftKnee = new T.Bone();
  readonly rightKnee = new T.Bone();
  private cape: T.Mesh<T.PlaneGeometry, T.MeshStandardMaterial>;
  private capeBase: Float32Array;
  private phase = 0;
  private stride = 0;
  private restBlend = 0;
  private silver = new T.MeshStandardMaterial({
    color: "#d5d6cf",
    metalness: 0.3,
    roughness: 0.38,
    flatShading: true,
  });
  private dark = new T.MeshStandardMaterial({
    color: "#484e50",
    metalness: 0.15,
    roughness: 0.8,
  });
  private brass = new T.MeshStandardMaterial({
    color: "#aa9163",
    metalness: 0.35,
    roughness: 0.45,
  });
  private leather = new T.MeshStandardMaterial({
    color: "#252827",
    roughness: 0.9,
  });
  constructor() {
    this.root.name = "Nameless knight";
    this.root.add(this.hips);
    this.hips.position.y = 1.03;
    this.hips.add(this.torso);
    this.torso.position.y = 0.18;
    this.piece(
      this.hips,
      new T.SphereGeometry(0.31, 12, 8),
      this.dark,
      0,
      0,
      0,
      1,
      0.65,
      0.8,
    );
    this.piece(
      this.torso,
      new T.CylinderGeometry(0.37, 0.27, 0.59, 8),
      this.silver,
      0,
      0.27,
      0,
      1,
      1,
      0.68,
    );
    this.piece(
      this.torso,
      new T.SphereGeometry(0.36, 12, 10),
      this.silver,
      0,
      0.36,
      -0.03,
      1,
      0.72,
      0.72,
    );
    // Raised ridge, gorget, belt and overlapping fauld plates.
    this.piece(
      this.torso,
      new T.BoxGeometry(0.035, 0.48, 0.035),
      this.brass,
      0,
      0.3,
      0.225,
    );
    this.piece(
      this.torso,
      new T.TorusGeometry(0.19, 0.045, 6, 16),
      this.silver,
      0,
      0.63,
      0,
      1,
      1,
      1,
    ).rotation.x = Math.PI / 2;
    this.piece(
      this.hips,
      new T.CylinderGeometry(0.3, 0.32, 0.13, 12),
      this.leather,
      0,
      0.04,
      0,
      1,
      1,
      0.77,
    );
    this.piece(
      this.hips,
      new T.BoxGeometry(0.12, 0.12, 0.04),
      this.brass,
      0,
      0.04,
      0.25,
    );
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++)
        this.piece(
          this.hips,
          new T.BoxGeometry(0.26, 0.13, 0.05),
          this.silver,
          side * 0.18,
          -0.1 - i * 0.085,
          0.19 + i * 0.025,
        );
    }
    this.torso.add(this.head);
    this.head.position.y = 0.77;
    this.piece(
      this.head,
      new T.SphereGeometry(0.22, 12, 12),
      this.silver,
      0,
      0.09,
      0,
      1,
      1.25,
      0.9,
    );
    this.piece(
      this.head,
      new T.CylinderGeometry(0.195, 0.16, 0.19, 8),
      this.silver,
      0,
      -0.035,
      0.035,
      1,
      1,
      0.94,
    );
    this.piece(
      this.head,
      new T.BoxGeometry(0.325, 0.045, 0.055),
      this.leather,
      0,
      0.09,
      0.19,
    );
    this.piece(
      this.head,
      new T.BoxGeometry(0.034, 0.28, 0.045),
      this.brass,
      0,
      0.04,
      0.217,
    );
    for (const side of [-1, 1])
      for (let i = 0; i < 3; i++)
        this.piece(
          this.head,
          new T.BoxGeometry(0.016, 0.018, 0.028),
          this.dark,
          side * (0.055 + i * 0.04),
          -0.045,
          0.208,
        );
    this.piece(
      this.head,
      new T.BoxGeometry(0.025, 0.24, 0.26),
      this.silver,
      0,
      0.27,
      -0.015,
    );
    for (const side of [-1, 1]) {
      const arm = side < 0 ? this.leftArm : this.rightArm,
        elbow = side < 0 ? this.leftElbow : this.rightElbow;
      this.torso.add(arm);
      arm.position.set(side * 0.4, 0.49, 0);
      this.piece(
        arm,
        new T.SphereGeometry(0.245, 10, 8),
        this.silver,
        side * 0.02,
        -0.015,
        0,
        1,
        0.68,
        0.98,
      );
      for (let i = 0; i < 2; i++)
        this.piece(
          arm,
          new T.SphereGeometry(0.21 - i * 0.012, 10, 8),
          this.silver,
          side * 0.035,
          -0.08 - i * 0.065,
          0,
          1,
          0.46,
          1,
        );
      this.piece(
        arm,
        new T.CylinderGeometry(0.12, 0.1, 0.31, 8),
        this.dark,
        0,
        -0.24,
        0,
      );
      this.piece(
        arm,
        new T.CylinderGeometry(0.15, 0.105, 0.23, 8),
        this.silver,
        0,
        -0.22,
        0.01,
      );
      arm.add(elbow);
      elbow.position.y = -0.4;
      this.piece(elbow, new T.SphereGeometry(0.12, 8, 6), this.silver, 0, 0, 0);
      this.piece(
        elbow,
        new T.CylinderGeometry(0.12, 0.085, 0.3, 8),
        this.silver,
        0,
        -0.18,
        0,
      );
      this.piece(
        elbow,
        new T.BoxGeometry(0.16, 0.16, 0.18),
        this.silver,
        0,
        -0.38,
        0.025,
      );
      const leg = side < 0 ? this.leftLeg : this.rightLeg,
        knee = side < 0 ? this.leftKnee : this.rightKnee;
      this.hips.add(leg);
      leg.position.set(side * 0.17, -0.13, 0);
      this.piece(
        leg,
        new T.CylinderGeometry(0.155, 0.12, 0.42, 10),
        this.silver,
        0,
        -0.2,
        0,
        1,
        1,
        0.9,
      );
      leg.add(knee);
      knee.position.y = -0.43;
      this.piece(
        knee,
        new T.SphereGeometry(0.14, 8, 8),
        this.silver,
        0,
        0,
        0.03,
        1,
        1,
        0.85,
      );
      this.piece(
        knee,
        new T.CylinderGeometry(0.105, 0.075, 0.36, 8),
        this.silver,
        0,
        -0.22,
        0,
      );
      this.piece(
        knee,
        new T.BoxGeometry(0.18, 0.15, 0.32),
        this.dark,
        0,
        -0.4,
        0.07,
      );
      this.piece(
        knee,
        new T.SphereGeometry(0.12, 8, 6),
        this.silver,
        0,
        -0.375,
        0.14,
        1,
        0.6,
        1.5,
      );
    }
    // Sword hangs naturally from the right hand; the blade moves with its joint.
    const sword = new T.Group();
    sword.position.set(0, -0.38, 0.04);
    sword.rotation.z = -0.12;
    this.rightElbow.add(sword);
    this.piece(
      sword,
      new T.CylinderGeometry(0.032, 0.032, 0.2, 6),
      this.leather,
      0,
      -0.08,
      0,
    );
    this.piece(
      sword,
      new T.BoxGeometry(0.32, 0.045, 0.07),
      this.brass,
      0,
      -0.2,
      0,
    );
    this.piece(
      sword,
      new T.BoxGeometry(0.065, 0.77, 0.024),
      this.silver,
      0,
      -0.6,
      0,
    );
    const tip = this.piece(
      sword,
      new T.ConeGeometry(0.045, 0.16, 4),
      this.silver,
      0,
      -1.06,
      0,
    );
    tip.rotation.z = Math.PI;
    this.piece(
      sword,
      new T.SphereGeometry(0.05, 8, 6),
      this.brass,
      0,
      0.035,
      0,
    );
    // Small heater shield carried on the left forearm.
    const shape = new T.Shape();
    shape.moveTo(-0.24, 0.3);
    shape.lineTo(0.24, 0.3);
    shape.lineTo(0.22, -0.12);
    shape.lineTo(0, -0.4);
    shape.lineTo(-0.22, -0.12);
    shape.closePath();
    const shield = this.piece(
      this.leftElbow,
      new T.ExtrudeGeometry(shape, {
        depth: 0.055,
        bevelEnabled: true,
        bevelSize: 0.025,
        bevelThickness: 0.015,
        bevelSegments: 1,
        steps: 1,
      }),
      this.dark,
      -0.08,
      -0.15,
      0.15,
    );
    shield.rotation.y = -0.3;
    this.piece(
      shield,
      new T.BoxGeometry(0.025, 0.5, 0.02),
      this.brass,
      0,
      -0.01,
      0.08,
    );
    this.piece(
      shield,
      new T.BoxGeometry(0.3, 0.025, 0.02),
      this.brass,
      0,
      0.13,
      0.08,
    );
    const capeGeo = new T.PlaneGeometry(0.68, 1.17, 8, 14);
    capeGeo.translate(0, -0.585, 0);
    this.cape = new T.Mesh(
      capeGeo,
      new T.MeshStandardMaterial({
        color: "#656257",
        roughness: 1,
        side: T.DoubleSide,
      }),
    );
    this.cape.position.set(0, 0.61, -0.22);
    this.torso.add(this.cape);
    this.capeBase = new Float32Array(capeGeo.attributes.position.array);
    // Brass keepsake bell at the hip.
    this.piece(
      this.hips,
      new T.CylinderGeometry(0.035, 0.065, 0.09, 10),
      this.brass,
      -0.31,
      -0.03,
      0.15,
    );
    this.root.traverse((o) => {
      if (o instanceof T.Mesh) o.castShadow = true;
    });
  }
  private piece(
    parent: T.Object3D,
    geometry: T.BufferGeometry,
    material: T.Material,
    x: number,
    y: number,
    z: number,
    sx = 1,
    sy = 1,
    sz = 1,
  ) {
    const m = new T.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    parent.add(m);
    return m;
  }
  update(
    dt: number,
    time: number,
    speed: number,
    restTime: number | null,
    dodge: number,
    _turnRate = 0,
  ) {
    this.stride = damp(this.stride, Math.min(1, speed / 3), 7, dt);
    this.phase += dt * (5 + speed * 1.45);
    const a = Math.sin(this.phase) * this.stride,
      b = Math.sin(this.phase + Math.PI) * this.stride;
    const sit = restTime === null ? 0 : smoothstep(0, 2.8, restTime);
    const lie = restTime === null ? 0 : smoothstep(3.7, 7.5, restTime);
    this.restBlend = damp(this.restBlend, sit, 4, dt);
    const r = this.restBlend;
    this.hips.position.y =
      1.03 -
      0.53 * r -
      0.22 * lie +
      Math.sin(time * 2) * 0.009 +
      Math.abs(Math.cos(this.phase)) * this.stride * 0.035;
    this.hips.rotation.x = lie * -Math.PI * 0.48;
    this.torso.rotation.x =
      0.08 * this.stride - 0.15 * r + 0.12 * lie + dodge * 0.5;
    this.torso.rotation.y = Math.sin(this.phase) * this.stride * 0.065;
    this.torso.scale.y = 1 + Math.sin(time * 1.8) * 0.009;
    this.leftLeg.rotation.x = a * 0.62 * (1 - r) - r * 1.2 + lie * 1.05;
    this.rightLeg.rotation.x = b * 0.62 * (1 - r) - r * 1.18 + lie * 1.03;
    this.leftKnee.rotation.x =
      Math.max(0, -a) * 0.9 * (1 - r) + r * 1.5 - lie * 1.4;
    this.rightKnee.rotation.x =
      Math.max(0, -b) * 0.9 * (1 - r) + r * 1.48 - lie * 1.38;
    this.leftArm.rotation.x = -a * 0.42 * (1 - r) - r * 0.4 + lie * 0.75;
    this.rightArm.rotation.x = -b * 0.42 * (1 - r) - r * 0.35 + lie * 0.7;
    this.leftArm.rotation.z = -0.13 - r * 0.13;
    this.rightArm.rotation.z = 0.13 + r * 0.13;
    this.leftElbow.rotation.x = -0.18 - r * 0.5;
    this.rightElbow.rotation.x = -0.14 - r * 0.5;
    this.head.rotation.x = Math.sin(time * 0.5) * 0.025 + r * 0.12 - lie * 0.25;
    this.head.rotation.y = Math.sin(time * 0.35) * 0.055 * (1 - r);
    const p = this.cape.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = this.capeBase[i * 3 + 1],
        x = this.capeBase[i * 3];
      p.setZ(
        i,
        -0.07 +
          Math.sin(time * 2.5 + x * 5 + y * 3) * y * 0.1 -
          Math.abs(y) * (0.16 + this.stride * 0.25),
      );
    }
    p.needsUpdate = true;
    this.cape.geometry.computeVertexNormals();
  }
}
