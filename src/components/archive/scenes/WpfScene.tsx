import { PALETTE } from '@/art/palette';
import { AC, CARBON, DIM, type Fx, INK, label, LINE, PANEL } from '@/components/scene-kit';
import { EASE } from '@/motion/tokens';
import { Scene, type SceneProps } from '../scene';

// WinForms to WPF: the cramped fixed form reshapes into the responsive window

const WF_FILL = '#2c2c31', WF_EDGE = '#4a4a52';

const box = (x1: number, y1: number, x2: number, y2: number) => `M${x1} ${y1} H${x2} V${y2} H${x1} Z`;
// The same commands on both sides (see buildWpf).
const WINFORMS = [box(22, 42, 62, 110), box(70, 42, 170, 54), box(70, 60, 118, 74), box(122, 60, 170, 74), box(70, 80, 170, 110)];
const WPF = [box(22, 42, 86, 178), box(94, 42, 298, 62), box(94, 70, 192, 124), box(200, 70, 298, 124), box(94, 132, 298, 178)];
const CONTENT = [[30, 52, 40], [30, 62, 32], [30, 72, 36], [102, 82, 60], [102, 90, 44], [208, 82, 60], [208, 90, 38], [102, 144, 120], [102, 152, 90]];

function buildWpf({ tl, q, qa, from, scramble }: Fx) {
  const panels = qa('[data-panel]'), file = q('[data-file]'), tech = q('[data-tech]');
  from(file, 'Form1.Designer.cs');
  from(tech, 'WINFORMS');
  tl.fromTo(q('[data-frame]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 0);
  // Same commands on both sides, so GSAP tweens the path data number by number.
  panels.forEach((p, i) => tl.fromTo(p, { attr: { d: WINFORMS[i] } }, { attr: { d: WPF[i] }, duration: 0.75, ease: EASE.wipe }, 0.9 + i * 0.06));
  tl.fromTo(panels, { fill: WF_FILL, stroke: WF_EDGE }, { fill: PALETTE.carbon, stroke: 'rgba(255,255,255,0.12)', duration: 0.6 }, 1.0);
  scramble(file, 'Form1.Designer.cs', 'MainWindow.xaml', 0.95, 0.5);
  scramble(tech, 'WINFORMS', 'WPF · MVVM', 1.05, 0.45);
  tl.fromTo(qa('[data-fill]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, stagger: 0.04 }, 1.7)
    .fromTo(q('[data-accent]'), { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.45 }, 2.0);
}

export function WpfScene(p: SceneProps) {
  return (
    <Scene build={buildWpf} {...p}>
      <g data-frame>
        <rect x="14" y="14" width="292" height="172" rx="4" fill={PANEL} stroke={LINE} />
        {[0, 8, 16].map(d => <circle key={d} cx={24 + d} cy="24" r="2" fill={DIM} />)}
        <text data-file x="52" y="26.2" {...label()}>MainWindow.xaml</text>
        <text data-tech x="296" y="26.2" textAnchor="end" {...label(INK)}>WPF · MVVM</text>
        <line x1="14" y1="33" x2="306" y2="33" stroke={LINE} />
      </g>
      {WPF.map(d => <path key={d} data-panel d={d} fill={CARBON} stroke={LINE} />)}
      {CONTENT.map(([x, y, w]) => <rect key={`${x} ${y}`} data-fill x={x} y={y} width={w} height="3" rx="1.5" fill={DIM} />)}
      <rect data-accent x="102" y="102" width="82" height="3" rx="1.5" fill={AC} />
    </Scene>
  );
}
