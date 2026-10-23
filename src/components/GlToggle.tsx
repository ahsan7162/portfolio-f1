import { choose3d, use3d } from '@/gl/gl3d';
import { cn } from '@/lib/utils';

const MODES = [{ on: false, label: '2D' }, { on: true, label: '3D' }] as const;

/**
 * Phones only: the page's 3D is off there by default (their GPUs can't keep up, and
 * three.js isn't loaded), and this turns it on for whoever wants it. The pick is kept for
 * later visits (gl3d.ts). Not in the prerendered HTML: a phone adds it as it hydrates.
 */
export function GlToggle({ className, inert }: { className?: string; inert?: boolean }) {
  const s = use3d();
  if (!s.toggle) return null;
  return (
    <div role="group" aria-label="3D graphics" inert={inert} className={cn('flex items-center rounded-full border border-line p-[3px]', className)}>
      {MODES.map(m => {
        const pressed = s.on === m.on;
        return (
          <button key={m.label} type="button" aria-pressed={pressed} onClick={() => choose3d(m.on)}
            className={cn('flex h-9 items-center rounded-full px-2.5 font-mono text-[11px] font-semibold transition-colors duration-(--dur-hit) ease-out-expo md:px-3',
              pressed ? 'bg-fg text-carbon' : 'text-mute hover:text-fg')}>
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
