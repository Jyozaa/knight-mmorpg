import * as T from "three";

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
