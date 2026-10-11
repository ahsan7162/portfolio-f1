# Font audit: portfolio v2

11 October 2026.

> **Status: done on branch `fix/fonts`.** Every item in section 4 is in, plus the phone scale-up
> for the project scenes (3.4). Changes from the plan below:
> - **Mono font: Monaspace Krypton**, using its plain zero (alternate `cv01=1`), which is built
>   into the font file. Neon was the other option; Krypton's chamfered shapes read more like a
>   timing screen.
> - **Display sizes:** six roles instead of five (`hero`, `section`, `lead`, `stat`, `card`,
>   `small`). Below 375 px the minimums shrink with the screen, so the name and the longest
>   words fit a 320 px phone. At 360 px the name used to overflow by 8 px.
> - **Detail dialog titles:** long project names ("modernization", "notifications") were wider
>   than a phone screen at the old size too. The title now uses the lead size on phones.
> - **Letter-spacing:** one size-aware rule, `calc(0.7px - 0.043em)`, instead of fixed steps.
> - **Fonts:** 238 KB → **112 KB**. The Krypton file is smaller than the trimmed JetBrains
>   Mono would have been.
> - **Not changed:** `motion-lab/` (the social card and films) still uses JetBrains Mono.

**What was checked**

- **The code:** `src/index.css`, every section and component, and the canvas text in `src/gl/`.
- **The live page:** the dev server in Chrome at 1440×900 and 375×812. I read the computed font, weight, width, size, tracking and colour of every visible text node.
- **The font files:** checked with fontTools for axes, glyph coverage and OpenType features. I also trimmed test copies to measure possible savings.
- **Contrast:** worked out with the WCAG formula.

---

## Summary

| Question | Answer |
|---|---|
| Is the display font good and on theme? | **Yes, keep Mona Sans.** At 125% width, weight 800 and all caps, it gives the site its F1 broadcast voice. It is not one of the usual AI-template fonts. |
| Is the mono font good and on theme? | **It is the weak spot.** JetBrains Mono is the standard "developer portfolio" mono. Its dotted zero comes from code editors, not timing screens. I recommend replacing it, after a side-by-side preview. |
| Do weights make important things look important? | **Partly.** Body, label and button roles are clear. But weight 800 is used for *every* display tier, from 14 px to 416 px, so size is the only signal left. The sizes have no system, so in several places a tile, a CTA or a caption is as big as the section heading, or bigger. |
| Anything else? | **Two bugs and one performance item.** (1) The `→` arrows are not in either web font and fall back to system arrows. (2) No font preload. (3) The fonts could be about 44% smaller (238 KB down to 132 KB). |

---

## 1. Are the fonts good, and do they fit the theme?

### Mona Sans (headings and body): keep it

- **It fits the race theme.** Wide, heavy, all-caps lettering is what F1 liveries and broadcast graphics look like. `.display` (`font-stretch: 125%`, weight 800, caps, tight tracking) gets very close to that.
- **It does three jobs from one variable file.** The width axis (75 to 125) and weight axis (200 to 900) cover:
  - poster headings (125%)
  - small headings (110 to 115%)
  - plain body text (100%)

  That is why the site looks consistent with only one sans.
- **It is not a template font.** It is not Inter, Geist, Space Grotesk, Satoshi or Manrope. At 125% it also stops looking like "GitHub's font".
- **The italic is a real italic file, not a faux slant.** It is used on only four words ("Full-Stack", "slowest", "fast.", "fast"), which keeps it strong.

### JetBrains Mono (labels, buttons, data): replace it, preview first

It is a good, readable font. The problems are about what it signals:

- **It is the default developer-portfolio mono.** It is also the default pairing in AI-generated dev sites. It is the one font on the site that looks like a template.
- **It is a code-editor font, not a timing-screen font.** Its zero has a dot inside. You see it in the lap timer `0:00.000`, the years (`2025`) and the deck index `01 / 03`. The Fontsource subset removes the glyph alternates, so the dot cannot be turned off.
- **It carries a big share of the look.** About 85 labels and every button use it, so changing it changes the feel of the whole site.

Options:

