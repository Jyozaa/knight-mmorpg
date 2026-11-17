import type { Material } from "three";
// Semantic alpha travels only in the offscreen HDR buffer. It is not transparency or a color overlay.
export const SURFACE_TAG = {
  armor: 0.18,
  cloth: 0.43,
  grass: 0.69,
  landmark: 0.9,
} as const;
export function tagAsciiSurface(
  material: Material,
  tag: number,
  expression?: string,
) {
  const compile = material.onBeforeCompile.bind(material),
    cache = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    compile(shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <dithering_fragment>",
      `#include <dithering_fragment>\n gl_FragColor.a=${expression ?? tag.toFixed(3)};`,
    );
  };
  material.customProgramCacheKey = () =>
    `${cache()}:ascii-surface-${tag}:${expression ?? ""}`;
}
