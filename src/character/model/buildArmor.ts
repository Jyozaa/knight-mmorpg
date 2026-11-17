import * as T from "three";
import {
  ArmorAssembler,
  armorLoft,
  ellipseSeam,
  seam,
  panel,
  type Section,
} from "./armorGeometry";
export interface Rig {
  hips: T.Bone;
  spine: T.Bone;
  chest: T.Bone;
  head: T.Bone;
  thighs: T.Bone[];
  shins: T.Bone[];
  feet: T.Bone[];
  toes: T.Bone[];
  arms: T.Bone[];
  forearms: T.Bone[];
  hands: T.Bone[];
}
const v = (x: number, y: number, z: number) => new T.Vector3(x, y, z);
export function buildArmor(root: T.Group) {
  const steel = new T.MeshStandardMaterial({
    color: "#bfc2c0",
    metalness: 0.38,
    roughness: 0.43,
  });
  const edge = new T.MeshStandardMaterial({
    color: "#e1e4df",
    metalness: 0.42,
    roughness: 0.31,
  });
  const mail = new T.MeshStandardMaterial({
    color: "#585d5c",
    metalness: 0.3,
    roughness: 0.65,
  });
  const leather = new T.MeshStandardMaterial({
    color: "#151716",
    roughness: 0.95,
  });
  const brass = new T.MeshStandardMaterial({
    color: "#827552",
    metalness: 0.4,
    roughness: 0.5,
  });
  const b = new ArmorAssembler(root, [steel, edge, mail, leather, brass]);
  const joint = (
    name: string,
    parent: T.Object3D,
    p: [number, number, number],
  ) => b.register(new T.Bone(), name, parent, p);
  const hips = joint("pelvis", root, [0, 1.01, 0]),
    spine = joint("lumbar", hips, [0, 0.11, 0]),
    chest = joint("thorax", spine, [0, 0.24, 0]),
    head = joint("neck", chest, [0, 0.31, 0]);
  const rig: Rig = {
    hips,
    spine,
    chest,
    head,
    thighs: [],
    shins: [],
    feet: [],
    toes: [],
    arms: [],
    forearms: [],
    hands: [],
  };
  // A fitted Gothic cuirass. The deep front keel and widening rib cage avoid the old barrel torso.
  const chestSections: Section[] = [
    { y: -0.23, width: 0.218, depth: 0.125 },
    { y: -0.18, width: 0.232, depth: 0.14 },
    { y: -0.08, width: 0.28, depth: 0.155 },
    { y: 0.04, width: 0.326, depth: 0.165 },
    { y: 0.14, width: 0.31, depth: 0.145 },
    { y: 0.21, width: 0.245, depth: 0.115 },
    { y: 0.24, width: 0.14, depth: 0.09 },
  ];
  b.add(chest, armorLoft(chestSections, 18, 0.2));
  for (const y of [-0.2, -0.15]) b.add(chest, ellipseSeam(y, 0.235, 0.147), 1);
  // Embossed ribs, rolled armhole edges and tapering decorative flutes.
  for (const side of [-1, 1]) {
    for (let i = 1; i <= 5; i++)
      b.add(
        chest,
        seam(
          [
            v(side * (0.018 + i * 0.028), -0.2, 0.145),
            v(side * (0.025 + i * 0.041), -0.05, 0.165),
            v(side * (0.03 + i * 0.047), 0.11, 0.13),
          ],
          0.0045,
        ),
        1,
      );
    b.add(
      chest,
      seam(
        [
          v(side * 0.14, 0.245, 0.08),
          v(side * 0.265, 0.19, 0.1),
          v(side * 0.325, 0.08, 0.07),
          v(side * 0.29, -0.07, 0.06),
        ],
        0.009,
      ),
      1,
    );
    // Rivet heads spaced along the lower breastplate, not a flat painted texture.
    for (let i = 0; i < 6; i++)
      b.add(chest, new T.IcosahedronGeometry(0.006, 1), 1, [
        side * (0.04 + i * 0.032),
        -0.17,
        0.155,
      ]);
  }
  b.add(
    chest,
    seam([v(0, -0.22, 0.151), v(0, -0.04, 0.205), v(0, 0.16, 0.16)], 0.006),
    1,
  );
  b.add(
    spine,
    armorLoft(
      [
        { y: -0.13, width: 0.21, depth: 0.13 },
        { y: 0.09, width: 0.23, depth: 0.14 },
      ],
      0,
    ),
    2,
  );
  // Five overlapping articulated fauld lames, with divided, pointed tassets.
  for (let i = 0; i < 5; i++) {
    const y = 0.07 - i * 0.05,
      w = 0.22 + i * 0.013;
    b.add(
      hips,
      armorLoft(
        [
          { y: y + 0.04, width: w - 0.008, depth: 0.14 + i * 0.006 },
          { y, width: w + 0.008, depth: 0.155 + i * 0.006 },
        ],
        14,
        0.04,
      ),
    );
    b.add(hips, ellipseSeam(y, w + 0.01, 0.156 + i * 0.006), 1);
  }
  const addTasset = (side: number, thigh: T.Bone) => {
    const tasset = panel(
      [
        [-0.105, 0.03],
        [0.1, 0.025],
        [0.12, -0.15],
        [0.075, -0.31],
        [-0.07, -0.32],
        [-0.12, -0.12],
      ],
      0.018,
      0.009,
    );
    b.add(
      thigh,
      tasset,
      0,
      [side * -0.008, -0.11, 0.125],
      [0.1, side * 0.16, side * -0.08],
    );
    for (let i = 0; i < 4; i++)
      b.add(
        thigh,
        seam(
          [
            v(side * -0.008 - 0.085, -0.14 - i * 0.055, 0.158),
            v(side * -0.008, -0.15 - i * 0.055, 0.18),
            v(side * -0.008 + 0.085, -0.14 - i * 0.055, 0.158),
          ],
          0.004,
        ),
        1,
      );
  };
  b.add(
    hips,
    armorLoft(
      [
        { y: 0.075, width: 0.226, depth: 0.149 },
        { y: 0.018, width: 0.23, depth: 0.153 },
      ],
      0,
    ),
    3,
  );
  b.add(
    hips,
    panel(
      [
        [-0.037, 0.03],
        [0.037, 0.03],
        [0.037, -0.03],
        [-0.037, -0.03],
      ],
      0.01,
      0.004,
    ),
    4,
    [0.04, 0.05, 0.155],
  );
  // Gorget and actual linked mail at the vulnerable collar and joints.
  b.add(
    head,
    armorLoft(
      [
        { y: -0.09, width: 0.12, depth: 0.095 },
        { y: -0.055, width: 0.105, depth: 0.08 },
        { y: 0.01, width: 0.105, depth: 0.09 },
      ],
      10,
    ),
    0,
  );
  b.add(head, ellipseSeam(-0.075, 0.12, 0.096), 1);
  const addMail = (
    bone: T.Bone,
    sections: Section[],
    rows: number,
    around: number,
  ) => {
    b.add(bone, armorLoft(sections), 2);
    for (let r = 0; r < rows; r++) {
      const t = r / Math.max(1, rows - 1),
        a = sections[0],
        z = sections[sections.length - 1];
      const y = T.MathUtils.lerp(a.y, z.y, t),
        w = T.MathUtils.lerp(a.width, z.width, t),
        d = T.MathUtils.lerp(a.depth, z.depth, t);
      for (let j = 0; j < around; j++) {
        const angle = ((j + (r % 2) * 0.5) / around) * Math.PI * 2;
        b.add(
          bone,
          new T.TorusGeometry(0.0085, 0.0019, 3, 7),
          r % 3 === 0 ? 1 : 2,
          [Math.sin(angle) * w, y, Math.cos(angle) * d],
          [0.32, angle, 0],
        );
      }
    }
  };
  addMail(
    head,
    [
      { y: -0.085, width: 0.115, depth: 0.092 },
      { y: 0.02, width: 0.104, depth: 0.088 },
    ],
    7,
    30,
  );
  // Bascinet: pointed skull, projecting visor, open sight slit and articulated bevor.
  b.add(
    head,
    armorLoft(
      [
        { y: 0.005, width: 0.13, depth: 0.115, z: -0.015 },
        { y: 0.09, width: 0.151, depth: 0.143, z: -0.013 },
        { y: 0.19, width: 0.145, depth: 0.136, z: -0.025 },
        { y: 0.27, width: 0.105, depth: 0.11, z: -0.035 },
        { y: 0.325, width: 0.015, depth: 0.035, z: -0.025 },
        { y: 0.328, width: 0.001, depth: 0.003, z: -0.025 },
      ],
      0,
      0.03,
      48,
    ),
  );
  b.add(
    head,
    armorLoft(
      [
        { y: 0.035, width: 0.135, depth: 0.13, z: 0.005 },
        { y: 0.085, width: 0.148, depth: 0.165, z: 0.01 },
        { y: 0.125, width: 0.146, depth: 0.19, z: 0.012 },
      ],
      0,
      0.16,
      32,
      -Math.PI * 0.48,
      Math.PI * 0.48,
    ),
  );
  b.add(
    head,
    armorLoft(
      [
        { y: 0.145, width: 0.144, depth: 0.185, z: 0.01 },
        { y: 0.168, width: 0.142, depth: 0.165, z: 0.002 },
        { y: 0.204, width: 0.133, depth: 0.127, z: -0.01 },
      ],
      0,
      0.14,
      32,
      -Math.PI * 0.48,
      Math.PI * 0.48,
    ),
    1,
  );
  b.add(head, ellipseSeam(0.127, 0.148, 0.19, 0.013, -1.45, 1.45, 0.005), 1);
  b.add(head, ellipseSeam(0.145, 0.146, 0.185, 0.012, -1.45, 1.45, 0.004), 0);
  b.add(
    head,
    armorLoft(
      [
        { y: -0.025, width: 0.116, depth: 0.11, z: 0.004 },
        { y: 0.02, width: 0.14, depth: 0.14, z: 0.005 },
        { y: 0.055, width: 0.144, depth: 0.159, z: 0.008 },
      ],
      0,
      0.12,
      32,
      -Math.PI * 0.65,
      Math.PI * 0.65,
    ),
  );
  for (const side of [-1, 1]) {
    b.add(head, new T.IcosahedronGeometry(0.017, 2), 4, [
      side * 0.145,
      0.14,
      0.025,
    ]);
    for (let r = 0; r < 2; r++)
      for (let j = 0; j < 5; j++)
        b.add(
          head,
          panel(
            [
              [-0.004, -0.007],
              [0.004, -0.007],
              [0.004, 0.007],
              [-0.004, 0.007],
            ],
            0.001,
            0.001,
          ),
          3,
          [side * (0.035 + j * 0.019), 0.065 + r * 0.026, 0.197 - j * 0.006],
        );
  }
  b.add(
    head,
    seam(
      [
        v(0, 0.19, -0.161),
        v(0, 0.295, -0.09),
        v(0, 0.331, -0.023),
        v(0, 0.277, 0.08),
        v(0, 0.214, 0.127),
      ],
      0.005,
    ),
    1,
  );
  // Arms: overlapping scalloped pauldrons, fitted rerebraces, couters and fluted vambraces.
  for (const side of [-1, 1]) {
    const index = side < 0 ? 0 : 1;
    const arm = joint(side < 0 ? "upper_arm.L" : "upper_arm.R", chest, [
      side * 0.315,
      0.125,
      -0.005,
    ]);
    const forearm = joint(
      side < 0 ? "forearm.L" : "forearm.R",
      arm,
      [0, -0.335, 0],
    );
    const hand = joint(side < 0 ? "hand.L" : "hand.R", forearm, [0, -0.3, 0]);
    rig.arms[index] = arm;
    rig.forearms[index] = forearm;
    rig.hands[index] = hand;
    addMail(
      arm,
      [
        { y: 0.02, width: 0.115, depth: 0.105 },
        { y: -0.17, width: 0.09, depth: 0.082 },
      ],
      8,
      28,
    );
    for (let i = 0; i < 4; i++) {
      const y = 0.1 - i * 0.063,
        w = 0.18 - i * 0.012,
        d = 0.153 - i * 0.008;
      b.add(
        arm,
        armorLoft(
          [
            { y: y + 0.04, width: w * 0.65, depth: d * 0.75 },
            { y: y + 0.02, width: w, depth: d },
            { y: y - 0.055, width: w * 0.98, depth: d * 0.98 },
          ],
          12,
          0.02,
          32,
        ),
        0,
        [side * 0.035, 0, 0],
      );
      b.add(arm, ellipseSeam(y - 0.055, w * 0.98, d * 0.98), 1, [
        side * 0.035,
        0,
        0,
      ]);
    }
    b.add(
      arm,
      armorLoft(
        [
          { y: -0.12, width: 0.105, depth: 0.095 },
          { y: -0.2, width: 0.103, depth: 0.09 },
          { y: -0.31, width: 0.076, depth: 0.078 },
        ],
        12,
        0.04,
      ),
    );
    addMail(
      forearm,
      [
        { y: 0.035, width: 0.075, depth: 0.073 },
        { y: -0.06, width: 0.071, depth: 0.066 },
      ],
      5,
      20,
    );
    b.add(
      forearm,
      armorLoft(
        [
          { y: 0.03, width: 0.087, depth: 0.086 },
          { y: -0.015, width: 0.115, depth: 0.112 },
          { y: -0.067, width: 0.082, depth: 0.083 },
        ],
        0,
        0.1,
      ),
    );
    b.add(
      forearm,
      panel(
        [
          [-0.03, 0.04],
          [0.08, 0.06],
          [0.12, -0.005],
          [0.075, -0.09],
          [-0.025, -0.05],
        ],
        0.013,
        0.012,
      ),
      0,
      [side * 0.06, -0.004, 0],
      [0, (side * Math.PI) / 2, 0],
    );
    b.add(
      forearm,
      armorLoft(
        [
          { y: -0.06, width: 0.081, depth: 0.084 },
          { y: -0.12, width: 0.084, depth: 0.086 },
          { y: -0.235, width: 0.06, depth: 0.068 },
          { y: -0.285, width: 0.061, depth: 0.072 },
        ],
        12,
        0.08,
      ),
    );
    for (const y of [-0.09, -0.25])
      b.add(
        forearm,
        ellipseSeam(y, y < -0.2 ? 0.063 : 0.085, y < -0.2 ? 0.073 : 0.087),
        1,
      );
    // Flared cuff, five metacarpal lames and separately modeled articulated fingers.
    b.add(
      hand,
      armorLoft(
        [
          { y: 0.055, width: 0.075, depth: 0.078 },
          { y: 0.005, width: 0.063, depth: 0.068 },
          { y: -0.075, width: 0.069, depth: 0.052 },
          { y: -0.135, width: 0.061, depth: 0.045 },
        ],
        8,
        0.06,
      ),
    );
    for (let i = 0; i < 4; i++)
      b.add(
        hand,
        seam(
          [
            v(-0.058, -0.063 - i * 0.02, 0.048),
            v(0, -0.067 - i * 0.02, 0.057),
            v(0.058, -0.063 - i * 0.02, 0.048),
          ],
          0.005,
        ),
        1,
      );
    for (let finger = 0; finger < 4; finger++) {
      const x = (finger - 1.5) * 0.028;
      for (let k = 0; k < 3; k++)
        b.add(
          hand,
          armorLoft(
            [
              {
                y: -0.13 - k * 0.028,
                width: 0.014,
                depth: 0.022,
                z: 0.006 + k * 0.013,
                x,
              },
              {
                y: -0.158 - k * 0.028,
                width: 0.012,
                depth: 0.019,
                z: 0.012 + k * 0.013,
                x,
              },
            ],
            0,
          ),
          k % 2,
        );
    }
    b.add(
      hand,
      armorLoft([
        { y: -0.07, width: 0.019, depth: 0.023, x: side * 0.075, z: 0.02 },
        { y: -0.12, width: 0.017, depth: 0.02, x: side * 0.083, z: 0.055 },
        { y: -0.145, width: 0.012, depth: 0.018, x: side * 0.07, z: 0.075 },
      ]),
      0,
    );
    // Legs: cuisses follow thigh anatomy, winged poleyns and pinched greaves follow the calf.
    const thigh = joint(side < 0 ? "thigh.L" : "thigh.R", hips, [
      side * 0.153,
      -0.04,
      0,
    ]);
    const shin = joint(side < 0 ? "shin.L" : "shin.R", thigh, [0, -0.445, 0]);
    const foot = joint(side < 0 ? "ankle.L" : "ankle.R", shin, [0, -0.435, 0]);
    const toe = joint(side < 0 ? "toe.L" : "toe.R", foot, [0, -0.055, 0.105]);
    rig.thighs[index] = thigh;
    addTasset(side, thigh);
    rig.shins[index] = shin;
    rig.feet[index] = foot;
    rig.toes[index] = toe;
    addMail(
      thigh,
      [
        { y: 0.01, width: 0.125, depth: 0.115 },
        { y: -0.13, width: 0.115, depth: 0.1 },
      ],
      6,
      28,
    );
    b.add(
      thigh,
      armorLoft(
        [
          { y: -0.06, width: 0.131, depth: 0.12 },
          { y: -0.17, width: 0.129, depth: 0.115, z: 0.006 },
          { y: -0.3, width: 0.101, depth: 0.094, z: 0.008 },
          { y: -0.42, width: 0.078, depth: 0.08 },
        ],
        14,
        0.08,
      ),
    );
    for (const y of [-0.1, -0.39])
      b.add(
        thigh,
        ellipseSeam(y, y < -0.3 ? 0.081 : 0.132, y < -0.3 ? 0.084 : 0.12),
        1,
      );
    b.add(
      shin,
      armorLoft(
        [
          { y: 0.045, width: 0.087, depth: 0.086 },
          { y: 0.005, width: 0.108, depth: 0.108, z: 0.025 },
          { y: -0.06, width: 0.087, depth: 0.088 },
        ],
        12,
        0.1,
      ),
    );
    b.add(
      shin,
      panel(
        [
          [-0.035, 0.045],
          [0.07, 0.06],
          [0.115, -0.015],
          [0.075, -0.085],
          [-0.03, -0.05],
        ],
        0.014,
        0.009,
      ),
      0,
      [side * 0.065, 0, 0],
      [0, (side * Math.PI) / 2, 0],
    );
    addMail(
      shin,
      [
        { y: -0.035, width: 0.073, depth: 0.075 },
        { y: -0.11, width: 0.076, depth: 0.075 },
      ],
      4,
      20,
    );
    b.add(
      shin,
      armorLoft(
        [
          { y: -0.075, width: 0.083, depth: 0.085 },
          { y: -0.16, width: 0.098, depth: 0.09, z: -0.012 },
          { y: -0.26, width: 0.075, depth: 0.072, z: -0.009 },
          { y: -0.37, width: 0.055, depth: 0.06 },
          { y: -0.415, width: 0.065, depth: 0.068 },
        ],
        14,
        0.1,
      ),
    );
    b.add(
      shin,
      seam([v(0, -0.09, 0.091), v(0, -0.22, 0.087), v(0, -0.4, 0.075)], 0.005),
      1,
    );
    b.add(
      foot,
      armorLoft([
        { y: 0.01, width: 0.064, depth: 0.078, z: 0.015 },
        { y: -0.065, width: 0.073, depth: 0.12, z: 0.035 },
        { y: -0.085, width: 0.073, depth: 0.13, z: 0.04 },
      ]),
      3,
    );
    for (let i = 0; i < 5; i++) {
      const z = 0.025 + i * 0.032,
        w = 0.073 - i * 0.006,
        y = -0.01 - i * 0.009;
      b.add(
        foot,
        seam(
          [
            v(-w, y - 0.025, z),
            v(-w * 0.7, y + 0.015, z + 0.004),
            v(0, y + 0.03, z + 0.008),
            v(w * 0.7, y + 0.015, z + 0.004),
            v(w, y - 0.025, z),
          ],
          0.013,
        ),
        0,
      );
      b.add(
        foot,
        seam(
          [
            v(-w, y - 0.025, z + 0.011),
            v(0, y + 0.03, z + 0.019),
            v(w, y - 0.025, z + 0.011),
          ],
          0.0035,
        ),
        1,
      );
    }
    b.add(
      toe,
      armorLoft([
        { y: 0.005, width: 0.046, depth: 0.054, z: 0.055 },
        { y: -0.025, width: 0.05, depth: 0.06, z: 0.055 },
      ]),
      0,
    );
  }
  // Longsword with a diamond cross-section, recessed fuller, wrapped grip and swept guard.
  const hand = rig.hands[1];
  b.add(
    hand,
    armorLoft(
      [
        { y: -0.09, width: 0.028, depth: 0.025, z: 0.035 },
        { y: -0.24, width: 0.025, depth: 0.022, z: 0.035 },
      ],
      0,
    ),
    3,
  );
  for (let i = 0; i < 9; i++)
    b.add(
      hand,
      ellipseSeam(-0.1 - i * 0.015, 0.028, 0.025, 0.035, 0, Math.PI * 2, 0.002),
      4,
    );
  b.add(
    hand,
    seam(
      [
        v(-0.19, -0.265, 0.035),
        v(-0.12, -0.245, 0.035),
        v(0, -0.255, 0.035),
        v(0.12, -0.245, 0.035),
        v(0.19, -0.265, 0.035),
      ],
      0.018,
    ),
    1,
  );
  b.add(
    hand,
    armorLoft(
      [
        { y: -0.28, width: 0.038, depth: 0.012, z: 0.035 },
        { y: -0.34, width: 0.043, depth: 0.013, z: 0.035 },
        { y: -1.02, width: 0.024, depth: 0.009, z: 0.035 },
        { y: -1.13, width: 0.001, depth: 0.001, z: 0.035 },
      ],
      0,
      0,
      4,
    ),
    1,
  );
  b.add(
    hand,
    seam([v(0, -0.32, 0.049), v(0, -0.85, 0.046), v(0, -1.01, 0.044)], 0.004),
    2,
  );
  b.add(hand, new T.IcosahedronGeometry(0.042, 2), 1, [0, -0.055, 0.035]);
  // A compact shield leaves the fitted armor visible; its face is curved in three dimensions.
  const shield = panel(
    [
      [-0.19, 0.22],
      [0.19, 0.22],
      [0.17, -0.08],
      [0, -0.32],
      [-0.17, -0.08],
    ],
    0.025,
    0.015,
  );
  b.add(rig.forearms[0], shield, 0, [-0.1, -0.14, 0.105], [0, -0.5, -0.06]);
  b.add(
    rig.forearms[0],
    seam(
      [v(-0.11, 0.04, 0.15), v(-0.1, -0.17, 0.18), v(-0.1, -0.38, 0.15)],
      0.009,
    ),
    4,
  );
  // Small brass keepsake, the sole warm accent on the suit.
  b.add(
    hips,
    armorLoft(
      [
        { y: -0.03, width: 0.025, depth: 0.025 },
        { y: -0.11, width: 0.045, depth: 0.045 },
      ],
      0,
    ),
    4,
    [-0.25, -0.02, 0.11],
  );
  const mesh = b.build();
  return { rig, mesh, materials: b.materials };
}
