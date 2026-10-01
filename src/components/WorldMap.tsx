import { WORLD, WORLD_DOTS, WORLD_MARKERS } from '@/art/worldDots';

/**
 * The dotted world map from precomputed data (scripts/world-dots.ts): one path
 * for every dot, plus the location markers, the first with a pulse.
 */
export function WorldMap({ markerColor }: { markerColor: string }) {
  return (
    <svg viewBox={`0 0 ${WORLD.width} ${WORLD.height}`} className="block size-full">
      <path d={WORLD_DOTS} fill="none" stroke="currentColor" strokeWidth={WORLD.dot} strokeLinecap="round" />
      {WORLD_MARKERS.map(m => (
        <g key={`${m.x}-${m.y}`}>
          <circle cx={m.x} cy={m.y} r={m.r} fill={markerColor} />
          {m.pulse && [0, 0.7].map(begin => (
            <circle key={begin} cx={m.x} cy={m.y} r={m.r} fill="none" stroke={markerColor} strokeWidth={0.35} pointerEvents="none">
              <animate attributeName="r" values={`${m.r};${m.r * 2.8}`} dur="1.4s" begin={`${begin}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="1;0" dur="1.4s" begin={`${begin}s`} repeatCount="indefinite" />
            </circle>
          ))}
        </g>
      ))}
    </svg>
  );
}
