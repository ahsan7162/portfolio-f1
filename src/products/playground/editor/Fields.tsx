// A form for any block, built from the block's own data: text for strings, switches for true and false, a list
// for arrays, a group for objects, and a picker for a picture. Fields a block may have but doesn't yet come from
// every real page and sample of that type, so nothing has to be described twice.
import { useId, useState } from 'react';
import { products } from '../../data';
import { LIVE_NAMES, PARTS_NAMES, RULE_SET_NAMES, SURFACES_NAMES } from '../../stage/names';
import { CATALOG, sample } from '../catalog';
import { spliced, swapped } from '../doc';

type V = unknown;
type Obj = Record<string, V>;
const isObj = (v: V): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Values a field can only take one of, by its name. */
const CHOICES: Record<string, readonly string[]> = {
  side: ['left', 'right'],
  live: LIVE_NAMES,
  set: RULE_SET_NAMES,
  parts: PARTS_NAMES,
  surfaces: SURFACES_NAMES,
};
/** Fields worth a few lines to write in. */
const LONG = new Set(['body', 'head', 'text', 'line', 'note', 'caption', 'a', 'reply', 'ask', 'code', 'before', 'after', 'source', 'edit', 'detail']);

/** Every top-level field each block type is seen with, and a value to start one from. */
const KNOWN = (() => {
  const out = new Map<string, Map<string, V>>();
  const all = [...products.flatMap(p => p.blocks), ...CATALOG.map(e => sample(e.type))];
  for (const b of all) {
    const m = out.get(b.type) ?? new Map<string, V>();
    for (const [k, v] of Object.entries(b)) if (!m.has(k)) m.set(k, v);
    out.set(b.type, m);
  }
  return out;
})();

/** An empty value of the same shape: a new list item starts from the last one, with its words cleared. */
function blank(v: V): V {
  if (typeof v === 'string') return '';
  if (Array.isArray(v)) return v.length ? [blank(v[0])] : [];
  if (isObj(v)) {
    // a picture keeps its kind and path, so the new item shows something
    if ('src' in v || 'sample' in v || 'live' in v) return structuredClone(v);
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, blank(x)]));
  }
  return v;
}

const title = (k: string) => k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());

export function BlockFields({ block, onChange }: { block: Obj & { type: string }; onChange: (b: Obj & { type: string }) => void }) {
  const known = KNOWN.get(block.type) ?? new Map();
  const missing = [...known.keys()].filter(k => !(k in block) && k !== 'type');
  return (
    <div className="pg-fields">
      {Object.entries(block).filter(([k]) => k !== 'type').map(([k, v]) => (
        <Field key={k} name={k} value={v} onChange={nv => onChange({ ...block, [k]: nv })} onRemove={() => { const { [k]: _, ...rest } = block; onChange(rest as typeof block); }} />
      ))}
      {missing.length > 0 && (
        <label className="pg-add-field pp-mono">
          <span>Add a field</span>
          <select value="" onChange={e => { const k = e.target.value; if (k) onChange({ ...block, [k]: structuredClone(known.get(k)) }); }}>
            <option value="">Choose…</option>
            {missing.map(k => <option key={k} value={k}>{title(k)}</option>)}
          </select>
        </label>
      )}
    </div>
  );
}

