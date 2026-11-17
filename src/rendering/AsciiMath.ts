/** Shared temporal/tonal constants are used by the shader and CPU regression tests. */
export const BLACK_LEVEL = 0.004;
export const HISTORY_DEADBAND = 0.012;
export const HISTORY_DEPTH_TOLERANCE = 0.035;
export const GLYPH_LEVELS = 24;
export function mapLuminance(luminance: number) {
  return 1 - Math.exp(-Math.max(0, luminance - BLACK_LEVEL) * 2.4);
}
export function historyAccepted(
  depth: number,
  previousDepth: number,
  motionCells: number,
  luminance: number,
  previousLuminance: number,
) {
  return (
    Math.abs(depth - previousDepth) < HISTORY_DEPTH_TOLERANCE &&
    motionCells < 7 &&
    Math.abs(luminance - previousLuminance) < 0.22
  );
}
export function stableLuminance(
  current: number,
  previous: number,
  dt: number,
  valid: boolean,
) {
  if (!valid) return current;
  if (Math.abs(current - previous) < HISTORY_DEADBAND) return previous;
  return previous + (current - previous) * (1 - Math.exp(-22 * dt));
}

export function mapArmorLuminance(value: number) {
  const t = Math.max(0, Math.min(1, (value - 0.006) / (0.028 - 0.006)));
  return (
    Math.sqrt(1 - Math.exp(-Math.max(0, value - 0.006) * 3.8)) *
    t *
    t *
    (3 - 2 * t)
  );
}
