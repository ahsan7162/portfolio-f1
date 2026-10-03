# Scroll motion plan: smoother, more distinctive, more "wow"

Branch: `scroll-wow-plan` (from `main` at `9936d6e`). Nothing in this document is implemented yet; it is
the plan, the reasoning, and the performance check, so every item can be approved, changed or dropped
before any code is written.

Skills used: `gsap-scrolltrigger`, `gsap-react`, `gsap-plugins`, `gpt-taste` for the plan, then
`gsap-performance` for the impact check (Part 5).

Contents

1. [How this was put together](#1-how-this-was-put-together)
2. [What is on the site today](#2-what-is-on-the-site-today) (live inventory, section by section, baseline numbers)
3. [Diagnosis: why it does not "wow" yet](#3-diagnosis-why-it-does-not-wow-yet)
4. [The plan](#4-the-plan)
   - 4.0 Thesis and design plan (gpt-taste pre-flight)
   - 4.1 Global systems (speed, scrubbed headings, fast-scroll safety)
   - 4.2 to 4.9 Section by section
   - 4.10 Polish and taste fixes
   - 4.11 Custom cursor: the pit-lane pointer
5. [Performance check (gsap-performance)](#5-performance-check-gsap-performance)
6. [Order of work, commits and rollback](#6-order-of-work-commits-and-rollback)
7. [Verification per step](#7-verification-per-step)
8. [Decisions I need from you](#8-decisions-i-need-from-you)
9. [Explicitly not doing](#9-explicitly-not-doing)

---

## 1. How this was put together

- Ran the dev server (`v2-dev`, port 5174) and scrolled the live site at **1440 × 900** and **375 × 812**,
  screenshotting every section (hero, About pin, Lap pin, Experience bento, Projects, Tech stack,
  Results podium, the 450+ finale with the helmet, Contact).
- Read every motion file and section: `App.tsx`, `motion/*` (SmoothScroll, gsap, tokens, patterns,
  useSectionMotion, intro, useBentoPointer, prefs), `sections/*`, `TrackMap`, `ScrollRail`, `Intro`,
  `ProjectVisuals`, `gl/Stage.ts`, `gl/helmetPath.ts`, `gl/field.ts`, `index.css`, and the previous plan
  `docs/GSAP-ENHANCEMENTS.md` (so nothing here undoes a decision already made there).
- Read the live ScrollTrigger setup from `window.__ST` (dev only) and measured frame times with
  a scripted full-page scroll (in the browser pane with WebGL on, and headless Chrome at 1× and 4× CPU
  throttle). Numbers are in 2.3.

---

## 2. What is on the site today

### 2.1 The motion stack

| Piece | What it does | File |
|---|---|---|
| Lenis | Smooth wheel scroll, `lerp: 0.1`, runs inside the GSAP ticker; `ScrollTrigger.update()` on every Lenis scroll, so pins, scrubs and WebGL share one frame | `motion/SmoothScroll.tsx` |
| `scrollState` | Live `y`, `progress`, `velocity`, `direction`, shared with non-React code (WebGL, marquee, rail) | same |
| Plugins | ScrollTrigger, SplitText, DrawSVG, MotionPath, Flip, ScrambleText, useGSAP. `lagSmoothing(0)` | `motion/gsap.ts` |
| Tokens | `DUR` hit .15 / split .3 / wipe .45 / close .4 / open .65 / reveal .9 / show 1.6; `EASE` none / expo.out / power2.in / expo.inOut / back.out(1.15) | `motion/tokens.ts` |
| `useSectionMotion` | `useGSAP` + `gsap.matchMedia` (desktop / mobile / short), reverts on unmount, `onRevert` for non-GSAP undo, `fit` rebuild after fonts | `motion/useSectionMotion.ts` |
| Patterns | `splitReveal`, `batchReveal`, `clipReveal`, `scrubParallax`, `digitRoll`, `drawPath`, `magnet`, `proximityChars`, `finishRevealsAbove`, `fitsViewport` | `motion/patterns.ts` |
| WebGL stage | One renderer: contour field background (colours per section from `data-bg`, scroll parallax and velocity stretch), the helmet (pose scrubbed along `helmetPath`, perches on the P3 step), the 3D lap during the Lap pin. Adaptive resolution, renders only when something moves | `gl/*` |
| Chrome around the page | Intro (F1 start lights tied to real loading), Nav, TrackMap (dot laps the circuit), ScrollRail (custom scrollbar that stretches with velocity) | `components/*` |

Rules that already hold and that this plan keeps:

- The markup is the final frame. `?nomotion`, reduced motion and the prerender all show finished content;
  GSAP sets start states, CSS never hides content.
- Transforms and opacity only, plus `clip-path` and DrawSVG on single paths.
- Scroll-linked = `ease: none`; discrete events = `expo.out`; leaving = quicker `power2.in`.
- Tokens in `tokens.ts`; one bounce (`settle`) on the page, for the podium.

### 2.2 Section by section (what a visitor sees now)

| # | Section | Height (desktop / phone) | Entrance today | While scrolling today | Feel |
|---|---|---|---|---|---|
| 0 | Intro | overlay | F1 lights fill with real load, lights out, screen splits | — | Strong, unique |
| 1 | Hero `#top` | 900 / 812 | Name chars rise (intro timeline), sub words, fades, circuit draws, ghost "04" rises | Name lines slide apart (−8% / +10%), "04" drifts up, circuit drifts, body fades to 0.15. Hover: letters lean and warm red. Helmet on the right | Good, but the exit is a gentle drift, not a moment |
| 2 | About `#about` | 1980 / 1786 | — | **Pinned 120%**: words light up 0.14 → 1, swoosh draws. Helmet turns | Solid, and the most "scroll-driven" part of the page, but only opacity changes |
| 3 | Lap `#timeline` | 1845 / 1665 | Veil clears, heading and first card rise | **Pinned `n × 35%`**: 3D camera laps the circuit (scrub 0.5), stage cards crossfade, snap to stage via Lenis | The centrepiece. HUD is static apart from the sector labels |
| 4 | Experience `#experience` | 1178 / 1696 | Heading + tiles wipe left to right **once** | Nothing scroll-linked; tilt and spotlight on hover | Static once revealed |
| 5 | Projects `#projects` | 2409 / 3046 | Heading wipes up once; each card visual wipes up, text rises once | Desktop: cards drift at their own speed (−6 / 8 / −3 yPercent), inner visual parallax; hover draws a red sector line; scenes loop while on screen | Good details, but the section is long and reads as "three cards in a grid" |
| 6 | Tech stack `#skills` | 1175 / 1506 | Tiles wipe in once | Logo marquee moves only with scroll velocity and coasts | Nice marquee, the bento is static |
| 7 | Results `#results` | 1544 / 1380 | Edu lines rise, podium builds, P3 fills, stats roll | Ghost "P3" parallax, helmet perches on P3 then glides to finale; **450+ chars rise scrubbed**, drifts x | Strong finale |
| 8 | Contact `#contact` | 811 / 853 | Heading lines rise once, finish strip wipes, links rise | Nothing | Ends quietly |

### 2.3 Baseline numbers (measured on `9936d6e`)

| Metric | Desktop 1440 × 900 | Phone 375 × 812 |
|---|---|---|
| Page height | 11,842 px | 12,743 px |
| ScrollTriggers (WebGL on) | **81** | 74 |
| ScrollTriggers (headless, WebGL off) | 65 | — |
| Pins | **2** (About 900 → 1980, Lap 2880 → 3825) | 2 |
| Scrubbed triggers / one-off (`once`) | 29 / 23 | — |
| Full-page scripted scroll, browser pane, WebGL on, 120 Hz | p50 **8.3 ms**, p95 8.7, p99 **9.3**, 5 frames > 20 ms in 1250 | — |
| Same, headless, WebGL off, CPU 1× | p50 16.7, p99 16.8, max 33.4, 1 frame > 20 ms in 962 | — |
| Same, headless, WebGL off, CPU **4×** | p50 16.7, p99 16.8, max 50.0, 1 frame > 33 ms | — |
| JS (from the last build) | ~129 KB gzip total, prerender 111.4 KB | |

So the site has headroom: at 120 Hz the 99th percentile frame is 9.3 ms, and even at 4× CPU slowdown
(without WebGL) almost every frame makes 60 fps. The plan below is sized to keep it there (Part 5).

---

## 3. Diagnosis: why it does not "wow" yet

Everything works and is careful, but most of it plays **once and then stands still**. Out of eight sections,
only About, the Lap and the 450+ number respond continuously to the scroll; the rest wipe in once and become
a static page. The things that make award sites feel alive are:

1. **The scroll is felt everywhere, not only in pins.** Here, between the pins, nothing reacts to *how*
   you scroll (speed, direction). The only velocity-aware pieces are the WebGL contour stretch, the
   marquee and the scrollbar, and they are all at the edges of the screen.
2. **Sections hand off to each other.** Here, every section starts from zero: hero drifts away, About
   starts, About unpins, Lap fades in. There is no moment where one section *becomes* the next.
3. **A recurring signature.** The F1 language is strong in the intro, Lap and podium, but the middle of
   the page (Experience, Projects, Tech stack) uses generic wipes. A visitor remembers one or two
   signature moves seen several times.
4. **One-off reveals reveal nothing on the way back.** Scroll up and the page is inert. Scrubbed reveals
   answer both directions and also remove the "blank section after an anchor jump" class of bugs
   (`finishRevealsAbove` exists only because of `once` reveals).
5. **The ending is quiet.** The finale is 450+, then Contact simply wipes in. The lap never "finishes".

---

## 4. The plan

### 4.0 Thesis and design plan (gpt-taste pre-flight)

**Thesis (extends the existing one, does not replace it):**

> The scroll is the throttle. How fast you scroll is felt in the type (speed skew), every section
> enters like a car taking its grid slot, the middle of the page stacks and pins like a pit wall,
> and the page ends by crossing a finish line with your real lap time. Still: transforms, opacity and
> clip only; one ticker; markup is the final frame.

`<design_plan>` (gpt-taste is built for new pages; here its randomisation picks which of its paradigms
to bring into an existing site, and the rest of its checklist is applied as an audit.)

```
>>> seed = len(prompt)              # 513 characters
>>> random.choice(GSAP_PARADIGMS)    # 513 % 5 = 3 -> "Card stacking"
'Card stacking'                       # -> Projects (4.6)
>>> random.choice(GSAP_PARADIGMS)    # (513 // 11) % 5 = 1 -> "Scroll pinning split"
'Scroll pinning split'                # -> Projects title column (4.6)
>>> random.choice(COMPONENTS)        # 513 % 4 = 1 -> "Horizontal accordion"
'Horizontal accordion'                # -> Tech stack, optional (4.7)
```

| gpt-taste check | Today | Plan |
|---|---|---|
| Navigation first | Nav pill + menu | Keep |
| AIDA | Attention = Hero; Interest = Experience + Tech bentos; Desire = About, Lap, Projects; Action = Results finale + Contact | Keep the order; strengthen Desire (4.6) and Action (4.9) |
| Hero H1 2 to 3 lines | Name is exactly 2 lines (`Muhammad` / `Ahsan.`), full-width container | Pass; no change |
| No stamps / pill tags / stats in hero | The "Currently at Careem" pill is a status button, not a tag; no stats | Pass |
| Bento with zero gaps | Experience (6 cols): 4 + 2, 3 + 3 = 6 / 6. Tech stack: 6; 3 + 3 (AI spans 2 rows); 3 + AI; 2 + 4 = 6 | Pass. Add `grid-flow-dense` as a guard for when data changes (4.10) |
| Font never Inter | Mona Sans (expanded) + JetBrains Mono | Pass |
| Meta labels banned ("ABOUT US") | Small mono h2 labels: **"About me"**, **"Career timeline"**, **"Contact"** | Decision 8.4 |
| Huge vertical spacing between sections | `py-24 md:py-32` | Optional bump, decision 8.5 |
| `overflow-x-hidden` on `<main>` | `body { overflow-x: clip }` already | Pass (and `clip`, unlike `hidden`, keeps sticky working; 4.10) |
| Stock images (picsum) | None; product scenes in SVG | **Not applying.** Real product scenes beat stock photos, and this was your call |

### 4.1 Global systems

#### G1. Speed skew: the type feels how fast you scroll (signature, small)

Display headings lean with the scroll speed and settle back when you stop, like a car's livery
blurring past. Direction-aware: scrolling down leans one way, up the other.

- One `gsap.ticker` function reads `scrollState.velocity` (Lenis already smooths it), clamps it, and
  eases toward it (frame-rate independent, the same coast maths as the marquee).
- Applies `skewY` (headings) through `gsap.quickSetter(el, 'skewY', 'deg')` to **only the `[data-speed]`
  elements currently on screen**: each one gets a ScrollTrigger toggle (`top bottom` → `bottom top`)
  that adds or removes it from the active set. The ticker removes itself when the set is empty or the
  speed has settled to 0.
- Clamp: ±3° at full speed (Lenis velocity ~ 60 to 80 on a hard flick), 0 at rest. Never on body text.
- Targets: section display headings (Experience, Projects, Tech stack, Results), hero name lines, the
  450+ number, the Contact heading. About's pinned statement **not** (it is read word by word).
- Off for touch (Lenis does not smooth touch, the velocity is noisy) and reduced motion.
- Conflict check: hero name lines already get `xPercent` from `scrubParallax`; skew is a different
  property on the same element (fine). `proximityChars` works on the **chars**, not the lines (fine).

#### G2. Scrubbed section headings: "the grid slot" entrance (signature, medium)

Replace the one-off heading wipes with one shared, scroll-linked entrance used by every big section heading,
so the same move is seen five times and becomes the site's signature:

- `SplitText` chars (masked by lines, as now), from `xPercent: 60, skewX: -18, autoAlpha: 0` to rest,
  stagger tiny (0.015 by char), **scrubbed** from `top 95%` to `top 60%` of the heading, `ease: none`
  on the timeline with `expo.out` inside each char's tween (so it feels like a launch, but stays locked to
  the scroll). Reads as each letter "pulling into its grid slot" from the right.
- `scrub: 0.6` (short catch-up so a wheel tick does not jump).
- Used on: Experience, Projects, Tech stack, Results headings, and Contact. The hero keeps its intro rise;
  About keeps its word light-up.
- Replaces: Experience's heading clip (the tiles get their own move, 4.5), Projects' heading clip,
  Results' static heading, Contact's `splitReveal` lines.
- Bonus: scrubbed, so scrolling back up reverses it, and anchor jumps land on a finished heading without
  `finishRevealsAbove`.
- New pattern in `patterns.ts`: `gridSlot(el, opts)`; `autoSplit: true` with the tween returned from
  `onSplit` (same rule as `splitReveal`).

#### G3. Fast-scroll safety for every remaining one-off reveal (small)

- Add `fastScrollEnd: true` to the one-off reveal triggers (`inView`, `batchReveal`'s batch, the podium,
  card text). When a visitor flings past, GSAP jumps the animation to its end instead of leaving it half
  played behind them. Smoother on fast scrolls, no cost when scrolling normally.
- Add `preventOverlaps: true` where two `once` reveals share a trigger (Results row).

#### G4. Section handoffs (medium; specified per section below)

Each boundary gets one deliberate handoff instead of a cut:
Hero → About (4.2), About → Lap (4.3), Lap → Experience (4.4), Projects → Tech stack (4.6),
Results → Contact (4.9).

#### G5. Lenis tuning (tiny, needs your feel test)

- Keep `lerp: 0.1`. Add `wheelMultiplier: 0.9` only if the new scrubbed headings feel too quick on a
  mouse wheel. Not changed by default.
- No `anticipatePin`: Lenis sets the scroll inside the GSAP ticker before ScrollTrigger updates, so the
  pins already start on the right frame (checked in the last plan).

### 4.2 Hero: "launch" exit

Today: lines slide apart gently; the body fades.

Plan:

1. **Launch exit (scrubbed, `top top` → `bottom top`):** the two name lines keep sliding apart, and
   also **stretch** (`scaleX` 1 → 1.12 from the leading edge, `transformOrigin` left for line 0, right
   for line 1) while G1 adds lean from velocity. Together it reads as the name accelerating off the
   screen, not drifting.
2. **Red streak:** a 2px red line (the intro's lights-out line, reused) draws across the hero bottom as
   it leaves (`scaleX` 0 → 1, scrubbed between `center top` and `bottom top`). It connects the intro
   to the hero exit: the same line opened the page and now launches it.
3. **Pill and CTAs:** fade and lift slightly earlier than the name (they already fade with `data-hbody`);
   unchanged.
4. **Handoff to About:** the last 15% of the hero scroll overlaps the first words of About lighting
   up (About's pin trigger starts at `top top`; add a pre-roll tween on the first three words from
   `top 40%`), so there is no dead frame between them.

Hover: unchanged (`proximityChars`), but **disabled while the hero is scrolling out** (progress > 0.05),
so the letters do not fight the launch.

### 4.3 About: "slowest" crawls, "fast" snaps

Today: words light up 0.14 → 1 on a 120% pin, swoosh draws.

Plan (same pin, same length, so the helmet path timed to it does not move):

1. Words light up as now, plus a small rise (`yPercent: 30 → 0`) on each word as it lights, so the
   statement assembles instead of only brightening.
2. **The typographic joke:** the accent word *SLOWEST* gets its chars split and arrives **late and
   slowly** (it lights last in its line, chars trickle in with a long stagger); *FAST.* snaps in at once
   with a skewX kick (−14° → 0) and a red streak behind it. Both remain scrubbed.
3. **Handoff to Lap:** over the last 20% of the pin, the statement scales to 0.94 and dims to 0.3 while
   the Lap veil starts to open (`lapState.veil` already scrubs from `top 35%`); the swoosh draws on as
   now, before the dim.

Cost: one more SplitText (chars of two words), a handful of extra tweens on the existing pinned
timeline. No new triggers.

### 4.4 Lap: live timing HUD

Today: 3D lap scrubbed to the pin, cards crossfade per stage, sector labels light, snap.

Plan:

1. **Lap timer** in the HUD (bottom right, next to the sector labels): `0:00.000` counting up with the
   pin's progress (scrubbed, so it runs backwards if you scroll up). Written with `textContent` on one
   node per update, in `tabular-nums`, inside a box with `contain: layout paint` so the text change
   never reflows the page. Mapped to a believable lap, e.g. 0 → `1:23.456`.
2. **F1 sector colours:** as each sector completes, its label flashes the timing colour for one beat
   (purple for the current job, "fastest"; green for the others). One class toggle per stage switch.
3. **Speed lines on the stage card:** when a stage switches with a fast scroll (`self.getVelocity()`
   high), the outgoing card leaves with `skewX` and a slightly longer `x` streak. Same tweens as now,
   only the values depend on velocity.
4. **Handoff to Experience:** the veil already closes over the last quarter screen of the pin; add the
   lap timer freezing and flashing "LAP 1" before the veil closes, so the section ends on an event.

Nothing changes in the WebGL scene.

### 4.5 Experience: "grid formation"

Today: heading and tiles wipe left to right once.

Plan: the tiles **line up like cars on a starting grid** as the grid scrolls in, scrubbed:

1. Start state: each tile offset in a staggered two-column zig-zag (the F1 grid shape): odd tiles from
   `x: -12vw`, even from `x: +12vw`, each lower one further down (`y: 80 * i`), `rotation: ±2`,
   `autoAlpha: 0.2`.
2. Scrubbed from `top 90%` to `top 35%` of the grid (`scrub: 0.8`, `ease: none` on the timeline,
   `power2.out` per tile), the tiles slot into their bento positions, the lead (Careem) first.
3. The promotions tile's digit roll stays a one-off event when it lands (it is a number, not layout).
4. Heading uses G2.
5. Phones: no zig-zag (one column); tiles rise from `y: 60` with a slight `rotation: 1.5` → 0, scrubbed,
   one by one.

Why not pin it: the grid is about 900 px tall at 1440 × 900, so a pin would cut it off on shorter
laptops; a scrubbed entry gets the same feeling with zero pin cost.

Hover tilt (`useBentoPointer`) works on `rotationX/Y` and `scale`; the formation uses `x/y/rotation`.
To be safe, the formation animates an **inner wrapper** per tile, and the tilt stays on the tile.

### 4.6 Projects: pinned title + stacking cards (gpt-taste picks)

Today: big heading, three staggered cards with parallax, then the "See all projects" row.

Plan (desktop ≥ 1024 px wide **and** a card fits the viewport; otherwise the current layout):

```
┌──────────────────────────┬──────────────────────────────────────┐
│ PROJECTS                 │  ┌────────────────────────────────┐  │
│ (sticky)                 │  │  card 1 (sticky top: nav + 0)  │  │
│                          │  │                                │  │
│ 01 / 03                  │  │  ┌──────────────────────────┐  │  │
│ AI Agent Platform        │  │  │ card 2 (top: nav + 24px) │  │  │
│ ███████░░░░░ progress    │  │  │   ┌───────────────────┐  │  │  │
│                          │  │  │   │ card 3 (+48px)    │  │  │  │
│ [All projects 12]        │  │  │   │                   │  │  │  │
└──────────────────────────┴──────────────────────────────────────┘
```

1. **Pinned split (CSS sticky, not a ScrollTrigger pin):** the left column (heading, a live index
   "01 / 03", the current project's title, a thin progress bar, the All projects button) is
   `position: sticky; top: var(--navh)`. Sticky costs nothing per frame and adds no pin-spacer, so the
   page height and the helmet path below stay predictable.
2. **Card stacking:** each card is `position: sticky` with a stepped `top` (`navh + i × 24px`), so as
   you scroll, the next card slides up over the previous one and the edges peek like a deck.
3. **Scale and fade on the card underneath** (scrubbed, `ease: none`): as card *i + 1* covers card *i*,
   card *i* scales 1 → 0.92 and an overlay on it goes from opacity 0 → 0.55 (darkening without
   `filter`, which would repaint the whole card every frame).
4. **Index and title swap:** when a card reaches the top (`onToggle`), the left index scrambles to
   `02 / 03` (ScrambleText, already loaded) and the title swaps with a short `yPercent` mask move
   (`DUR.split`). The progress bar is `scaleX`, scrubbed across the stack.
5. Scenes: `ProjectVisuals` already plays only while a card is on screen and pauses off screen;
   a covered card counts as off screen (its ScrollTrigger range ends when the next card covers it), so
   only one scene animates at a time. Lower cost than now (today two can loop together).
6. The red hover sector line, tilt and spotlight stay (on the card, not the sticky wrapper).
7. **Handoff to Tech stack:** the last card does not scale away; the "See all projects" row slides up
   over the stack like a fourth card (same sticky rule), then releases into Tech stack.
8. Phones (375 × 812): cards measured at about 630 px tall, which fits under the nav, so the same
   stacking works with CSS sticky and a `top` step of 12px; no split column (heading stays on top),
   no index. Guarded by `fitsViewport`-style measurement and rebuilt on resize; if it does not fit
   (landscape phones, short laptops) the current layout stays.
9. Removes: the per-card `yPercent` speed parallax and the inner visual parallax (they would fight the
   sticky stack). The staggered `LAYOUT` offsets go too in stack mode.

Section height grows by about one viewport (stack scroll distance), on desktop and phones. That is
intended: this becomes the "Desire" chapter.

### 4.7 Tech stack: marquee you can feel, bento that wakes up

Today: velocity-only logo marquee; bento tiles wipe in once.

Plan:

1. **Two marquee rows in opposite directions** (second row = the same logos, offset, smaller, dimmer),
   both driven by the existing velocity ticker, the second at −0.6×. One extra transform per frame, only
   while on screen.
2. **Centre emphasis:** logos near the screen centre are slightly brighter and larger (scale 1 → 1.15).
   Computed from the loop's progress and each logo's known offset (no `getBoundingClientRect` per frame),
   written with `quickSetter`. Only for the main row.
3. **Bento:** tiles keep their wipe, then pills inside each tile stagger in (`y: 8`, opacity) as each
   tile lands, so the tiles fill in rather than appear full.
4. **Optional (gpt-taste component pick): horizontal accordion** for the six skill groups, desktop only:
   six vertical slices, the hovered or focused slice expands to show its pills. Keyboard: each slice is
   a button with `aria-expanded`. Phones keep the bento. This is a layout change, not just motion, so it
   is listed separately in decisions (8.3); recommended **no** because the bento already reads well and
   the accordion hides content until hovered.

### 4.8 Results: the 450+ fills in

Today: podium, stats roll, helmet perch, 450+ chars rise scrubbed.

Plan:

1. Heading uses G2.
2. **450+ outline to fill:** the number is drawn twice, an outline layer (`-webkit-text-stroke`, like
   the ghost "04") and the solid layer on top with `clip-path: inset(0 100% 0 0)` → `inset(0 0 0 0)`
   scrubbed while the chars rise, so the number fills left to right in red, then settles to the page
   colour. One clipped element, scrubbed.
3. **Stat rolls:** keep the one-off digit roll, add `fastScrollEnd` (G3).
4. Helmet: unchanged (perch and finale pose are already tuned).

### 4.9 Contact: crossing the finish line

Today: heading lines rise once, the chequered strip wipes, links rise.

Plan:

1. **Chequered flag sweep:** as Contact reaches the middle of the screen, a full-width chequered band
   (the existing `.checker` style) sweeps across once (`xPercent: -100 → 100`, `DUR.show`,
   `EASE.wipe`), then the finish strip at the bottom draws as now.
2. **Your lap time:** a mono line under the heading, "Lap complete · 2:41.380", showing the **real time
   this visitor has spent on the page** (from `performance.now()` at load, frozen when Contact enters).
   Real, personal, on-theme, and costs one `textContent` write. Hidden from the prerender (it is filled
   on the client), so the prerendered page has no fake value.
3. **TrackMap finish:** the TrackMap dot crosses the start/finish line as Contact enters, and its
   caption scrambles to "Finish" (the label already exists; only the timing changes).
4. **Heading:** G2 scrubbed entrance, plus the CTA buttons get the `magnet` effect on fine pointers.
5. **Handoff from Results:** the 450+ number drifts right as now; the Contact heading's G2 chars come
   in from the right, so the motion continues in the same direction across the boundary.

### 4.10 Polish and taste fixes

1. Horizontal overflow: `body` already has `overflow-x: clip` (`index.css`), which covers the
   gpt-taste `overflow-x-hidden` rule for the side entrances (grid formation, G2) **and** keeps CSS
   sticky working (`overflow: hidden` would break it). No change; just never switch it to `hidden`.
2. `grid-flow-dense` on `.bento` (guard for future data changes; no visual change today).
3. `will-change: transform` only on the stacking cards and the marquee (the marquee has it already),
   and only while their section is active (toggled by ScrollTrigger), not permanently.
4. Remove `finishRevealsAbove` calls for any reveal that becomes scrubbed (keep the function for the
   remaining one-off reveals).
5. Update `README.md` (motion paragraph) and `docs/GSAP-ENHANCEMENTS.md` (new status rows) when done.

### 4.11 Custom cursor: the pit-lane pointer

Added on your call (it was listed under "not doing" in the first draft). Done well, it ties the hover
effects together instead of fighting them, as long as it follows the rules below.

**Look**

- A **red dot** (8 px, `--ac`) that sits exactly on the pointer, with a **thin ring** (34 px, 1.5 px
  `--fg` at 60%) that trails behind it. Same palette as the rest of the site; no glow and no blend
  modes.
- **Speed stretch:** the ring stretches along the direction you move the mouse (`scaleX` up to 1.5,
  `scaleY` down to 0.75, rotated to the movement angle) and rounds back when you stop. This is the same
  "speed" language as the speed skew (G1) and the scrollbar.

**States.** Elements opt in with a `data-cursor` attribute, read through one delegated `pointerover`
listener. No per-element listeners.

| Over | `data-cursor` | Cursor does |
|---|---|---|
| Links and buttons (default for `a, button`) | `link` | Ring grows to 56 px and fills to 12% `--ac`; the dot stays |
| Project cards | `view` | Ring becomes an 84 px red disc with **VIEW** in mono (carbon text) |
| Experience tiles, Lap "Details" | `open` | Same disc with **OPEN** |
| ScrollRail thumb | `drag` | Ring narrows to a vertical pill with **DRAG**; while dragging, it locks to the thumb's x |
| Hero name | `heat` | Ring hides and the dot grows to 14 px: the cursor becomes the heat source the letters react to (`proximityChars`) |
| Magnetic arrows (hero pill, See all projects) | `magnet` | The ring **snaps to the arrow's circle** (it reads the circle's rect once on enter) and follows the magnet's pull; it releases on leave |
| Lap pin (3D track) | `scroll` | Ring shows a small down chevron and **SCROLL** until you first scroll inside the pin, then returns to normal |
| Dialogs (open) | inherits | Close button gets `link`; the cursor sits above the dialog (`z-[85]`, over dialogs at 70 to 75 and the intro at 80) |

- **Press:** on `pointerdown` the ring tightens to 0.8 scale (`DUR.hit`) and springs back on release.
- **Label text** changes with ScrambleText (already loaded), 0.25 s, so the states read as a timing
  board updating rather than a swap.

**Rules**

1. **Desktop, fine pointer, motion on only** (`(hover: hover) and (pointer: fine)`, `motionEnabled()`).
   Touch, reduced motion and `?nomotion` keep the native cursor. Nothing about it is in the prerender.
2. The native cursor is hidden only by a class JS adds (`html.has-cursor { cursor: none }` and on
   `a, button`). If the script fails, the native cursor stays. Text inside dialogs keeps the native
   I-beam (`cursor: text` on dialog prose) so selecting text still feels normal.
3. **No input lag where it matters:** the dot is written straight from the event with
   `gsap.quickSetter` (no easing), so pointing is exactly as precise as the native cursor. Only the ring
   eases (`quickTo`, 0.35 s, `expo.out`).
4. Hidden until the first `pointermove` (never flashes at 0, 0), fades out when the pointer leaves the
   window, and hides during the intro (`html.intro`), like the scrollbar.
5. Focus and keyboard users are unaffected: focus rings stay as they are and the cursor is
   `aria-hidden` with `pointer-events: none`.

**How it works with what is already there**

- **Proximity letters (hero):** complementary; the `heat` state hides the ring so the letters are the
  effect.
- **Tilt and spotlight (bento, project cards):** unchanged; the spotlight already follows the pointer
  and the `view`/`open` disc sits on top of it.
- **Magnets:** the ring snapping to the magnetic arrow makes the magnet feel stronger with no change to
  `magnet()`.
- **Red sector line on project cards:** unchanged; it draws around the card while the cursor shows
  VIEW.
- **WebGL helmet:** the Stage already has its own `pointermove` listener for the helmet's parallax;
  the cursor adds a second passive listener and does not read anything from the Stage.

**Build**

- New `src/components/Cursor.tsx`, mounted once in `App.tsx`, outside the memoized page and outside
  the `inert` wrapper so it keeps working while a dialog is open.
- Two fixed elements, positioned with `x`/`y` transforms (never `top`/`left`).
- State changes are class toggles on the cursor root (`data-state`), with sizes in CSS transitions on
  `transform` only, and the label in its own span.
- Cleanup removes the listeners, the `has-cursor` class and the quickTo tweens (StrictMode safe).

---

## 5. Performance check (gsap-performance)

Method: each item was checked against the gsap-performance rules (transform and opacity, `will-change`
only where it animates, `quickTo`/`quickSetter` for per-frame values, stagger instead of many tweens,
kill off-screen work, refresh only on layout change, pins only where needed) and costed in terms of
ScrollTriggers, per-frame work, layout reads, paint area and GPU memory. The baseline is in 2.3.

### 5.1 Per item

| Item | New triggers | Per-frame work while active | Layout reads | Paint / layers | Verdict |
|---|---|---|---|---|---|
| G1 speed skew | +1 per heading (~8 toggles) | 1 ticker fn, `quickSetter` on 1 to 3 visible headings | none (velocity from Lenis) | transform only, existing layers | **Low.** Ticker removes itself at rest |
| G2 grid-slot headings | 0 net (replaces 5 one-off triggers with 5 scrubbed) | scrubbed tweens on ~10 to 25 chars per heading | SplitText on load and resize only | transform + opacity on chars; mask by line (`overflow: clip`) | **Low.** Same SplitText cost as today |
| G3 fastScrollEnd | 0 | 0 | 0 | 0 | **Free** |
| 4.2 Hero launch | +1 (streak) | 2 more scrubbed props (`scaleX`) on existing tweens | none | transform only | **Low** |
| 4.3 About | 0 (same pinned timeline) | extra tweens on the same timeline | SplitText chars for 2 words, once | transform + opacity | **Low** |
| 4.4 Lap timer | 0 (uses the existing pin's `onUpdate`) | 1 `textContent` write per update, contained | none | tiny contained box | **Low.** Must use `contain: layout paint`, else each write lays out the HUD |
| 4.5 Grid formation | +1 scrubbed timeline | 4 tiles × x/y/rotation/opacity | none | 4 tiles each a compositor layer while moving (~1.2 MB each at DPR 2) | **Low** |
| 4.6 Stacking cards | +3 to 4 scrubbed (scale + overlay per card), +3 toggles (index), +1 progress | 2 to 3 transforms + opacity | none per frame; sticky handled by the browser | 3 card layers while the section is active: ~760 × 800 × 4 B × DPR² ≈ **9.7 MB each, ~29 MB GPU** | **Medium.** Drop `will-change` when the section is off screen; scene loops drop from 2 at once to 1 |
| 4.6 removed parallax | −6 scrubbed | −6 transforms | — | — | Saves what 4.6 adds |
| 4.7 second marquee row | 0 (same toggle) | +1 transform | none | 1 more layer (~1 MB) | **Low** |
| 4.7 centre emphasis | 0 | 20 `quickSetter` calls per frame while scrolling, from maths (no rect reads) | none | 20 small logo transforms | **Low to medium.** Only while velocity ≠ 0; skip on touch |
| 4.7 pill stagger | 0 (on the existing tile tween) | one-off | none | opacity | **Free** |
| 4.8 450+ fill | +0 (shares the chars' trigger) | 1 clip-path (one element) | none | repaint of the number box (~1200 × 400 px) while scrubbing | **Low to medium.** clip-path repaints, but one element and only during ~500 px of scroll |
| 4.9 flag sweep | +1 one-off | one tween for `DUR.show` | none | full-width band (~1440 × 48 px) | **Low** |
| 4.9 lap time | +0 (Contact trigger) | 1 `textContent` write, once | none | — | **Free** |
| 4.11 Custom cursor | 0 (+1 toggle for the Lap `scroll` hint) | per pointer move: 2 `quickSetter` writes (dot), 4 `quickTo` calls (ring x, y, stretch, angle), a `Math.hypot`/`atan2`; ring tweens run only while the mouse moves | none per move; one `getBoundingClientRect` on entering a magnet | 2 small layers (≤ 84 × 84 px, ~0.1 MB at DPR 2); state changes animate `transform` only | **Low.** Estimated ~0.02 to 0.05 ms per move (the hero proximity effect measured ~0.06 ms per move and does more). No ticker at rest |

### 5.2 Totals and budget

| | Today | After plan (est.) | Budget |
|---|---|---|---|
| ScrollTriggers (desktop, WebGL on) | 81 | **~93 to 97** (+~21 new incl. the cursor's Lap hint, −6 parallax, 5 replaced) | ≤ 100 |
| Pins (pin-spacer reflows) | 2 | **2** (Projects uses CSS sticky) | No new pins |
| Tickers running at rest | Stage idle (30 fps cap), marquee off at rest | Same: speed-skew and logo-centre stop at 0 velocity; the cursor's tweens finish ~0.35 s after the mouse stops | None new at rest |
| Peak GPU memory, extra | — | ~30 MB while Projects is on screen | ≤ 40 MB |
| New plugins / KB | — | **0 KB** (ScrambleText, SplitText already loaded) | 0 |
| New app JS | — | ~4 to 5 KB gzip (patterns, Projects stack, HUD, cursor ~1 KB) | ≤ 6 KB |
| Prerender HTML | 111.4 KB | +~1 KB (index, lap-time placeholder) | ≤ 115 KB |
| Frame time target (pane, 120 Hz, WebGL on) | p99 9.3 ms | **p99 ≤ 11 ms** | ≤ 12 ms |
| Frame time target (headless, CPU 4×) | p99 16.8 ms | **p99 ≤ 16.8 ms**, ≤ 3 frames > 33 ms | 60 fps |

### 5.3 Risks and how each is handled

1. **Sticky + Lenis.** Lenis scrolls the real window (not a transformed wrapper), so `position: sticky`
   behaves normally. `overflow: hidden` on any ancestor breaks sticky: `body` uses `overflow-x: clip`
   (fine), and the Projects section must not become `overflow-hidden` (today it is not).
2. **Helmet path and section heights.** The helmet segments are trigger-based (`#about`, `#timeline`,
   `#results`), so a taller Projects section shifts them with the page; `ScrollTrigger.sort()` and
   `refresh()` after mount already handle order. Projects must call `ScrollTrigger.refresh()` after it
   decides stack vs grid (same as Lap's `fit`).
3. **Refresh order.** New triggers are created in page order inside each section; the Projects stack
   triggers get `refreshPriority` in line with their position (lower than Tech stack and Results).
4. **Two systems on one element.** Formation vs tilt (inner wrapper, 4.5); proximity vs launch (proximity
   paused while leaving, 4.2); speed skew vs `scrubParallax` (different properties, verified with
   `gsap.getProperty` during testing).
5. **StrictMode and HMR.** Everything goes through `useSectionMotion` (context revert); non-GSAP state
   (lap timer text, project index text, lap time) is restored with `onRevert`, like the scenes do.
6. **Reduced motion, `?nomotion`, prerender.** No change to the rule: markup is final. Stacking is
   motion-only (CSS sticky classes are added by JS), so without motion Projects stays the current grid.
7. **Touch.** Speed skew and logo centre emphasis are off on touch (noisy velocity, no Lenis smoothing).
   Stacking uses sticky, which is native and smooth on iOS and Android.
8. **Cursor feel.** A trailing cursor that lags reads as a slow site. The dot is never eased (rule 3 of
   4.11), and the ring's easing is a token (`DUR.split` range), so it can be tightened in one place
   if it feels late. Cursor hides on touch, so phones and tablets are unaffected.
9. **Mid-range laptops.** The Stage's adaptive resolution already lowers the WebGL cost when frames miss
   vsync; the new DOM work is small enough not to trigger it (measured in step 7).

### 5.4 Verdict

The plan adds about 21 ScrollTriggers, **no pins**, no plugins, ~4 to 5 KB of JS (the cursor is ~1 KB
and a few hundredths of a millisecond per mouse move) and one medium-cost
item (the stacking cards' layers, ~30 MB GPU while visible). Removing the Projects parallax pays back
6 scrubbed tweens and halves the concurrent scene loops. Expected effect on frame time: within the
measured headroom (today's p99 is 9.3 ms at 120 Hz), with the 4× throttled target kept at 60 fps.
Every item is measured again after it lands (Part 7); anything that pushes p99 over budget is cut or
reduced before the next item starts.

---

## 6. Order of work, commits and rollback

One commit per step, in this order (cheapest and most global first, so later steps build on them).
Each commit can be reverted alone.

| Step | Item | Size | Depends on |
|---|---|---|---|
| 1 | G3 `fastScrollEnd` + 4.10.2 `grid-flow-dense` | small | — |
| 2 | G2 `gridSlot` pattern, applied to Experience, Projects, Tech stack, Results, Contact headings | medium | 1 |
| 3 | G1 speed skew | small | 2 (shares targets) |
| 4 | 4.2 Hero launch exit + streak + proximity pause | small | 3 |
| 5 | 4.3 About slowest / fast + handoff | small | — |
| 6 | 4.4 Lap timer, sector colours, velocity exits, LAP 1 | medium | — |
| 7 | 4.5 Experience grid formation | medium | 2 |
| 8 | 4.6 Projects pinned split + stacking cards (desktop), then phones | large | 1, 2 |
| 9 | 4.7 Tech stack second row, centre emphasis, pill stagger | medium | — |
| 10 | 4.8 450+ fill | small | 2 |
| 11 | 4.9 Contact flag sweep, lap time, TrackMap finish, magnets | medium | 2 |
| 12 | 4.11 Custom cursor: dot, ring, speed stretch, states, magnet snap | medium | — (independent; can move earlier) |
| 13 | Docs: README, GSAP-ENHANCEMENTS status rows | small | all |

---

## 7. Verification per step

After every step:

1. `npm run build` (tsc, Vite, SSR build, prerender) passes; prerender size noted.
2. Browser pane, 1440 × 900: scroll the changed section down and back up; screenshot; console clean.
3. Phone 375 × 812: same; no horizontal scroll (`document.documentElement.scrollWidth === innerWidth`).
4. `?nomotion`: every word visible, layout identical to the final frame.
5. Trigger count: `__ST.getAll().length` against the budget (≤ 100).
6. Frame times: the same scripted full-page scroll used for the baseline:
   - browser pane, WebGL on (p50 / p95 / p99 / frames > 20 ms),
   - headless at CPU 1× and 4× (`THR=4 node perf.mjs …`).
   Results go into a table in this doc next to the baseline.
7. Anchor jumps from the menu into each section land on finished content.
8. Dialogs open and close over the changed section without jank (the page is memoized; check nothing
   re-renders).
9. For step 8 (Projects): resize across 1024 px and across the "fits" height, back and forth; the layout
   switches cleanly and the helmet path still perches on P3.

10. For step 12 (cursor): hover every interactive element type in the states table; open and close a
    dialog; drag the scrollbar; check the native cursor returns with `?nomotion`, on touch emulation and
    when the script is blocked; measure the per-move cost with a scripted 5 s pointer sweep in the
    pane (target ≤ 0.1 ms per move, no frames over 20 ms caused by it).

Still for you on real hardware (not measurable here): a mid-range Windows laptop with a mouse wheel, an
iPhone and an Android phone, and the OS "Reduce motion" setting.

---

## 8. Decisions I need from you

1. **Scope:** all of Part 4, or a first pass of the signature pieces only (G1, G2, 4.5, 4.6, 4.9, 4.11)?
   Recommended: signature pass first, then the rest.
2. **Projects stacking (4.6):** it changes the Projects layout (split column, stacked cards) and makes
   the section about one screen longer. Yes or no? Recommended: yes, it is the biggest "wow" in the plan.
3. **Tech stack horizontal accordion (4.7.4):** recommended no (hides content behind hover).
4. **Small mono labels "About me", "Career timeline", "Contact" (gpt-taste meta-label ban):** keep them,
   or make them screen-reader only (the h2 stays for structure)? Recommended: drop "About me" and
   "Contact" visually (the big type says it), keep "Career timeline" (it labels the HUD).
5. **More space between sections (gpt-taste spacing rule):** `md:py-32` → `md:py-40`? Recommended: only
   around Projects and Contact, where the new moments need room.
6. **Lap time in Contact (4.9.2):** real time on page, shown as a lap time. Fun or gimmick? Recommended:
   yes.
7. **Custom cursor labels (4.11):** text labels (VIEW / OPEN / DRAG / SCROLL), or icons only (arrow,
   plus, grip)? Recommended: text, in mono, because it matches the timing-board labels around the site.
8. **Hide the native cursor everywhere, or only over interactive elements?** Recommended: everywhere on
   the page (the dot is exact, so precision is unchanged), with the native I-beam kept for dialog text.

---

## 9. Explicitly not doing

- **Horizontal-scroll Projects gallery.** A classic "wow", but it hides the archive CTA behind a long
  sideways scroll, is awkward with keyboard and screen readers, and would need a third pin.
- **Stock photography (gpt-taste picsum rule).** The product scenes are real and specific; photos would
  make it more generic.
- **Blur filters on scroll.** `filter: blur()` repaints every frame over large areas; the darkening in
  4.6 uses an opacity overlay instead.
- **ScrollSmoother.** Lenis is already wired into the ticker; swapping would touch every pin for no gain.
- **New WebGL work.** The Stage is already the heaviest part; this plan is DOM and GSAP only.