| Option | Why | Notes |
|---|---|---|
| **Monaspace Krypton** (recommended) | GitHub's mono family, designed to pair with Mona Sans. Krypton is the "mechanical" style, so it reads more like telemetry and pit-wall hardware. | Variable font with weight, width (100 to 125) and slant axes, so labels can match the 125% headings. Self-host the variable woff2 from the `githubnext/monaspace` releases (OFL licence). The npm package `@fontsource/monaspace-krypton` exists but has static weights only, with no width axis. |
| **Monaspace Neon** | Same family. Neon is the neo-grotesque style, the closest match to Mona Sans's own shapes. The safest pairing. | Same as Krypton. |
| Martian Mono | Wide and technical, with a width axis. Available as `@fontsource-variable/martian-mono`. | Popular on crypto and web3 sites lately, so less distinctive. |
| Keep JetBrains Mono | No work. Already used in v3 and the brag films. | Stays generic. |

**The trade-off to decide:** portfolio v3 and the brag intro films also use JetBrains Mono. Switching v2 alone splits the type system, so decide whether v3 and the films follow.

**Before switching:** preview Krypton and Neon on the real page, with the same labels, buttons and lap timer side by side. Then pick.

---

## 2. Do the weights make important things look important?

### What the site uses today

| Font | Weight | Where |
|---|---|---|
| Mona Sans | **800**, 125%, caps | Every display level: hero name, section headings, card titles, stats, the About statement, menu rows, "See all projects", the `450+` caption, podium digits, logo |
| Mona Sans | 700 italic, 125% | "Full-Stack" in the hero subtitle (only use) |
| Mona Sans | 600, 110 to 115% | Small headings: education and award, dialog highlight titles, menu job names |
| Mona Sans | 500, 112% | Hero subtitle, status pill, the red "4 languages" tile text |
| Mona Sans | 400 | All body text |
| JetBrains Mono | 400 | `.label` (11 px caps), stack pills, footer |
| JetBrains Mono | 600 | Buttons, red proof lines, sector tags (S1, S2, S3), "Lap 1" |
| JetBrains Mono | 700 | Cursor label, project-scene SVG text |

### What works

- **The hero order is right:** name (151 px), then subtitle (30 px, weight 500) with its red italic accent, then the lede (18 px, weight 400, muted), then the buttons. You read them in the intended order.
- **The small text has clear roles:**
  - muted 400 for reading
  - mono 600 caps for actions
  - red mono 600 for proof ("450+ AI agents, 35% dashboard adoption")
- **The accents are used sparingly.** Italic plus red appears on four words in total.

### 2.1 Weight 800 is used for every display level, and the sizes collide (main issue)

Because every heading level is weight 800 caps, size is the only way to tell them apart. The sizes come from about 25 one-off `clamp()` values, with no shared scale.

Measured on the live page:

**Desktop, 1440 px wide**

| Element | Size | Problem |
|---|---|---|
| "Work experience" section heading | 115 px | |
| Red "4" tile | **115 px** | Same size as its section heading |
| Lead "Careem" tile title | 92 px | Close to the heading |
| "Projects" section heading (sticky-column mode) | **81 px** | Smallest section heading on the page |
| "See all projects" button | **101 px** | Bigger than the "Projects" heading above it |
| Other section headings | 101 / 101 / 115, Contact 130 | No shared size |
| Caption under `450+` ("AI agents shipped on a platform I built") | 56 px, weight 800, caps | A caption styled like a heading |

**Phone, 375 px wide**

| Element | Size | Problem |
|---|---|---|
| "Careem" tile title | **44 px** | Bigger than its section heading ("Work experience", 42 px) |
| Red "4" | **72 px** | 1.7× its section heading |
| Results stats | **44 px** | Bigger than the Results heading (38 px) |
| "One lap, three teams." | 29 px | Smaller than the stage titles (36 px) and stats (36 px) |

**Why this happens on phones:** the smallest allowed size (the `clamp()` minimum) of the inner items is larger than the heading's. For example, the lead tile's title has a 2.75rem minimum ([Experience.tsx:65](../src/components/sections/Experience.tsx)), but the section heading has 2.6rem ([Experience.tsx:52](../src/components/sections/Experience.tsx)). The Results stats have 2.75rem ([Results.tsx:96](../src/components/sections/Results.tsx)), but the Results heading has 2.4rem.

**Fix, part 1: a display scale, defined once in `index.css`.**

| Token | Use | Suggested value |
|---|---|---|
| `--display-hero` | Hero name, Contact line | `clamp(3rem, 10.5vw, 9.5rem)` (as now) |
| `--display-1` | Every section heading | `clamp(3rem, 8vw, 7.5rem)` |
| `--display-2` | Lead tile title, big tile stat | `clamp(2.25rem, 5.5vw, 5.5rem)` |
| `--display-3` | Card titles, stats in a row, dialog stats | `clamp(1.75rem, 3.2vw, 3rem)` |
| `--display-4` | Inline display: podium digits, the sticky "now" title, AI provider list | `clamp(1.25rem, 2vw, 2rem)` |

