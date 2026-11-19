// The plugin's Maps, media and sandbox group. App and Shader are the real thing, not drawings: the App's page runs
// in a sandboxed frame with no network, and the Shader's GLSL runs on the visitor's GPU. Map is drawn without
// tiles, since this page fetches nothing from map or photo services; ImageSearch shows where its photo would go.
import { useEffect, useMemo, useRef, useState } from 'react';
import { reducedMotion } from '../../motion';
import { Btn, els, num, str, useOui, type Draw } from './kit';
import type { El } from './lang';

// ---------------------------------------------------------------- Map

/** Each place takes the day of the last one that named a day, as the plugin groups the route. */
function dayOfEach(places: { day?: string }[]) {
  const out: (string | undefined)[] = [];
  for (const p of places) out.push(p.day ?? out[out.length - 1]);
  return out;
}

function Map({ e }: { e: El }) {
  const places = els(e.props.places).map((p, i) => ({ i, name: str(p.props.name), lat: num(p.props.lat), lng: num(p.props.lng), note: str(p.props.note), day: p.props.day == null ? undefined : str(p.props.day) }));
  const located = places.filter((p) => p.lat !== undefined && p.lng !== undefined);
  const [at, setAt] = useState(0);
  if (!located.length) return null;
  const lats = located.map((p) => p.lat!);
  const lngs = located.map((p) => p.lng!);
  const k = Math.cos(((Math.min(...lats) + Math.max(...lats)) / 2) * (Math.PI / 180));
  const [w, h] = [Math.max(1e-4, (Math.max(...lngs) - Math.min(...lngs)) * k), Math.max(1e-4, Math.max(...lats) - Math.min(...lats))];
  const s = Math.min(340 / w, 150 / h);
  const xy = (p: (typeof located)[number]) => [30 + ((p.lng! - Math.min(...lngs)) * k * s) + (340 - w * s) / 2, 25 + (Math.max(...lats) - p.lat!) * s + (150 - h * s) / 2] as const;
  const days = dayOfEach(located);
  const order = [...new Set(days)];
  const tour = e.props.tour === true;
  const cur = located[at];
  return (
    <figure className="oui-map" role="img" aria-label={`Map of ${located.length} places`}>
      <svg viewBox="0 0 400 200">
        <defs><pattern id="oui-map-dots" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.8" /></pattern></defs>
        <rect width="400" height="200" className="oui-map-ground" />
        {e.props.route === true && order.map((d, n) => (
          <path key={d ?? n} className="oui-map-route oui-draw" pathLength={1} data-r={n} d={located.filter((_, i) => days[i] === d).map((p, i) => `${i ? 'L' : 'M'}${xy(p).join(' ')}`).join('')} />
        ))}
        {located.map((p, i) => {
          const [x, y] = xy(p);
          return <g key={p.name} className="oui-map-pin" data-on={i === at || undefined} data-r={order.indexOf(days[i])}><circle cx={x} cy={y} r="8" /><text x={x} y={y + 3}>{i + 1}</text></g>;
        })}
      </svg>
      <figcaption>
        {tour && <p className="oui-actions"><Btn label="Previous stop" disabled={at === 0} onClick={() => setAt(at - 1)}>‹</Btn><span className="oui-label">Stop {at + 1} of {located.length}</span><Btn label="Next stop" disabled={at === located.length - 1} onClick={() => setAt(at + 1)}>›</Btn></p>}
        <ol className="oui-map-list">{located.map((p, i) => (
          <li key={p.name} data-on={i === at || undefined}><button type="button" onClick={() => setAt(i)}><b>{i + 1}</b>{p.name}{days[i] !== undefined && <span className="oui-label">Day {days[i]}</span>}</button></li>
        ))}</ol>
        {cur?.note && <p className="oui-label">{cur.name}: {cur.note}</p>}
      </figcaption>
    </figure>
  );
}

const ImageSearch: Draw = ({ e }) => (
  <figure className="oui-imgsearch"><div className="oui-noimg"><span>A freely licensed photo of “{str(e.props.query)}”, from Wikimedia Commons in bb</span></div></figure>
);

// ---------------------------------------------------------------- App

/** bb's dark theme as the App's page sees it, through the same variable names the plugin passes in. */
const APP_VARS = '--foreground:#f3f2ee;--muted-foreground:#9d9c97;--border:#2e2e2c;--primary:var(--brand,#5fe08a);--card:#111110;--font-sans:system-ui,sans-serif';
const MAX_HEIGHT = 480;

