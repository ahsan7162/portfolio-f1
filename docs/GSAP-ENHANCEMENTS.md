# GSAP enhancement and cleanup plan (v2, reviewed with genjutsu `cast`)

Status: **implemented** on branch `gsap-enhancements-plan` (`main` untouched). Every item below
is done, changed on your call, or skipped with a reason; see **Implementation status** right below.
The rest of the doc is the plan as agreed, kept for the reasoning.

## Implementation status (2 Oct 2026)

| Item | Status | Commit |
|---|---|---|
| 1.3 Content C1–C7 (hero pill, Performance and Frontend/Backend removed, promotions stat removed, Results last, data-driven bento, helmet path, menu, track map) | Done | `ceab427` |
| Section 0 tokens (5 durations, 4 eases, `--dur-hit/split/wipe` in CSS) | Done | `3ce6983` |
| 2.3 anchor-jump fix · 2.1 quickTo tilt · 2.4 UI under 0.5 s · 2.5 submenu Flip · 2.11 tap targets | Done. Measured: menu open 0.49 s, close 0.28 s; dialog open 0.5 s, close 0.35 s; menu links 44 px | `e13e361` |
| 2.2 Lap snap | Done, **through Lenis** on `scrollEnd` (ScrollTrigger's own snap scrolled the window and Lenis undid it); never interrupts a scroll in progress | `ab863f6`, `1d77f3f` |
| Lap feel (after review: "laggy") | Measured 120 fps with no dropped frames, so the lag was design, not GPU. The camera ran a fixed 2.2 s glide per stage (it kept moving after you stopped); it is now **scrubbed to the pin** (scrub 0.5), so the lap stops when you stop. The 3D scene now takes over **before** the pin behind a veil in its own background colour that clears as the section scrolls in, and closes over the last quarter screen of the pin, so arrival and exit fade instead of cutting. Heading and first stage arrive with it | see git log |
| Lap card switches (after review) | Cards switched only at the halfway line (~160 px from a snapped stage). Now direction-based intent: a short scroll (18% of a band) switches at once, measured ~110 ms for a 71 px nudge both ways; gapless crossfade; the snap settles on the card's own stage | `0cb4976` |
| Logo marquee (after review: laggy) | One `gsap.ticker` function eases toward Lenis's velocity (frame-rate independent) instead of a new tween per scroll update; frame-to-frame speed change < 0.75 px | `9f902d1` |
| Dialogs (after review: laggy) | Page content memoized, so opening or closing no longer re-renders the whole site (first frame 39 → 16 ms, close end 52 → ~26 ms); wipe is a `clip-path` circle instead of a ~46M-pixel scaled layer | `b3c84ba` |
| 2.10 section openers | Done (Experience heading wipes with its tiles, Projects heading wipes up, Tech stack has none; hero keeps the char rise) | `06d0ab5` |
| 1.1 drop Motion | Done. `motion` uninstalled; main chunk **174 → 127 KB gzip**, GSAP chunk 63 → 73.5 KB (Flip, ScrambleText), about **37 KB gzip less** overall | `1ccf1b9` |
| 1.1 terminal | **Replaced by an architecture diagram** (your call): React chat → Go core → Python runtime (CPU icon) → OpenAI, Anthropic, + more; Slack, Jira and CI/CD deploy from the Go core. Semantic search left out | `1ccf1b9` |
| 1.1 beams | One-shot DrawSVG lines on all three diagrams; hover sends one dot along the request path, **0.45 s per line** (slowed after review) | `1ccf1b9`, `ab863f6` |
| 2.7 hover sector line | Done (DrawSVG rect, retracts quicker on leave) | `1ccf1b9` |
| Marquee | Scroll-velocity only, coasts to a stop. Two copies, the second reuses the first's paths (`<use>`), so the prerendered HTML stays at ~123 KB | `1ccf1b9`, `744b34c` |
| 1.4 tells | Tile numbers and both em dashes gone. **Mono on buttons and pills: kept** as a deliberate pit-wall UI (added to the allowed patterns below) | `f4ecf3b` |
| 1.5 small removals | `ignoreMobileResize` removed (the installed GSAP 3.15 source already defaults it on for touch); Projects `lg:mt-40` → `lg:mt-24` | `f4ecf3b` |
| C8 + 2.6 Results and education | Done, **then redesigned on your review**: one row in order **education → 3rd place award → ~300× → 4+**, then the 450+ finale. **No P2,520 → P3 counter, no field bar, no Details button**: the podium is the award visual (steps rise 2nd, 1st, 3rd; P3 fills red; its 3 rises in). Helmet "nod" dropped | `1d77f3f`, `63371dc` |
| 2.12 helmet on the P3 step | Done, **as the main design rather than an optional last commit** (your call): the Stage reads the step's rect every frame and blends the helmet onto it with a scrubbed weight `perch.k`. It lands as the section arrives, sits at about the step's width with its measured bottom edge on the step, and glides to the finale pose over about 700 px of scroll (lengthened after review), arriving as 450+ settles. Desktop and phones | `63371dc`, `933e731` |
| 2.8 shared title | Done: card title flies into the dialog heading (FLIP, one uniform scale so text never stretches) | `933e731` |
| Magnetic arrows | Done: hero pill arrow and See all projects arrow (fine pointers only) | `933e731` |
| 2.9 footer reveal | **Skipped.** Sections are transparent over the WebGL background, so Contact can't show "from underneath" without making Results opaque and hiding the contour background | — |
| Extra (your call) | About's Now / Before / Education strip removed | `63371dc` |

**Bugs found and fixed on the way:**
- `splitReveal` with a `timeline` returned the whole timeline from `onSplit`; SplitText reverts that on re-split (fonts, resize), which killed the podium timeline. It now returns its own tween (the hero intro had the same latent bug).
- In dev (StrictMode), opening the page on a `#hash` and scrolling up left the hero pill and name hidden. `skipIntro()` now renders 0 → 1, and the intro timeline is created outside any section's context.

**Verified:** `tsc` and `vite build` pass; console clean; `?nomotion` shows all text and loads no three.js; no horizontal scroll at phone width; menu and dialog timings measured from the live timelines; Lap snap lands on 0.5; headless 1440×900 and phone screenshots of the diagrams, podium, helmet perch and finale.
**Still for you to check** (I can't measure these): frame time in DevTools during a full scroll, OS "Reduce motion", and a real iPhone and Android pass over the pins, snap and helmet perch.

---

How this was put together:
- v1: I ran the dev server, scrolled every section at 1440×900 and 375×812, checked the ScrollTrigger setup
  live (103 triggers, 3 pins, page about 14.9k px tall on desktop), read every motion file and section, built
  the bundle, and checked it against the official GSAP skills.
- v2: I reviewed the plan with the genjutsu `cast` pipeline (modules: motion-principles, gsap, tells,
  mobile-principles, design-audit) and ran `audit.py --group tells` on `src/`. **What changed since v1** is
  summarised at the end.
- v3: **a live pass on the running site with genjutsu and the GSAP skills.** I read real durations from
  GSAP's live timelines, measured tap targets and monospace use on the rendered DOM at 1440 and 375 px,
  re-read every heading on the page, and checked the `?nomotion` path. New findings are marked **(live)**.
  Limit: the browser pane was hidden, so frames didn't advance. Durations come from the live timeline
  objects, not a stopwatch, and the dialog-open time (built inside a rAF) comes from the code.

---

## 0. Interaction thesis (needs your yes before any code)

> **Motion works like F1 timing. Scrolling drives the race: scrubbed, `ease: none`, locked 1:1 to the
> scroll. Each discrete event lands like a sector split: one hit, `expo.out`, 300 ms or less. Nothing loops
> unless it reports something live. Everything runs on one GSAP ticker, using 5 durations and 4 eases.**

**Allowed patterns** (deliberate devices, so the tells audit doesn't flag them): mono timing labels
(sector, years, stat labels), the chequered strips, the
"04" ghost number and "Grid slot 04" (driver number), the red glow on the lights-out line in the intro only,
the 01–07 numbers in the full-screen menu (they navigate), the red accent on one word per heading, and
**mono buttons and tags** (pit-wall UI; decided 2 Oct 2026).

Every item below is checked against this sentence. Anything that doesn't follow it is cut or changed.

### Motion token system (new, comes from the thesis)

The audit counted **26 different durations** in the code (`0.05` … `2.2` s). `tokens.ts` already has
`DUR` and `EASE`, but most call sites hardcode values. Target:

| Token | Value | Used for |
|---|---|---|
| `DUR.hit` | 0.15 s | hover, press, toggles (also the CSS `--dur-hit`) |
| `DUR.split` | 0.3 s | UI events: menu rows, dialog content, Lap stage swap |
| `DUR.wipe` | 0.45 s | menu or dialog open wipe (UI, so at most 500 ms) |
| `DUR.reveal` | 0.9 s | one-off scroll reveals (each heading plays once per visit) |
| `DUR.show` | 1.6 s | intro and hero only (plays once ever) |

| Ease | Use |
|---|---|
| `EASE.none` | everything scrubbed to scroll |
| `EASE.out` (`expo.out`) | anything entering |
| `EASE.in` (`power2.in`) | anything leaving, which is always quicker and quieter than the entry |
| `EASE.wipe` (`expo.inOut`) | clip-path and circle wipes |

`back.out` (`EASE.settle`) is used only for the podium. Drop it, or keep it as the only bounce on the page
and say so in the thesis.

---

## Part 1: Remove what isn't needed

### 1.1 Drop `motion` (Framer Motion) and run all JS animation on GSAP (high value)

Two animation runtimes ship today (GSAP and Lenis are 63 KB gzip; Motion is inside the 175 KB gzip main
chunk). Motion is only used by 7 Magic UI leaves. **But don't port them one for one.** The tells review
shows that several of them shouldn't survive in their current form:

| Component | Tells verdict | What to do instead |
|---|---|---|
| `number-ticker.tsx` | ok, real figures | Use the existing `digitRoll()` (sector-timer digits), which the promo tile already uses |
| `hyper-text.tsx` | ok on the TrackMap label (it shows the current section) | **ScrambleTextPlugin**, `DUR.split`. Nav logo: play on hover only, never on load |
| `terminal.tsx` | **Tell: fake product drawn in divs.** It "types" invented commands (`agents create support-triage`) | Replace it with a **real screenshot or short screen recording** of the agent platform (the `TODO(screenshots)` already in `ProjectVisuals.tsx`). If none can be shown, use an honest architecture diagram like the other two cards. Don't rebuild the fake terminal in GSAP (this replaces v1 item 2.6) |
| `animated-beam.tsx` | the diagrams are real architecture (Kafka → OpenSearch → MFE), **but the beams loop forever and report nothing** | Draw each path **once** with DrawSVG on view (`DUR.reveal`, staggered), then leave it static. On hover, send **one** pulse along the path (MotionPathPlugin dot, `DUR.wipe`). No infinite loop |
| `border-beam.tsx` | **Tell: perpetual motion** (`repeat: Infinity`) | On hover, a single **sector line** draws around the card once (DrawSVG on an SVG rect, `DUR.wipe`) and stays drawn while hovered. On leave it retracts with `EASE.in` |
| `magic-card.tsx` | duplicate of `useBentoPointer` | Delete it and use the bento hook on the project grid |
| `scroll-based-velocity.tsx` | a logo wall that loops forever reports nothing | **Scroll-driven only:** the marquee moves with scroll velocity (`ScrollTrigger` `getVelocity` → `quickTo` on `timeScale`) and **coasts to a stop when scrolling stops**, the way a car only moves while racing. Uses the GSAP `horizontalLoop` helper |

**Expected result:** one engine, one ticker, and an estimated 35–45 KB gzip less JS (an estimate; I'll
measure before and after with `vite build`). Remove the "GSAP never targets Magic UI" boundary rule in
`patterns.ts` and the README, plus `useOnScreen`'s mount and unmount use for the beams.
`npm uninstall motion` runs only after you say yes.

### 1.2 GSAP-only, with two exceptions

- **CSS keeps simple hover and focus colour transitions** (about 30 Tailwind `transition-colors` classes).
  The gsap module itself says GSAP is "overkill" for a hover or simple toggle. They work without JS, focus
  styles come free, and Tailwind v4's `hover:` already applies only on hover-capable devices, so touch is
  fine. Put them on `--dur-hit` so CSS and GSAP share the same timing.
- **Lenis stays.** It's already driven by the GSAP ticker. ScrollSmoother would need wrapper elements and
  would risk the 3 pins and the fixed nav, track map and canvas, for no visible gain.
- The two CSS keyframes go: `animate-ping` (see 1.4) and `fade-in` (it disappears with the border beam).

### 1.3 Content changes (your decisions, 2 Oct 2026)

**New page order:** Hero → About → Career timeline (Lap) → Work experience (bento) → Projects → Tech stack
→ **Results and education** (Education merged into Results, see C8) → Contact. The menu goes from 10 entries to 7.

| # | Decision | What it touches |
|---|---|---|
| C1 | **Hero: the "Now" card becomes a pill**, "Currently at Careem" | `Hero.tsx`: remove the card, `useOnScreen` and the `animate-ping` loop (this also settles the ping tell in 1.4). The pill enters with the hero's `data-hfade` group. Its dot is **static**. Suggestion: keep it a button that opens the Careem breakdown, so the deep link isn't lost |
| C2 | **Keep the Lap with its stage cards and Details buttons** | No change to `Lap.tsx` content |
| C3 | **Keep the Experience bento as its own section, right after the Lap** | Decided (a), see below |
| C4 | **Remove the Performance section** (timing table) | Delete `Performance.tsx` and its `deltas` data. The measured results stay crawlable through the project and archive breakdowns (`CrawlableDetails`). Plan items **2.6** (counters) and the Performance row of **2.10** are dropped |
| C5 | **Results: remove the "Promotions in 30 months" stat** | `stats.grid` in `data.ts`. Promotions still show in the Lap (Astera "3 in 30") and the Experience promo tile, so the fact isn't lost |
| C6 | **Remove the Frontend / Backend section** (Tech stack already covers it) | Delete `Disciplines.tsx` and the `disciplines` data. This removes **one of the 3 pins** (2 left: About, Lap). Plan item **2.2** snap now applies to the Lap only, and the Disciplines entry in **2.4** is dropped |
| C7 | **Move Results in numbers to the end** (before Contact) | `App.tsx` order, plus the knock-on effects below |
| C8 | **Merge Education and awards into Results** ("they're all results"), ordered university years → career → 450+ finale. The Alibaba award gets its own explained, animated moment | Delete `Education.tsx` (its podium, the P3 ghost and the copy move into `Results.tsx`). Full design in **2.6** |

**Knock-on effects (all need doing in the same commit, or the page breaks):**
- **The 3D helmet path** (`src/gl/helmetPath.ts`) is timed against `#skills-overview` (the flight away) and
  `#results` (where it comes back and turns). After C6 and C7, the "away" segment loses its trigger, and the
  helmet would sit off-screen through the whole middle of the page. New segments:
  hero → about → about2 (About pin, unchanged) → **away on `#timeline`** (the Lap's 3D track takes over the
  stage) → **back as the Results and education section starts** and **stays for the whole section**, turning
  to "present" each achievement → exit as Contact arrives. Full design in 2.6 ("The driver's helmet").
- **Menu** (`Nav.tsx` `MENU`): remove `skills-overview`, `performance` and `education`; move `results` to the
  end, labelled "Results and education". The menu numbers renumber themselves. Keep an `id="education"` on
  the education block inside Results, so old `#education` links still land.
- **Track map** (`TrackMap.tsx` `SECTIONS`): same edits. The dot's lap is page-wide, so nothing else changes.
- **Section backgrounds** (`data-bg` on each section, which the WebGL stage blends between): re-check the
  colour order once the sections move. Results takes `#0b0b0c,#101114` and then hands over to Contact's `#070708`.
- **Results stats (decided):** `450+` AI agents shipped (the giant finale number), `~300×` faster agent
  builds, `4+` years in production. "Measured speed-ups: 7" is dropped with the Performance table, and
  promotions per C5.
- **Each number now lands about once:** "~300×" only in Results (Performance and Disciplines are gone),
  "450+" in the Lap (Careem stage) and the Results headline. That's acceptable: one is the story, the other
  is the finale.
- **The page gets about 3k px shorter** on desktop (Disciplines about 1.5k, Performance about 1.1k, and
  merging Education saves roughly another 0.4k), and one pin fewer means less scroll to get through.

**C3 decided: (a).** The Experience bento stays as its own section **directly after the Lap**. Why: the
Lap takes a lot of scroll per job, so the bento is the quick, clickable overview of **every** job right after
you've watched the lap, and it's the place that grows when you add experience later.

Adding a job should only mean adding data, so two small changes go with it:
- **Bento layout from data, not ids.** `LAYOUT` in `Experience.tsx` is keyed by `careem`, `xtel` and
  `astera`, so a 4th job falls back to a plain half-width tile. Derive it instead: the newest job is the
  lead tile, the rest fill the 6-column grid in pairs, and the promotions tile stays last. Also, the
  tile-clip reveal and `useBentoPointer` already work for any number of tiles.
- **The Lap scales on its own** (pin length is `n × 35%`, sectors come from `timeline`), but past about 4
  jobs the pin gets long. The plan's 2.2 snap keeps each stop clean. If it ever passes 5, show only the
  latest 4 sectors in the Lap and leave the full history to the bento.

### 1.4 Tells found in the current code (listed for you, not changed without a yes)

| Finding | Where | Verdict and suggestion |
|---|---|---|
| Perpetual `animate-ping` on the "Now" dot | `Hero.tsx` (status dot) | **Settled by C1:** the card becomes a pill with a static dot |
| **(found while planning C5)** Em dash in the promotions copy: "at Astera — associate to SE II" | `data.ts` `promotions.text` (shown on the Experience promo tile) | Same tell as the Experience dates. Use a comma or "from" |
| Glow | `Intro.tsx` red line `shadow-[0_0_24px…]` | **Allowed by the thesis** ("the red glow on the lights-out line in the intro only") |
| Numbered tiles `01 02 03`, `01…06` | Project cards (`Projects.tsx`), Tech stack tiles (`TechStack.tsx`, `padStart(2,'0')`) | Numbered eyebrows nobody navigates by. Remove them (the menu numbers stay, see the thesis) |
| Fake product in divs | Terminal card | See 1.1 |
| Copy in JS data (`content/data.ts`) | — | The script can't read it. I'll re-read it against "hollow copy" and "round figures" when we touch content in 1.3 |
| **(live)** Em dash in visible dates: "2025 — now / Karachi" | `Experience.tsx` `span()` does `years.replace(' to ', ' — ')` | The audit script missed it (the string is built in JS). It's also **register drift**: every other date on the page reads "2025 to now". Keep "to" |
| **(live)** Monospace beyond timing labels | every `.btn` (View projects, Download CV, Details…), all stack pills, the contact links | Measured share of mono text: Tech stack 40 of 51 text nodes, Contact 8 of 10, Projects 49 of 123. The thesis allows mono **timing labels**, not buttons and pills. Either add "mono buttons and tags (pit-wall UI)" to the allowed patterns, or set buttons and pills in the sans. **Your call** |
| **(live)** Same layout family for section openers | Experience, Projects, Tech stack and Education (and the removed Performance) all open with the same giant all-caps `display` h2 **and the same char-by-char SplitText rise** | See 2.10 |

### 1.5 Small removals

- `ScrollTrigger.config({ ignoreMobileResize: true })`: reportedly the default since GSAP 3.10. I'll verify
  this against the GSAP docs before deleting it.
- Projects section is about 2,470 px tall on desktop. Reduce the `lg:mt-40` offset (to about `lg:mt-24`) and
  keep the parallax.

---

## Part 2: GSAP enhancements

Ordered by impact per effort. Every item respects `motionEnabled()`, `matchMedia` and the touch checks.

### 2.1 Bento tilt and spotlight with `gsap.quickTo` (small)
`useBentoPointer` writes `style.transform` directly, so the tilt jumps to the cursor and snaps flat on
leave. Use `quickTo(rotationX/rotationY, { duration: DUR.split, ease: 'power3' })` with
`transformPerspective: 1000`. Leaving eases back to 0 (`EASE.in`). The spotlight `--mx/--my` trails slightly
in the same way. Only on `(hover: hover) and (pointer: fine)`.

### 2.2 Snap the pinned step sections (small)
The Lap (3 steps) can stop between steps. (Disciplines had the same issue; it goes away with C6.) Add
`snap: { snapTo: 1 / (n - 1), duration: { min: 0.2, max: 0.45 }, ease: 'power2.inOut', delay: 0.05 }`,
so every stop lands on a sector split. The About scrub stays free.

### 2.3 Fix blank sections after menu and anchor jumps (bug, small)
Jumping straight to Education left it blank for about 1 s while its `once` reveals played after landing. In
`useAnchorNav`, before scrolling, finish the reveals above the target:
```ts
ScrollTrigger.getAll().filter(t => t.vars.once && t.start < targetY).forEach(t => t.animation?.progress(1));
```

### 2.4 Bring UI transitions under 500 ms (new, from motion-principles)
UI that's used many times should be quick. Measured **(live)** from the running timelines:

| Interaction | Now | Target |
|---|---|---|
| Menu open | **1.32 s** (live timeline) | ≤ 0.5 s: `DUR.wipe` wipe, rows `DUR.split` with a 0.02 stagger |
| Menu close | **≈ 0.73 s** (1.32 s reversed at `timeScale(1.8)`) | ≤ 0.3 s: rows drop with `EASE.in`, then the wipe closes |
| Dialog open | ≈ 1.0–1.1 s (from code: 0.8 s circle, content from 0.18 s plus stagger) | ≤ 0.5 s: circle `DUR.wipe`, content `DUR.split` at 0.12 s |
| Dialog close | **0.60 s** (live) | ≤ 0.35 s: content `EASE.in` 0.15 s, circle 0.3 s |
- Lap stage swap 0.7 s → `DUR.split`. (The Disciplines panel swap goes away with C6.)
- The Lap camera's 2.2 s glide is scroll-paced 3D, so it stays.

### 2.5 Nav submenu: stop animating `height` (new, from motion-principles)
`Nav.tsx` tweens the work-experience list's `height` (a layout property, the only one on the site). Use
**Flip** (`Flip.getState` → toggle → `Flip.from`, `DUR.split`) or `grid-template-rows: 0fr → 1fr` with the
rows rising in `yPercent`, so nothing below the list has to re-layout on every frame.

### 2.6 Results and education: the finale (C8, medium)

One section, read top to bottom as **university years → career → headline number**, ending right before
"Let's build something fast". The h2 is **"Results and education"**, plain terms for search and
recruiters, with the F1 flavour kept in decoration (`aria-hidden`).

```
RESULTS AND EDUCATION                              (h2)
├─ 1. Podium row
│    ├─ 3rd place, Alibaba Cloud Global Challenge  (h3, the lead block, wider)
│    │    position counter P2,520 → P3, podium steps, explanation, Details →
│    └─ Education                                   (h3, id="education", beside it)
│         BS Computer Science, FAST-NUCES · 2018 to 2022 · CGPA 3.58 / 4.00 · Dean's list
├─ 2. Stat row       ~300× faster agent builds     4+ years in production
└─ 3. Finale         450+  AI agents shipped on a platform I built   (giant number, helmet faces you)

   The helmet arrives as the section starts and stays in the right-hand column throughout.
```

#### The Alibaba award moment: explained, not just decorated

**What the visitor reads** (all from `data.ts`, nothing invented):
- **3rd place, Alibaba Cloud Global Challenge (2021)**
- **Out of 2,520 teams worldwide**, with a weather-forecasting solution built on Alibaba Cloud and machine
  learning.
- A **Details →** button that opens the existing "Weather forecasting AI" breakdown (it's already in the
  archive), so the full story is one click away, using the same circle-wipe dialog as everything else.
- *Needs you:* if you want more than one sentence (what the model predicted, the data, the round structure,
  team size), send me the facts. The tells rules forbid inventing them.

**How it moves.** It's the one place on the page where the "race" metaphor is literally true, so it gets
a real race sequence. Two parts, following the thesis (the scroll drives it, the result lands as a split):

| Beat | Trigger | GSAP |
|---|---|---|
| **a. The climb** (scroll-driven) | `start: 'top 75%'`, `end: 'center 55%'`, `scrub: 0.5` on the award block | A big position counter **P2,520 → P3** rolls down as you scroll: a tween of `{ pos: 2520 → 3 }` with `snap: { pos: 1 }`, plus an **`expo.out` ease inside the scrub** so it races through the thousands and slows for the last few places, the way positions settle at the end of a race. The number is written straight to the DOM in `onUpdate` (no React state). Beside it, a thin **field bar** of 2,520 → 3 shrinks with `scaleX` (transform only), showing how much of the field is behind you |
| **b. The podium** (discrete, once) | `onLeave` of the climb (that is, when P3 is reached), or `once: true` at `center 55%` | One timeline: the three podium steps grow (`scaleY` from 0.05, never 0, staggered 2nd → 1st → 3rd, `DUR.split`, `EASE.out`; `back.out` only here, if the thesis keeps `EASE.settle`); the **P3 step fills with the accent red** (`clipPath` bottom → top, `EASE.wipe`); the "3" on it rolls in with `digitRoll`; then the explanation lines and the Details button rise (`DUR.split`, stagger 0.05) |
| **c. Afterglow** | scrubbed, the whole section | The giant ghost **"P3"** outline (from Education) drifts behind the podium (`yPercent 20 → -20`, `EASE.none`), as it does today |

**Scrolling back up:** the climb un-scrubs (P3 → P2,520), and the podium stays built (`once`). It's an
achievement, not a toggle.

**Reduced motion / `?nomotion`:** the static markup reads "3rd of 2,520 teams" with the podium already
built and the P3 step red. Nothing is hidden in CSS, the same rule as the rest of the site.

**Phones:** the podium row stacks (award first, then education). The climb uses the same scroll range, and
the counter is sized with `clamp()` so "P2,520" fits at 375 px without wrapping.

#### The rest of the section
- **Education block:** quieter on purpose. Its lines rise once (`type: 'lines'`, `DUR.reveal`) as the
  podium finishes, so the eye goes award → degree.
- **Stat row:** `~300×` and `4+` roll with `digitRoll()` (sector-timer digits), staggered `DUR.split`, once.
  Two items in a two-column row; on phones too.
- **Finale:** the existing giant **"450+"** scrubbed char rise stays, and the helmet turns to face you as it
  lands (see below), then the helmet exits as
  Contact arrives.
- Only `transform`, `opacity` and `clip-path` are animated. No loops. Two ScrollTriggers for the award (the
  climb and the podium), one for the stats, and the existing ones for 450+. No new pin.

#### The driver's helmet: present for every achievement (your call)

The helmet is the driver, so it **arrives when the section starts** and stays while the achievements are
shown. One scrubbed path through the section, in three beats that follow the content:

| Beat | Scroll range | Helmet pose | Why |
|---|---|---|---|
| **Arrive** | section `top bottom` → `top 20%` | flies in from the `away` pose (where it's been since the Lap) to a new **`podium`** pose: right column, turned about 30° toward the award | It arrives *as the climb starts*, so P2,520 → P3 plays with the driver watching |
| **Podium → stats** | award block → stat row | turns slowly from the award toward the stats (`ry` scrubbed, `EASE.none`); a small nod (`rx` +0.08) as the P3 step fills red | One continuous turn, no stop and start, so it reads as the same driver looking along the results |
| **Finale** | `[data-bignum]` entering → centre | settles into the current **`results`** pose, facing camera, as "450+" rises | The headline number and the driver face you together: the closing shot |
| **Exit** | section `bottom 85%` → `bottom top` | the existing `exit` pose as Contact (the finish) arrives | Unchanged |

What this needs:
- **Two new poses** in `helmetPath.ts` (`podium` for desktop and mobile). `results` and `exit` are reused.
  The segments become: `away → podium` (section start), `podium → results` (scrubbed across the section),
  `results → exit` (unchanged).
- **Layout room for it.** On desktop (≥ 1024 px, where the side-by-side poses apply), the section's content
  sits in the **left about 60%**, and the right column is left empty for the helmet, the same as the
  current Results ("450+" left, helmet right). Without this, the helmet would cover the education block.
  On phones and tablets the helmet uses the existing mobile poses (small, low on the right), and the stacked
  content keeps a little bottom padding so the helmet never sits on text.
- **No new pin**, and it stays off with `?nogl`, reduced motion and weak devices (the existing `glEnabled()`
  gate). Without WebGL the section reads the same, just without the helmet.
- **Extra, approved and scheduled last (2.12):** the helmet drops onto the P3 step at the podium beat.

### 2.7 Project card hover sector line (medium, part of 1.1)
See the border-beam row in 1.1: one DrawSVG stroke around the card on hover, retracting on leave. It
replaces the infinite beam.

### 2.8 Card to details: Flip shared title (optional)
`Flip.from` moves the project title from the card into the dialog heading, alongside the circle wipe, in
`DUR.wipe` or less. It touches dialog focus logic, so it comes last.

### 2.9 Footer reveal (optional)
Contact is pinned under Results and education (`pinSpacing: false`) and shows from underneath, like the finish line
coming into view. Only when the footer fits the viewport (`fitsViewport`).

### 2.10 Give each section opener its own entrance (live, medium)
On the rendered page, 5 section headings (Experience, Performance, Projects, Tech stack, Education) used the
**same** `splitReveal(h2, { type: 'chars' })` at the same size. By the third one it reads as a pattern, not
a moment. Keep the char rise for the **hero only** (it plays once, at `DUR.show`). For the others, use
an entrance that comes from what the section shows:

| Section | Entrance (GSAP) |
|---|---|
| Experience | The lines wipe in with the tiles' clip (`clipPath` left to right, the same timeline as the tile stagger), so heading and grid read as one block |
| Projects | Lines rise once; the "Projects" word gets the card clip-reveal |
| Tech stack | No heading animation: the marquee coming in is the entrance (scroll-driven, see 1.1) |
| Results and education | No heading animation: the award climb (2.6) is the entrance |

Fewer distinct effects overall, each one tied to its content. It also removes 4 char splits (the most
expensive split type).

### 2.11 Tap targets in the menu (live, small)
Measured on the rendered menu: **GitHub and LinkedIn links are 16 px tall and the email link is 26 px**,
so the social links are under 24 px tall (they may still pass AA thanks to the 24 px gap between them, but they're far from the 44 px phone target). Pad them to 44 px (`min-h-11` plus
inline-flex), the same as the nav bar button. Every other control measures 40–42 px.

### 2.12 The helmet lands on the P3 step (approved; the **very last commit**, easy to revert)

At the podium beat (2.6 b), instead of only nodding from the right column, the helmet **drops onto the red
P3 step**, stays for a moment, then lifts back to its column and carries on turning toward the stats.

**How:**
- The helmet pose is in viewport units (`x`, `y` from -1 to 1, `s` scale). A function **reads the P3 step's
  `getBoundingClientRect()`** and converts its top-centre to a pose (`x = (cx / innerWidth) * 2 - 1`,
  `y = 1 - (top / innerHeight) * 2`, with a scale sized to the step's width).
- That pose is a **function-based value** in the scrubbed `podium` segment
  (`x: () => stepPose().x`, with `invalidateOnRefresh: true`), so ScrollTrigger re-measures it on every
  refresh (resize, fonts, pins).
- Sequence inside the existing scrub: `podium` → **`onStep`** (drop: `y` falls onto the step top, a small
  `rz` tilt settling to 0, eased `power2.out` within the scrub) → hold for about 10% of the range → lift back
  to `podium` → continue to `results`. Still one scrubbed path: scrolling back up replays it in reverse.
- The step and the helmet must agree on timing: the drop starts only once the podium timeline (2.6 b) has
  built the steps. Simplest is to let the podium's `once` trigger sit just before the drop's scroll range.

**Guard rails (when it doesn't run, it falls back to the plain 2.6 version):**
- Desktop only (≥ 1024 px). On phones the step is too small and the helmet would cover the award text.
- Not when the step is off screen at that scroll point (short screens): the pose function returns the plain
  `podium` pose.
- Off with `?nogl`, reduced motion and weak devices, like all WebGL.

**Why it's last and on its own:** it's the only place a 3D pose depends on DOM layout, so it's the most
likely piece to need tuning or to go wrong (font swap, resize, pin spacing). As a single commit touching only
`helmetPath.ts` (plus one `data-p3step` attribute), **reverting it leaves the 2.6 helmet fully working**.

### Dropped or reduced since v1
- **Global scroll-velocity skew on all display headings: dropped.** It's a category default (the
  guessability test), and skewing 10 large headings hurts readability. The velocity idea lives on only in the
  marquee (1.1), where it means something.
- **Magnetic buttons: reduced** to the two round "→" buttons (hero Now card, See all projects), on
  `(hover: hover) and (pointer: fine)` only, with `quickTo` at `DUR.split`. Optional.
- **GSAP terminal rebuild: dropped.** It would polish a tell (see 1.1).

---

## Suggested order (one commit each, so any one can be dropped)

1. **1.3 content changes first** (C1–C7 plus the helmet path, menu, track map and backgrounds, in one
   commit so the page never breaks): there's no point polishing sections that are about to go
2. **Tokens** (section 0): `DUR`/`EASE` values and `--dur-hit`, then replace hardcoded values. Nothing should
   look different except quicker UI
3. **2.3, 2.2 (Lap only), 2.1, 2.4, 2.5, 2.11**: bug fix, feel and tap targets, no new dependencies
4. **2.10**: section openers (after the tokens, since it uses them)
5. **1.1**: remove Motion component by component (ticker → hyper-text → magic-card → border-beam as
   sector line → marquee → beams as one-shot draw), then terminal → screenshot (**needs your asset**),
   then `npm uninstall motion`, then compare bundle sizes
6. **1.4**: the tile numbers and em dashes go
7. **2.6** Results and education finale (with the Alibaba award sequence), then the optional **2.8 / 2.9 / magnetic arrows**
8. **2.12 helmet lands on the P3 step: the very last commit**, on its own, so a single `git revert` removes it

## Verification per step

Checked by me in the browser preview, with evidence: console clean, ScrollTrigger count, `?nomotion` static
path, 375 / 768 / 1440 widths with no horizontal scroll, and `vite build` sizes.

Already checked in the live pass **(live)**:
- `?nomotion`: 10 ScrollTriggers left (nav state and track map only), all section content visible (the only
  hidden node is the inactive Disciplines panel, which is intentional), and three.js **not** downloaded. Pass.
  (Rerun after the content changes in 1.3.)
- 375 px: no horizontal scroll. Pass.
- Rendered headings: each company h3 shows twice on screen (Lap and Experience) plus once in the hero card;
  the crawlable copies are `hidden="until-found"` and don't show. This confirms 1.3.

**For you to run (I can't measure these):**

| What | How | Pass |
|---|---|---|
| Frame time | Chrome DevTools → Performance, record a full scroll plus menu and dialog open | no frame over 16.7 ms |
| Reduced motion | OS setting "Reduce motion" on, reload | page is static and fully readable |
| Real phone | Scroll the pins on iOS Safari and Android Chrome | no jump at pin start or end, snap feels right |

---

## What changed since v1

| v1 | v2 |
|---|---|
| No guiding rule | **Interaction thesis + allowed patterns** (section 0); every item is checked against it |
| `DUR`/`EASE` partly used | **Token system**: 26 durations become 5, plus 4 eases, shared with CSS |
| Port all 7 Motion components to GSAP one for one | Port only what holds up: the **terminal becomes a real screenshot**, **loops become one-shot draws**, and the **marquee moves only while you scroll** |
| — | **UI transitions under 500 ms** (menu, dialog, panels) |
| — | **Nav submenu `height` tween → Flip** (the only layout-property animation) |
| — | **Tells list**: hero ping, numbered tiles, fake terminal (glow allowed by the thesis) |
| Global velocity skew | Dropped (category default, readability) |
| Magnetic buttons on all CTAs | Two round arrow buttons only, optional |
| **v3 (live pass)** | Real durations: menu open **1.32 s**, close ≈ 0.73 s, dialog close 0.60 s |
| **v3 (live pass)** | New: **2.10** varied section openers (5 identical char reveals), **2.11** menu tap targets (16 px links) |
| **v3 (live pass)** | New tells: em dash in Experience dates, mono on buttons and pills (your call), repeated opener layout |
| **v3 (live pass)** | `?nomotion` and 375 px checked: pass |
| **v4 (your content decisions)** | Hero card becomes a pill; Performance and Frontend/Backend sections removed; promotions stat removed; Results moved to the end as a podium finale (new 2.6); helmet path re-timed; 2 pins left; content changes are now step 1. C3 decided as (a), with a data-driven bento layout. **C8:** Education merged into Results (award → degree → stats → 450+), Alibaba award gets a P2,520 → P3 climb plus podium sequence (2.6); stats decided: 450+, ~300×, 4+ years; **helmet arrives as the section starts** and turns through award → stats → 450+ (new `podium` pose, right column kept free); **2.12** helmet drops onto the P3 step, scheduled as the final, separately revertable commit |

Modules loaded: motion-principles, gsap, tells (+ references/web.md), mobile-principles, design-audit (script only)
Modules not loaded: desktop-principles (mobile indicators present, so the load table didn't call for it)
