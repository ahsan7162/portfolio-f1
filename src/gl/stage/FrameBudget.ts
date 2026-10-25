const MIN_SCALE = 0.55;
/** A frame this long (ms) is far over budget: the page can't keep up with the scenes at all. */
const OVER_BUDGET = 50;

/**
 * The canvases' render scale, from how long frames take. The page itself keeps scrolling
 * at full rate; only the canvas resolution changes.
 */
export class FrameBudget {
  scale = 1;
  private vsync = 1000 / 60;
  private slow = 0;
  private fast = 0;
  private cooldown = 0;
  private over = 0;

  /** `rescale` applies a new `scale`; `giveUp` turns the WebGL off. */
  constructor(private readonly rescale: () => void, private readonly giveUp: () => void) {}

  /**
   * Watch frame intervals while rendering continuously. Sustained misses (mostly GPU fill
   * on large or weak screens) lower the render scale; a long run of on-time frames raises
   * it again.
   */
  adapt(delta: number) {
    if (delta <= 0 || delta > 100) return; // first frame after idle, or a tab switch
    this.vsync = Math.min(this.vsync * 1.002, Math.max(delta, 1000 / 240)); // tracks the display refresh
    if (this.cooldown > 0) { this.cooldown--; return; }
    // Slow means a real drop (under ~45fps), not 60fps on a 120Hz phone, where the
    // browser often halves the frame rate while scrolling.
    if (delta > Math.max(this.vsync * 1.5, 1000 / 45)) { this.slow++; this.fast = 0; } else { this.fast++; this.slow = Math.max(0, this.slow - 0.25); }
    if (this.slow >= 8 && this.scale > MIN_SCALE) this.step(Math.max(MIN_SCALE, this.scale - 0.15));
    else if (this.fast >= 600 && this.scale < 1) this.step(Math.min(1, this.scale + 0.1));
  }

  private step(scale: number) {
    this.scale = scale;
    this.rescale();
    this.slow = this.fast = 0;
    this.cooldown = 30;
  }

  /**
   * The backup to the software-renderer check in prefs.ts: frames far over budget, moving
   * or idle, first take the render scale straight to its floor; if they stay that slow
   * there, WebGL is as good as drawn on the CPU, and it is turned off like a lost context.
   * Single long frames (a shader compile, a texture upload) are paid back by the quick ones
   * around them. Returns true once it has given up.
   */
  overBudget(delta: number) {
    if (delta > 1000) return false; // a stall or a tab switch, not a frame
    if (delta <= OVER_BUDGET) { this.over = Math.max(0, this.over - 1); return false; }
    if (++this.over < 8) return false;
    this.over = 0;
    if (this.scale > MIN_SCALE) {
      this.scale = MIN_SCALE;
      this.rescale();
      return false;
    }
    this.giveUp();
    return true;
  }
}
