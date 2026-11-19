// Every OpenUI Lang program the OpenUI Live Replies page shows, as an agent would write it. Pure data: the data
// script (motion-lab/products-directions/openui/ouidata.ts) runs each one through the plugin's real check_openui
// and oui.test.ts asserts they all came back clean. Invented content throughout; several are the plugin's own
// component examples, as marked.

/** One agent reply: a line of prose, then its block. */
export interface Reply { prose: string; program: string }

// ---------------------------------------------------------------- the demo's thread

export const ASK = 'Which job queue should we use for email sends?';

export const DECISION: Reply = {
  prose: 'Three of them fit. Weigh what matters to you, and I’ll go with your pick.',
  program: `root = Stack([d])
d = Decision([pg, redis, managed], ["Throughput", "Ops cost", "Delivery", "Local dev"], [3, 5, 4, 2])
pg = DecisionOption("Postgres queue", [4, 5, 4, 4], ["Runs on the database we already operate"], ["Polling adds load at high volume"])
redis = DecisionOption("Redis queue", [5, 2, 4, 4], ["Fastest of the three"], ["Needs a Redis with persistence"])
managed = DecisionOption("Managed queue", [4, 3, 5, 2], ["Nothing to run ourselves"], ["Hard to run on a laptop"])`,
};

export const PLAN: Reply = {
  prose: 'Here is how I’d move email sends onto it. Approve it and I’ll start.',
  program: `root = Stack([p])
p = Plan([s1, s2, s3, s4])
s1 = PlanStep("Add a Redis service with persistence", "Append-only file on, one replica.", ["infra/redis.yml"], "medium", "2h")
s2 = PlanStep("Queue email sends", "The send handler enqueues instead of sending inline.", ["src/email/send.ts", "src/queue.ts"], "medium", "3h")
s3 = PlanStep("Worker with retries", "Five tries with backoff, then the dead-letter list.", ["src/email/worker.ts"], "high", "4h")
s4 = PlanStep("Tests for retries and the dead-letter list", null, ["src/email/worker.test.ts"], "low", "2h")`,
};

/** What the agent says to each message a click can send in the demo. */
export const AFTER_APPROVE = 'Approved. Starting with step 1, the Redis service.';
export const AFTER_CHANGE = 'Sure. Which step would you change?';

// ---------------------------------------------------------------- morph: a CI reply, plain and live

/** The facts of one CI run, as an agent writes them without the plugin. `{key}` ties a line to its part of the UI. */
export const CI_TEXT = [
  '{title}CI failed on fix/checkout-rounding.',
  '{s-build}Build passed in 1m 14s.',
  '{s-test}Test failed after 3m 32s:',
  '{j-unit}  unit passed in 1m 36s,',
  '{j-e2e}  e2e failed in 1m 56s.',
  '{s-deploy}Deploy was skipped.',
  '{t-head}Checkout tests: 1 failed, 2 passed, 1 skipped.',
  '{t-1}- checkout > adds an item: passed',
  '{t-2}- checkout > removes an item: passed',
  '{t-0}- checkout > applies the promo code: failed. Expected total 42.50, received 45.00 (src/checkout.test.ts:88)',
  '{t-3}- checkout > pays with a saved card: skipped, needs the payments sandbox',
];

// The plugin's Pipeline and Tests examples, in one reply.
export const CI = `root = Stack([title, pipeline, tests])
title = TextContent("CI failed on fix/checkout-rounding", "large-heavy")
pipeline = Pipeline([{name: "Build", status: "passed", duration: 74}, {name: "Test", status: "failed", duration: 212, jobs: [{name: "unit", status: "passed", duration: 96}, {name: "e2e", status: "failed", duration: 116}]}, {name: "Deploy", status: "skipped"}])
tests = Tests([{name: "checkout > applies the promo code", status: "failed", message: "Expected total 42.50, received 45.00", file: "src/checkout.test.ts", line: 88}, {name: "checkout > adds an item", status: "passed"}, {name: "checkout > removes an item", status: "passed"}, {name: "checkout > pays with a saved card", status: "skipped", message: "needs the payments sandbox"}], "Checkout tests")`;

// ---------------------------------------------------------------- prompts: eight asks

export interface Ask extends Reply { id: string; chip: string; ask: string }

