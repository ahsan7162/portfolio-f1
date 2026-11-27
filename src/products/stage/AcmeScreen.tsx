// Acme Notes, the products pages' made-up product, drawn in code: its panel beside the code (with search over it, or a
// linked line opened as a card), its branches, a note's history, the light theme, its website, and its phone app. Its
// accent is the product's colour, so on the system page and in the playground every screen takes the colour picked
// for it. A still screen: it is in its finished state whether `active` or not.
import type { ReactNode } from 'react';
import type { LiveProps } from '../types';
import type { AcmeName, AcmeView } from './names';
import '../styles/acme.css';

const Top = ({ children }: { children: ReactNode }) => <div className="top"><span className="ico acc" />{children}</div>;
const Task = ({ done, children }: { done?: boolean; children: ReactNode }) => <div className={`task${done ? ' done' : ''}`}><span className={`box${done ? ' done' : ''}`} /><span>{children}</span></div>;

function Panel({ over }: { over?: 'search' | 'links' }) {
  return (
    <section className="v">
      <Top>Notes <span className="chip mono">feat/checkout-v2</span><span className="sp" /><span className="chip ok">Saved</span><span className="btn">⌘J</span></Top>
      <div className="panel-main">
        <aside className="list">
          <div className="search">⌕ <span>Search every note</span><span className="sp" /><span className="kbd">⌘⇧F</span></div>
          <p className="group">This branch · 3</p>
          <div className="item on"><b>Review: totals that round twice</b><span>Updated 4m ago · 3 of 5 done</span></div>
          <div className="item"><b>Why the cart drops a promo code</b><span>Yesterday · links to 2 lines</span></div>
          <div className="item"><b>Hand-off for Sam</b><span>Mon · shared on the branch</span></div>
          <p className="group">Other branches</p>
          <div className="item"><b>Retry policy for webhooks</b><span>fix/webhook-retry · 2d ago</span></div>
          <div className="item"><b>Release checklist 2.4</b><span>main · last week</span></div>
        </aside>
        <article className="note">
          <h1>Review: totals that round twice</h1>
          <div className="meta"><span className="chip acc"><span className="dot" />review</span><span className="chip">cart</span><span>notes/feat-checkout-v2.md</span></div>
          <p className="p">The subtotal is rounded per line, then the total is rounded again. Three cents go missing on carts with more than seven items.</p>
          <h2>Before it merges</h2>
          <Task done>Reproduce with the 8-item fixture</Task>
          <Task done>Find where the second rounding happens</Task>
          <Task done>Round once, at the total <span className="ref">src/cart/total.ts:42</span></Task>
          <Task>Add a test for 7, 8 and 50 items</Task>
          <Task>Ask Sam to check the receipts view</Task>
          <div className="codeblock"><span className="k">export function</span> total(lines: <span className="k">Line</span>[]) {'{'}{'\n  '}<span className="k">return</span> round(lines.reduce((s, l) =&gt; s + l.price * l.qty, <span className="n">0</span>));{'\n}'}</div>
          <div className="foot"><span>Plain Markdown · 41 lines</span><span>Linked lines follow your edits</span></div>
        </article>
      </div>
      {over === 'search' && (
        <div className="overlay">
          <div className="pal">
            <div className="q">⌕ <span>rounding</span><span className="sp" /><span className="kbd">esc</span></div>
            <div className="res on"><b>Review: totals that round twice</b><span>feat/checkout-v2 · …then the total is <mark>rounded</mark> again. Three cents go missing…</span></div>
            <div className="res"><b>Why the cart drops a promo code</b><span>feat/checkout-v2 · …the discount is applied before <mark>rounding</mark>, so…</span></div>
            <div className="res"><b>Release checklist 2.4</b><span>main · …check currency <mark>rounding</mark> in JPY and KWD…</span></div>
            <div className="res"><b>Pricing edge cases</b><span>fix/tax-display · …banker’s <mark>rounding</mark> on the invoice line…</span></div>
            <div className="res last"><span>4 notes across 3 branches · ↵ to open · ⌘↵ to open beside the code</span></div>
          </div>
        </div>
      )}
      {over === 'links' && (
        <div className="hover">
          <div className="h"><span className="mono">src/cart/total.ts · line 42</span><span>followed 3 edits</span></div>
          <pre>
            <div><i>40</i>export function total(lines: Line[]) {'{'}</div>
            <div><i>41</i>  const sum = lines.reduce((s, l) =&gt; s + l.price * l.qty, 0);</div>
            <div className="on"><i>42</i>  return round(sum);</div>
            <div><i>43</i>{'}'}</div>
          </pre>
        </div>
      )}
    </section>
  );
}

const BRANCHES: [string, string, string, string, string?][] = [
  ['fix/webhook-retry', 'Retry policy for webhooks', '1 note', '2d ago'],
  ['fix/tax-display', 'Pricing edge cases · Invoice copy', '2 notes', '3d ago'],
  ['main', 'Release checklist 2.4 · On-call notes · ADR 12', '3 notes', 'last week'],
  ['spike/offline-sync', 'What we tried, what broke', '2 notes', 'merged', 'ok'],
  ['chore/deps', 'No notes yet', '0', '1w ago', 'off'],
];

