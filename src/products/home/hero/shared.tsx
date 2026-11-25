// Who the hero introduces. Nothing here comes from the list of products.
import { scrollToY } from '../../scroll';

export const ME = {
  name: 'Muhammad Ahsan',
  role: 'Full-stack and AI developer',
  place: 'Karachi',
  since: '2022',
  stack: ['React', 'Go', 'Python', '.NET'],
  line: 'I take a product from the first sketch to its launch film.',
  /** The layers of the work, in the order it is done. Car.tsx's PARTS point into this list by index. */
  layers: [
    { name: 'Design', note: 'Drawn before it is built: the look, the motion and the words.' },
    { name: 'Architecture', note: 'The floor everything else bolts to.' },
    { name: 'Back end', note: 'Go, Python and .NET services that hold under load.' },
    { name: 'AI', note: 'Agents and models, where they earn their seat.' },
    { name: 'Front end', note: 'The first thing people meet. React, down to the last interaction.' },
    { name: 'Launch', note: 'Lights out. Shipped, measured and filmed.' },
  ],
} as const;

/** The facts as one sentence: "Full-stack and AI developer in Karachi, building since 2022 with React, Go, Python and .NET." */
export const FACTS = `${ME.role} in ${ME.place}, building since ${ME.since} with ${new Intl.ListFormat('en-GB').format(ME.stack)}.`;

/** Scroll to whatever follows the hero. */
export function toNext(hero: HTMLElement | null) {
  if (hero) scrollToY(hero.offsetTop + hero.offsetHeight);
}
