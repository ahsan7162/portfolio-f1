import { useEffect, useState } from 'react';
import type { Section } from '@/content/data';
import { ScrollTrigger } from '@/motion/gsap';

/**
 * Where the page is, for the nav: the section on screen (`current`, marked in the menu),
 * whether the hero is still up (`start`: it has its own CV button) and whether the footer
 * has arrived (`finish`: the bar steps back). Measured after the pins (priority -1).
 */
export function useSectionState(menu: Section[]) {
  const [current, setCurrent] = useState<string | null>(null);
  const [finish, setFinish] = useState(false);
  const [start, setStart] = useState(true);

  useEffect(() => {
    const triggers = menu.flatMap(m => {
      const el = document.getElementById(m.id);
      return el ? [ScrollTrigger.create({
        trigger: el, start: 'top 55%', end: 'bottom 55%', refreshPriority: -1,
        onToggle: s => setCurrent(c => (s.isActive ? m.id : c === m.id ? null : c)),
      })] : [];
    });
    // Re-read on refresh too, after a jump.
    const contact = document.getElementById('contact');
    const atFinish = (s: ScrollTrigger) => setFinish(s.isActive);
    if (contact) triggers.push(ScrollTrigger.create({ trigger: contact, start: 'top 15%', refreshPriority: -1, onToggle: atFinish, onRefresh: atFinish }));
    const hero = document.getElementById('top');
    const atStart = (s: ScrollTrigger) => setStart(s.isActive);
    if (hero) triggers.push(ScrollTrigger.create({ trigger: hero, start: 'top bottom', end: 'bottom 40%', refreshPriority: -1, onToggle: atStart, onRefresh: atStart }));
    return () => triggers.forEach(t => t.kill());
  }, [menu]);

  return { current, finish, start };
}
