import * as T from "three";
import type { Rig } from "./buildArmor";
import { armorLoft, ellipseSeam, seam } from "./armorGeometry";
import { SURFACE_TAG, tagAsciiSurface } from "../../rendering/SurfaceStyle";
/** Separate sockets keep future drawing/reparenting independent from the skin. */
export class SheathedSword {
  readonly mount = new T.Group();
  readonly sword = new T.Group();
  readonly scabbard = new T.Group();
  readonly drawn = false;
  constructor(rig: Rig, materials: T.Material[]) {
    this.mount.name = "Left hip sword suspension";
    this.scabbard.name = "Leather scabbard with silver chape";
    this.sword.name = "Sheathed longsword — future draw socket";
    this.mount.position.set(-0.32, 0.025, 0.16);
    rig.hips.add(this.mount);
    this.mount.add(this.scabbard, this.sword);
    const steel = materials[1],
      leather = new T.MeshStandardMaterial({
        color: "#302b28",
        roughness: 0.94,
        fog: false,
      });
    tagAsciiSurface(leather, SURFACE_TAG.armor);
    const add = (parent: T.Group, g: T.BufferGeometry, m: T.Material) => {
      const mesh = new T.Mesh(g, m);
      parent.add(mesh);
      return mesh;
    };
    add(
      this.scabbard,
      armorLoft(
        [
          { y: 0, width: 0.052, depth: 0.028 },
          { y: -0.7, width: 0.034, depth: 0.024 },
          { y: -0.86, width: 0.017, depth: 0.018 },
        ],
        0,
      ),
      leather,
    );
    for (const y of [-0.015, -0.68, -0.83])
      add(
        this.scabbard,
        ellipseSeam(
          y,
          y > -0.1 ? 0.054 : 0.035,
          0.03,
          0,
          0,
          Math.PI * 2,
          0.008,
        ),
        steel,
      );
    add(
      this.sword,
      armorLoft(
        [
          { y: 0.025, width: 0.025, depth: 0.022 },
          { y: 0.22, width: 0.026, depth: 0.022 },
        ],
        0,
      ),
      leather,
    );
    for (let i = 0; i < 10; i++)
      add(
        this.sword,
        ellipseSeam(0.035 + i * 0.018, 0.027, 0.023, 0, 0, Math.PI * 2, 0.0025),
        materials[4],
      );
    add(
      this.sword,
      seam(
        [
          new T.Vector3(-0.16, -0.01, 0),
          new T.Vector3(-0.08, 0.025, 0),
          new T.Vector3(0, 0.015, 0),
          new T.Vector3(0.08, 0.025, 0),
          new T.Vector3(0.16, -0.01, 0),
        ],
        0.013,
      ),
      steel,
    );
    const pommel = add(this.sword, new T.IcosahedronGeometry(0.038, 2), steel);
    pommel.position.y = 0.25;
    // The blade is enclosed, but exists as an independent mesh for a later draw animation.
    add(
      this.sword,
      armorLoft(
        [
          { y: -0.02, width: 0.038, depth: 0.01 },
          { y: -0.73, width: 0.023, depth: 0.008 },
          { y: -0.83, width: 0.001, depth: 0.001 },
        ],
        0,
        0,
        4,
      ),
      steel,
    );
    for (const y of [0.01, -0.12]) {
      const strap = add(
        this.mount,
        seam(
          [
            new T.Vector3(0.0, y, -0.015),
            new T.Vector3(0.1, y + 0.05, -0.025),
            new T.Vector3(0.16, y + 0.06, -0.035),
          ],
          0.014,
        ),
        leather,
      );
      strap.name = "Sword belt hanger";
    }
    this.update(0, 0, 0);
  }
  update(time: number, speed: number, rest: number) {
    this.mount.rotation.set(
      0.22 + rest * 1.24 + Math.sin(time * 5) * Math.min(speed, 0.4) * 0.025,
      0,
      -0.28,
    );
  }
}
