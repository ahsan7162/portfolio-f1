import { AC, CARBON, DIM, FG, type Fx, INK, label, LINE, MUTE, t } from '@/components/scene-kit';
import { EASE } from '@/motion/tokens';
import { Scene, type SceneProps, Win } from '../scene';

// Xtel performance work: the document opens, the field check answers

function buildXtel({ tl, q, from, scramble }: Fx) {
  tl.fromTo(q('[data-doc]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 0)
    // Before: 250 s, struck through as the load runs again.
    .fromTo(q('[data-old1]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 0.3)
    .fromTo(q('[data-cut1]'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.3, ease: EASE.in }, 0.65)
    .fromTo(q('[data-bar]'), { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.8, ease: 'power2.inOut' }, 0.55)
    // After: 30 s, the document open.
    .fromTo(q('[data-new1]'), { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.35 }, 1.3)
    .fromTo(q('[data-opened]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 1.4);
  from(q('[data-x8]'), '');
  scramble(q('[data-x8]'), '', '8× FASTER', 1.45, 0.4);
  // The field check: 30 s struck through, then the tick and 100 ms.
  tl.fromTo(q('[data-check]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 1.9)
    .fromTo(q('[data-old2]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 2.15)
    .fromTo(q('[data-cut2]'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.3, ease: EASE.in }, 2.45)
    .fromTo(q('[data-tick]'), { autoAlpha: 0, scale: 0.4, transformOrigin: '50% 50%' }, { autoAlpha: 1, scale: 1, duration: 0.3 }, 2.6)
    .fromTo(q('[data-new2]'), { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.35 }, 2.65);
}

export function XtelScene(p: SceneProps) {
  return (
    <Scene build={buildXtel} {...p}>
      <g data-doc>
        <Win x={14} y={14} w={292} h={100} title="contract_2025.docx" right={<text x="296" y="26.2" textAnchor="end" {...label()}>AZURE SQL · .NET CORE</text>} />
        <text x="24" y="48" {...label()}>DOCUMENT LOAD</text>
        <text data-old1 x="24" y="70" {...t(10, MUTE)}>250 s</text>
        <line data-cut1 x1="23" y1="66.5" x2="54" y2="66.5" stroke={MUTE} strokeWidth="0.9" />
        <text data-new1 x="66" y="71" {...t(15, INK, 700)}>30 s</text>
        <rect x="24" y="82" width="272" height="4" rx="2" fill={DIM} />
        <rect data-bar x="24" y="82" width="272" height="4" rx="2" fill={AC} />
        <text data-opened x="24" y="103" {...label()}>OPENED</text>
        <text data-x8 x="296" y="103" textAnchor="end" {...label(INK)}>8× FASTER</text>
      </g>
      <g data-check>
        <Win x={14} y={122} w={292} h={64} />
        <text x="24" y="138" {...label()}>FIELD CHECK</text>
        <rect x="24" y="148" width="150" height="16" rx="2" fill={CARBON} stroke={LINE} />
        <text x="30" y="158.6" {...t(6.8)}>Delivery date</text>
        <text data-tick x="168" y="158.6" textAnchor="end" {...t(6.8, FG, 700)}>✓</text>
        <text data-old2 x="206" y="162" {...t(9, MUTE)}>30 s</text>
        <line data-cut2 x1="205" y1="158.8" x2="229" y2="158.8" stroke={MUTE} strokeWidth="0.9" />
        <text data-new2 x="296" y="163" textAnchor="end" {...t(13, INK, 700)}>100 ms</text>
      </g>
    </Scene>
  );
}
