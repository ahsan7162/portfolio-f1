import { AC, CARBON, Cursor, DIM, FG, type Fx, INK, label, LINE, MUTE, PANEL, t } from '@/components/scene-kit';
import { EASE } from '@/motion/tokens';
import { Scene, type SceneProps, Win } from '../scene';

// Enterprise catalog system: share one asset by role

const ROLES = [['Analyst', [1, 0, 0]], ['Manager', [1, 1, 0]], ['Admin', [1, 1, 1]]] as const;

function buildCatalog({ tl, q, qa, type, count, click }: Fx) {
  const cur = q('[data-pointer]');
  tl.fromTo(q('[data-cat]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 0)
    .fromTo(qa('[data-asset]'), { autoAlpha: 0, x: -4 }, { autoAlpha: 1, x: 0, duration: 0.25, stagger: 0.06 }, 0.15)
    // Pick the asset to share.
    .fromTo(cur, { autoAlpha: 0, x: 120, y: 200 }, { autoAlpha: 1, x: 70, y: 44, duration: 0.45, ease: 'power2.inOut' }, 0.5);
  click(cur, 0.97);
  tl.fromTo(q('[data-pick]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 1.0)
    .fromTo(q('[data-pickbar]'), { scaleY: 0, transformOrigin: '50% 50%' }, { scaleY: 1, duration: 0.3 }, 1.0)
    .to(cur, { autoAlpha: 0, duration: 0.2, ease: EASE.in }, 1.25)
    // Share it by role: each role gets exactly the rights it needs.
    .fromTo(q('[data-share]'), { autoAlpha: 0, x: 10 }, { autoAlpha: 1, x: 0 }, 1.2)
    .fromTo(qa('[data-role]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, stagger: 0.08 }, 1.4)
    .fromTo(qa('[data-tick]'), { autoAlpha: 0, scale: 0.4, transformOrigin: '50% 50%' }, { autoAlpha: 1, scale: 1, duration: 0.25, stagger: 0.1 }, 1.75)
    .fromTo(qa('[data-av]'), { autoAlpha: 0, scale: 0.5, transformOrigin: '50% 50%' }, { autoAlpha: 1, scale: 1, duration: 0.3, stagger: 0.08 }, 2.45);
  type(q('[data-team]'), 2.65, 0.4);
  tl.fromTo(q('[data-sharing]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 2.9);
  count(q('[data-rate]'), 0, 2.95, 0.8);
}

export function CatalogScene(p: SceneProps) {
  return (
    <Scene build={buildCatalog} {...p}>
      <g data-cat><Win x={14} y={14} w={128} h={172} title="CATALOG" /></g>
      <g data-pick>
        <rect x="20" y={34} width="116" height="18" rx="2" fill={DIM} />
        <rect data-pickbar x="20" y={34} width="2" height="18" fill={AC} />
      </g>
      {['sales_2023', 'partners', 'invoices', 'regions'].map((n, i) => (
        <g key={n} data-asset>
          <rect x="28" y={39 + i * 22} width="8" height="8" rx="1.5" fill="none" stroke={i ? LINE : FG} />
          <text x="42" y={45.6 + i * 22} {...t(6.6, i ? MUTE : FG, i ? undefined : 700)}>{n}</text>
        </g>
      ))}
      <g data-share>
        <Win x={150} y={14} w={156} h={172} title="SHARE · sales_2023" />
        <text x="160" y="46" {...label()}>ROLE</text>
        {['VIEW', 'EDIT', 'SHARE'].map((h, j) => <text key={h} x={226 + j * 30} y="46" textAnchor="middle" {...label()}>{h}</text>)}
        {ROLES.map(([r, on], i) => (
          <g key={r} data-role>
            <line x1="160" y1={53 + i * 20} x2="296" y2={53 + i * 20} stroke={LINE} />
            <text x="160" y={66 + i * 20} {...t(6.6)}>{r}</text>
            {on.map((v, j) => (
              <g key={['view', 'edit', 'share'][j]}>
                <rect x={222 + j * 30} y={58.5 + i * 20} width="8" height="8" rx="1.5" fill="none" stroke={LINE} />
                {v ? (
                  <g data-tick>
                    <rect x={222 + j * 30} y={58.5 + i * 20} width="8" height="8" rx="1.5" fill={FG} stroke={FG} />
                    <path d={`M${224 + j * 30} ${62.5 + i * 20} l1.8 1.8 l3.2 -3.6`} stroke={CARBON} strokeWidth="1.2" />
                  </g>
                ) : null}
              </g>
            ))}
          </g>
        ))}
        {[0, 1, 2].map(i => <circle key={i} data-av cx={166 + i * 11} cy="130" r="6" fill={DIM} stroke={PANEL} strokeWidth="1.5" />)}
        <text data-team x="198" y="132.5" {...t(6.4, MUTE)}>Finance team</text>
        <line x1="150" y1="152" x2="306" y2="152" stroke={LINE} />
        <text data-sharing x="160" y="170" {...label()}>SHARING</text>
        <text data-rate x="296" y="172" textAnchor="end" {...t(11, INK, 700)}>80% faster</text>
      </g>
      <Cursor />
    </Scene>
  );
}
