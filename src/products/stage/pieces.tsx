// Product drawings the rules, compose and replay blocks show, by name (stage/names.ts). A block owns its layout,
// its controls and its motion; the product's own look and rules come from here, drawn with the product's kit.
import type { ReactNode } from 'react';
import { blockersOf, rowTone, type PrFacts } from './pr';
import { FINDINGS, PR } from './prSample';
import { AlertList, AlertToast, Av, G, RailMe, Row, Spine } from './PrView';
import type { PartsName, RuleSetName, SurfacesName } from './names';

export interface RuleSet {
  /** Each input is a list of options; a pair whose first is "Off" is a switch. */
  inputs: { label: string; options: string[] }[];
  start: number[];
  count: (v: number[]) => number;
  /** The words beside the count. */
  words: (n: number) => [string, string];
  draw: (v: number[]) => ReactNode;
}

const OFF_ON = ['Off', 'On'];
/** #482 under any of the conditions the plugin reads, through its own blocker rule. */
function prUnder(v: number[]): PrFacts {
  const [draft, stacked, conflicts, ci, review, unresolved] = v;
  return {
    isDraft: !!draft, stackedOn: stacked ? 478 : null, conflicts: !!conflicts,
    ci: (['failing', 'pending', 'passing'] as const)[ci], failingChecks: ci === 0 ? 2 : 0,
    reviewDecision: (['CHANGES_REQUESTED', 'REVIEW_REQUIRED', 'APPROVED'] as const)[review], unresolvedThreads: unresolved,
  };
}

export const RULES: Record<RuleSetName, RuleSet> = {
  'pr:blockers': {
    inputs: [
      { label: 'Draft', options: OFF_ON }, { label: 'Stacked on #478', options: OFF_ON }, { label: 'Merge conflicts', options: OFF_ON },
      { label: 'CI', options: ['Failing', 'Running', 'Passing'] }, { label: 'Review', options: ['Changes', 'Awaiting', 'Approved'] },
      { label: 'Unresolved', options: ['0', '1', '2', '3'] },
    ],
    start: [1, 1, 1, 0, 0, 2],
    count: v => blockersOf(prUnder(v)).length,
    words: n => (n ? [n === 1 ? 'reason' : 'reasons', 'it’s stuck'] : ['nothing', 'blocks it']),
    draw: v => {
      const facts = prUnder(v);
      const blockers = blockersOf(facts);
      return (
        <div className="prd-rows prd-rows--big">
          <Row pr={{ number: PR.number, title: PR.title, additions: 186, deletions: 42, updated: '26m ago', facts, blockers, tone: rowTone(facts, blockers), draft: facts.isDraft, jobs: facts.ci === 'failing' ? ['test › unit', 'ci › lint'] : undefined }} focused />
        </div>
      );
    },
  },
};

/** How a compose block draws one of its parts. `n` is its place in the text, when picked. */
export type PartsDrawer = (p: { id: string; title: string; picked: boolean; n: number; toggle: () => void }) => ReactNode;

export const PARTS: Record<PartsName, PartsDrawer> = {
  'pr:findings': ({ id, title, picked, n, toggle }) => {
    const s = FINDINGS.find(f => f.key === id)!.subject;
    const job = s.kind === 'check';
    const first = s.kind === 'thread' ? s.thread.comments[0] : null;
    return (
      <div className="prd-card" data-tone={job ? 'bad' : 'warn'} data-picked={picked || undefined}>
        <Spine tone={job ? 'bad' : 'warn'} />
        <div className="prd-card-h">
          <span className="prd-n" aria-hidden="true">{picked ? n : ''}</span>
          {job ? <G n="x" /> : <G n="msg" />}
          <div><strong className="prd-mono-t">{title}</strong><small>{job ? s.check.title : `${first?.author} · ${s.thread.comments.length - 1 ? `${s.thread.comments.length - 1} replies` : 'waiting on your reply'}`}</small></div>
        </div>
        {first && <p className="prd-cmt-x"><Av who={first.author} />{first.body.replace(/`/g, '').slice(0, 74)}…</p>}
        <div className="prd-acts">
          <button type="button" className="prd-btn" aria-pressed={picked} onClick={toggle}><G n={picked ? 'check' : 'fix'} />Fix with agent</button>
        </div>
      </div>
    );
  },
};

export interface Fired { at: string; alerts: { kind: string; headline: string; detail: string }[]; push: { title: string; body: string } | null }
/** How a replay block draws what reached you: the checks that have run so far, and the settings now. */
export type SurfacesDrawer = (p: { fired: Fired[]; on: Record<string, string>; clock: string }) => ReactNode;

export const SURFACES: Record<SurfacesName, SurfacesDrawer> = {
  'pr:alerts': ({ fired, on, clock }) => {
    const alerts = fired.flatMap(c => c.alerts).reverse();
    const pushes = fired.filter(c => c.push).reverse().slice(0, 3);
    return (
      <div className="prd prd-reach">
        <div className="prd-desk">
          <p className="prd-desk-rail"><RailMe badge={on.showBadge === 'On' ? alerts.length : 0} /><span>My PRs</span></p>
          <div className="prd-toasts prd-toasts--flow" aria-hidden={on.showToasts !== 'On'}>
            {on.showToasts === 'On' && alerts.slice(0, 2).reverse().map(a => <AlertToast key={a.headline} a={a} />)}
          </div>
          {alerts.length > 0 ? <AlertList alerts={alerts} /> : <p className="prd-quiet">Nothing new since you last looked.</p>}
        </div>
        <div className="prd-phone" data-off={on.showDesktop !== 'On' || undefined}>
          <p className="prd-phone-t">{clock}</p>
          {on.showDesktop === 'On'
            ? pushes.map(c => <div className="prd-push" key={c.at}><span className="prd-app-ic">bb</span><div><strong>{c.push!.title}</strong><p>{c.push!.body.split('\n').map(l => <span key={l}>{l}<br /></span>)}</p></div><small>{c.at}</small></div>)
            : <p className="prd-quiet">showDesktop is off: nothing leaves your bb server.</p>}
        </div>
      </div>
    );
  },
};
