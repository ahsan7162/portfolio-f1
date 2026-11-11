// Every product in one place, however many there are: filter by kind, search, and view as a list or a wall.
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { brandVars } from '../brand';
import { pad } from '../format';
import { Flip, gsap, reducedMotion, ScrollTrigger, useGSAP } from '../motion';
import { Link, productPath } from '../router';
import { KINDS, type Kind, type Product } from '../types';
import { Preview } from './Preview';

const kinds = Object.keys(KINDS) as Kind[];

export function Catalogue({ items }: { items: Product[] }) {
  const root = useRef<HTMLElement>(null);
  const peekEl = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const viewChanged = useRef(false);
  const [kind, setKind] = useState<Kind | 'all'>('all');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'list' | 'wall'>('list');
  const [peek, setPeek] = useState<Product | null>(null);

  const q = query.trim().toLowerCase();
  const matches = (p: Product) =>
    (kind === 'all' || p.kind === kind) && (!q || [p.name, KINDS[p.kind].label, p.year, ...p.stack].join(' ').toLowerCase().includes(q));
  const shown = items.filter(matches).length;

  /** Apply a filter change, and play the rows from where they were to where they land. */
  const refilter = (apply: () => void) => {
    const list = view === 'list' && !reducedMotion() ? root.current?.querySelector<HTMLElement>('.cat-list') : null;
    const state = list ? Flip.getState(list.querySelectorAll('.cat-row')) : null;
    const from = list?.offsetHeight ?? 0;
    flushSync(apply);
    if (list && state) {
      // The rows leave the layout while they travel, which would let the list collapse and its bottom
      // line jump. So the list's height is carried from the old size to the new one alongside them.
      gsap.killTweensOf(list);
      gsap.set(list, { clearProps: 'height' });
      const to = list.offsetHeight;
      gsap.fromTo(list, { height: from }, { height: to, duration: 0.45, ease: 'expo.out', clearProps: 'height', onComplete: () => ScrollTrigger.refresh() });
      Flip.from(state, {
        duration: 0.45, ease: 'expo.out', absolute: true,
        onEnter: els => gsap.fromTo(els, { opacity: 0 }, { opacity: 1, duration: 0.4 }),
        onLeave: els => gsap.to(els, { opacity: 0, duration: 0.2 }),
      });
    } else {
      requestAnimationFrame(() => ScrollTrigger.refresh());
    }
  };

  // "/" jumps to the search field, like the products themselves do.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || t?.closest('input, textarea, [contenteditable]')) return;
      e.preventDefault();
      search.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.cat-title > *', { yPercent: 105, duration: 1.1, stagger: 0.08, scrollTrigger: { trigger: '.cat-head', start: 'top 85%' } });
      gsap.from('.cat-tools, .cat-f', { autoAlpha: 0, y: 18, duration: 0.6, stagger: 0.04, scrollTrigger: { trigger: '.cat-filters', start: 'top 92%' } });
      gsap.from('.cat-row', { autoAlpha: 0, yPercent: 40, duration: 0.7, stagger: 0.05, clearProps: 'all', scrollTrigger: { trigger: '.cat-list', start: 'top 88%' } });
    });
    mm.add('(hover: hover) and (pointer: fine)', () => {
      const x = gsap.quickTo(peekEl.current, 'x', { duration: 0.3, ease: 'power3' });
      const y = gsap.quickTo(peekEl.current, 'y', { duration: 0.3, ease: 'power3' });
      const move = (e: PointerEvent) => { x(e.clientX); y(e.clientY); };
      window.addEventListener('pointermove', move, { passive: true });
      return () => window.removeEventListener('pointermove', move);
    });
  }, { scope: root });

  // Switching between list and wall: the new view's items come in one after another.
  useGSAP(() => {
    if (!viewChanged.current) return;
    viewChanged.current = false;
    ScrollTrigger.refresh();
    if (reducedMotion()) return;
    gsap.from(view === 'list' ? '.cat-row' : '.cat-tile', { autoAlpha: 0, y: 20, duration: 0.4, stagger: 0.025, clearProps: 'all' });
  }, { scope: root, dependencies: [view] });

  const pick = (k: Kind | 'all') => refilter(() => setKind(k));
  const show = (v: 'list' | 'wall') => { if (v !== view) { viewChanged.current = true; setPeek(null); setView(v); } };

  return (
    <section className="cat" id="all" ref={root} aria-labelledby="cat-title">
      <div className="cat-head">
        <h2 className="cat-title pp-display" id="cat-title" aria-label={`All ${items.length} products`}><span>All</span><em>{pad(items.length)}</em></h2>
        <div className="cat-tools">
          <label className="cat-search pp-mono">
            <input ref={search} className="pp-mono" type="search" value={query} placeholder="Search by name, kind or stack" aria-label="Search products"
              onChange={e => { const value = e.target.value; refilter(() => setQuery(value)); }} />
            <kbd>/</kbd>
          </label>
          <div className="cat-view pp-mono" role="group" aria-label="View" data-view={view}>
            <button type="button" className="pp-mono" aria-pressed={view === 'list'} onClick={() => show('list')}>List</button>
            <button type="button" className="pp-mono" aria-pressed={view === 'wall'} onClick={() => show('wall')}>Wall</button>
          </div>
        </div>
      </div>

      <div className="cat-filters" role="group" aria-label="Filter by kind">
        <button type="button" className="cat-f pp-mono" aria-pressed={kind === 'all'} onClick={() => pick('all')}>All <small>{pad(items.length)}</small></button>
        {/* A kind with no products yet has no filter. */}
        {kinds.filter(k => items.some(p => p.kind === k)).map(k => (
          <button type="button" className="cat-f pp-mono" key={k} aria-pressed={kind === k} onClick={() => pick(k)}>
            {KINDS[k].plural} <small>{pad(items.filter(p => p.kind === k).length)}</small>
          </button>
        ))}
      </div>

      {view === 'list' ? (
        <ul className="cat-list" onPointerLeave={() => setPeek(null)}>
          {items.map((p, i) => (
            <li key={p.slug}><Link className="cat-row" to={productPath(p.slug)} data-kind={p.kind} data-off={matches(p) ? undefined : ''} data-cursor="Open"
              onPointerEnter={() => setPeek(p)} onFocus={() => setPeek(null)}>
              <span className="cat-n pp-mono">{pad(i + 1)}</span>
              <span className="cat-name"><b className="pp-display">{p.name}</b>{p.sample && <span className="pp-sample pp-mono">Sample</span>}</span>
              <span className="cat-k pp-mono"><i />{KINDS[p.kind].label}</span>
              <span className="cat-y pp-mono">{p.year}</span>
              <span className="cat-go" aria-hidden="true">↗</span>
            </Link></li>
          ))}
        </ul>
      ) : (
        <ul className="cat-wall">
          {items.map((p, i) => (
            <li key={p.slug}><Link className="cat-tile" to={productPath(p.slug)} data-kind={p.kind} data-off={matches(p) ? undefined : ''} data-cursor="Open"
              inert={!matches(p)}>
              <span className="cat-tile-top pp-mono"><span>{pad(i + 1)}</span><span>{KINDS[p.kind].label} · {p.year}{p.sample ? ' · Sample' : ''}</span></span>
              <span className="cat-tile-pv pp-branded" style={brandVars(p.brand)}><Preview product={p} /></span>
              <b className="cat-tile-name pp-display">{p.name}</b>
            </Link></li>
          ))}
        </ul>
      )}

      <p className="cat-count pp-mono" aria-live="polite">
        {shown ? `Showing ${pad(shown)} of ${pad(items.length)}` : 'Nothing matches. Try another word, or clear the filter.'}
      </p>

      <div className="cat-peek" ref={peekEl} data-on={peek && view === 'list' ? '' : undefined} aria-hidden="true">
        <div className="cat-peek-in pp-branded" style={peek ? brandVars(peek.brand) : undefined}>{peek && <Preview product={peek} />}</div>
      </div>
    </section>
  );
}
