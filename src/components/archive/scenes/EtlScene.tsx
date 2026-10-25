import { AC, CARBON, Cursor, FG, type Fx, INK, label, LINE, MUTE, t } from '@/components/scene-kit';
import { EASE } from '@/motion/tokens';
import { Scene, type SceneProps, Win } from '../scene';

// ETL workflow marketplace: wire a workflow, run a row through it, publish it

const NODES = [
  { x: 24, kind: 'SOURCE', name: 'SQL Server' },
  { x: 128, kind: 'TRANSFORM', name: 'Clean · Join' },
  { x: 232, kind: 'DESTINATION', name: 'Data lake' },
];
const WIRES = ['M88 67 C104 67 112 67 128 67', 'M192 67 C208 67 216 67 232 67'];
const MARKET = [{ x: 24, name: 'invoice_etl' }, { x: 120, name: 'crm_cleanup' }];

function buildEtl({ tl, q, qa, click }: Fx) {
  const cur = q('[data-pointer]'), wires = qa('[data-wire]'), packet = q('[data-packet]');
  const along = (wire: Element): gsap.TweenVars => ({ motionPath: { path: wire as SVGPathElement, align: wire as SVGPathElement, alignOrigin: [0.5, 0.5] }, duration: 0.5, ease: 'power2.inOut' });
  tl.fromTo(q('[data-canvas]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 0)
    .fromTo(qa('[data-node]'), { autoAlpha: 0, scale: 0.94, transformOrigin: '50% 50%' }, { autoAlpha: 1, scale: 1, duration: 0.35, stagger: 0.12 }, 0.2)
    // The wires draw from output to input, then a row travels along them.
    .fromTo(wires, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.45, ease: 'power2.inOut', stagger: 0.26 }, 0.65)
    .fromTo(qa('[data-head]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15, stagger: 0.26 }, 1.05)
    .fromTo(packet, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1 }, 1.35)
    .to(packet, along(wires[0]), 1.35)
    .to(packet, along(wires[1]), 1.95)
    .to(packet, { autoAlpha: 0, duration: 0.15, ease: EASE.in }, 2.45)
    .fromTo(q('[data-ok]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 2.45)
    .fromTo(cur, { autoAlpha: 0, x: 300, y: 200 }, { autoAlpha: 1, x: 262, y: 108, duration: 0.45, ease: 'power2.inOut' }, 2.45);
  click(cur, 2.95);
  tl.to(q('[data-pub]'), { scale: 0.96, transformOrigin: '50% 50%', duration: 0.08, yoyo: true, repeat: 1, ease: EASE.in }, 2.97)
    // Published: the workflow drops into the marketplace, signed in with OAuth.
    .fromTo(q('[data-new]'), { autoAlpha: 0, y: -46 }, { autoAlpha: 1, y: 0, duration: 0.55 }, 3.1)
    .fromTo(q('[data-lock]'), { autoAlpha: 0, scale: 0.6, transformOrigin: '50% 50%' }, { autoAlpha: 1, scale: 1, duration: 0.3 }, 3.55)
    .to(cur, { autoAlpha: 0, duration: 0.2, ease: EASE.in }, 3.3);
}

export function EtlScene(p: SceneProps) {
  return (
    <Scene build={buildEtl} {...p}>
      <g data-canvas>
        <Win x={14} y={14} w={292} h={112} title="workflow · partner_sync" right={<text x="296" y="26.2" textAnchor="end" {...label()}>DESIGNER</text>} />
        {NODES.map(n => (
          <g key={n.kind} data-node>
            <rect x={n.x} y="52" width="64" height="30" rx="3" fill={CARBON} stroke={LINE} />
            <text x={n.x + 7} y="63" {...label()}>{n.kind}</text>
            <text x={n.x + 7} y="75" {...t(6.8)}>{n.name}</text>
          </g>
        ))}
        {WIRES.map(d => <path key={d} data-wire d={d} stroke={FG} strokeWidth="1" strokeOpacity="0.6" />)}
        {[128, 232].map(x => <path key={x} data-head d={`M${x - 4} 64 L${x} 67 L${x - 4} 70 Z`} fill={FG} fillOpacity="0.6" />)}
        <circle data-packet r="2.4" fill={AC} opacity="0" />
        <text data-ok x="24" y="114" {...label()}>VALIDATED ✓</text>
        <g data-pub>
          <rect x="232" y="100" width="64" height="15" rx="2" fill={AC} />
          <text x="264" y="110" textAnchor="middle" {...t(6.4, CARBON, 700)} letterSpacing="0.8">PUBLISH</text>
        </g>
      </g>
      <Win x={14} y={134} w={292} h={52} />
      <text x="24" y="148" {...label()}>MARKETPLACE</text>
      {MARKET.map(m => (
        <g key={m.name}>
          <rect x={m.x} y="155" width="88" height="22" rx="2" fill={CARBON} stroke={LINE} />
          <text x={m.x + 7} y="169" {...t(6.4, MUTE)}>{m.name}</text>
        </g>
      ))}
      <g data-new>
        <rect x="216" y="155" width="80" height="22" rx="2" fill={CARBON} stroke={AC} />
        <text x="223" y="169" {...t(6.4, FG, 700)}>partner_sync</text>
        <g data-lock>
          <rect x="280" y="164" width="8" height="6" rx="1" fill={AC} />
          <path d="M281.6 164 V162 a2.4 2.4 0 0 1 4.8 0 V164" stroke={AC} strokeWidth="1" />
        </g>
      </g>
      <text x="296" y="148" textAnchor="end" {...label(INK)}>OAUTH · JWT</text>
      <Cursor />
    </Scene>
  );
}