const Branches = () => (
  <section className="v">
    <Top>Notes · branches<span className="sp" /><span className="chip">6 branches · 11 notes</span></Top>
    <div className="br">
      <div className="brow on"><span className="dot" /><div><b className="mono">feat/checkout-v2</b><small>You are here · the note follows you</small></div><span className="chip acc">3 notes</span><span className="chip">4m ago</span></div>
      {BRANCHES.map(([name, notes, count, when, mod]) => (
        <div key={name} className={`brow${mod === 'off' ? ' off' : ''}`}><span className="ico" /><div><b className="mono">{name}</b><small>{notes}</small></div><span className="chip">{count}</span><span className={`chip${mod === 'ok' ? ' ok' : ''}`}>{when}</span></div>
      ))}
    </div>
  </section>
);

const DIFF: [string, string][] = [
  ['same', '## Before it merges'], ['same', '- [x] Reproduce with the 8-item fixture'], ['del', '- [ ] Find where it rounds'],
  ['add', '- [x] Find where the second rounding happens'], ['add', '- [x] Round once, at the total [src/cart/total.ts:42]'],
  ['add', '- [ ] Add a test for 7, 8 and 50 items'], ['same', '- [ ] Ask Sam to check the receipts view'], ['same', ' '],
  // the blank lines differ in width only, so every line is its own key
  ['add', 'The subtotal is rounded per line, then the total is rounded again.'], ['same', '  '],
  ['same faint', '6 lines added, 1 removed: what git will see, too.'],
];

const History = () => (
  <section className="v">
    <Top>Review: totals that round twice · history<span className="sp" /><span className="chip">5 versions</span><span className="btn pri">Restore this version</span></Top>
    <div className="hist">
      <aside className="vers">
        <div className="ver"><b>Now</b><span>You · 4m ago · +2 −1</span></div>
        <div className="ver on"><b>Found the second rounding</b><span>You · 40m ago · +6 −0</span></div>
        <div className="ver"><b>Reproduced</b><span>You · 2h ago · +3 −1</span></div>
        <div className="ver"><b>Notes from Sam</b><span>Sam Rivera · yesterday · +4 −0</span></div>
        <div className="ver"><b>Started</b><span>You · yesterday · +5</span></div>
      </aside>
      <div className="diff">{DIFF.map(([k, line]) => <div key={line} className={k}>{line}</div>)}</div>
    </div>
  </section>
);

const TABS = <div className="tabbar"><span className="on">● Notes</span><span>Branches</span><span>Search</span><span>You</span></div>;

const PhoneList = () => (
  <section className="ph">
    <h1>Notes</h1>
    <div className="search">⌕ <span>Search</span></div>
    <p className="group">feat/checkout-v2</p>
    <div className="card"><b>Review: totals that round twice</b><span>3 of 5 done · 4m ago</span></div>
    <div className="card"><b>Why the cart drops a promo code</b><span>links to 2 lines · yesterday</span></div>
    <div className="card"><b>Hand-off for Sam</b><span>shared on the branch · Mon</span></div>
    <p className="group">main</p>
    <div className="card"><b>Release checklist 2.4</b><span>12 of 14 done · last week</span></div>
    <div className="fab">+</div>
    {TABS}
  </section>
);

const PhoneNote = () => (
  <section className="ph">
    <span className="chip mono start">feat/checkout-v2</span>
    <h1 className="small">Review: totals that round twice</h1>
    <p className="p">The total is rounded twice. Three cents go missing on big carts.</p>
    <Task done>Reproduce with 8 items</Task>
    <Task done>Find the second rounding</Task>
    <Task>Add a test for 7, 8, 50 items</Task>
    <Task>Ask Sam about receipts</Task>
    <span className="ref start">src/cart/total.ts:42</span>
    {TABS}
  </section>
);

const Site = ({ phone }: { phone?: boolean }) => (
  <section className={`site${phone ? ' siteph' : ''}`}>
    <nav><b><span className="dot" />Acme Notes</b><span>Features</span><span>Pricing</span><span>Docs</span><span className="btn pri">Install</span></nav>
    <div className="hero">
      <div>
        <h1>Notes that live <em>beside your code</em>.</h1>
        <p>One note per branch, in plain Markdown, linked to the lines it is about. Switch branch, and the note switches with you.</p>
        <div className="cta"><span className="btn pri big">Install for bb</span><span className="btn big">See it work</span></div>
      </div>
      {/* the panel itself, in the site's own screenshot frame */}
      <div className="shot"><div className="acm"><div className="acm-c"><Panel /></div></div></div>
    </div>
    <div className="logos"><span>NORTHWIND</span><span>Globex</span><span>INITECH</span><span>Umbrella</span><span>Hooli</span></div>
  </section>
);

const VIEWS: Record<AcmeView, () => ReactNode> = {
  panel: () => <Panel />,
  search: () => <Panel over="search" />,
  links: () => <Panel over="links" />,
  branches: () => <Branches />,
  history: () => <History />,
  'panel-light': () => <Panel />,
  site: () => <Site />,
  'phone-list': () => <PhoneList />,
  'phone-note': () => <PhoneNote />,
  'site-phone': () => <Site phone />,
};

const PHONE = new Set<AcmeView>(['phone-list', 'phone-note', 'site-phone']);

export default function AcmeScreen({ name, alt }: LiveProps & { name: AcmeName }) {
  const view = name.slice('acme:'.length) as AcmeView;
  const draw = VIEWS[view];
  if (!draw) return <div className="acm" role="img" aria-label={alt} />;
  return (
    <div className={`acm${PHONE.has(view) ? ' acm--phone' : ''}${view === 'panel-light' ? ' acm--light' : ''}`} role="img" aria-label={alt}>
      <div className="acm-c" aria-hidden="true">{draw()}</div>
    </div>
  );
}
