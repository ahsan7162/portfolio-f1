// A film behind its poster and a big play button; the block clips open as it enters.
import { useId, useRef, useState } from 'react';
import { gsap } from '../../motion';
import { FILM_ID, findBlock } from '../../types';
import { Label, useBlockMotion, usePreload, type BlockProps } from './shared';

/** Stable, so re-renders do not re-run it and pull focus back to the video. */
const focus = (el: HTMLElement | null) => el?.focus();

export function Film({ block, product, n }: BlockProps<'film'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();
  const [playing, setPlaying] = useState(false);

  usePreload(root);

  useBlockMotion(root, ({ q, enter }) => {
    const film = q('.dt-film');
    if (!film) return;
    gsap.fromTo(film,
      { clipPath: 'inset(12% 10% 12% 10% round 28px)' },
      { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 0.7, ease: 'expo.out', scrollTrigger: enter(film) });
  });

  return (
    <section className="dt-block dt-sec pp-wrap" ref={root} id={findBlock(product, 'film') === block ? FILM_ID : undefined} aria-labelledby={id}>
      <Label n={n} id={id}>{block.label}</Label>
      <div className="dt-film">
        {/* The poster stays under the video, so the swap is a quick fade over it, never a blank frame. */}
        <img className="dt-film-media" src={block.poster} alt="" loading="lazy" decoding="async" />
        {playing ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption -- the film data has no captions file to point a <track> at
          <video ref={focus} className="dt-film-media dt-film-video" src={block.src} poster={block.poster} controls autoPlay playsInline preload="none" aria-label={block.title} />
        ) : (
          <button type="button" className="dt-play" aria-label={`Play the film: ${block.title}, ${block.duration}`} onClick={() => setPlaying(true)}>
            <span className="dt-play-icon" aria-hidden="true" />
          </button>
        )}
      </div>
      <p className="dt-film-cap pp-mono"><span>{block.title}</span><span className="pp-dim">{block.duration}</span></p>
      {block.credit && <p className="dt-credit">{block.credit}</p>}
    </section>
  );
}
