import type { Vector3 } from "three";
export interface Interaction {
  id: string;
  label: string;
  position: Vector3;
  radius: number;
  action: () => void;
}
export class InteractionSystem {
  readonly interactions: Interaction[] = [];
  active: Interaction | null = null;
  update(position: Vector3) {
    this.active = null;
    let best = Infinity;
    for (const item of this.interactions) {
      const d = Math.hypot(
        position.x - item.position.x,
        position.z - item.position.z,
      );
      if (d < item.radius && d < best) {
        this.active = item;
        best = d;
      }
    }
  }
  interact() {
    this.active?.action();
  }
}