export const ASKS: Ask[] = [
  {
    id: 'waterfall',
    chip: 'Slow endpoint',
    ask: 'Where does the time go in GET /orders?',
    prose: 'Mostly in the database: the select takes 290 of the 420 ms. The last 30 requests look the same.',
    // the Waterfall is the plugin's own example
    program: `root = Stack([w, h])
w = Waterfall([{name: "GET /orders", start: 0, duration: 420}, {name: "auth check", start: 6, duration: 38, depth: 1}, {name: "db: select orders", start: 48, duration: 290, depth: 1}, {name: "render json", start: 342, duration: 70, depth: 1}], "ms")
h = Histogram([318, 342, 355, 361, 370, 377, 381, 388, 392, 396, 401, 404, 408, 411, 415, 418, 420, 423, 427, 431, 436, 442, 449, 457, 466, 478, 495, 520, 561, 640], null, "GET /orders, last 30 requests", "ms")`,
  },
  {
    id: 'release',
    chip: 'Release check-in',
    ask: 'How are the release workstreams doing?',
    prose: 'One on track, one at risk, one late, one done. The press kit is the one to chase.',
    // the plugin's own Status and Roadmap examples
    program: `root = Stack([s, r])
s = Status([s1, s2, s3, s4])
s1 = StatusItem("Marketing site", "on-track", 70, "Marta Rossi", "2026-11-13", "Pricing page in review; the rest is on staging.")
s2 = StatusItem("Onboarding", "at-risk", 40, "Jon Park", "2026-11-20", "Copy changed late; needs a call on checklist order by Monday.")
s3 = StatusItem("Press kit", "off-track", 60, "Ana Lima", "2026-11-06", "Founder photos missing; past the agency deadline.")
s4 = StatusItem("Billing v2", "done", 100, "Jon Park", "2026-11-06")
r = Roadmap([r1, r2, r3, r4, r5, r6, r7])
r1 = RoadmapItem("Brand refresh", "2026-10-05", "2026-10-23", "Design", "done")
r2 = RoadmapItem("Marketing site", "2026-10-19", "2026-11-13", "Design", "active")
r3 = RoadmapItem("Billing v2", "2026-10-12", "2026-11-06", "Product", "done")
r4 = RoadmapItem("Onboarding checklist", "2026-11-02", "2026-11-20", "Product", "at-risk")
r5 = RoadmapItem("Load test", "2026-11-16", "2026-11-25", "Infra", "planned")
r6 = RoadmapItem("Public beta", "2026-11-26", "2026-11-26", "Launch", null, true)
r7 = RoadmapItem("Launch day", "2026-12-03", "2026-12-03", "Launch", null, true)`,
  },
  {
    id: 'quiz',
    chip: 'Teach me',
    ask: 'Quiz me on HTTP caching.',
    prose: 'Three questions. Send me your score at the end and I’ll go over what you missed.',
    program: `root = Stack([quiz])
quiz = Quiz([q1, q2, q3])
q1 = QuizQuestion("Which header lets a cache reuse a response for an hour without asking the server?", ["Cache-Control: max-age=3600", "ETag: \\"v42\\"", "Vary: Accept"], 0, "max-age says how long the response stays fresh.")
q2 = QuizQuestion("A response came with an ETag. What does the browser send to check it later?", ["If-Modified-Since", "If-None-Match", "Cache-Control: no-cache"], 1, "If-None-Match carries the ETag back; a 304 means nothing changed.")
q3 = QuizQuestion("What does Cache-Control: no-store mean?", ["Keep it, but check before each use", "Never keep a copy", "Keep it for one day"], 1, "no-cache checks before each use; no-store keeps nothing at all.")`,
  },
  {
    id: 'trip',
    chip: 'Weekend trip',
    ask: 'Plan two days in Lisbon.',
    prose: 'Belém on day one, the old town on day two. Tap a stop for its note.',
    // the plugin's own Map example, with Alfama's place filled in
    program: `root = Stack([map])
map = Map([p1, p2, p3, p4, p5, p6], true, true)
p1 = MapPlace("Belém Tower", 38.6916, -9.2160, "Opens at 10:00; go early.", 1, "Belém Tower")
p2 = MapPlace("Jerónimos Monastery", 38.6979, -9.2068, "Cloister ticket needed.", 1, "Jerónimos Monastery")
p3 = MapPlace("LX Factory", 38.7036, -9.1784, "Lunch and bookshops.", 1)
p4 = MapPlace("São Jorge Castle", 38.7139, -9.1335, "Views over the river.", 2, "São Jorge Castle")
p5 = MapPlace("Alfama", 38.7111, -9.1300, "Walk down through the lanes.", 2)
p6 = MapPlace("Praça do Comércio", 38.7075, -9.1364, "Finish at the river.", 2)`,
  },
  {
    id: 'estimate',
    chip: 'Estimate it',
    ask: 'How long will the environments dashboard take?',
    prose: 'About 10 days, 11 to be safe. The dashboard UI is the widest range.',
    // the plugin's own Estimate example
    program: `root = Stack([e])
e = Estimate([t1, t2, t3, t4, t5], "d")
t1 = EstimateTask("Environments RPCs in server.ts", 1, 3, 1.5)
t2 = EstimateTask("Lazy per-row git status", 1, 4, 2)
t3 = EstimateTask("Dashboard UI", 2, 5, 3)
t4 = EstimateTask("Polling with backoff", 0.5, 2, 1)
t5 = EstimateTask("Non-git environments", 0.5, 3)`,
  },
  {
    id: 'pr',
    chip: 'Ready to merge?',
    ask: 'Is this branch ready to merge?',
    prose: 'Not yet. The checks are still running, and two things it claims haven’t been checked.',
    program: `root = Stack([pr, a])
pr = PullRequest()
a = Acceptance([c1, c2, c3, c4], ["Claimed", "Checked"])
c1 = AcceptanceCriterion("Retries stop after five tries", null, null, "src/email/worker.test.ts", ["passed", "passed"])
c2 = AcceptanceCriterion("Failed sends land in the dead-letter list", null, null, "src/email/worker.test.ts", ["passed", "passed"])
c3 = AcceptanceCriterion("Survives a Redis restart", null, "Not tried against a real restart", null, ["claimed", "untested"])
c4 = AcceptanceCriterion("Sends keep their order", null, "Two workers can reorder them", null, ["claimed", "failed"])`,
  },
  {
    id: 'app',
    chip: 'A tiny tool',
    ask: 'Make me a tip splitter.',
    prose: 'Here it is. Change the numbers; the button sends the split to this chat.',
    // the plugin's own App example, run for real in a sandboxed frame
    program: `root = Stack([app])
app = App("<style>\\n  .row { display: flex; gap: 8px; align-items: center; margin: 8px 0; }\\n  input { width: 80px; }\\n  output { font-weight: 600; color: var(--primary); }\\n  button { padding: 6px 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--card); color: var(--foreground); }\\n</style>\\n<div class='row'><label for='bill'>Bill</label><input id='bill' type='number' value='84'></div>\\n<div class='row'><label for='people'>People</label><input id='people' type='number' value='3' min='1'></div>\\n<div class='row'><label for='tip'>Tip %</label><input id='tip' type='number' value='15'></div>\\n<p>Each pays <output id='each'></output></p>\\n<button id='share' type='button'>Send this split to the chat</button>\\n<script>\\n  const read = (id) => Number(document.getElementById(id).value) || 0;\\n  function update() {\\n    const each = (read('bill') * (1 + read('tip') / 100)) / Math.max(1, read('people'));\\n    document.getElementById('each').textContent = each.toFixed(2);\\n    return each;\\n  }\\n  document.querySelectorAll('input').forEach((input) => input.addEventListener('input', update));\\n  document.getElementById('share').addEventListener('click', () => bbui.send('Split: ' + update().toFixed(2) + ' each'));\\n  update();\\n</script>", "Tip splitter")`,
  },
  {
    id: 'shader',
    chip: 'Something calm',
    ask: 'Make me something calm to look at.',
    prose: 'Slow ripples. It runs on your graphics card, right in the reply.',
    // the plugin's own Shader example
    program: `root = Stack([shader])
shader = Shader("void mainImage(out vec4 fragColor, in vec2 fragCoord) {\\n  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;\\n  float r = length(uv);\\n  float wave = 0.5 + 0.5 * cos(18.0 * r - iTime * 2.0);\\n  vec3 deep = vec3(0.06, 0.08, 0.14);\\n  vec3 light = vec3(0.35, 0.6, 0.95);\\n  fragColor = vec4(mix(deep, light, wave * smoothstep(0.7, 0.0, r)), 1.0);\\n}", "Ripples")`,
  },
];

/** Every program above by name, for the data script's check. */
export const ALL_PROGRAMS: Record<string, string> = {
  decision: DECISION.program,
  plan: PLAN.program,
  ci: CI,
  ...Object.fromEntries(ASKS.map((a) => [a.id, a.program])),
};
