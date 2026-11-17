export interface Settings {
  master: number;
  ambience: number;
  music: number;
  sfx: number;
  density: number;
  quality: number;
  sensitivity: number;
}
export const defaults: Settings = {
  master: 0.7,
  ambience: 0.7,
  music: 0.3,
  sfx: 0.55,
  density: 1,
  quality: 0.8,
  sensitivity: 1,
};
export function readSettings(): Settings {
  try {
    const saved = JSON.parse(
      localStorage.getItem("last-bell-settings") || "{}",
    );
    const value = { ...defaults };
    for (const key of Object.keys(defaults) as (keyof Settings)[])
      if (typeof saved[key] === "number" && Number.isFinite(saved[key]))
        value[key] = Math.max(
          key === "density" || key === "quality" ? 0.5 : 0,
          Math.min(
            key === "sensitivity" ? 2 : key === "density" ? 1.5 : 1,
            saved[key],
          ),
        );
    return value;
  } catch {
    return { ...defaults };
  }
}
export const damp = (a: number, b: number, rate: number, dt: number) =>
  a + (b - a) * (1 - Math.exp(-rate * dt));
export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export function random(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