/** The page the frame runs: theme, then a bridge for bbui.send and the page's height, then the program's HTML. */
export function appDocument(html: string, brand: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>:root{${APP_VARS.replace('var(--brand,#5fe08a)', brand)};color-scheme:dark}body{margin:0;padding:12px;font:13px/1.5 var(--font-sans);color:var(--foreground);background:transparent}input{font:inherit;color:inherit;background:#0b0b0a;border:1px solid var(--border);border-radius:6px;padding:4px 6px}</style>
<script>window.bbui={send:function(t){parent.postMessage({bbui:1,type:"send",text:String(t)},"*")}};addEventListener("load",function(){var s=function(){parent.postMessage({bbui:1,type:"height",height:document.documentElement.scrollHeight},"*")};new ResizeObserver(s).observe(document.body);s()});</script></head><body>${html}</body></html>`;
}

function App({ e }: { e: El }) {
  const { ask } = useOui();
  const frame = useRef<HTMLIFrameElement>(null);
  const holder = useRef<HTMLElement>(null);
  const [height, setHeight] = useState(190);
  const [brand, setBrand] = useState('#5fe08a');
  useEffect(() => {
    const acc = holder.current && getComputedStyle(holder.current).getPropertyValue('--oui-acc').trim();
    if (acc) setBrand(acc);
  }, []);
  const srcDoc = useMemo(() => appDocument(str(e.props.html), brand), [e.props.html, brand]);
  useEffect(() => {
    const on = (ev: MessageEvent) => {
      if (!frame.current || ev.source !== frame.current.contentWindow) return;
      const d = ev.data as { bbui?: number; type?: string; height?: unknown; text?: unknown } | null;
      if (d?.bbui !== 1) return;
      if (d.type === 'height' && typeof d.height === 'number') setHeight(Math.min(MAX_HEIGHT, Math.max(40, Math.ceil(d.height))));
      // As in the plugin: the page may speak for the visitor only right after a click inside it.
      if (d.type === 'send' && typeof d.text === 'string' && d.text.trim() && document.activeElement === frame.current) ask(d.text.trim().slice(0, 500));
    };
    window.addEventListener('message', on);
    return () => window.removeEventListener('message', on);
  }, [ask]);
  return (
    <figure className="oui-app" ref={holder}>
      <figcaption className="oui-label">{str(e.props.title, 'Page')}<span>sandboxed, no network</span></figcaption>
      <iframe ref={frame} title={str(e.props.title, 'Page')} sandbox="allow-scripts" srcDoc={srcDoc} style={{ height }} />
    </figure>
  );
}

// ---------------------------------------------------------------- Shader

const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const frag = (code: string) => `precision mediump float;uniform float iTime;uniform vec3 iResolution;uniform vec4 iMouse;\n${code}\nvoid main(){mainImage(gl_FragColor,gl_FragCoord.xy);}`;

/** Runs a Shadertoy-style mainImage. One still frame on a phone, with reduced motion, or off screen. */
function Shader({ e }: { e: El }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const code = str(e.props.code);
  const note = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const c = canvas.current;
    const gl = c?.getContext('webgl', { antialias: false, premultipliedAlpha: false });
    const say = (text: string) => { if (note.current) note.current.textContent = text; };
    if (!c || !gl) { say('WebGL is not available here.'); return; }
    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'compile error');
      return s;
    };
    let prog: WebGLProgram;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, frag(code)));
      gl.linkProgram(prog);
      // oxlint-disable-next-line react/rules-of-hooks -- WebGL's useProgram, not a React hook
      gl.useProgram(prog);
    } catch (err) { say(err instanceof Error ? err.message : 'The shader did not compile.'); return; }
    say('');
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const [uT, uR, uM] = ['iTime', 'iResolution', 'iMouse'].map((n) => gl.getUniformLocation(prog, n));
    const mouse = [0, 0, 0, 0];
    const draw = (t: number) => {
      const k = Math.min(1.5, window.devicePixelRatio || 1);
      const [w, h] = [Math.round(c.clientWidth * k), Math.round(c.clientHeight * k)];
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      gl.viewport(0, 0, w, h);
      gl.uniform1f(uT, t);
      gl.uniform3f(uR, w, h, 1);
      gl.uniform4f(uM, mouse[0] * k, (c.clientHeight - mouse[1]) * k, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const still = reducedMotion() || window.matchMedia('(pointer: coarse), (max-width: 600px)').matches;
    draw(2);
    if (still) return;
    let raf = 0;
    let seen = false;
    const t0 = performance.now();
    const loop = () => { draw(2 + (performance.now() - t0) / 1000); raf = requestAnimationFrame(loop); };
    const io = new IntersectionObserver(([en]) => {
      seen = en.isIntersecting;
      cancelAnimationFrame(raf);
      if (seen) raf = requestAnimationFrame(loop);
    });
    io.observe(c);
    const move = (ev: PointerEvent) => { const r = c.getBoundingClientRect(); mouse[0] = ev.clientX - r.left; mouse[1] = ev.clientY - r.top; };
    c.addEventListener('pointermove', move);
    return () => { io.disconnect(); cancelAnimationFrame(raf); c.removeEventListener('pointermove', move); gl.getExtension('WEBGL_lose_context')?.loseContext(); };
  }, [code]);
  return (
    <figure className="oui-shader">
      <figcaption className="oui-label">{str(e.props.title, 'Shader')}</figcaption>
      <canvas ref={canvas} aria-label={str(e.props.title, 'Shader')} role="img" />
      <p className="oui-label" ref={note} aria-live="polite" />
    </figure>
  );
}

export const WEB: Record<string, Draw> = { Map, ImageSearch, App, Shader };
