import { PALETTE } from '@/art/palette';
import { AC, CARBON, clear, Cursor, DIM, FG, type Fx, INK, label, LINE, MUTE, PANEL, t } from '@/components/scene-kit';
import { EASE } from '@/motion/tokens';
import { LoopingScene } from '../LoopingScene';

// SuperAgent, the AI agent platform: build an agent in a form, deploy it, it answers in Slack

/** A selectable chip; `on` chips are picked during the scene and end selected. */
const Chip = ({ x, y, w, text, on }: { x: number; y: number; w: number; text: string; on?: boolean }) => (
  <g data-chip={on || undefined} data-cx={x + w * 0.6} data-cy={y + 7}>
    <rect x={x} y={y} width={w} height="12" rx="6" fill={on ? AC : 'none'} stroke={on ? AC : LINE} />
    <text x={x + w / 2} y={y + 8.2} textAnchor="middle" {...t(5.8, on ? CARBON : FG, 600)}>{text}</text>
  </g>
);

function buildAgents({ tl, q, qa, type, count, click }: Fx) {
  const cur = q('[data-pointer]'), chips = qa('[data-chip]'), lines = qa('[data-reply]');
  // Name, prompt, pick MCP tools, pick where people chat with it, post. Then it answers
  // in Slack and the live count ticks to 450.
  tl.fromTo(q('[data-form]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 0);
  type(q('[data-name]'), 0.3, 0.6);
  qa('[data-prompt]').forEach((l, i) => type(l, 0.95 + i * 0.55, 0.5));
  const pos = (el: Element) => ({ x: +el.getAttribute('data-cx')!, y: +el.getAttribute('data-cy')! });
  chips.forEach((c, i) => {
    const at = 2.5 + i * 0.45;
    if (i) tl.to(cur, { ...pos(c), duration: 0.3, ease: 'power2.inOut' }, at - 0.35);
    else tl.fromTo(cur, { autoAlpha: 0, x: 150, y: 200 }, { autoAlpha: 1, ...pos(c), duration: 0.45, ease: 'power2.inOut' }, at - 0.5);
    click(cur, at);
    tl.fromTo(c.querySelector('rect'), { fill: clear(PALETTE.ac), stroke: LINE }, { fill: PALETTE.ac, stroke: PALETTE.ac, duration: 0.15 }, at + 0.05)
      .fromTo(c.querySelector('text'), { fill: PALETTE.fg }, { fill: PALETTE.carbon, duration: 0.15 }, at + 0.05);
  });
  const post = 2.5 + chips.length * 0.45 + 0.1;
  tl.to(cur, { x: 92, y: 170, duration: 0.35, ease: 'power2.inOut' }, post - 0.4);
  click(cur, post);
  tl.to(q('[data-btn]'), { scale: 0.96, transformOrigin: '50% 50%', duration: 0.08, yoyo: true, repeat: 1, ease: EASE.in }, post + 0.05)
    .fromTo(q('[data-strike]'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.3 }, post + 0.15)
    .fromTo(q('[data-ten]'), { autoAlpha: 0, x: -4 }, { autoAlpha: 1, x: 0, duration: 0.3 }, post + 0.25)
    .to(cur, { autoAlpha: 0, duration: 0.2 }, post + 0.3)
    .fromTo(q('[data-msg1]'), { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0 }, post + 0.5)
    .fromTo(q('[data-msg2]'), { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0 }, post + 1.0);
  lines.forEach((l, i) => type(l, post + 1.25 + i * 0.45, 0.4));
  count(q('[data-live]'), 449, post + 2.65, 0.3);
  tl.fromTo(q('[data-live]'), { scale: 1 }, { scale: 1.12, transformOrigin: '100% 50%', duration: 0.12, yoyo: true, repeat: 1, ease: EASE.out }, post + 2.65);
}

export function AgentsScene() {
  return (
    <LoopingScene build={buildAgents}>
      <g data-form>
        <rect x="14" y="8" width="138" height="184" rx="4" fill={PANEL} stroke={LINE} />
        <text x="26" y="24" {...label()}>NEW AGENT</text>
        <text x="26" y="40" {...t(6, MUTE)}>Name</text>
        <rect x="24" y="44" width="118" height="16" rx="2" fill={CARBON} stroke={LINE} />
        <text data-name x="30" y="55" {...t(7.2)}>Release notes bot</text>
        <text x="26" y="72" {...t(6, MUTE)}>Prompt</text>
        <rect x="24" y="76" width="118" height="26" rx="2" fill={CARBON} stroke={LINE} />
        <text data-prompt x="30" y="87" {...t(6.4)}>Summarize merged PRs</text>
        <text data-prompt x="30" y="96.5" {...t(6.4)}>for the weekly release</text>
        <text x="26" y="110" {...t(6, MUTE)}>MCP tools</text>
        <Chip x={24} y={114} w={32} text="github" on />
        <Chip x={60} y={114} w={46} text="confluence" on />
        <Chip x={110} y={114} w={32} text="+ add" />
        <text x="26" y="140" {...t(6, MUTE)}>Chat from</text>
        <Chip x={24} y={144} w={30} text="Slack" on />
        <Chip x={58} y={144} w={28} text="Jira" />
        <Chip x={90} y={144} w={40} text="Web chat" on />
        <g data-btn>
          <rect x="24" y="163" width="118" height="15" rx="2" fill={AC} />
          <text x="83" y="173" textAnchor="middle" {...t(6.6, CARBON, 700)} letterSpacing="0.8">POST</text>
        </g>
        <text x="26" y="187.5" {...t(6, MUTE)}>2 to 3 days</text>
        <line data-strike x1="25" y1="185.4" x2="66" y2="185.4" stroke={MUTE} strokeWidth="0.8" />
        <text data-ten x="142" y="187.5" textAnchor="end" {...t(6.6, INK, 700)}>10 min</text>
      </g>

      <rect x="162" y="8" width="144" height="184" rx="4" fill={PANEL} stroke={LINE} />
      <text x="174" y="24" {...label()}># RELEASE-TEAM</text>
      <g data-msg1>
        <circle cx="180" cy="47" r="6" fill={DIM} />
        <text x="192" y="46" {...t(7, FG, 700)}>Sara</text>
        <text x="192" y="56" {...t(6.8)}><tspan fill={INK}>@release-bot</tspan> what</text>
        <text x="192" y="65" {...t(6.8)}>shipped this week?</text>
      </g>
      <g data-msg2>
        <rect x="174" y="83" width="12" height="12" rx="3" fill={AC} />
        <text x="180" y="91.5" textAnchor="middle" {...t(7, CARBON, 700)}>R</text>
        <text x="192" y="89" {...t(7, FG, 700)}>Release notes bot</text>
        <rect x="267" y="83.5" width="16" height="7.5" rx="1.5" fill={DIM} />
        <text x="275" y="89" textAnchor="middle" {...t(4.8, MUTE, 700)}>APP</text>
      </g>
      <text data-reply x="192" y="100" {...t(6.8)}>3 features, 12 fixes:</text>
      <text data-reply x="192" y="110" {...t(6.8, MUTE)}>Partner CSV export</text>
      <text data-reply x="192" y="120" {...t(6.8, MUTE)}>Faster booking search</text>
      <line x1="172" y1="158" x2="296" y2="158" stroke={LINE} />
      <text x="174" y="178" {...label()}>AGENTS LIVE</text>
      <text data-live x="296" y="180" textAnchor="end" {...t(14, INK, 700)}>450+</text>
      <Cursor />
    </LoopingScene>
  );
}
