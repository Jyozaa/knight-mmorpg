/** Non-blocking GPU timer queries. Unsupported/disjoint hardware reports null, never CPU time as GPU time. */
export class GpuProfiler {
  private ext: { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null;
  private pending: { query: WebGLQuery; label: string }[] = [];
  private active: WebGLQuery | null = null;
  readonly milliseconds: Record<string, number | null> = {
    scene: null,
    grass: null,
    ascii: null,
  };
  enabled = false;
  constructor(private gl: WebGL2RenderingContext) {
    this.ext = gl.getExtension("EXT_disjoint_timer_query_webgl2");
  }
  begin(label: string) {
    if (!this.enabled || !this.ext || this.active || this.pending.length > 18)
      return;
    const q = this.gl.createQuery();
    if (!q) return;
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, q);
    this.active = q;
    this.pending.push({ query: q, label });
  }
  end() {
    if (this.active && this.ext) {
      this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
      this.active = null;
    }
  }
  poll() {
    if (!this.ext) return;
    const disjoint = this.gl.getParameter(this.ext.GPU_DISJOINT_EXT);
    while (
      this.pending.length &&
      this.gl.getQueryParameter(
        this.pending[0].query,
        this.gl.QUERY_RESULT_AVAILABLE,
      )
    ) {
      const { query, label } = this.pending.shift()!;
      if (!disjoint)
        this.milliseconds[label] =
          this.gl.getQueryParameter(query, this.gl.QUERY_RESULT) / 1e6;
      this.gl.deleteQuery(query);
    }
  }
}
