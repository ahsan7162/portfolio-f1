import type { ReactNode } from 'react';
import { AC, CARBON, DIM, type Fx, INK, label, LINE, MUTE, PANEL, t } from '@/components/scene-kit';
import { EASE } from '@/motion/tokens';
import { LoopingScene } from '../LoopingScene';

// Multi-LLM API server: change one word, same request, another model answers

const MODELS = [
  { id: 'gpt-4o', via: 'via OpenAI' },
  { id: 'llama-3', via: 'via Meta Llama' },
  { id: 'hf/mistral', via: 'via HuggingFace' },
  { id: 'claude', via: 'via Anthropic' },
];

function buildLlm({ tl, q, type, scramble, from }: Fx) {
  const model = q('[data-model]'), via = q('[data-via]'), out = q('[data-out]'), hl = q('[data-hl]');
  tl.fromTo(q('[data-editor]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 0);
  from(model, MODELS[0].id);
  from(via, MODELS[0].via);
  type(out, 0.35, 0.8);
  MODELS.slice(1).forEach((m, i) => {
    const at = 1.6 + i * 1.6, prev = MODELS[i];
    tl.fromTo(hl, { opacity: 0 }, { opacity: 0.18, duration: 0.12, immediateRender: false }, at)
      .to(hl, { opacity: 0, duration: 0.5, ease: EASE.in }, at + 0.4);
    scramble(model, prev.id, m.id, at, 0.45);
    scramble(via, prev.via, m.via, at + 0.1, 0.45);
    type(out, at + 0.5, 0.8);
  });
}

export function LlmScene() {
  const code = (n: number, y: number, body: ReactNode) => (
    <g key={n}>
      <text x="26" y={y} textAnchor="end" {...t(6.5, DIM)}>{n}</text>
      <text x="36" y={y} {...t(7.5)} xmlSpace="preserve" style={{ whiteSpace: 'pre' }}>{body}</text>
    </g>
  );
  return (
    <LoopingScene build={buildLlm}>
      <g data-editor>
        <rect x="14" y="14" width="292" height="116" rx="4" fill={PANEL} stroke={LINE} />
        <text x="26" y="26.2" {...label()}>app.py</text>
        <text x="296" y="26.2" textAnchor="end" {...label(INK)}>4 PROVIDERS, 1 API</text>
        <line x1="14" y1="33" x2="306" y2="33" stroke={LINE} />
        <rect data-hl x="32" y="78.5" width="268" height="12" rx="1.5" fill={AC} opacity="0" />
        {code(1, 48, <><tspan fill={MUTE}>from</tspan> gateway <tspan fill={MUTE}>import</tspan> llm</>)}
        {code(2, 61, '')}
        {code(3, 74, 'reply = llm.chat(')}
        {code(4, 87, <>{'    model="'}<tspan data-model fill={INK} fontWeight="700">claude</tspan>{'",'}</>)}
        {code(5, 100, <>{'    prompt='}<tspan fill={MUTE}>"Summarize Q3 sales"</tspan>,</>)}
        {code(6, 113, ')')}

        <rect x="14" y="138" width="292" height="46" rx="4" fill={CARBON} stroke={LINE} />
        <text x="24" y="152" {...label()}>OUTPUT</text>
        <text data-via x="296" y="152" textAnchor="end" {...label(INK)}>via Anthropic</text>
        <text data-out x="24" y="170" {...t(7.5)}>Sales rose 12%, led by partner bookings.</text>
      </g>
    </LoopingScene>
  );
}
