export class Input {
  readonly keys = new Set<string>();
  private pressed = new Set<string>();
  mouseX = 0;
  mouseY = 0;
  dragging = false;
  constructor(private canvas: HTMLCanvasElement) {
    addEventListener("keydown", (e) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLButtonElement
      )
        return;
      if (
        ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          e.code,
        )
      )
        e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    addEventListener("keyup", (e) => this.keys.delete(e.code));
    addEventListener("blur", () => this.clear());
    canvas.addEventListener("pointerdown", (e) => {
      if (e.button === 2 || e.button === 0) {
        this.dragging = true;
        canvas.setPointerCapture(e.pointerId);
      }
    });
    addEventListener("pointerup", () => (this.dragging = false));
    addEventListener("mousemove", (e) => {
      if (document.pointerLockElement === canvas || this.dragging) {
        this.mouseX += e.movementX;
        this.mouseY += e.movementY;
      }
    });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener("dblclick", () => this.lock());
  }
  lock() {
    try {
      const p = this.canvas.requestPointerLock();
      if (p) p.catch(() => {});
    } catch {
      /* Drag orbit remains available. */
    }
  }
  consume(code: string) {
    const v = this.pressed.has(code);
    this.pressed.delete(code);
    return v;
  }
  endFrame() {
    this.mouseX = 0;
    this.mouseY = 0;
    this.pressed.clear();
  }
  clear() {
    this.keys.clear();
    this.pressed.clear();
    this.dragging = false;
    this.mouseX = 0;
    this.mouseY = 0;
  }
}
