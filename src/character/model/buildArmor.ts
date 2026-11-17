import * as T from "three";
import { tagAsciiSurface, SURFACE_TAG } from "../../rendering/SurfaceStyle";
import { WIND_GLSL, WindSystem } from "../../environment/WindSystem";
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
interface Gltf {
  nodes: { name: string; translation?: number[]; children?: number[] }[];
  accessors: {
    bufferView: number;
    componentType: number;
    count: number;
    type: string;
    byteOffset?: number;
  }[];
  bufferViews: { byteOffset?: number; byteLength: number }[];
  meshes: {
    primitives: {
      indices: number;
      material: number;
      attributes: Record<string, number>;
    }[];
  }[];
  materials: {
    name: string;
    pbrMetallicRoughness: {
      baseColorFactor: number[];
      metallicFactor: number;
      roughnessFactor: number;
    };
  }[];
  skins: { joints: number[] }[];
}
let model: { json: Gltf; bytes: ArrayBuffer; offset: number } | undefined;
/** Load the original Blender-authored asset once; no primitive character is substituted. */
export async function prepareArmor(bytes?: ArrayBuffer) {
  if (!bytes) {
    const response = await fetch(
      `${import.meta.env.BASE_URL}models/nameless-knight.glb`,
    );
    if (!response.ok) throw new Error(`Knight model: ${response.status}`);
    bytes = await response.arrayBuffer();
  }
  const view = new DataView(bytes);
  if (view.getUint32(0, true) !== 0x46546c67)
    throw new Error("Invalid knight GLB");
  const length = view.getUint32(12, true),
    json = JSON.parse(
      new TextDecoder().decode(new Uint8Array(bytes, 20, length)),
    ) as Gltf;
  model = { json, bytes, offset: 28 + length };
}
export function buildArmor(root: T.Group, wind?: WindSystem) {
  if (!model)
    throw new Error("Call prepareArmor before constructing the knight");
  const { json, bytes, offset } = model;
  const read = (index: number) => {
    const a = json.accessors[index],
      v = json.bufferViews[a.bufferView],
      size = (
        { SCALAR: 1, VEC3: 3, VEC4: 4, MAT4: 16 } as Record<string, number>
      )[a.type],
      start = offset + (v.byteOffset ?? 0) + (a.byteOffset ?? 0),
      length = a.count * size;
    return a.componentType === 5126
      ? new Float32Array(bytes, start, length)
      : a.componentType === 5123
        ? new Uint16Array(bytes, start, length)
        : new Uint32Array(bytes, start, length);
  };
  const bones = json.skins[0].joints.map((i) => {
    const b = new T.Bone();
    b.name = json.nodes[i].name;
    b.position.fromArray(json.nodes[i].translation ?? [0, 0, 0]);
    return b;
  });
  json.skins[0].joints.forEach((node, i) => {
    for (const child of json.nodes[node].children ?? []) {
      const j = json.skins[0].joints.indexOf(child);
      if (j >= 0) bones[i].add(bones[j]);
    }
  });
  root.add(bones[0]);
  const get = (name: string) => bones.find((b) => b.name === name)!;
  const pair = (prefix: string) => [get(`${prefix}_L`), get(`${prefix}_R`)];
  const rig: Rig = {
    hips: get("pelvis"),
    spine: get("lumbar"),
    chest: get("thorax"),
    head: get("neck"),
    arms: pair("upper_arm"),
    forearms: pair("forearm"),
    hands: pair("hand"),
    thighs: pair("thigh"),
    shins: pair("shin"),
    feet: pair("ankle"),
    toes: pair("toe"),
  };
  const materials = json.materials.map((m, i) => {
    const p = m.pbrMetallicRoughness,
      material = new T.MeshStandardMaterial({
        name: m.name,
        color: new T.Color().fromArray(p.baseColorFactor),
        metalness: p.metallicFactor * 0.55,
        roughness: p.roughnessFactor,
        fog: false,
        side: T.DoubleSide,
      });
    material.onBeforeCompile = (shader) => {
      shader.vertexShader =
        "varying vec3 bindPosition;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\n bindPosition=position;",
      );
      shader.fragmentShader =
        "varying vec3 bindPosition;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
    float forged=sin(bindPosition.x*57.+sin(bindPosition.y*42.))*sin(bindPosition.z*67.-bindPosition.y*53.);
    float wear=pow(max(0.,sin(bindPosition.y*310.+bindPosition.x*47.)),18.);
    diffuseColor.rgb*=.88+forged*.12+wear*.06;`,
      );
      if (i === 5 && wind) {
        Object.assign(shader.uniforms, wind.uniforms);
        shader.vertexShader = WIND_GLSL + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          "bindPosition=position;",
          `bindPosition=position;
    vec3 f=sharedWind((modelMatrix*vec4(position,1.)).xz);
    float hem=clamp((.82-position.y)/.32,0.,1.);
    transformed.x+=windDirection.x*f.x*hem*hem*.08;
    transformed.z+=windDirection.y*f.x*hem*hem*.08+sin(windTime*5.-position.y*19.)*f.x*hem*.018;`,
        );
      }
    };
    material.customProgramCacheKey = () => `forged-blender-v05-${i}`;
    tagAsciiSurface(
      material,
      i === 5 ? SURFACE_TAG.cloth : SURFACE_TAG.armor,
      i === 5
        ? undefined
        : ".14+.10*fract(sin(dot(floor(bindPosition*31.),vec3(12.9898,78.233,37.719)))*43758.5453)",
    );
    return material;
  });
  const primitives = json.meshes[0].primitives,
    attrs = primitives[0].attributes,
    g = new T.BufferGeometry();
  g.setAttribute("position", new T.BufferAttribute(read(attrs.POSITION), 3));
  g.setAttribute("normal", new T.BufferAttribute(read(attrs.NORMAL), 3));
  g.setAttribute("skinIndex", new T.BufferAttribute(read(attrs.JOINTS_0), 4));
  g.setAttribute("skinWeight", new T.BufferAttribute(read(attrs.WEIGHTS_0), 4));
  const indices: number[] = [];
  for (const p of primitives) {
    const start = indices.length;
    for (const index of read(p.indices)) indices.push(index);
    g.addGroup(start, indices.length - start, p.material);
  }
  g.setIndex(indices);
  const mesh = new T.SkinnedMesh(g, materials);
  mesh.name = "Blender-authored sallet and articulated harness";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  root.add(mesh);
  root.updateMatrixWorld(true);
  mesh.bind(new T.Skeleton(bones));
  return { rig, mesh, materials };
}
