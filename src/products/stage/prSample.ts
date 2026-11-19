// The PR Dashboard page's invented sample: the acme cast the plugin's own screenshots and film use.
// No imports, so the data script (motion-lab/products-directions/pr-dashboard/prdata.ts) can run it beside
// the plugin's code and write what the plugin makes of it to prData.gen.ts.

export const PR = {
  url: 'https://github.com/acme/payments-api/pull/482',
  repo: 'acme/payments-api',
  number: 482,
  title: '[PAY-214] Retry failed webhook deliveries with backoff',
  headRefName: 'pay-214-webhook-retries',
  baseRefName: 'main',
  author: 'sam-rivera',
};
/** The bb thread already working on the PR's branch, and its project. */
export const THREAD = { title: 'PAY-214 webhook retries', project: 'Payments API' };

const at = (hhmm: string) => `2026-11-19T${hhmm}:00Z`;
const comment = (id: string, author: string, body: string, time: string) => ({ id, canDelete: author === PR.author, author, avatarUrl: null, body, createdAt: at(time), url: `${PR.url}#discussion_${id}` });
const thread = (id: string, path: string, line: number, startLine: number | null, comments: ReturnType<typeof comment>[]) => ({
  id, path, side: 'RIGHT' as const, startLine, line, isPending: false, isResolved: false, isOutdated: false, resolvedBy: null,
  canToggleResolved: true, diffHunk: null, comments, awaitingReply: comments[comments.length - 1]?.author !== PR.author,
});
const job = (workflow: string, name: string, title: string, annotations: [string, number, string][]) => ({
  name, workflow, status: 'failing' as const, conclusion: 'FAILURE', title, summary: null,
  url: `https://github.com/acme/payments-api/actions/runs/9182/job/${name}`,
  annotations: annotations.map(([path, line, message]) => ({ path, line, level: 'failure', message })),
});

/** What blocks #482, in the PR's order (threads, then failed jobs), as the plugin's FixSubject. */
export const FINDINGS = [
  { key: 'jitter', who: 'mina-k', subject: { kind: 'thread' as const, thread: thread('r1', 'src/webhooks/retry.ts', 18, null, [
    comment('r1', 'mina-k', '`Math.random()` makes the schedule impossible to test. Can we inject the jitter, or derive it from the delivery id so a retry is reproducible?', '07:40'),
    comment('r2', 'sam-rivera', 'Good point. I’ll hash the delivery id into the jitter so the same delivery always waits the same time.', '08:10'),
    comment('r3', 'mina-k', 'Sounds good, thanks!', '08:25'),
  ]) } },
  { key: 'gone', who: 'priya-n', subject: { kind: 'thread' as const, thread: thread('r4', 'src/webhooks/dispatcher.ts', 52, 44, [
    comment('r4', 'priya-n', 'A 410 from the partner means the endpoint is gone for good. Should this stop retrying instead of backing off?', '08:40'),
  ]) } },
  { key: 'unit', who: null, subject: { kind: 'check' as const, check: job('test', 'unit', '2 tests failed', [
    ['src/webhooks/retry.test.ts', 6, 'expected 30 to be 33.4 (jitter is not deterministic)'],
    ['src/webhooks/retry.test.ts', 14, 'scheduleRetry › enqueues the next attempt: timeout after 5000ms'],
  ]) } },
  { key: 'lint', who: null, subject: { kind: 'check' as const, check: job('ci', 'lint', '1 error', [
    ['src/webhooks/dispatcher.ts', 31, "'markFailed' is not defined (no-undef)"],
  ]) } },
];
export type FindingKey = (typeof FINDINGS)[number]['key'];

/** Your open pull requests on the My PRs list, newest first in each repository. #482 is the demo's. */
export const OPEN = [
  { repo: 'acme/payments-api', prs: [
    { number: 482, title: PR.title, additions: 186, deletions: 42, updated: '26m ago' },
    { number: 479, title: 'Add idempotency keys to the refund endpoint', additions: 94, deletions: 8, updated: '2h ago', ci: 'passing', reviewDecision: 'APPROVED' },
  ] },
  { repo: 'acme/web-checkout', prs: [
    { number: 1207, title: 'Show saved cards first in the payment step', additions: 210, deletions: 77, updated: '56m ago', ci: 'pending', reviewDecision: 'REVIEW_REQUIRED' },
    { number: 1210, title: 'Animate the order summary when totals change', additions: 58, deletions: 14, updated: '1h ago', ci: 'passing', reviewDecision: 'REVIEW_REQUIRED', stackedOn: 1207 },
  ] },
  { repo: 'acme/mobile-app', prs: [
    { number: 331, title: 'Offline cart sync', additions: 412, deletions: 96, updated: '5h ago', ci: 'passing', reviewDecision: 'REVIEW_REQUIRED', isDraft: true },
  ] },
];

/**
 * A morning, for the alerts replay: what happens on GitHub to your open pull requests. The plugin checks
 * every few minutes and alerts on what changed: a CI job that starts failing, or a comment or review by
 * someone else (not you, not a bot, not an ignored name). `fails` is a job that starts failing at that time.
 */
export const MORNING = {
  from: '09:00', to: '09:50',
  events: [
    { at: '09:12', pr: 331, who: 'dependabot', bot: true, what: 'commented' },
    { at: '09:21', pr: 482, who: 'sam-rivera', what: 'commented' },
    { at: '09:27', pr: 1210, who: 'ci-helper', what: 'commented' },
    { at: '09:33', pr: 1207, who: 'GitHub Actions', what: 'test › unit failed', fails: 'unit' },
    { at: '09:41', pr: 482, who: 'mina-k', what: 'commented' },
    { at: '09:43', pr: 479, who: 'priya-n', what: 'reviewed' },
  ],
  /** Already failing when the plugin first looks: the first check only records it. */
  failing: { 482: ['unit', 'lint'] } as Record<number, string[]>,
};
/** The settings that change which alerts are made (the rest only change where they show). */
export const REPLAY_RUNS = { notifyCi: [true, false], notifyComments: [true, false], ignore: ['', 'ci-helper'], every: [5, 10] };
