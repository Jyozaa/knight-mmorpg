import * as T from "three";
import {
  mergeGeometries,
  mergeVertices,
} from "three/addons/utils/BufferGeometryUtils.js";

export interface Section {
  y: number;
  width: number;
  depth: number;
  z?: number;
  x?: number;
}
/** Sculpted elliptical cross-sections. Front keel, hammer flutes and rolled edges are geometry. */
export function armorLoft(
  sections: Section[],
  flutes = 0,
  keel = 0,
  segments = 40,
  start = 0,
  end = Math.PI * 2,
): T.BufferGeometry {
  const vertices: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  for (let row = 0; row < sections.length; row++) {
    const s = sections[row];
    for (let j = 0; j <= segments; j++) {
      const a = start + ((end - start) * j) / segments,
        front = Math.max(0, Math.cos(a));
      const flute = flutes
        ? 1 +
          0.022 *
            Math.cos(a * flutes) *
            Math.sin((Math.PI * row) / (sections.length - 1))
        : 1;
      const point = 1 + keel * Math.pow(front, 8);
      vertices.push(
        (s.x ?? 0) + Math.sin(a) * s.width * flute,
        s.y,
        (s.z ?? 0) + Math.cos(a) * s.depth * flute * point,
      );
      uvs.push(j / segments, row / (sections.length - 1));
      if (row && j) {
        const k = row * (segments + 1) + j;
        indices.push(
          k,
          k - 1,
          k - segments - 2,
          k,
          k - segments - 2,
          k - segments - 1,
        );
      }
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
  if (sections[sections.length - 1].y < sections[0].y)
    for (let i = 0; i < indices.length; i += 3) {
      const value = indices[i];
      indices[i] = indices[i + 1];
      indices[i + 1] = value;
    }
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
/** Curved embossed wire, welt, articulation groove or decorative plate edge. */
export function seam(points: T.Vector3[], radius = 0.006, segments = 40) {
  return new T.TubeGeometry(
    new T.CatmullRomCurve3(points),
    segments,
    radius,
    5,
    false,
  );
}
export function ellipseSeam(
  y: number,
  w: number,
  d: number,
  z = 0,
  start = 0,
  end = Math.PI * 2,
  radius = 0.006,
) {
  const points = [];
  for (let i = 0; i <= 40; i++) {
    const a = start + ((end - start) * i) / 40;
    points.push(new T.Vector3(Math.sin(a) * w, y, z + Math.cos(a) * d));
  }
  return seam(points, radius, 40);
}
export function panel(points: [number, number][], depth: number, bevel = 0.01) {
  const s = new T.Shape();
  points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  return new T.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 2,
    steps: 1,
    curveSegments: 12,
  });
}

/** Rigid armor vertices carry a single joint weight; skinning batches the entire suit into five draws. */
export class ArmorAssembler {
  readonly bones: T.Bone[] = [];
  private geometry: T.BufferGeometry[][] = Array.from({ length: 5 }, () => []);
  private matrix = new T.Matrix4();
  private rootInverse = new T.Matrix4();
  constructor(
    private root: T.Group,
    readonly materials: T.MeshStandardMaterial[],
  ) {}
  register(
    bone: T.Bone,
    name: string,
    parent: T.Object3D,
    position: [number, number, number],
  ) {
    bone.name = name;
    bone.position.set(...position);
    parent.add(bone);
    this.bones.push(bone);
    return bone;
  }
  add(
    bone: T.Bone,
    g: T.BufferGeometry,
    material = 0,
    position: [number, number, number] = [0, 0, 0],
    rotation: [number, number, number] = [0, 0, 0],
  ) {
    const geometry = g.index ? g.toNonIndexed() : g.clone();
    g.dispose();
    const transform = new T.Matrix4().compose(
      new T.Vector3(...position),
      new T.Quaternion().setFromEuler(new T.Euler(...rotation)),
      new T.Vector3(1, 1, 1),
    );
    this.root.updateMatrixWorld(true);
    this.rootInverse.copy(this.root.matrixWorld).invert();
    this.matrix
      .multiplyMatrices(this.rootInverse, bone.matrixWorld)
      .multiply(transform);
    geometry.applyMatrix4(this.matrix);
    const n = geometry.attributes.position.count,
      indices = new Uint16Array(n * 4),
      weights = new Float32Array(n * 4),
      joint = this.bones.indexOf(bone);
    for (let i = 0; i < n; i++) {
      indices[i * 4] = joint;
      weights[i * 4] = 1;
    }
    geometry.setAttribute("skinIndex", new T.Uint16BufferAttribute(indices, 4));
    geometry.setAttribute(
      "skinWeight",
      new T.Float32BufferAttribute(weights, 4),
    );
    geometry.deleteAttribute("uv");
    this.geometry[material].push(geometry);
  }
  build() {
    const parts: T.BufferGeometry[] = [],
      materials: T.Material[] = [];
    this.geometry.forEach((list, index) => {
      if (!list.length) return;
      const merged = mergeGeometries(list, false);
      if (!merged) throw new Error("Incompatible armor geometry");
      parts.push(merged);
      materials.push(this.materials[index]);
      for (const g of list) g.dispose();
    });
    const combined = mergeGeometries(parts, true);
    if (!combined) throw new Error("Armor batching failed");
    for (const g of parts) g.dispose();
    const mesh = new T.SkinnedMesh(mergeVertices(combined, 1e-5), materials);
    mesh.name = "Gothic plate harness — original sculpted armor";
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    this.root.add(mesh);
    this.root.updateMatrixWorld(true);
    mesh.bind(new T.Skeleton(this.bones));
    return mesh;
  }
}

/** Domed overlapping shoulder lames, rather than closed rings around a cylinder. */
export function pauldronPlate(
  width: number,
  depth: number,
  top: number,
  layer: number,
) {
  const positions: number[] = [],
    indices: number[] = [],
    segments = 40,
    rings = 8;
  const inner = layer === 0 ? 0.015 : 0.48;
  const profile = (rho: number, a: number) =>
    top +
    0.105 * Math.sqrt(Math.max(0, 1 - rho * rho)) -
    0.065 * rho * rho +
    0.012 * Math.cos(a * 3 + layer) * rho * rho;
  for (let r = 0; r <= rings; r++) {
    const rho = inner + ((1 - inner) * r) / rings;
    for (let j = 0; j <= segments; j++) {
      const a = (j / segments) * Math.PI * 2;
      positions.push(
        Math.sin(a) * width * rho,
        profile(rho, a),
        Math.cos(a) * depth * rho,
      );
      if (r && j) {
        const p = (r - 1) * (segments + 1) + j - 1,
          c = r * (segments + 1) + j - 1;
        indices.push(p, c, p + 1, c, c + 1, p + 1);
      }
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const edge = [];
  for (let j = 0; j <= 40; j++) {
    const a = (j / 40) * Math.PI * 2;
    edge.push(
      new T.Vector3(Math.sin(a) * width, profile(1, a), Math.cos(a) * depth),
    );
  }
  return { geometry, rim: seam(edge, 0.006, 40) };
}
