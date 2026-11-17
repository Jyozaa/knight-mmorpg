export function heightAt(x: number, z: number): number {
  const hill = 12 * Math.exp(-(x * x + (z - 8) * (z - 8)) / 1300);
  const rolling =
    2.7 * Math.sin(x * 0.035 + z * 0.019) +
    1.8 * Math.cos(z * 0.052 - x * 0.012) +
    0.7 * Math.sin(x * 0.11) * Math.cos(z * 0.08);
  const ridge = Math.max(0, Math.hypot(x * 0.65, z * 0.82) - 70) * 0.22;
  return hill + rolling + ridge - 2;
}
export function terrainMaterial(x: number, z: number): "grass" | "stone" {
  return Math.abs(x - 9 * Math.sin(z * 0.025)) < 1.6 ? "stone" : "grass";
}
export interface Obstacle {
  x: number;
  z: number;
  radius: number;
  height?: number;
}
export function resolveObstacles(
  x: number,
  z: number,
  obstacles: Obstacle[],
  radius = 0.42,
): [number, number] {
  for (const o of obstacles) {
    const dx = x - o.x,
      dz = z - o.z,
      d = Math.hypot(dx, dz),
      r = o.radius + radius;
    if (d < r) {
      if (d < 0.0001) {
        x = o.x + r;
        z = o.z;
      } else {
        x = o.x + (dx / d) * r;
        z = o.z + (dz / d) * r;
      }
    }
  }
  return [Math.max(-150, Math.min(150, x)), Math.max(-150, Math.min(150, z))];
}
