# Motion graphics pass: the road book journey, plus dialogs, map, nav and social stills

## Implementation status (4 Oct 2026)

Built on branch `motion-graphics`, one commit per step. Everything below the status table is the
plan as approved.

| Step | Status | Changes from the plan |
|---|---|---|
| 0. Shared fixes | Done | `digitRoll` keeps the original text on the element (`data-roll-text`), so a re-run never rolls the strips; each digit window is as wide as its own final digit (a narrow "1" left a gap in "~150×") |
| 1. Content | Done | — |
| 2. Road book trail | **Built, then reverted on your review** ("doesn't look great") | Nothing of it is left: the contour field keeps its own red line, no trail component or data |
| 3. Dialog stats | Done | Bars and row motion live in `Dialogs.tsx` (no separate `StatGraphic.tsx` / `statMotion.ts`); the agents bar uses the low end of "2 to 3 days" and labels it "2 to 3 days" |
| 4. Archive rows | Done | `revealWithin` also releases rows a jump or fling skipped, so none stays hidden above you |
| 5. Contact map | Done | Added: the finish strip never showed (its reveal started at 85% of the screen, which the last screen can't reach at 1440×900 or 375×812); it now starts as it enters |
| 6. Nav entrance | Done | Animates the wordmark and the buttons' wrapper (the `.btn` CSS transitions would fight GSAP) |
| 7. Stills | Done | Card text kept clear of the helmet (HyperFrames `check` flagged the overlap); the card has no trail since step 2 was reverted |

**Measured** (headless Chrome, dev server, scripted full-page scroll, `main` vs this branch):

| | `main` | Branch |
|---|---|---|
| Main JS gzip | 122.5 KB | 123.6 KB |
| WorldMap chunk gzip (lazy) | 4.2 KB | 5.0 KB |
| CSS gzip | 13.9 KB | 13.8 KB |
| Prerender | 116.1 KB | 115.9 KB |
| ScrollTriggers at load (desktop / phone) | 96 / 85 | 96 / 85 (+1 once the map loads) |
| Scroll p99, CPU 1× and 4×, 1440×900 and 375×812 | 16.8 ms | 16.8 ms |
| Dialog open, CPU 4×, worst frame over 5 opens | 33.4 ms, one 233 ms outlier | 33.3 ms on the first opens, then 16.8 ms |
| Dialog open/close ×10 | — | trigger count unchanged, no leftover dialog |

Single frames over 20 ms showed up in different runs on both branches (noise in the headless runs).
Still for you: a real iPhone and Android pass (dialog reveals while momentum scrolling, the
map clip in Safari) and the OS "Reduce motion" setting on a device.

## Context

The site is already heavily animated. Three earlier plans (GSAP enhancements, scroll wow, three.js) shipped
motion for every home-page section. Their docs were removed in `079d21f` and can still be read with
`git show 079d21f^:docs/<NAME>.md`. Ideas those plans rejected stay rejected: looping decoration, a fake
terminal, the footer reveal, the WebGL chequered wipe, bloom, new pins, ScrollSmoother.

You asked for two things:
1. **A background that turns the site into one complete journey of you.** Today the background is an abstract contour field that only changes colour per section, so it tells no story. You picked the **road book trail**: the contour lines become a map, and one red trail runs down the whole page from START (2018, FAST-NUCES, Karachi) to NEXT (your team), passing a flag at each milestone.
2. **Motion where the site is still static:**
   - Details dialogs: stats are plain text, and every row rises at once, even rows below the fold.
   - Archive list.
   - Contact map: pops in, and its pulse loops forever and ignores reduced motion.
   - Nav bar: no entrance.
   - No og:image (`index.html:13` TODO).

**Constraints from you:**
- No video files on the site. The `videos/` films are for something else and are not used or touched.
- Nothing may cost performance on desktop or mobile.
- The journey must work on phones and with 3D off.

**How HyperFrames fits.** Its runtime output is video, so it's used at **design time** only:
1. Its motion rules and catalog are the recipe source for the new live GSAP code. Relevant entries:
   - `svg-path-draw` for the trail.
   - The `maps` "connect places" route-and-pins move for the trail and the Contact map.
   - `vertical-spring-ticker` for the year odometer.
   - `stat-bars-and-fills` for the dialog bars.

   Before hand-building each move, run `npx hyperframes catalog --query "<move>"`, and port a block if one fits.
2. Its seek-safe contract (`fromTo`, nothing measured mid-tween, no randomness) is exactly what scroll scrubbing in both directions needs.
3. It renders the **still images**: the 1200×630 social card (showing the trail) and the touch icon. These cost nothing at runtime.

**Your content decisions:**
- Lap S1 "3 in 30" → **"4 LLMs"**.
- Red promotions tile → **"4 languages in production"**.
- The Astera dialog drops its promotions row.

## Branch and commits

- New branch `motion-graphics` from `main`, one commit per step, so any step can be dropped.
- The first commit saves this plan as `docs/MOTION-GRAPHICS-PLAN.md`, as earlier passes did. The last commit adds a status table.
- Stage files by path, never `git add -A`: `videos/` and `behance-export/` are untracked and about 160 MB.

## Steps

### 0. Shared fixes (small)
- **`src/motion/patterns.ts` `digitRoll` (:113):**
  - Return the restore function in timeline mode too. Today StrictMode re-runs it on the rolled strips, which turns "8×" into runs of digits.
  - Replace the `aria-label` on a plain span with an `sr-only` copy, so screen readers read the stat. This also fixes `Experience.tsx:46` and `Results.tsx:36`.
- **Add `revealWithin(root, targets, onEnter) → stop`:** an IntersectionObserver whose root is the dialog, with `rootMargin '-64px 0px -8% 0px'`. Dialogs are their own scroll containers, and ScrollTrigger with `scroller: dialog` is a bad fit for three reasons:
  - It never forgets a scroller, so every closed dialog stays in memory.
  - Every dialog scroll would update all page triggers.
  - `finishRevealsAbove` would also finish the dialog's reveals.
- **`src/components/Dialogs.tsx` `useDialogIn` (:51-58):** wrap the rAF body in `ctx.add(...)`. Today anything created there survives `ctx.revert()`.
- **`src/index.css:147-165`:** delete the dead `.timing` CSS left from the removed Performance section.

### 1. Content
- **`src/content/data.ts`:**
  - `timeline[0]` stat becomes `'4 LLMs'`, label "providers behind one API".
  - Drop the Astera `'3 in 30'` highlight (:87).
  - Astera `result` (:86) becomes "Multi-LLM API server, 4 providers".
  - Astera `summary` (:85) leads with the work instead of "ASE → SE I → SE II".
  - Rename `promotions` (:95-99) to `languages`: `{ value: skills.core.length, text: 'languages in production: Go, Python, C# and JavaScript…' }`.
- **`Experience.tsx` (:1, :12, :21, :79-83):** use `languages` and update the comments.
- **Check:** `grep -rn "promotion\|3 in 30" src` returns nothing.
- **Risk to check on the live page:** "4" now shows in several places (4 LLMs, the 4 tile, 4+ years, the "04" ghost).

### 2. The road book: one trail down the whole page (headline piece)

**Milestones** (facts from `data.ts`, each with a skill or proof, following your skills-plus-experience rule).
The page isn't in time order, so the trail carries the chronology on its own track, from 2018 at the top to NOW at the bottom:

| Where on the page | Year readout | Flag on the trail |
|---|---|---|
| Hero (the trail leaves the hero's red circuit) | 2018 · KARACHI | START · FAST-NUCES · BS Computer Science |
| About (inside the pin) | 2021 | 3rd of 2,520 · Alibaba Cloud Global Challenge |
| Just before the Lap | 2022 | Graduated · CGPA 3.58 · Dean's list |
| Lap (3D) | 2022 Astera → 2025 Xtel → 2025 Careem, following `lapState.stage` | none: the trail **becomes the circuit**, and the Lap's own cards and run-off names are the milestones |
| Experience → Tech stack | 2025 → 2026 · CAREEM | none (the trail passes behind; these sections show the work) |
| Results | NOW · 2026 | NOW · 450+ AI agents live |
| Contact | NEXT | FINISH · your team → (meets the chequered finish strip) |

**How it looks:**
- A thin red trail: **solid behind you**, a dim dashed line ahead. Its head stays at about 60% of the screen height, so you are the one driving it.
- Flags are a small pole that draws, a mono year that rolls, and a label that rises. They retract when you scroll back up.
- The field shader's own accent "racing line" (`src/gl/field.ts:54,60`) is removed, so the trail is the only red line on the map.

**Layers and routing:**
- One `<JourneyLeg>` per section (new `src/components/Journey.tsx`, legs data in new `src/content/journey.ts`). Each leg is an absolutely positioned, `pointer-events-none`, `aria-hidden` SVG covering its section.
  - In pinned sections (About), the leg sits inside the pinned element so it stays with the pin.
  - The Lap gets no leg: the trail ends in an "entering circuit" marker at the Lap's top and resumes at Experience.
  - With 3D off, the Lap's existing flat SVG circuit draws as it does today, so the story still reads.
- **Paths are written in percent units:** `viewBox 0 0 100 100`, `preserveAspectRatio="none"`, `vector-effect: non-scaling-stroke`, the same technique as the hero circuit. Flags are HTML placed with `left/top` %.
  - This keeps the markup static: no measuring, and the prerender works.
  - Legs join end to end across sections.
  - Each leg has a desktop and a phone path (CSS shows one).
- **Routing stays clear of the 3D helmet.** The trail is DOM above the canvas, so it can't pass behind it.
  - **Desktop:** the trail keeps to the left side in Hero, About and Results, where the helmet poses sit at x ≈ 0.56–0.62 (`helmetPath.ts:11-18`). It swings freely through Experience, Projects and Tech stack, where the helmet is away.
  - **Phones:** it hugs the left edge.
  - **Everywhere:** flags sit in the sections' top and bottom padding (the `py-24`/`py-32` gaps), never over body text.
- **Readout:**
  - **Desktop:** `TrackMap` (`src/components/TrackMap.tsx`) becomes the road book. Its label shows a rolling mono year above the place or section name (2018 · KARACHI → … → NEXT), reusing its existing per-section triggers, plus the Lap's stage for the 2022/2025/2025 ticks.
  - **Phones:** keep the thin top progress bar. The flags carry the years.

**Motion and performance:**
- **One ScrollTrigger per leg** (about 7) drives everything for that leg:
  - DrawSVG scrubbed with `ease: none` on the solid copy, from `top 60%` to `bottom 60%`.
  - Its flags fire from the same trigger's `onUpdate` progress thresholds, so there are no extra triggers.
  - The dashed copy is static. It's the same path via `<use href>`, so the prerender stays small.
- **Each leg's SVG gets its own layer** (`contain: strict`, `will-change: transform`). A scrub repaints one thin path in that layer only, never the text tiles above it. Legs out of view do no work, and nothing runs at rest.
- **Phones:** scrubbed by default. If the frame sampler shows drops during iOS momentum scrolling, legs switch to a one-off timed draw on enter (no per-frame work while scrolling).
- **Reduced motion and `?nomotion`:** the markup is the final frame: the whole trail solid, all flags shown, the readout static. With 3D off, the trail still works (it's DOM).

### 3. Details dialog: stats that show their result
This brings back the idea of the removed timing table, but only **inside dialogs a visitor opens**, so the page doesn't get longer.

- **Data:** `Highlight` (`data.ts:5`) gets an optional `delta?: { from: number; to: number; fromLabel: string; toLabel: string; higher?: true }`. Add it only where the row's own stat and text measure the same thing:

  | Where | Rows |
  |---|---|
  | Xtel job (:79-82) | 250 s→30 s, 40 s→20 s, 30 s→100 ms, 2 min→30 s |
  | Xtel archive item (:143-145) | the same three |
  | Agents project "10 min" (:107) | 2 days→10 min (low end of "2 to 3 days") |
  | Careem job "35%" | <2% → 35%, higher is better |

- **Markup is the final frame.** New `src/components/StatGraphic.tsx` renders the stat plus two thin `aria-hidden` BEFORE/AFTER bars with inline `transform: scaleX(r)`, where `r = max(min/max, 0.006)`.
- **Motion:** builders in new `src/motion/statMotion.ts`.
  - **Bars:** both grow `fromTo scaleX 0 → r` at the **same speed** (`1.2 s × r`, `EASE.none`, because the bar is a stopwatch). The fast result stops almost at once while the old one keeps crawling.
  - **Stats:** numeric stats use `digitRoll`. Word stats (R19, SSE, RAG…) use Lap's masked rise. No ScrambleText: it's random, and the width jumps in the 12rem column.
- **Timing:**
  - Rows visible on open play after the wipe starts (+0.15 s). Rows below the fold play when `revealWithin` sees them.
  - Stats run on their **own** timeline, never in `state.tl`, so the dialog's `clipPath` clears on time for iOS scrolling.
  - Do the digitRoll DOM rewrite before the FLIP measure.
  - Close disconnects the observer.
- **DEV only:** expose the stats timeline so it can be seeked frame by frame in the browser pane.

### 4. Archive dialog rows
- Rows rise as they scroll into view inside the dialog (`revealWithin`, staggering each batch).
- **Hover, CSS only:** a red rule draws under the row (`origin-right scale-x-0` → `group-hover:origin-left scale-x-100`) and the `→` nudges.
- Adds about 0 JS and 0 triggers.

### 5. Contact map: home to where you've worked
In `src/components/WorldMap.tsx`, with its own `useSectionMotion` (Contact's build runs before the lazy chunk loads).
- **Reveal:** a `clip-path: circle()` that grows from Karachi (69.4% 44.8%) on an **HTML wrapper** (Safari has bugs with clip-path on SVG), then `clearProps`.
- **Arcs:** Karachi → Milan (Xtel, remote) and a short high hop to Dubai (Careem HQ), drawn with `drawPath`. Drop the Dubai hop if it reads as a blob at 375 px.
- **Pulse:** replace the infinite SMIL pulse (:14-19) with two HTML rings that animate scale and opacity, `repeat: 2`, restarted on enter. Nothing runs at rest, and nothing runs under reduced motion.
- **Triggers:** +1 ScrollTrigger.
- **Fallback:** if the clip is slow at 4× CPU, switch to scale and opacity.

### 6. Nav entrance after lights out
- In `src/components/Nav.tsx`, add a `fromTo` for y and autoAlpha on the **children** of `nav[aria-label=Primary]` to `introTimeline()` at `reveal+=0.2`, about 0.9 s.
  - **Never transform `<header>`:** the fixed `#site-menu` inside it would collapse.
- It must end inside the current master timeline (about 1.95 s), or it would delay the helmet reveal.
- A `#hash` URL, `?nointro`, `?nomotion` and reduced motion all still show the nav immediately.

### 7. HyperFrames stills: social card and touch icon
- **Project:** a new HyperFrames project at `motion-lab/` (repo root, **not** under `videos/`).
  - Check usage first with `npx hyperframes usage --json`, then run `init` with `--example=blank`.
  - Two compositions, authored per `/hyperframes-core`.
- **Assets from the site itself:**
  - Fonts from `node_modules/@fontsource-variable/*`.
  - `src/assets/contours.svg` and the circuit path.
  - The **journey trail and milestones from `src/content/journey.ts`**.
  - The procedural helmet, bundled from `src/gl/helmet` and `src/gl/garage.ts` by a new `motion-lab/scripts/build-helmet.mjs` (esbuild is already installed; output gitignored).
- **`og-card` (1200×630):**
  - "MUHAMMAD AHSAN.", "Senior *Full-Stack* Developer".
  - A mono skills line: React · Go · Python · .NET · AI agents.
  - The road-book trail from START 2018 to NOW · 450+ agents · Careem.
  - The helmet and the checker strip.
  - Snapshot the final hold and save it with `sips` as `public/og.jpg`, at most 200 KB.
- **`icon`:** a red "04" mark on carbon, saved as `public/apple-touch-icon.png` (180 px), with a static relative `<link>`.
- **Wiring:**
  - `index.html:13` TODO becomes a `<!--seo-->` placeholder.
  - `scripts/prerender.ts` fills in canonical, og:url, og:image (+ size, alt) and twitter:image from `process.env.SITE_URL || SITE_URL`.
  - If `SITE_URL` is empty, it removes the placeholder and warns. It never writes a relative og:image.
- **`.gitignore`:** add `motion-lab/{node_modules,renders,snapshots,.hyperframes}` and the helmet bundle.

### 8. Docs
Add a status table and measurements to `docs/MOTION-GRAPHICS-PLAN.md`. Update the README motion paragraph and `docs/SEO.md`.

## Performance budget

| | Now | Budget after |
|---|---|---|
| Main JS gzip | ~123.7 KB | ≤ +5 KB (estimate ~4 KB: journey ~2, dialogs ~1.5, nav/map ~0.5) |
| ScrollTriggers (page, headless) | 82 | ≤ 92 (+~7 legs, +1 map; dialogs add 0) |
| Pins / tickers at rest | 2 / none | unchanged |
| Prerender HTML | ~115 KB | ≤ 118 KB (trail paths written once via `<use>`) |
| Scroll p99 at 120 Hz / headless 4× CPU | per scroll plan | ≤ 11–12 ms / ≤ 16.8 ms, also at 375×812 |
| WebGL | — | no new passes; one shader term removed |

Dialog motion runs while the WebGL Stage and Lenis are paused (`scrollState.locked`).

## Verification
1. **Types and build:**
   - `npm run typecheck` and `npm run build`.
   - Compare main-chunk gzip and `dist/index.html` size before and after.
   - `SITE_URL=https://example.pages.dev npm run build` gives absolute og tags. Without it there are no og:image tags, and a warning prints.
2. **Live checks:** `preview_start` with `v2-dev`, in the browser pane at 1440×900 and `resize_window` mobile (375×812).
   - **Journey:**
     - Scroll top to bottom: the trail draws behind you from START to FINISH, with no gaps at section joins.
     - Flags pop as you reach them and retract on the way up.
     - The trail never crosses the helmet or body text.
     - The road-book year runs 2018 → NEXT, including the Lap stage ticks.
     - `?nomotion` shows the full trail and all flags.
     - `?nogl` keeps the trail, with the flat Lap circuit.
     - `/#projects` deep links land with the trail above already drawn.
   - **Dialogs:**
     - Xtel details: seek the DEV stats timeline at 0, 0.3 and 1.2 s and screenshot. Lower rows reveal on scroll. Closing mid-open leaves no clip.
     - Open and close 10 times, and `__ST.getAll().length` doesn't change.
   - **Archive:** rows reveal while scrolling. Hover works on desktop and is absent on phone.
   - **Contact:** the map grows from Karachi, the arcs draw, and the pulse runs twice. `?nomotion` shows a static map.
   - **Nav:** slides in after lights out. A hash or `?nointro` shows it at once. The phone menu opens full height.
   - **Accessibility:** `read_page` shows the rolled stats as text, and the trail and flags are `aria-hidden`.
3. **Perf:**
   - A scripted full-page scroll with a rAF frame sampler via `javascript_tool` (the scroll plan's method), at desktop and phone sizes, compared against the table above.
   - Also sample frames while a Xtel dialog plays.
   - The console stays clean.
4. **Stills:** view `public/og.jpg` (1200×630, at most 200 KB) and the icon at 180 px.
5. **Left for you:** a real iPhone and Android pass, covering the trail scrub during momentum scrolling, dialog reveals, and the map clip in Safari.

## Not doing
- Any video on the site, or using the `videos/` projects or their bundles.
- Replacing the contour field. The road book keeps it and gives it a story.
- Drawing the trail in WebGL. It would be desktop-only (touch keeps the field still, and weak devices have no WebGL) and would need a second DOM version anyway.
- A HyperFrames frame-review copy of the site's graphics: it would duplicate markup that drifts. The live timelines are seeked in DEV instead.
- New pins, looping decoration, or a return of the Performance section.