Rule: a section heading is always at least one step above anything inside its section, at every screen width. The `450+` finale keeps its own size, because it is meant to be the biggest thing on the page.

**Fix, part 2: use weight as a second signal.** Mona Sans goes up to 900.

- **900:** the two biggest moments only, the hero name and `450+`. In a test render, 900 is visibly heavier at 64 px.
- **800:** section headings and card titles (as now).
- **600 to 700:** supporting display text, or the hero-subtitle style (sentence case, weight 500, 112%). This covers the `450+` caption ([Results.tsx:116](../src/components/sections/Results.tsx)), the podium digits, the AI provider list and the sticky "now" title.

### 2.2 The same tight letter-spacing at every size

`.display` uses `letter-spacing: -0.035em` everywhere ([index.css:71](../src/index.css)). At 90 px and up it looks like a poster. Between 20 and 60 px the caps get cramped. In a 64 px test render, "AVATAR LAP, WAY" at −0.035em has letters almost touching, while the same text at 0 reads cleanly.

This affects:

- the 56 px caption
- 36 px card titles
- 18 px podium digits
- the 14 px nav logo (`tracking-tight`)

Fix: make the spacing depend on size.

- 80 px and up: −0.035em
- 32 to 80 px: −0.02em
- under 32 px: 0

This fits naturally into the display tokens above.

### 2.3 Width values that drift

Sans text uses five widths: 100%, **110%, 112%, 115%** and 125%. The middle three look identical on screen, so they look like an accident rather than a choice:

- 110%: Results and dialog small headings
- 112%: hero subtitle
- 115%: menu job names

Fix: three tokens, 100% (body), 112.5% (small headings and subtitle) and 125% (display).

### 2.4 Body text looks thin on the dark background

Body text is weight 400, in muted grey, with grayscale antialiasing ([index.css:42](../src/index.css)). Light text on a dark background renders thinner than the same text on white. At 14 px (education text, menu job roles) it looks light. The variable font allows in-between weights, so set body text to **450**. In a test render, 450 reads firmer without looking bold.

### 2.5 Mono labels are at the size limit

- **Too small for real content:** `.label` is 11 px, weight 400, caps, muted grey. It is used for real headings: the Tech stack tile headings, the "Career timeline" `<h2>`, and education and award years. It is readable, but it is the smallest text on the page that carries content. Use 12 px, or keep 11 px at weight 500.
- **10 px is fine for decoration only:** the scroll-rail labels, track-map name and cursor label.
- **Pixel units ignore the browser's font-size setting:** `.label`, `.btn` and `.pill` sizes are in px, so a visitor who raises the browser's default font size gets no bigger labels. Use rem: 11 px = 0.6875rem, 12 px = 0.75rem.

### 2.6 Minor: the proof line is smaller than the summary above it

The red proof line on each tile ("450+ AI agents, 35% dashboard adoption") is 14 px. The summary above it is 18 px. The red colour carries it, so this is optional. If the proof should land first, use 15 to 16 px.

---

## 3. Things you may have missed

### 3.1 Bug: the `→` arrows are not in either web font

The Fontsource "latin" subsets include U+2191 and U+2193 but **skip U+2192 (→)**, and no other subset has it. fontTools confirms neither loaded file contains it. So every arrow is drawn by a system font: Menlo or Apple Symbols on Mac, and something different on Windows and Android.

It shows most in Mona Sans contexts:

- the hero "Currently at Careem" pill
- the large round arrow on "See all projects"

In both places a thin hairline arrow sits next to weight-800 caps. In the mono buttons ("Breakdown →", "Details →", "See all →") the system arrow is close enough that the swap is less obvious, but it is still not JetBrains Mono.

Arrows appear in:

- [Hero.tsx:61](../src/components/sections/Hero.tsx)
- [Experience.tsx:72](../src/components/sections/Experience.tsx)
- [Projects.tsx:152](../src/components/sections/Projects.tsx)
- [Lap.tsx:160](../src/components/sections/Lap.tsx)
- [Dialogs.tsx:172](../src/components/Dialogs.tsx)
- [Nav.tsx:151](../src/components/Nav.tsx)

Fix: one small inline-SVG `<Arrow />` component. Its stroke width can follow the text weight, and it looks the same on every OS and in every font.

### 3.2 No font preload

The built `index.html` has no `<link rel="preload" as="font">`. The browser only finds the fonts after it downloads and parses the CSS, so the hero name (the largest element on first load, which sets the Largest Contentful Paint time) waits, then swaps.

