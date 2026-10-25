import type { ReactNode } from 'react';
import { DIM, FG, type Fx, INK, label, MUTE, t } from '@/components/scene-kit';
import { Scene, type SceneProps, Win } from '../scene';

// React 19 modernization: the version bump, a generated client, the first test

function buildReact({ tl, q, qa, from, type, scramble }: Fx) {
  tl.fromTo(q('[data-pkg]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 0)
    .fromTo(qa('[data-ln]'), { autoAlpha: 0, x: -4 }, { autoAlpha: 1, x: 0, duration: 0.25, stagger: 0.05 }, 0.15);
  // The versions roll over to the new ones (what they were isn't claimed: placeholders roll).
  qa('[data-ver]').forEach((v, i) => {
    const to = v.textContent ?? '';
    from(v, '^--.-.-');
    scramble(v, '^--.-.-', to, 0.6 + i * 0.15, 0.5);
  });
  tl.fromTo(q('[data-spec]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 1.15);
  qa('[data-ep]').forEach((e, i) => type(e, 1.3 + i * 0.2, 0.3));
  // A client generated from the spec replaces the hand-written fetch.
  tl.fromTo(q('[data-gen]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 1.95);
  type(q('[data-call]'), 2.05, 0.55);
  const fn = q('[data-fn]'), call = fn.textContent ?? '';
  from(fn, '');
  scramble(fn, '', call, 2.6, 0.45);
  tl.fromTo(q('[data-tests]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 3.0)
    .fromTo(q('[data-pass]'), { autoAlpha: 0, scale: 0.8, transformOrigin: '0% 50%' }, { autoAlpha: 1, scale: 1, duration: 0.35 }, 3.15);
  type(q('[data-first]'), 3.35, 0.4);
}

export function ReactScene(p: SceneProps) {
  const line = (n: number, body: ReactNode) => (
    <g key={n} data-ln>
      <text x="30" y={44 + n * 12} textAnchor="end" {...t(6, DIM)}>{n + 1}</text>
      <text x="38" y={44 + n * 12} {...t(6.6)} xmlSpace="preserve" style={{ whiteSpace: 'pre' }}>{body}</text>
    </g>
  );
  return (
    <Scene build={buildReact} {...p}>
      <g data-pkg><Win x={14} y={14} w={184} h={124} title="package.json" /></g>
      {line(0, <tspan fill={MUTE}>"dependencies": {'{'}</tspan>)}
      {line(1, <>{'  "react": "'}<tspan data-ver fill={INK} fontWeight="700">^19.0.0</tspan>{'",'}</>)}
      {line(2, <>{'  "react-dom": "'}<tspan data-ver fill={INK} fontWeight="700">^19.0.0</tspan>{'"'}</>)}
      {line(3, <tspan fill={MUTE}>{'},'}</tspan>)}
      {line(4, <tspan fill={MUTE}>"devDependencies": {'{'}</tspan>)}
      {line(5, <>{'  "vite": "'}<tspan data-ver fontWeight="700">^5.4.0</tspan>{'"'}</>)}
      {line(6, <tspan fill={MUTE}>{'}'}</tspan>)}
      <g data-spec>
        <Win x={206} y={14} w={100} h={70} title="openapi.yaml" />
        {['GET /partners', 'POST /payouts', 'GET /bookings'].map((e, i) => <text key={e} data-ep x="216" y={46 + i * 12} {...t(6.2, i ? MUTE : FG)}>{e}</text>)}
      </g>
      <g data-tests>
        <Win x={206} y={92} w={100} h={46} />
        <text x="216" y="106" {...label()}>TESTS</text>
        <text data-pass x="216" y="122" {...t(8, FG, 700)}>1 passed ✓</text>
        <text data-first x="216" y="132" {...label(INK)}>FIRST IN THE REPO</text>
      </g>
      <g data-gen>
        <Win x={14} y={146} w={292} h={40} />
        <text x="24" y="163" {...t(6.8)} xmlSpace="preserve" style={{ whiteSpace: 'pre' }}><tspan data-call>{'const partners = await '}</tspan><tspan data-fn fill={INK} fontWeight="700">api.partners.list()</tspan></text>
        <text x="24" y="177" {...label()}>GENERATED FROM OPENAPI · TYPE-SAFE</text>
      </g>
    </Scene>
  );
}
