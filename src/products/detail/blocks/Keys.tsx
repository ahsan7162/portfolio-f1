// Keyboard shortcuts as rows: keycaps on the left, what they do on the right. The rows rise,
// then each keycap does one soft press in turn. While the block is on screen, pressing a shortcut it lists
// presses its caps and lights its row; nothing else happens, so no site shortcut fires. The caps are <kbd>.
import { useEffect, useId, useRef } from 'react';
import { gsap, reducedMotion } from '../../motion';
import { keysMatch } from './keyMatch';
import { Label, useBlockMotion, type BlockProps } from './shared';

export function Keys({ block }: BlockProps<'keys'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();

  useBlockMotion(root, ({ q, qa, enter }) => {
    const list = q('.dt-keys');
    if (!list) return;
    gsap.timeline({ scrollTrigger: enter(list, 'top 88%') })
      .from(qa('.dt-keys-row'), { y: 28, autoAlpha: 0, duration: 0.45, stagger: 0.04 })
      .to(qa('.dt-key-face'), { yPercent: 9, duration: 0.09, ease: 'power2.in', yoyo: true, repeat: 1, stagger: 0.04 }, 0.3);
  });

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let seen = false;
    const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; });
    io.observe(el);
    const onKey = (e: KeyboardEvent) => {
      if (!seen || e.repeat || (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable], dialog'))) return;
      const press = { key: e.key, code: e.code, meta: e.metaKey, ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey };
      el.querySelectorAll<HTMLElement>('.dt-keys-row').forEach((row, i) => {
        if (!keysMatch(block.keys[i]?.keys ?? [], press)) return;
        if (reducedMotion()) { gsap.fromTo(row, { '--hit': 1 }, { '--hit': 0, duration: 0.01, delay: 0.6 }); return; }
        gsap.timeline()
          .fromTo(row, { '--hit': 1 }, { '--hit': 0, duration: 1.1, ease: 'power2.in' }, 0)
          .to(row.querySelectorAll('.dt-key-face'), { yPercent: 14, duration: 0.08, ease: 'power2.in', yoyo: true, repeat: 1, stagger: 0.03 }, 0);
      });
    };
    window.addEventListener('keydown', onKey);
    return () => { io.disconnect(); window.removeEventListener('keydown', onKey); };
  }, [block]);

  return (
    <section className="dt-block dt-sec pp-wrap" ref={root} aria-labelledby={id}>
      <Label id={id}>{block.label}</Label>
      {block.note && <p className="dt-keys-note">{block.note}</p>}
      <ul className="dt-keys">
        {block.keys.map(k => (
          <li key={k.does} className="dt-keys-row">
            <span className="dt-keys-caps">
              {k.keys.map(key => <kbd key={key} className="dt-key"><span className="dt-key-face">{key}</span></kbd>)}
            </span>
            <span className="dt-keys-does">{k.does}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