- **First visit:** the start-lights intro hides this, because it waits up to 1.2 s for fonts.
- **No intro:** the swap is visible. The intro is skipped on:
  - a second visit in the same tab
  - any `#hash` link
  - reduced motion
  - `?nointro`
- **How big the jump is:**
  - **macOS:** the system fallback is within 3% of Mona Sans's width for the name, so the jump is small.
  - **Windows:** Segoe UI has no expanded width, so the jump will be bigger. I did not test this on a Windows machine.

Fix: preload the upright Mona Sans latin file. Optionally preload JetBrains Mono latin too. Vite hashes the file names, so add the link at build time, for example in `scripts/prerender.ts`, which already rewrites the `<head>`.

### 3.3 The font files are bigger than needed

Measured with fontTools. Only the latin files load.

| File | Now | Trimmed to the axis ranges actually used | Saved |
|---|---|---|---|
| Mona Sans upright | 95.8 KB | 67.0 KB (weight 400–900, width 100–125) | 29 KB |
| Mona Sans italic | **102.3 KB** | **35.0 KB** (weight 700–800, width fixed at 125) | 67 KB |
| JetBrains Mono | 39.5 KB | 30.1 KB (weight 400–700) | 9 KB |
| **Total** | **237.6 KB** | **132.1 KB** | **105 KB (−44%)** |

The italic is the largest font file on the site, for four words plus the helmet livery (which also uses italic 800 at 125%, so it is covered by the trimmed file). The trimmed files would be self-hosted in place of the three Fontsource imports in [main.tsx:3](../src/main.tsx). If the mono font is replaced (section 1), trim the new one the same way.

### 3.4 Small text in the project scenes on phones

The animated SVG scenes on the project cards use font sizes of 5 to 7 inside a 320-wide viewBox, scaled to 76%. On a 375 px phone, text boxes come out about 6.5 px tall, which is unreadable. The scenes are `aria-hidden` illustrations, so this does not affect screen readers. It does make them look busy on phones. Options: drop the smallest labels below 640 px, or raise the label size slightly. Low priority.

### 3.5 Checked and fine

- **Contrast (WCAG AA):** everything passes.

  | Pair | Ratio |
  |---|---|
  | Main text on carbon | 17.8:1 |
  | Muted grey on carbon | 7.75:1 |
  | Dim grey on carbon | 5.3:1 |
  | Red on carbon | 5.2:1 |
  | Carbon text on red buttons | 5.2:1 |
  | Red on the lead tile | 4.59:1 (passes, but close to the 4.5:1 limit) |

- **Letter-splitting animations:** SplitText's letter splitting costs almost no kerning. On "MUHAMMAD" the difference is 2 px.
- **Fixed-width numbers:** the lap timer and the intro counter use them (Mona Sans supports `tnum`). The rolling stats use their own per-digit boxes, so they don't jitter.
- **Canvas text:** it waits for the font before drawing (`runoff.ts`, `livery.ts`), and ScrollTrigger re-measures after the fonts load.
- **Other subsets:** `unicode-range` keeps the latin-ext, Vietnamese, Greek and Cyrillic files from downloading. `×` (U+00D7) is in the latin subset.
- **Line lengths:** 42 to 65 characters, which is comfortable.
- **No faux bold or italic:** every weight and style in use exists in the files.

---

## 4. Suggested order

| # | Change | Effort | Effect |
|---|---|---|---|
| 1 | SVG `<Arrow />` instead of the `→` character | Small | Fixes a visible bug on every OS |
| 2 | Display scale tokens, and fix the phone `clamp()` minimums | Medium | Headings outrank tiles, CTAs and captions everywhere |
| 3 | Weight roles: 900 for the hero name and `450+`, lighter supporting display | Small | Weight becomes a second hierarchy signal |
| 4 | Letter-spacing by size | Small | Mid-size caps stop looking cramped |
| 5 | Width tokens 100 / 112.5 / 125 | Small | Removes the 110/112/115 drift |
| 6 | Body text at weight 450 | Tiny | Firmer reading text on dark |
| 7 | Labels at 12 px minimum, in rem | Small | Readability, respects browser font size |
| 8 | Preload, plus trimmed self-hosted fonts | Medium | 105 KB less, no font swap on return visits |
| 9 | Mono replacement (preview Krypton and Neon first) | Medium | Removes the one generic font |

1 to 7 are CSS and markup changes with no visual risk beyond what they intend. 8 touches the build. 9 needs your decision on v3 and the films.
