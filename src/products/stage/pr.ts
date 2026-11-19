// The PR Dashboard demo's model: the plugin's blocker rules, and the small world the demo plays in.
// blockersOf is copied from the plugin's prs.ts, and blockerTone and rowTone from parts.tsx and app.tsx
// (github.com/ahsan7162/bb-github-pr-dashboard, MIT, © Muhammad Ahsan). pr.test.ts pins blockersOf to the
// plugin's own output (prRules.gen.ts); the tones are copied by hand, as the plugin keeps them beside React.
import { FINDINGS, OPEN, PR, type FindingKey } from './prSample';

export type Tone = 'bad' | 'warn' | 'good' | 'merged' | 'neutral';
export type Ci = 'failing' | 'pending' | 'passing';
export type Review = 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | 'APPROVED';
/** The fields of the plugin's Pr that its blocker rule reads. */
export interface PrFacts {
  isDraft: boolean; stackedOn: number | null; conflicts: boolean; ci: Ci; failingChecks: number;
  reviewDecision: Review | null; unresolvedThreads: number;
}

/** Why an open pull request is not merged yet, worst first; empty when nothing blocks it (prs.ts). */
export function blockersOf(pr: PrFacts): string[] {
  const out: string[] = [];
  if (pr.isDraft) out.push('Draft');
  if (pr.stackedOn) out.push(`Stacked on #${pr.stackedOn}`);
  if (pr.conflicts) out.push('Merge conflicts');
  if (pr.ci === 'failing') {
    const n = pr.failingChecks;
    out.push(n > 0 ? `CI failing (${n} check${n === 1 ? '' : 's'})` : 'CI failing');
  }
  if (pr.ci === 'pending') out.push('CI running');
  if (pr.reviewDecision === 'CHANGES_REQUESTED') out.push('Changes requested');
  if (pr.unresolvedThreads > 0) {
    const n = pr.unresolvedThreads;
    out.push(`${n} unresolved comment${n === 1 ? '' : 's'}`);
  }
  if (pr.reviewDecision === 'REVIEW_REQUIRED') out.push('Awaiting review');
  return out;
}

/** A blocker's colour (parts.tsx). */
export function blockerTone(blocker: string): Tone {
  if (/conflict|failing|changes requested|unresolved/i.test(blocker)) return 'bad';
  if (/running|awaiting/i.test(blocker)) return 'warn';
  return 'neutral';
}

/** An open row's spine: its worst blocker, else ready (app.tsx). */
export function rowTone(pr: PrFacts, blockers = blockersOf(pr)): Tone {
  if (pr.ci === 'failing' || blockers.some(b => blockerTone(b) === 'bad')) return 'bad';
  if (pr.ci === 'pending' || blockers.some(b => blockerTone(b) === 'warn')) return 'warn';
  return blockers.length === 0 ? 'good' : 'neutral';
}

/** What the row says when nothing blocks it (app.tsx). */
export const readyLabel = (pr: PrFacts) => (pr.reviewDecision === 'APPROVED' ? 'Approved, ready to merge' : 'Nothing blocking');

// ---- The demo's world: #482, its four findings, and an agent and a reviewer played by the demo ----

export const KEYS = FINDINGS.map(f => f.key);
export const CHECKS: FindingKey[] = FINDINGS.filter(f => f.subject.kind === 'check').map(f => f.key);
export const THREADS: FindingKey[] = FINDINGS.filter(f => f.subject.kind === 'thread').map(f => f.key);
/** The reviewer who requested changes, and the thread she waits on. */
export const REVIEWER = { who: 'mina-k', waitsOn: 'jitter' as FindingKey };

export interface World {
  view: 'list' | 'pr';
  tab: 'checks' | 'comments';
  /** Findings picked with Fix with agent, waiting in the bar. */
  picked: FindingKey[];
  /** Handed to the agent and not yet pushed. */
  sent: FindingKey[];
  /** Fixed by the agent's push. */
  fixed: FindingKey[];
  /** The agent pushed and CI is running on the push. */
  running: boolean;
  approved: boolean;
  /** Alerts not yet looked at: the count on My PRs. */
  alerts: number;
}
export const START: World = { view: 'list', tab: 'checks', picked: [], sent: [], fixed: [], running: false, approved: false, alerts: 0 };

