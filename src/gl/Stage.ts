import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { gsap, ScrollTrigger } from '@/motion/gsap';
import { onIntroDone } from '@/motion/intro';
import { isMobile, isTouch } from '@/motion/prefs';
import { scrollState } from '@/motion/SmoothScroll';
import { EASE } from '@/motion/tokens';
import { createField } from './field';
import { bindHelmetPath, type Pose } from './helmetPath';
import { buildHelmet, type Helmet } from './helmet/buildHelmet';
import { createLap } from './lap';
import { lapState } from './state';

const FOV = 30, CAM_Z = 8;

/**
 * The single WebGL renderer for the page. Draw order per frame:
 *   1. contour background  2. helmet  (or the lap scene while it is pinned)
 * It renders only when something changes: scrolling, a tween, the pointer, or
 * a steady 30fps idle drift. It stops entirely
 * when the tab is hidden or a dialog has locked scrolling.
 */
export class Stage {
  private renderer: THREE.WebGLRenderer;
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 50);
  private scene = new THREE.Scene();
  private field = createField();
  private lap = createLap();
  private helmet: Helmet | null = null;
  private pose: Pose = { x: 0.5, y: 0, s: 1, rx: 0, ry: -0.65, rz: 0 };
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  private cleanups: Array<() => void> = [];
  private busy = 0;
  private lastRender = 0;
  /** Animation clock that only advances while frames render, so drift resumes without a jump. */
  private clock = 0;
  private lastInput = 0;
  private dead = false;
  /** Eased copy of the lap progress, so the camera glides instead of stepping. */
  private lapP = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.autoClear = false;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = env;
    pmrem.dispose();
    this.cleanups.push(() => env.dispose());

    // Accent rim light from behind, soft key from the top front.
    const rim = new THREE.DirectionalLight('#ff2438', 3.2);
    rim.position.set(-4, 2, -5);
    const key = new THREE.DirectionalLight('#ffffff', 1.4);
    key.position.set(3, 4, 6);
    this.scene.add(rim, key, new THREE.AmbientLight('#ffffff', 0.15));
    this.camera.position.set(0, 0, CAM_Z);

    this.resize();
    const onResize = () => { this.resize(); this.kick(); };
    window.addEventListener('resize', onResize);
    this.cleanups.push(() => window.removeEventListener('resize', onResize));

    if (!isTouch()) {
      const onMove = (e: PointerEvent) => {
        this.pointer.tx = (e.clientX / innerWidth) * 2 - 1;
        this.pointer.ty = (e.clientY / innerHeight) * 2 - 1;
        this.lastInput = performance.now();
      };
      window.addEventListener('pointermove', onMove, { passive: true });
      this.cleanups.push(() => window.removeEventListener('pointermove', onMove));
    }

    const onLost = (e: Event) => { e.preventDefault(); this.dead = true; };
    canvas.addEventListener('webglcontextlost', onLost);
    this.cleanups.push(() => canvas.removeEventListener('webglcontextlost', onLost));

    this.bindSectionColours();
    const tick = () => this.frame();
    gsap.ticker.add(tick);
    this.cleanups.push(() => gsap.ticker.remove(tick));

    this.lastInput = performance.now();
    void this.loadHelmet();
    if (import.meta.env.DEV) (window as unknown as { __stage: Stage }).__stage = this;
  }

  /** Ask for renders for a short while (after resizes, tweens starting, etc.). */
  private kick(ms = 600) { this.lastInput = Math.max(this.lastInput, performance.now() + ms - 1500); }

  private resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.field.uniforms.uRes.value.set(w, h);
  }

  private async loadHelmet() {
    const helmet = await buildHelmet({ lowDetail: isMobile(), anisotropy: Math.min(8, this.renderer.capabilities.getMaxAnisotropy()) });
    if (this.dead) { helmet.dispose(); return; }
    this.helmet = helmet;
    this.scene.add(helmet.group);
    this.cleanups.push(bindHelmetPath(this.pose), () => helmet.dispose());
    // Compile shaders before the reveal so the first frames don't stutter.
    this.renderer.compile(this.scene, this.camera);
    onIntroDone(() => this.playReveal());
  }

  /** Wireframe draws itself, the painted shell dissolves in, the wireframe fades. */
  private playReveal() {
    const h = this.helmet!;
    this.busy++;
    gsap.timeline({ onComplete: () => { this.busy--; } })
      .fromTo(h.wire, { draw: 0 }, { draw: 1, duration: 1.3, ease: EASE.inOut })
      .fromTo(h.reveal, { value: 0 }, { value: 1.05, duration: 1.6, ease: 'power2.inOut' }, 0.7)
      .to(h.wire, { opacity: 0, duration: 0.8, ease: 'power2.out' }, 1.8);
  }

  private bindSectionColours() {
    const u = this.field.uniforms;
    const light = new THREE.Color('#f4f4ed'), dark = new THREE.Color('#141416');
    const to = (a: string, b: string) => {
      const A = new THREE.Color(a), B = new THREE.Color(b);
      const isLight = A.r + A.g + A.b > 1.5;
      this.busy++;
      const L = isLight ? dark : light;
      gsap.timeline({ onComplete: () => { this.busy--; } })
        .to(u.uColA.value, { r: A.r, g: A.g, b: A.b, duration: 0.9, ease: EASE.inOut }, 0)
        .to(u.uColB.value, { r: B.r, g: B.g, b: B.b, duration: 0.9, ease: EASE.inOut }, 0)
        .to(u.uLine.value, { r: L.r, g: L.g, b: L.b, duration: 0.9, ease: EASE.inOut }, 0)
        .to(u.uLineAlpha, { value: isLight ? 0.13 : 0.09, duration: 0.9 }, 0);
    };
    document.querySelectorAll<HTMLElement>('[data-bg]').forEach(sec => {
      const [a, b] = sec.dataset.bg!.split(',');
      const st = ScrollTrigger.create({
        trigger: sec, start: 'top 55%', end: 'bottom 55%', refreshPriority: -1,
        onEnter: () => to(a, b), onEnterBack: () => to(a, b),
      });
      this.cleanups.push(() => st.kill());
    });
  }

  private frame() {
    if (this.dead || document.hidden || scrollState.locked) return;
    const now = performance.now();
    const lapEasing = lapState.active && lapState.progress !== this.lapP;
    const moving = Math.abs(scrollState.velocity) > 0.01 || this.busy > 0 || lapEasing || now - this.lastInput < 1500;
    // Idle: the contour lines (and the helmet, when on screen) keep a steady 30fps drift.
    // The lap scene has no drift, so it draws nothing while idle.
    if (!moving && (lapState.active || now - this.lastRender < 33)) return;
    this.clock += Math.min(now - this.lastRender, 50) / 1000;
    this.lastRender = now;

    const r = this.renderer, t = this.clock;
    const u = this.field.uniforms;
    u.uTime.value = t;
    u.uScroll.value = scrollState.progress;
    u.uVel.value += (scrollState.velocity - u.uVel.value) * 0.15;

    r.clear();
    if (lapState.active) {
      const { scene, camera, update } = this.lap;
      this.lapP = lapState.progress; // tweened on a fixed clock by the Lap section
      update(this.lapP, innerWidth, innerHeight);
      r.render(scene, camera);
      return;
    }
    r.render(this.field.scene, this.camera);
    if (this.helmet) {
      this.applyPose(t);
      r.clearDepth();
      r.render(this.scene, this.camera);
    }
  }

  private applyPose(t: number) {
    const h = this.helmet!, p = this.pose, g = h.group;
    const halfH = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * CAM_Z;
    const halfW = halfH * this.camera.aspect;
    // Gentle pointer follow (desktop), eased every frame.
    this.pointer.x += (this.pointer.tx - this.pointer.x) * 0.06;
    this.pointer.y += (this.pointer.ty - this.pointer.y) * 0.06;
    g.position.set(p.x * halfW, p.y * halfH + Math.sin(t * 0.9) * 0.03, 0);
    g.rotation.set(p.rx + this.pointer.y * 0.14, p.ry + this.pointer.x * 0.2 + Math.sin(t * 0.6) * 0.03, p.rz);
    g.scale.setScalar(p.s * Math.min(1.25, halfH / 2.14));
    g.visible = p.y > -1.6;
    h.update();
  }

  dispose() {
    this.dead = true;
    this.cleanups.splice(0).reverse().forEach(f => f());
    this.field.dispose();
    this.lap.dispose();
    this.renderer.dispose();
  }
}
