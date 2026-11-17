/** Active-play rAF intervals, kept separately from averaged FPS and submission timing. */
export class FramePacing {
  private samples = new Float32Array(1800);
  private index = 0;
  private count = 0;
  private cpuPeak = 0;
  observe(seconds: number, cpuMilliseconds: number) {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    this.samples[this.index] = seconds * 1000;
    this.index = (this.index + 1) % this.samples.length;
    this.count = Math.min(this.count + 1, this.samples.length);
    this.cpuPeak = Math.max(this.cpuPeak, cpuMilliseconds);
  }
  get diagnostics() {
    const sorted = Array.from(this.samples.subarray(0, this.count)).sort(
      (a, b) => a - b,
    );
    const at = (p: number) =>
      sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)] ?? 0;
    return {
      samples: this.count,
      p50: at(0.5),
      p95: at(0.95),
      p99: at(0.99),
      max: at(1),
      over25: sorted.filter((x) => x > 25).length,
      over33: sorted.filter((x) => x > 33.34).length,
      over50: sorted.filter((x) => x > 50).length,
      peakCpuSubmission: this.cpuPeak,
    };
  }
}