export function Field({ name, value, onChange, onRemove }: { name: string; value: V; onChange: (v: V) => void; onRemove?: () => void }) {
  const id = useId();
  const head = (
    <span className="pg-field-head">
      <label className="pp-mono" htmlFor={id}>{title(name)}</label>
      {onRemove && <button type="button" className="pg-x" onClick={onRemove} aria-label={`Remove ${title(name)}`}>×</button>}
    </span>
  );
  if (typeof value === 'string') {
    const choices = CHOICES[name];
    return (
      <div className="pg-field">
        {head}
        {choices ? (
          <select id={id} className="pg-input" value={value} onChange={e => onChange(e.target.value)}>
            {!choices.includes(value) && <option value={value}>{value || 'Choose…'}</option>}
            {choices.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        ) : LONG.has(name) || value.length > 60 || value.includes('\n') ? (
          <textarea id={id} className="pg-input" value={value} rows={Math.min(8, Math.max(2, Math.ceil(value.length / 44), value.split('\n').length))} onChange={e => onChange(e.target.value)} />
        ) : (
          <input id={id} className="pg-input" value={value} onChange={e => onChange(e.target.value)} />
        )}
      </div>
    );
  }
  if (typeof value === 'number') {
    return <div className="pg-field">{head}<input id={id} className="pg-input" type="number" value={value} step="any" onChange={e => onChange(e.target.value === '' ? 0 : Number(e.target.value))} /></div>;
  }
  if (typeof value === 'boolean') {
    return (
      <div className="pg-field pg-field--row">
        {head}
        <button id={id} type="button" className="pg-switch" role="switch" aria-checked={value} aria-label={title(name)} onClick={() => onChange(!value)}><span /></button>
      </div>
    );
  }
  if (Array.isArray(value)) return <ListField name={name} id={id} items={value} onChange={onChange} head={head} />;
  if (isObj(value)) {
    if ('src' in value || 'sample' in value || 'live' in value) return <div className="pg-field">{head}<MediaField id={id} media={value} onChange={onChange} /></div>;
    return (
      <fieldset className="pg-group">
        <legend>{head}</legend>
        {Object.entries(value).map(([k, v]) => (
          <Field key={k} name={k} value={v} onChange={nv => onChange({ ...value, [k]: nv })} />
        ))}
      </fieldset>
    );
  }
  return null;
}

function ListField({ name, id, items, onChange, head }: { name: string; id: string; items: V[]; onChange: (v: V[]) => void; head: React.ReactNode }) {
  const [open, setOpen] = useState(0);
  const move = (i: number, by: number) => { const j = i + by; if (j < 0 || j >= items.length) return; const n = [...items]; [n[i], n[j]] = [n[j], n[i]]; onChange(n); setOpen(j); };
  const simple = items.every(x => typeof x === 'string');
  return (
    <fieldset className="pg-group pg-list" id={id}>
      <legend>{head}<span className="pg-count pp-mono">{items.length}</span></legend>
      {items.map((it, i) => {
        const summary = typeof it === 'string' ? it : isObj(it) ? (Object.values(it).find((x): x is string => typeof x === 'string') ?? `Item ${i + 1}`) : `Item ${i + 1}`;
        return (
          // oxlint-disable-next-line react/no-array-index-key -- list items have no identity of their own; the fields are controlled, so moving one moves its values
          <div className="pg-item" key={i} data-open={simple || open === i ? '' : undefined}>
            <div className="pg-item-bar">
              {simple ? (
                <input className="pg-input" aria-label={`${title(name)} ${i + 1}`} value={it as string} onChange={e => onChange(swapped(items, i, e.target.value))} />
              ) : (
                <button type="button" className="pg-item-name" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>{summary || `Item ${i + 1}`}</button>
              )}
              <span className="pg-item-acts">
                <button type="button" className="pg-x" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                <button type="button" className="pg-x" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down">↓</button>
                <button type="button" className="pg-x" onClick={() => onChange(spliced(items, i, 1))} aria-label={`Remove item ${i + 1}`}>×</button>
              </span>
            </div>
            {!simple && open === i && <div className="pg-item-body"><Field name={`${name.replace(/s$/, '')} ${i + 1}`} value={it} onChange={nv => onChange(swapped(items, i, nv))} /></div>}
          </div>
        );
      })}
      <button type="button" className="pg-add pp-mono" onClick={() => { onChange([...items, items.length ? blank(items.at(-1)) : '']); setOpen(items.length); }}>+ Add</button>
    </fieldset>
  );
}

function MediaField({ id, media, onChange }: { id: string; media: Obj; onChange: (v: V) => void }) {
  const kind = 'live' in media ? 'live' : 'sample' in media ? 'sample' : 'src';
  return (
    <div className="pg-media">
      <div className="pg-seg pp-mono" role="radiogroup" aria-label="Picture">
        {(['src', 'sample', 'live'] as const).map(k => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => k !== kind && onChange(k === 'src' ? { src: '/products-media/', alt: '' } : k === 'sample' ? { sample: 0 } : { live: LIVE_NAMES[0], alt: '' })}>
            {k === 'src' ? 'Image' : k === 'sample' ? 'Sample' : 'Live'}
          </button>
        ))}
      </div>
      {kind === 'src' && <input id={id} className="pg-input" value={String(media.src)} placeholder="/products-media/<slug>/<file>.jpg" onChange={e => onChange({ ...media, src: e.target.value })} />}
      {kind === 'sample' && (
        <div className="pg-media-row">
          <select id={id} className="pg-input" value={Number(media.sample)} onChange={e => onChange({ ...media, sample: Number(e.target.value) })}>
            {[0, 1, 2].map(n => <option key={n} value={n}>Sample screen {n + 1}</option>)}
          </select>
          <label className="pp-mono"><input type="checkbox" checked={media.dark === true} onChange={e => onChange({ ...media, dark: e.target.checked })} /> Dark</label>
        </div>
      )}
      {kind === 'live' && (
        <select id={id} className="pg-input" value={String(media.live)} onChange={e => onChange({ ...media, live: e.target.value })}>
          {[...new Set([String(media.live), ...LIVE_NAMES])].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      )}
      {kind !== 'sample' && <input className="pg-input" aria-label="What the picture shows" value={typeof media.alt === 'string' ? media.alt : ''} placeholder="What the screen shows" onChange={e => onChange({ ...media, alt: e.target.value })} />}
    </div>
  );
}