/** In the PR's order, as the plugin's batch bar sends them. */
export const inOrder = (keys: FindingKey[]) => KEYS.filter(k => keys.includes(k));
export const pick = (w: World, k: FindingKey): World =>
  w.fixed.includes(k) || w.sent.includes(k) ? w : { ...w, picked: w.picked.includes(k) ? w.picked.filter(x => x !== k) : inOrder([...w.picked, k]) };
/** Send to agent: the picks go to the thread on the branch as one prompt. */
export const send = (w: World): World => (w.picked.length ? { ...w, sent: inOrder([...w.sent, ...w.picked]), picked: [] } : w);
/** The agent pushes what it fixed: CI runs again. */
export const push = (w: World): World => (w.sent.length ? { ...w, running: true } : w);
/** CI reports on the push; the fixed threads resolve, and the reviewer approves once her thread is addressed. */
export function land(w: World): World {
  const fixed = inOrder([...w.fixed, ...w.sent]);
  const approved = w.approved || fixed.includes(REVIEWER.waitsOn);
  return { ...w, fixed, sent: [], running: false, approved, alerts: w.alerts + (approved && !w.approved ? 1 : 0) };
}

/** #482 as the plugin would see it now. */
export function facts(w: World): PrFacts {
  const failing = CHECKS.filter(k => !w.fixed.includes(k)).length;
  return {
    isDraft: false, stackedOn: null, conflicts: false,
    ci: w.running ? 'pending' : failing ? 'failing' : 'passing', failingChecks: failing,
    reviewDecision: w.approved ? 'APPROVED' : 'CHANGES_REQUESTED',
    unresolvedThreads: THREADS.filter(k => !w.fixed.includes(k)).length,
  };
}
/** The demo's tally: what still blocks #482. */
export const tally = (w: World) => blockersOf(facts(w)).length;

/** The other rows of My PRs, as the plugin's list draws them. */
export function rows(w: World) {
  return OPEN.map(g => ({
    repo: g.repo,
    prs: g.prs.map(p => {
      const f: PrFacts = p.number === PR.number ? facts(w) : {
        isDraft: 'isDraft' in p && p.isDraft, stackedOn: ('stackedOn' in p && p.stackedOn) || null, conflicts: false,
        ci: ('ci' in p ? p.ci : 'passing') as Ci, failingChecks: 0, reviewDecision: ('reviewDecision' in p ? p.reviewDecision : null) as Review | null, unresolvedThreads: 0,
      };
      const blockers = blockersOf(f);
      return { ...p, facts: f, blockers, tone: rowTone(f, blockers), draft: f.isDraft };
    }),
  }));
}

/** The Open tab's totals (app.tsx): how many PRs have CI failing, unresolved comments, changes requested, nothing blocking. */
export function totals(w: World) {
  const all = rows(w).flatMap(g => g.prs);
  return {
    failing: all.filter(p => p.facts.ci === 'failing').length,
    unresolved: all.filter(p => p.facts.unresolvedThreads > 0).length,
    changes: all.filter(p => p.facts.reviewDecision === 'CHANGES_REQUESTED').length,
    ready: all.filter(p => p.blockers.length === 0).length,
  };
}

/** The prompt key for a set of findings (prData.gen.ts). */
export const promptKey = (keys: FindingKey[]) => inOrder(keys).join('+');

/** What the agent says it did, per finding. The agent is played by the demo; these lines are invented. */
export const AGENT_STEPS: Record<FindingKey, string> = {
  jitter: 'Jitter derived from the delivery id · retry.ts',
  gone: 'A 410 now stops the retries · dispatcher.ts',
  unit: 'Both retry tests pass · retry.test.ts',
  lint: 'markFailed imported · dispatcher.ts',
};
