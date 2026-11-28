# Products: design and build guide

This is the guide for `/products`, the section of the site that shows what Muhammad Ahsan has built.
Read it before you add a product, arrange a detail page, add a block type, or change how the section looks or moves.

The section has its own identity. It shares nothing visual with the portfolio at `/` (no shared colours, fonts, components or Tailwind).

**Contents**

1. [The rules that do not bend](#1-the-rules-that-do-not-bend)
2. [Where everything lives](#2-where-everything-lives)
3. [Colour](#3-colour)
4. [Type](#4-type)
5. [Layout and breakpoints](#5-layout-and-breakpoints)
6. [Motion](#6-motion)
7. [The main page](#7-the-main-page)
8. [Add a product](#8-add-a-product)
9. [Design a detail page](#9-design-a-detail-page)
10. [Block reference](#10-block-reference)
11. [Add a new block type](#11-add-a-new-block-type)
12. [Add a kind, a stage or a live demo](#12-add-a-kind-a-stage-or-a-live-demo)
13. [Writing](#13-writing)
14. [Accessibility](#14-accessibility)
15. [Check your work](#15-check-your-work)
16. [Known gaps](#16-known-gaps)
17. [Before publishing](#17-before-publishing)
18. [The design system page](#18-the-design-system-page)
19. [The playground](#19-the-playground)

---

## 1. The rules that do not bend

Each of these came from a decision the owner made after seeing the alternative. Do not reopen them without asking.

| Rule | Why |
|---|---|
| The page is neutral: bone type on jet black (`#000000`). | A product's screenshot can be any colour, light or dark. A neutral page lets every one of them sit well. |
| The page has no accent colour of its own. | One house accent on every highlight was rejected ("why everything is in lime?"). |
| Colour comes only from the product, and only on that product's own surfaces. | A colour per product spread across the page was rejected as a rainbow. |
| The ground is `#000000`, never a near-black. | Asked for explicitly. |
| The hero does not depend on the product list. | A hero built from the products was rejected: it must not change when products are added or removed. |
| A detail page is a list of blocks. New content goes in as a block type, never as a section hard-coded for one product. | So any page can be arranged from any components, and new components can be added later. |
| Detail pages must not all share one order. | Pages with the same hierarchy were rejected. Each product arranges its own. |
| The main page must hold up at about 50 products. | Stated target. Nothing on it may assume a short list. |
| Animation is built on GSAP. No other animation library. | Others were tried and removed. |
| Nothing trails the scroll, and no layout jumps. | Small jumps and delays get noticed. See [Motion](#6-motion). |
| The hero car faces right, and its labels read 01 Design to 06 Launch, left to right. | Both were corrected by the owner. |
| Design choices are shown as rendered images, side by side. | Words and ASCII sketches are not enough to choose from. |
| Frosted glass only on the sticky top bars (the main page's `.hd`, the detail page's `.dt-top`, no border on either), the detail page's jump list and the back-to-top button (`.pp-up`), each behind `@supports (backdrop-filter)`. | Chosen from renders on 2026-11-27. Over the flat black ground glass shows nothing; on the compare labels and deck tags it was tried and turned down. |

---

## 2. Where everything lives

```
products/index.html              the page's HTML entry (second Vite entry beside the portfolio's)
products/playground/index.html   the playground's editor (a third entry; section 19)
public/products/playground/frame.html  the playground's canvas: a locked sandbox (section 19)
vite.frame.config.ts             builds the canvas as one classic script, fonts inlined
scripts/playground.ts            the canvas's headers, its dev build, and the dev-only Save
scripts/playground-check/        headless-Chrome checks of the sandbox, the editor and Save (section 15)
public/products-media/<slug>/    a product's screenshots, thumb, poster and film
src/products/
  main.tsx                       mounts <App />, loads styles/base.css (which loads styles/tokens.css first)
  App.tsx                        the shell: route, smooth scroll, the page-change curtain
  router.tsx                     /products and /products/<slug>; Link, navigate
  data.ts                        EVERY PRODUCT. The only file you touch to add one.
  types.ts                       Product, Kind, StageKind, Media, and the Block union
  brand.ts                       brandVars(): a product's colour as CSS variables
  motion.ts                      the one GSAP import: plugins registered, defaults set
  format.ts                      pad(): 1 -> "01", for an index (a product's number, a row's); a count stays a plain number
  arrive.ts                      onReveal(): run when the curtain lifts
  scroll.ts                      scrollToY(), scrollToEl(), stepToY(), the wheel gate
  Cursor.tsx                     the pointer label ("Open") on links with data-cursor
  BackToTop.tsx                  the round frosted back-to-top button, on both pages
  home/                          the main page
    Home.tsx                     hero, featured, catalogue, footer
    Header.tsx                   SiteHeader, the page's one top bar: sticky and frosted, overlaying the hero and featured tops; no count, since it sits over the hero
    hero/                        the introduction (see section 7)
    Featured.tsx                 featured products, one full screen each
    Catalogue.tsx                every product: filters, search, list and wall
    Preview.tsx                  a product's small picture in the catalogue
    room/                        the footer room, loaded on its own when the footer comes near (see section 7)
      Scene.tsx                  the drawing: the room, me as a jointed figure, the cat, the screens
      day.ts                     the four-day timeline, the poses, and render(), which draws the state
      Room.tsx                   starts and stops it, the skip bar, pause, the clickable objects, the cat's click
  stage/                         how a product is shown "live"
    Stage.tsx                    picks the demo or frame from product.stage; TALLY, what a demo's number counts
    names.ts                     the live screen names (LIVE_NAMES), SCENES, and the names of the pieces below; no browser code, so tests can import it
    live.tsx                     a live screen's name -> the screen that draws it
    PrDemo.tsx, prScenes.ts      the PR Dashboard demo (My PRs, #482, Fix with agent, the batch bar, Send to agent, the thread on the branch, the alert) and its four scenes, its UI state and rest()
    PrView.tsx                   the PR Dashboard kit the demo and the pieces draw with
    pr.ts, prSample.ts           its world (the plugin's blockersOf, copied and tested; picks, send, push, land) and the invented acme sample
    prData.gen.ts, prRules.gen.ts generated from the plugin's own code by motion-lab/products-directions/pr-dashboard/prdata.ts: every prompt and every alert run; the blockers the tests pin
    pieces.tsx                   the product drawings the rules, compose and replay blocks show, by name (RULES, PARTS, SURFACES)
    JiraDemo.tsx                 the Jira Board demo: the plugin's panel on bb's rail, a ticket beside the list, Move to, the assignee search; loaded on its own, on idle (Stage.tsx)
    jira.ts, jiraRules.ts        its invented site (acme-software), workflow and people, and every change the demo makes; the plugin's own list rules, copied (MIT)
    jiraScenes.ts, jiraFilm.ts   its four scenes as lists of inputs (Close the tabs, Hands on the keys, Move it on, Hand it off) and their film layer: the tab crush, the giant keycap, the note
    jiraParts.tsx                Jira Board's glyphs, status rings, priority marks and ticket row, shared by the demo and the row screen
    JiraRow.tsx, jiraRowData.ts  the jira:row live screen the anatomy block takes apart, and its data, kept apart from the site so a page showing only the row stays light
    DashDemo.tsx, dashScenes.ts  the bb Dashboards demo and its four scenes (beat sheets: camera, pointer, state changes)
    dashFilm.ts                  what a playing scene draws over that demo: the program streaming in, its check, parts growing out of their lines, ripples, the pulse, the versions deck, and rest()
    DashView.tsx, dash.ts        the dashboard kit the demo and the live screens draw with, and its data
    film.ts                      what every filmed scene shares: box(), the camera and the drawn pointer (glow and click ring marked data-glow, data-click)
    MdDemo.tsx                   the Markwright demo: the editor beside the file it writes, the / menu, the agent's writes and the conflict banner
    md.ts, mdState.ts            Markwright's document model (blocks that keep their source; an edit rewrites only its block) and every change the demo makes
    mdScenes.ts, mdFilm.ts       its four scenes (Tick it, Insert it, Draw it, Agents welcome) and their film layer: the Mermaid source typing in as its diagram grows
    mdRender.tsx, mdDiagrams.tsx a block drawn as the plugin shows it; the eight Mermaid starters drawn by hand
    UsageDemo.tsx                the Usage Explorer demo: the plugin's limits screen over a sample week you play or drag
    usageRules.ts, usageWeek.ts  the plugin's own limits rules, copied (MIT); the sample week, run minute by minute, and the four moments it plays to
    mdCatalog.ts, mdTemplates.ts the plugin's 39 / menu entries and its eleven templates, copied from it (MIT)
    MdPage.tsx                   a template drawn as a page: the md:tpl-* live screens
    mwData.gen.ts                generated from the plugin's own code by motion-lab/products-directions/markwright/mwdata.sh: the demo's real saves, the diff block's two files, the corpus checks
    OpenUiDemo.tsx               the OpenUI Live Replies demo, loaded on its own: a bb thread whose blocks answer back, the render line, Edit with check_openui's words
    ouiThread.ts, ouiScenes.ts   its conversation (who said what, what a click sends, the tally) and its four scenes
    oui/                         the OpenUI drawing kit, loaded only with the demo or an oui:* live screen:
      lang.ts                    an OpenUI Lang reader: whole statements as they stream, problems worded as check_openui words them
      kit.tsx, render.tsx        the renderer and OpenUI's core; numbers, planning, reports, web.tsx draw the plugin's groups
      OuiLive.tsx                the oui:* live screens (replies that stream in, the CI reply, oui:spec-<Component>)
      copy.ts, programs.ts       the page's words (in every products bundle), and its programs (with the kit)
      plugin/                    the plugin's pure logic, copied unchanged (MIT): scoring, PERT, chart layout, report parsers
      *.gen.ts                   generated from the plugin by motion-lab/products-directions/openui/ouidata.ts: the catalogue, the examples, check_openui's wording on 23 programs
    Frames.tsx                   PhoneFrame, BrowserFrame, WindowFrame, KindFrame (the frame for a kind), SampleScreen
  detail/                        a product's own page
    Detail.tsx                   top bar, hero, outline, the blocks, the Next band
    fit.ts                       useFit(): sizes a name to fill its width
    blocks/index.tsx             the registry: block type -> component; listed(), the blocks with their labels
    blocks/shared.tsx            BlockProps, Label, useBlockMotion, countUp, useCopy, usePreload
    blocks/<Name>.tsx            one file per block type
    blocks/rotate.ts             the timer and index logic the cases, tour and scenes blocks share
    blocks/keyMatch.ts           which shortcut row a key press is (the keys block lights it)
  lineDiff.ts                    a line diff as git counts it: every "lines changed" on these pages comes from it
    blocks/MediaView.tsx         a Media value in the frame its product's kind calls for
  styles/                        plain CSS, one file per area
  products.test.ts               routes and product integrity
  system/System.tsx              /products/system, the design system drawn from tokens.css (section 18)
  playground/                    /products/playground (section 19)
    catalog.ts                   every block's group, use, glyph and starting content; the templates
    doc.ts                       the page being built: blocks, keys, undo; kept in this browser only
    literal.ts                   reads and writes the page as code: plain data, never run
    protocol.ts                  what the editor and the canvas say to each other, and the checks on it
    editor/                      the editor: Playground, Canvas, Fields, CodeEditor, Splitter, layout.ts (panes and widths), icons, roving.ts (arrow keys), written.ts (the starter block)
    frame/                       the canvas: main.tsx, compile.ts (TSX with sucrase), loopGuard.ts
  pages/                         pages saved from the playground, by slug; each replaces its product's blocks in data.ts
  detail/blocks/Custom.tsx       the custom block: a component written in the playground, by name
  detail/blocks/saved/           blocks saved from the playground, and their index
  styles/tokens.css              every token (section 3); tokens.test.ts holds the page CSS to it
```

Routing: `/products/<slug>` has no file. `productsFallback()` in `vite.config.ts` serves the products page for it in dev and preview, and the `rewrites` entry in `vercel.json` does the same in production. A new product needs no routing change.

CSS class prefixes, one per area. Keep to them so nothing collides:

| Prefix | File | Area |
|---|---|---|
| (none) | `tokens.css` | every token; no classes |
| `pp-` | `base.css`, `shell.css` | type, buttons, curtain, cursor |
| `hd-`, `ft-`, `cat-`, `ftr-` | `home.css` | top bar, featured, catalogue, footer |
| `hc-`, `r-`, `c-` | `hero-car.css` | car hero, its reveals, its paint |
| `dt-` | `detail.css` | detail page furniture and the first ten blocks |
| `bv-` | `blocks-visual.css` | split, showcase, compare, bento, marquee, MediaView, cases, tour, scenes and its Your turn, anatomy, route |
| `bc-` | `blocks-content.css` | scores, timeline, faq, quote, palette |
| `stg-`, `frm-` | `stage.css`, `frames.css` | stages and device frames |
| `prd-` | `pr-demo.css` | the PR Dashboard demo, its kit and its pieces |
| `jbd-`, `jbf-` | `jira-demo.css` | the Jira Board demo (`jbd-`), its film layer (`jbf-`), and its row screen (`.jbd-live`) |
| `dsd-` | `dash-demo.css`, `dash-film.css` | the bb Dashboards demo and its dashboard kit; the demo's film layer, camera and versions deck |
| `mwd-` | `md-demo.css` | the Markwright demo, its film layer, and its template pages (`.mwd-live`) |
| `ued-` | `usage-demo.css` | the Usage Explorer demo: the limits screen and its week |
| `oud-` | `openui-demo.css` (its box in `stage.css`) | the OpenUI Live Replies demo: the thread, the render line, Edit, the film layer |
| `oui-`, `oul-` | `oui.css` | the OpenUI drawing kit (every component a reply can hold) and its live screens |

---

## 3. Colour

All tokens, of every kind, are in `styles/tokens.css`, which `base.css` loads first. That file is the design system: the stylesheets only read it. `/products/system` draws every token from it, and `styles/tokens.test.ts` fails when a raw value that has a token is written in the page CSS, or when a value off every scale appears that is not on its short list of known ones (`OFF_SCALE`, which may only shrink).

The scales are named by what they hold: `--sp-12` is 12px, `--r-14` a 14px corner, `--fs-15` 15px type, `--t-180` 180 ms. A role (what a step is for) is written next to each scale below, not in its name, so a value can be read at a glance and a role can move to another step without renaming anything.

One trap: a token made from another token is resolved where it is declared (`:root`). `--acc`, `--ink`, `--line` and `--ground` are swapped on branded and paper surfaces, so never put them inside a composite token (a ring, a gradient). Write the composite where it is used, from its pieces: `box-shadow: inset 0 0 0 var(--stroke-2) var(--acc)`.


| Token | Value | Use |
|---|---|---|
| `--black`, `--bone`, `--white` | `#000000`, `#ECE9DF`, `#FFFFFF` | the raw colours; every other token is made from these |
| `--ground` | `--black` | the page |
| `--raise`, `--raise-2` | `#0E0E0D`, `#181817` | panels, cards, frames lifted off the ground |
| `--ink` | `--bone` | text |
| `--dim` | bone at 58% | secondary text and hints (about 5.9:1 on black) |
| `--faint` | bone at 34% | lines, dots, rings and other drawing; never text (about 2.6:1 on black, under the 4.5:1 text needs) |
| `--line` | bone at 10% | hairlines and borders |
| `--acc`, `--on-acc` | bone, black | the highlight and the text on it |
| `--paper`, `--paper-2`, `--paper-ink`, `--paper-dim`, `--paper-line` | light set | a light-themed product shown on the dark page |
| `--bad`, `--warn` | `#FF5A4C`, `#F2C14E` | status inside a product's own interface only |
| `--shadow-faint`, `--shadow`, `--shadow-deep` | black at 12%, 50%, 72% | drop shadows under frames and demos |

**How a product's colour gets on the page**

1. The product declares `brand` (a 6-digit hex taken from its own interface).
2. A surface that belongs to the product sets the variables: `style={brandVars(product.brand)}`. This gives `--brand` and `--on-brand` (black or bone, whichever reads on the colour).
3. The surface adds the class `pp-branded`, which swaps `--acc` and `--on-acc` to the brand pair.
4. Everything inside keeps using `--acc` and `--on-acc`. Never write a product's hex in CSS.

Where the brand is allowed: a product's featured stage, its tile preview on the wall, its peek preview, its whole detail page (`<main class="dt pp-branded">`), and the page-change curtain, which takes a deep shade of the destination product (`color-mix(in oklch, <brand> 46%, #000000)`). The curtain carries the destination's name, at up to 17vw; a longer name is shrunk to fit between the page's gutters (`fitLabel()` in `App.tsx`), so no name runs off the screen.

Where it is not: the hero, the catalogue chrome (filters, search, rows), the footer, the top bar.

**Do not**

- Write a hex or `rgb()` value anywhere outside `tokens.css`. The one exception is a drawing's own local palette, declared once as custom properties on its root (the car's greys on `.hc`, the room's night and day pairs on `.rm`). For a tint, use `color-mix()` on a token.
- Add a hue to the page chrome.
- Use `--bad` or `--warn` as decoration.
- Put text on `--acc` in any colour except `--on-acc`.
- Assume a brand is light or dark. Test a new surface against a pale brand, a dark brand and a vivid one.

---

## 4. Type

Two families, both self-hosted through fontsource and loaded in `base.css`:

- **Archivo Variable**, with its width axis. Display and text.
- **JetBrains Mono Variable**. Labels, metadata, keys, code.

| Class | What it is | Use |
|---|---|---|
| `pp-display` | weight 900, uppercase, narrow (`wdth` 64), line-height 0.84 | product names and huge numbers |
| `pp-lede` | weight 600, wide (`wdth` 108), tight tracking | pitches, every sentence headline, feature titles |
| `pp-mono` | 12px, uppercase, tracked | labels that name a place or an action: section labels, metadata, tags, tabs, toggles, keys, buttons |
| `pp-meta` | 13px mono in its own case, barely tracked | phrases: the words under any big figure (stats, tallies, the rules count, the replay meter), a route stop's place, requirement names, notes |
| `pp-cap` | 15px body text in `--dim`; its `code` in mono, in its own case | captions and hints: any sentence under a demo, a picture or a film |
| body | 17px Archivo at `wdth` 100, line-height 1.5 | paragraphs |

Rules:

- The display width is the custom property `--wdth`, registered with `@property`, so it can be tweened. Set `--wdth` on an element to change its width; do not write a new `font-variation-settings` rule.
- A name that must fill its line uses `useFit(ref, maxVh)` from `detail/fit.ts`. Do not hand-tune a font size per product.
- Mono comes in two cases, chosen by the kind of thing, never by its length, so one kind never switches between them: capitals (`pp-mono`) for labels that name a place or an action, its own case (`pp-meta`) for phrases. A sentence is never mono: a caption or hint uses `pp-cap`. The one exception is the car's hint, a mono sentence kept in its own case.
- Size type with `clamp()`, never a fixed pixel size above 20px.
- Fixed sizes come from the type scale (below); a fluid size is the component's own `clamp()`, and a headline uses `--pp-head`.
- Headlines come in three levels, each with one width and one weight:
  1. **Names and big figures**: `pp-display`, condensed (`wdth` 64), weight 900. The only very large type.
  2. **A short demo title** ("Ask for it."): extended (`wdth` 125), weight 800, one size, only above a demo. The live counters (tallies, the rules count, the replay clock) share this width.
  3. **Every sentence headline**: `pp-lede` at `--pp-head`, the one section size. The Why statement is the one step up, `clamp(36px, 5vw, 80px)`. Sub-heads (a step, a part, a stop) are `pp-lede` weight and width at their own smaller size.
  A new head takes one of these; it never sets its own weight, width or tracking. Buttons are weight 600; a pressed toggle keeps its weight, so its label doesn't widen.

**Type tokens**

| Scale | Steps | Roles |
|---|---|---|
| Weight `--w-*` | `regular` 400, `medium` 500, `semibold` 600, `bold` 700, `heavy` 800, `black` 900 | 900 names and figures, 800 the demo title, 600 ledes and buttons, 500 mono and ghost buttons |
| Width `--wd-*` | 64, 72, 80, 92, 100, 104, 108, 125 | 64 display, 100 text, 108 lede, 125 the demo title and live counters |
| Size `--fs-*` | 9, 11, 12, 13, 14, 15, 16, 17, 18, 22 (px at a 16px root, written in rem) | 12 `pp-mono`, 13 `pp-meta`, 15 `pp-cap` and buttons, 17 body |
| Line height `--lh-*` | `crush` 0.8, `display` 0.84, `lede` 1.06, `none` 1, `snug` 1.35, `label` 1.4, `body` 1.5, `read` 1.55, `loose` 1.6, `code` 1.7 | |
| Tracking `--tr-*` | `tightest` -0.05em, `tighter` -0.04em, `tight` -0.03em, `lede` -0.025em, `display` -0.02em, `none` 0, `wide` 0.02em, `wider` 0.04em, `caps` 0.06em, `mono` 0.08em | |

The values still off these scales are listed in `OFF_SCALE` in `tokens.test.ts`. Merging one into a step changes how something looks, so it is done as its own change, shown as before and after renders.

---

## 5. Layout and breakpoints

- Side padding is `--pad` (`clamp(20px, 3.6vw, 56px)`), applied with `pp-wrap`. A block that spans the full width (the Next band, a showcase) puts `pp-wrap` on an inner element.
- Vertical rhythm between blocks is `--dt-gap` (`clamp(80px, 9vw, 128px)`), applied as `padding-top` by `.dt-block`. A block that needs less sets `--dt-gap` on itself (see `.dt-sec--stats`). Do not add margins between blocks.
- Controls come in three heights, each a `min-height` so a label can wrap: 48px (buttons, search, the view switch), 40px (tabs, filters, picks, Previous and Next), 32px (tags such as the cost tag). The large install button is the one exception.
- Easing for CSS transitions is `--ease`; a pressed control dips to 97% and eases back over 0.16s. `--spring` is only for a goal ticking off.
- Text for screen readers only uses the class `pp-sr`.

**Space, corners, lines, depth and layers**

| Scale | Steps | Roles |
|---|---|---|
| Space `--sp-*` | a 2px grid: 2 to 32 in steps of 2, then 36, 40, 48, 56, 64, 96 | 10 and 12 between controls, 16 to 24 inside cards, 28 the dot gutter |
| Rhythm | `--pad` side padding; `--flow-label` a block's label to its content; `--flow-head` a heading or bar to the list under it (`--flow-head-b` is its visual-block twin, to merge); `--flow-wide` to a full-width piece; `--flow-list` the catalogue's filters; `--gap-split`, `--gap-track`, `--gap-cols` | all fluid, `clamp()` with vw |
| Corners `--r-*` | 2, 3, 4, 6, 8, 10, 12, 14, 16, 18, 20, `pill`, `round` | 4 the focus ring, 6 an item inside a card, 8 a tag or small control, 12 a tile, 14 a card, 16 to 20 a panel or stage, `pill` every button |
| Lines | `--stroke` 1px, `--stroke-2` 1.5px | hairline borders; a button or card ring is 1.5px |
| Depth | `--shadow-faint`, `--shadow`, `--shadow-deep`; `--drop-frame` under a device frame | only black, so they are safe as composites |
| Layers `--z-*` | `grain` 5, `up` 30, `float` 40, `bar` 50, `curtain` 80, `cursor` 95, `skip` 100 | the page's stacking order; inside a component, stack with plain 1 to 6 |

Measures (`62ch`), container widths and drawings sized in `em` (the device frames, the car) are a component's own geometry and stay in its CSS.
- A showcase (the `cases` and `scenes` blocks) fits one screen at any size. `useShowcaseFit` in `blocks/shared.tsx` narrows its screen until the headline or ask, the screen and the tabs fit the small viewport height. It refits on a viewport change, never on a content change, and it never shrinks a screen below half its width or 320px: there the page just scrolls. The tabs sit right under the screen, the caption and hint below them. On a phone the tabs are one row that scrolls sideways, with Pause or Play at its left.

Breakpoints already in use. Reuse these, do not invent a new one without a reason:

| Query | Meaning |
|---|---|
| `(min-width: 900px) and (pointer: fine)` | "desktop with a mouse": galleries pin. Must match `PIN_QUERY` in `blocks/shared.tsx`. |
| `(max-width: 1099px)` | grids drop a column |
| `(max-width: 899px)` | two-column layouts stack; featured stops pinning |
| `(max-width: 639px)` | phone: single column |
| `(hover: none), (pointer: coarse)` | touch: no cursor label, no peek preview, no drag in demos |

Design each new piece at 1440, 900 and 390 wide before calling it done.

---

## 6. Motion

Import GSAP only from `src/products/motion.ts`:

```ts
import { gsap, ScrollTrigger, Flip, SplitText, useGSAP, reducedMotion } from '../motion';
```

It takes the GSAP setup both pages share, from `src/motion/gsap.ts`: the plugins, registered once, and the defaults (`ease: 'expo.out'`, `duration: 0.9`).

**Motion tokens.** CSS transitions take their durations from `--t-*` in `tokens.css` (70, 100, 150, 160, 180, 200, 220, 250, 300, 320, 350, 360, 400, 450, 500 and 700 ms) and their curves from `--ease` and `--spring`. A press is `--t-70`, a hover 180 to 200, a panel 350, an entrance 450. GSAP code takes `MOTION` from `motion.ts` (`enter` 0.5 s, `enterLong` 0.7, `quick` 0.3, `stagger` 0.05, and the eases). Older blocks still write their numbers inline; new code uses `MOTION`.

**Rules**

1. **Start entrances when the page is seen.** A curtain covers every page change. Anything that plays on arrival starts through `onReveal()` from `arrive.ts`, not on mount, or it plays behind the curtain.
2. **Blocks use `useBlockMotion`.** It handles reduced motion, the reveal, the pin query and cleanup. Do not build a bare `ScrollTrigger` in a block.
3. **Every tween is a `from` or a `fromTo`.** CSS never hides content waiting for JavaScript. With reduced motion the block is simply its final state.
4. **Entrances play once and never leave content hidden.** Use the `enter(el)` trigger from `useBlockMotion`: scrolled past fast, it lands on its end state.
5. **Animate transforms, opacity and `clip-path`.** Not width, height, top or left. The one exception is the catalogue list's height during a filter change, which exists to stop its bottom edge jumping.
6. **Keep it brisk.** Entrances run 0.45 to 0.75 s with staggers of 0.04 to 0.08 s. The page change is 0.45 s down and 0.55 s up. A reader should see content within about 0.8 s of the reveal.
7. **Nothing trails the hand.** Smooth scrolling is Lenis at `lerp: 0.13`. Scrubbed animations use `scrub: true`, not a number, so they do not add a second layer of lag.
8. **Scroll through the scroller.** Any programmatic scroll calls `scrollToY()` from `scroll.ts`. `window.scrollTo` fights Lenis.
9. **No blend modes or filters on full-screen layers.** They are recomposited on every scroll frame. The grain (on the car hero only, so the product screenshots sit on clean black) is plain opacity for this reason.
10. **Decode images before they move.** A block with images that pin or slide calls `usePreload(root)`.
11. **Layout changes use Flip.** Capture state, change the DOM with `flushSync`, then `Flip.from`. See `Catalogue.tsx` and `JiraDemo.tsx`.
12. **Controls respond at once.** A press is immediate (about 0.07 s) and the release springs back (`.pp-btn`). Label swaps slide, they do not jump (`SwapLabel`).

Sections that take over the wheel do so through `setWheelGate()` in `scroll.ts` (the featured section is the only one; the system page's block frame takes the wheel over itself only, with its own listener, see section 18). Only wheel input is stepped; keys, the scrollbar and touch scroll freely. Do not add a second gate without checking it against `steptest.mjs`.

---

## 7. The main page

`home/Home.tsx`, top to bottom:

**Hero** (`home/hero/`). Introduces the builder. It reads from `ME` in `hero/shared.tsx` and nothing else: no product names, counts or colours. The chosen direction is the F1 car (`HeroCar.tsx` and `Car.tsx`): a side-on car drawn by hand in SVG, no 3D, facing right, with six parts that stand for the layers of the work. Pointing at a part shows something concrete (the blueprint, the engine, the airflow), and a click pins it.

- The order is fixed: 01 Design, 02 Architecture, 03 Back end, 04 AI, 05 Front end, 06 Launch. It lives in two places that must agree: `ME.layers` in `shared.tsx` and `PARTS` in `Car.tsx`.
- Hover and pin are separate states. Hit zones are fixed shapes that never move, so hovering a part that lifts does not flicker. Keep both when you change the car.
- A part's reveal must show a real thing, not only lift or glow.
- Hero art is designed directly, not delegated.

**Featured** (`Featured.tsx`). Every product with `featured: true` gets a full screen: its name, hook and hint beside its stage. On desktop the section pins and one wheel gesture moves exactly one product. Below 900px the slides stack. Keep the number of featured products small (four today); the catalogue carries the rest.

**Catalogue** (`Catalogue.tsx`). Every product. Filter by kind (the buttons are built from `KINDS`), search by name, kind, year or stack (`/` focuses the field), and switch between a list and a wall. In the list a preview follows the pointer. This is the part that scales: a new product appears here with no layout work.

**Footer.** The room, and a link back to the portfolio.

**The room** (`home/room/`). My day on a loop, drawn by hand in SVG: I sleep, eat biryani, code with Claude and Codex, watch Netflix and play a game, then go back to bed, while the cat keeps its own day around me (it walks across the keyboard and types into Codex, takes the monitor, gets a bite of biryani, curls up on the couch). The loop is four days long, and each night's game is different: football and a platformer on the couch, racing on a wheel and a PC game at the desk.

- One GSAP timeline tweens numbers in one state object; `render()` turns the state into transforms and opacities, writing only what changed. Small motions (typing, chewing, breathing, the walk cycle, the tail) are worked out from the timeline's time, so pause and fast-forward carry them too.
- I am a jointed figure: each limb is a `data-j` group rotated about its joint. Poses are lists of angles; arms are placed by where the hands go (`reach()`). The walk cycle follows the distance walked, so feet don't slide.
- The look is the one picked from three: at night the room is dark and lit by its screens, the moon and the PC; by day it becomes the car's solid greys in a lit box. `--day` (0 to 1) is the only thing the script sets; every colour in `room.css` is a mix of a night value and a day value. No hue, as in the rest of the page chrome.
- The finish (picked from three: shaded, line, shaded with grain) is shaded with film grain, and no outlines. Shade and light are laid over the flat paint as black and white at low alpha, so `--day` still drives every colour: `f-s` shadow sides, `f-h` lit top edges, `f-ao` shadows on the floor, `f-tube` a rounded light across limbs and round things (dark at the back, lighter at the front), `f-glass` glass sheen, `f-d` drawn detail. The side of me that faces a lit screen brightens with it (`--rim`, set from the monitor, the TV and the phone). The grain is one static tile over the stage.
- While I code the camera pushes in on the screen (`zoom`) and pulls back out at Build passed, onto the sunset. The screen is the code beside two agent panes, `claude` and `codex` (`CLAUDE` and `CODEX` in `Scene.tsx`); `aiA` and `aiB` count the lines shown in each, and the fraction is the line being typed. The pointer spots hide while the camera is in.
- No trademarks are drawn: the agents are their command names in plain text, no logos; the TV shows a generic streaming screen, the games have no logos.
- Skips: the bar under the room (Sleep, Eat, Code, Watch, Play) fast-forwards the day to that part. Clicking the bed, the table, the desk, the couch or the console does the same; those spots are pointer-only, and the bar is the keyboard and screen-reader way. Clicking the cat makes it answer.
- It plays only when revealed and on screen, stops when scrolled away, and has a pause button (WCAG 2.2.2). With reduced motion it holds one moment at the desk, and a skip jumps straight to its part.
- Below 700px wide the camera follows me across the room.
- The camera never repaints the drawing while it moves: the SVG is its own layer (`will-change: transform`), and a push-in or a follow slides and scales the layer already drawn. Once the push-in settles, the viewBox changes to the close framing, so the screen is redrawn sharp. On phones the layer is the whole width of the room, so following me is a slide. This took the push-in from about 4% dropped frames to none on a 4x-throttled phone.
- It loads as its own chunk when the footer is within 900px, into a box of the same size, so nothing moves. It mounts in idle time as a React transition, hidden, and the timeline is built and the room posed in the next idle moment, so the mount and the setup never land in one scroll frame.
- Raised arms (stretching, cheering) go up and a little back with the elbows bent, so they pass behind my face, not across it. Turning round takes a beat (the body narrows through the turn); the cat turns the same way, blinks, and breathes when it lies down.
- `day.test.ts` checks that the loop ends where it starts and that every part can be skipped to.

---

## 8. Add a product

You edit one file, `src/products/data.ts`, and add media under `public/products-media/<slug>/`.

### Step 1. Gather the facts

Read the product's README or its live site. Everything on its page must be true and come from there (see [Writing](#13-writing)). Pick its `brand` from its own interface with a colour picker, not by taste.

### Step 2. Prepare the media

Put files in `public/products-media/<slug>/` and reference them as `/products-media/<slug>/<file>`.

| File | Size | Notes |
|---|---|---|
| screenshots | JPEG, 1920 wide for a desktop interface (the existing ones are 1920 x 1200) | One clear state per shot. Crop out browser chrome: the page adds its own frame. |
| a `-960.jpg` copy of each screenshot | 960 wide | For phones: `ffmpeg -i list.jpg -vf scale=960:-2 -q:v 4 list-960.jpg`. A test fails if one is missing. |
| `thumb.jpg` | 900 x 562 | The catalogue preview. Without it the preview is a sample screen. |
| `poster.jpg` | 1280 x 720 | The film's still. |
| `film.mp4` | H.264, about a minute, a few MB (the existing ones are 2.4 and 3.0 MB) | Check its real length with `ffprobe` and put that in `duration`. |

Frames by kind, so shoot to fit: a plugin sits in a window frame that takes the image's own height, a website in a 16:10 browser frame, an app in a 300:620 phone frame.

### Step 3. Add the entry

Append an object to `products` in `data.ts`. Its position in the array is its number everywhere (01, 02, …) and its Prev and Next neighbours.

| Field | Required | What to write |
|---|---|---|
| `slug` | yes | lower case, digits and hyphens. It is the URL. |
| `brand` | yes | 6-digit hex from the product's interface |
| `name` | yes | the display name |
| `lines` | yes | the name broken for the featured stage, 1 or 2 entries. Joined with a space they must spell `name` exactly. |
| `kind` | yes | `'plugin'`, `'app'` or `'site'` |
| `year` | yes | the year it shipped |
| `facts` | yes | two or three short facts: `['for bb', 'v0.3', 'MIT']`. The last one is shown in the facts grid under the heading the kind names (Licence for a plugin, Runs on for an app or site). |
| `line` | yes | one sentence on what it does. The pitch on its page. |
| `hook` | yes | a short question or claim under the name on the featured stage |
| `hint` | yes | how to use the stage: "Click a blocker to clear it." |
| `stack` | yes | what it is built with. Searchable in the catalogue. |
| `stage` | yes | `'pr-demo'`, `'jira-demo'`, `'openui-demo'`, `'dash-demo'`, `'md-demo'`, `'usage-demo'`, `'window'`, `'phone'` or `'browser'`. The last three show `shots` in frames; use `'window'` for a plugin or desktop tool with no live demo. |
| `links` | yes | `{ label, href }` buttons in the hero. May be empty. |
| `blocks` | yes | the detail page. See the next section. |
| `featured` | no | `true` gives it a full screen at the top of the main page |
| `shots` | no | the pictures on a `window`, `phone` or `browser` stage, as `Media` values in order: one screenshot for a window; two phone screens for an app (about 600 x 1240 each); the desktop page (16:10) then the phone page for a website. A missing one is a sample screen. |
| `thumb` | no | path to `thumb.jpg` |
| `seo` | real products | `{ title, description, keywords }` for search engines. `title`: at most 60 characters, what people search for first ("PR Dashboard: GitHub Pull Request Dashboard Plugin for bb"). `description`: 70 to 160 characters, what it is and why open it. `keywords`: the phrases the page should be found by; a test fails if one is not in the page's own copy. |
| `variant` | no | samples only: which sample screens to show (0, 1 or 2) |
| `sample` | no | `true` marks a dummy. Never set it on a real product. |

A minimal real entry:

```ts
{
  slug: 'my-tool',
  brand: '#2F81F7',
  name: 'My Tool',
  lines: ['My', 'Tool'],
  kind: 'plugin',
  year: 2026,
  facts: ['for bb', 'v1.0', 'MIT'],
  line: 'One sentence on what it does for the person using it.',
  hook: 'The question it answers?',
  hint: 'What to try on the stage.',
  stack: ['TypeScript', 'React'],
  stage: 'pr-demo',
  thumb: '/products-media/my-tool/thumb.jpg',
  links: [{ label: 'GitHub', href: 'https://github.com/…' }],
  blocks: [
    { type: 'statement', label: 'Why', head: 'The problem in *one sentence*.', body: 'A paragraph on what the product does about it.' },
    { type: 'screens', label: 'Screens', screens: [{ src: '/products-media/my-tool/list.jpg', title: 'The list', caption: 'What this screen shows.' }] },
    { type: 'get', label: 'Get it', note: 'What it needs to run.', via: { kind: 'command', command: 'bb plugin add …' } },
  ],
}
```

### Step 4. What happens with no further work

- It appears in the catalogue list and wall, is counted in its kind's filter, and is searchable.
- It has a page at `/products/<slug>` with the curtain in its colour.
- Its neighbours' Prev, Next and "Next" band point at it.
- It appears in the jump list every detail page opens from its position.
- If `featured`, it gets a full screen above the catalogue.
- The hero's buttons come from the data: the first `get` block supplies the main button (copy the command, the store buttons, or the link), `links` supply the ghost buttons, and the first `film` block adds "Watch the film · <duration>".

### Step 5. Check

Run the checks in [section 15](#15-check-your-work). `products.test.ts` fails if the slug is not unique or URL-safe, the brand is not a 6-digit hex, or `lines` do not spell the name.

---

## 9. Design a detail page

A detail page is fixed furniture around a free middle:

```
top bar          All products · position (opens a list of every product to jump to) · Prev · Next; sticky, frosted
back to top      a round icon button, bottom right, once the blocks reach mid-screen (on the main page, the catalogue)
hero             meta row · the name, fitted to the width · pitch · buttons · facts
rail             "On this page": a bar per section at the right edge, in place of the scrollbar, from 1024px wide
blocks           product.blocks, in the order the product gives        <- you design this
Next band        the next product's name, full width
```

You design a page by choosing blocks and their order. Use any block, any number of times, in any order.

**Labels and the outline.** Sections are not numbered. A block with a `label` gets a small label line above it and a bar on the rail at the right edge, which stands in for the scrollbar: the section you are in is the longer bar in the product's colour, a bar shows its label on hover or focus and scrolls to it. A block without a label is not on the rail.

**The full stop.** A label, caption, key row or headline of one sentence has no full stop ("Only read-only tools", "Open the selected ticket"); `bare()` in `stop.tsx` drops it, so write the copy as a sentence. Two or more sentences keep their stops. The full stop is the house mark only on display lines, the scene headlines and the hooks (featured slide, poster, Next), where `<Stop>` sets it in the product's colour, as "I build." does on the portfolio. The Why statement and paragraphs are prose and keep theirs.

### How to arrange a page

1. **Open on the strongest thing the product has.** Something to play with: `stage`. A sharp reason to exist: `statement`. A look worth seeing: `showcase` or `screens`. A story: `text`.
2. **Give every page a different opening and order from its neighbours in the list.** If the two products before it open on `stage`, open on something else.
3. **Alternate dense and open.** Follow a wall of words (`features`, `faq`, `text`) with something visual (`split`, `showcase`, `stats`, `marquee`).
4. **Match length to substance.** A small product is three blocks. Do not pad a page to look important.
5. **Let numbers and proof come after the claim.** `stats`, `scores` and `quote` support a `statement`; they do not open a page.
6. **End on `get`.** It closes the page as the last frame of a trailer, on the black page: the product's name fitted to the width in its colour, the hook, the install as one wide ticket with a coloured Copy, and a credits line read from the product's facts (licence, the bb it needs, who built it). A `film`, if there is one, sits just before it. After it the Next band sells the next product: its name, its hook and a picture of it, in its colour. Never end on a flat band of colour.
7. **Use `split` in runs.** Alternate `side` left and right. Give the first a `label` and leave the rest without one: they read as one section.
8. **One `marquee` at most**, and only on a long page, as a breath between halves.
9. **At most one `cases`, one `tour` and one `scenes` per page.** `scenes` takes the place of `stage`, never sits beside it.
10. **Cut what the demo already shows.** A `steps` "How it works" that a `stage` or `scenes` plays through, or a `stats` band of feature counts (39 menu entries, 8 shortcuts), does not earn a block. Keep `steps` for a product with no live demo.

### Starting points by kind

These are starting points, not templates. Reorder them.

| Kind | A full page | A short page |
|---|---|---|
| Plugin | `stage`, `statement`, the product's own blocks, `split` x2, `tour`, `keys`, `specs` + `faq`, `film`, `get` | `statement`, `screens`, `get` |
| Mobile app | `stage`, `statement`, `showcase`, `features`, `split` x2, `stats`, `timeline`, `faq`, `get` | `screens`, `statement`, `get` |
| Website | `text`, `stage`, `compare`, `palette`, `scores`, `statement`, `get` | `text`, `stage`, `get` |

### See it

- `/products/system` lists every block with what it is for (section 18).
- `/products/playground` builds a page from them, live, starting from a shape or a real product's page (section 19). Its Page code tab is the `blocks` array to paste into `data.ts`; on the dev server, Save page writes it for you.
- The eight other products each use a different order. Read their `blocks` in `data.ts` as worked examples.
- To see all pages side by side as images, see [section 15](#15-check-your-work).

---

## 10. Block reference

The shapes are in `types.ts` (the `Block` union) with a comment on each. TypeScript will tell you the exact fields. This table is for choosing.

| Type | Label | What it shows | Use it for |
|---|---|---|---|
| `stage` | none | The product itself: its live demo, or its screens in device frames, with the hint under it | Letting the visitor try or see the product |
| `statement` | required | One big sentence, a paragraph beside it, optional short points as plain columns under hairlines (three or four, whichever fills the last row) | Why it exists. Wrap the one phrase to remember in `*asterisks*`: one accent per sentence, never more. |
| `text` | optional | Paragraphs under an optional heading | The parts of a story that need sentences in a row |
| `features` | required | A grid of title plus one sentence | What it does. Six items sit best; keep each body to one sentence. |
| `steps` | required | Connected steps, each with a tag, title and body | How a request travels, or how to set it up. Three or four. |
| `stats` | none | A few huge numbers with labels | Proof in numbers: two or three, each worth showing big. Never a 0; a "none" claim belongs in a sentence. `unit` is optional. |
| `keys` | required | Keycaps and what they do. While it is on screen, pressing a shortcut it lists presses its caps and lights its row (nothing else happens). Modifier caps (⌘ ⇧ ⌥ ⌃) combine with the rest; other caps are alternatives, so `['j', 'k']` is j or k | Keyboard shortcuts |
| `screens` | required | A sideways gallery, pinned to the scroll on desktop, a swipe row on touch | Many screenshots, each with a title and caption |
| `film` | required | A poster with a play button, then the video | The product's film. The first one is the target of the hero's button. |
| `split` | optional | A screen on one side, words and points on the other | Walking through one feature at a time |
| `showcase` | optional | Two or three screens fanned out, large | Showing off the look |
| `compare` | required | Before and after under a handle the visitor drags | A redesign, or light against dark |
| `bento` | required | A grid of mixed tiles: number, text or screen | A summary where no single form fits. The layout closes its own holes. |
| `marquee` | none | A band of big moving words | A break on a long page |
| `scores` | required | Rings filled to a value out of a maximum | Performance and accessibility scores, a rating |
| `timeline` | required | Releases or milestones in order | Version history, how it got here |
| `faq` | optional | Questions that open and close. With no `label` it sits right under the block before it as that block's questions (put it after `specs`: together they are "Before you install"). `show` lists that many, the rest open from "More questions"; all stay on the page, so the FAQ data matches | The questions a README answers: the four most useful first |
| `quote` | none | One large pull quote with a name and role | Something a real user said. Never invent one for a real product. |
| `palette` | required | The product's own colours and typefaces | A site or app whose identity is part of the work |
| `code` | required | A panel of code with Copy; optionally the screen it produces beside it | A config snippet, or what the user writes and what they get. Plain text, not highlighted. |
| `specs` | required | Rows of a name and a value, with an optional line of detail | Requirements, costs, where the data comes from |
| `notes` | required | Cards of small print; a warning takes the product's colour | Limits and things to know before installing. Keep them honest. |
| `cases` | required | One stage that rotates through cases: what was asked, and the screen that came of it, a tab per case | Use cases, or a tabbed gallery |
| `tour` | required | A list of points beside one screen that steps on by itself, with an optional camera move to the part each step is about | Several features of one screen |
| `scenes` | required | The product's live demo playing itself through named scenes, a tab per scene; the visitor can take over. Each scene may set `head`, a short line set large as it plays ("Ask for it."), and `cost`, a number then its words ("1 model call"): the number rolls in when the demo spends it, or pulses if it is 0. `turn` adds a last tab, Your turn: the scenes stop, goals sit beside the headline and tick as the demo reports them, and the keys and clicks are counted | Only a product whose demo lists its scenes in `SCENES` |
| `chips` | required | A wall of names as pills | What it works with or supports |
| `diff` | required | One edit and the file each way of saving it leaves, side by side: the block diffs and counts the lines itself, marks run down every file on one clock as it enters, the picked way in the product's colour and the others in grey, struck through. Changes only / Whole file folds unchanged runs; on a phone, a tab per way | A formatter, a codemod, a save that keeps diffs small: what git sees |
| `checks` | required | A wall of named checks a light runs over in turn; each stamps a pass (with an optional `proof`) or a refusal with its reason, then a `total` counts up. Run again replays it | Test results, a support matrix, files it was proven on |
| `morph` | required | The same content as plain text, then as the product's own interface (`to.media`, a live screen marking its parts `data-part`). It changes over once as it comes into view; a switch flips it. A line that starts `{key}` flies to its part; the rest cross-fades | A log viewer, a formatter, an import: raw in, structured out |
| `prompts` | required | A prompt bar with suggested asks as chips. A pick types into the bar and goes; the reply's words arrive, then its screen (a live screen, active) builds in a fixed box. It plays the first ask once as it comes into view | Any chat or agent product, a command-line tool, a search |
| `specimens` | required | Every named part of a product set large as a wall of words in groups, beside a sticky inspector: pointing at a name shows its drawing (`media`), signature (`sig`) and line; picking keeps it; on a phone a pick opens a sheet. `also` names what it builds on | A design system's components, an API's endpoints, a CLI's commands |
| `rules` | required | A product's own rules, live: its inputs as switches and choices, the result drawn as the product draws it, a big count beside it. Selected controls are inverted bone, never the product's colour | A rule engine, a linter, a pricing or eligibility rule, a status a product works out |
| `compose` | required | Parts to pick, and the product's own text for that pick writing itself; each `### ` section is marked when its part is hovered. Tabs show other texts (`modes`) | A prompt builder, a commit or changelog writer, a config generator |
| `replay` | required | A stretch of time on fast-forward: events in on the left, a clock, the product's own surfaces on the right; flipping a setting replays it with what the product made of it then, and shows the setting's command to copy | A watcher, notifier, cron job or automation: what reaches you and when |
| `deck` | required | A hand of cards: fanned on a wide screen (it deals as it enters, a card lifts under the pointer or focus), a swipe row on a phone. Picking one flies it into a dialog at full size; a card with `source` gets a second view (`views`, e.g. Rich and Source) | Templates, themes, presets, sample projects |
| `anatomy` | required | One screen drawn large and taken apart: its parts numbered above it, placed over where the drawing marks them. Hover previews a part, a click pins it (separate, like the hero car's parts), and the pinned part plays its `states` in the drawing; arrow keys walk the parts. On a phone the labels are chips under the drawing | A row, a card, a screen whose every piece means something |
| `route` | required | Where requests go: the `stops` set large along one line (a column on a phone), and `runs` as rotating tabs that send a light along their hops while each hop's payload types in. `never` is a last stop, struck through | Privacy and data flow: what is sent where, and what never leaves |
| `get` | required | The product's name as a poster in its colour, its hook, then an install command with Copy (a ticket), store buttons, or a link, and a credits line | How to get it. Always last. |

**Media.** `split`, `showcase`, `compare` and `bento` take a `Media` value:

- `{ src, alt }`: a real image. Write `alt` as what the screen shows.
- `{ sample, dark? }`: a drawn placeholder screen. For dummy products only.
- `{ live, alt }`: a screen drawn in code, by name from `stage/names.ts`, that builds itself in when its block shows it. It works in any block that takes `Media`. Today: `dash:*` (bb Dashboards' dashboards), `md:tpl-*` (Markwright's templates, each as the page it starts) and `jira:row` (one Jira Board row, which also takes the `part` and `state` the anatomy block gives it).

`MediaView` puts either one in the frame the product's kind calls for, so a block never chooses a frame. The stage does the same with a product's `shots`. Both draw the picture with `Shot` from `stage/Frames.tsx`: the frames are code, and a screenshot is only what goes inside one.

`screens` takes `Screen[]` (`src`, `title`, `caption`). An empty array shows sample screens: dummy products only.

---

## 11. Add a new block type

Add a block when a page needs something no existing block can say. First check that a different arrangement of existing blocks will not do it.

A block is a general component. It must make sense for any product of any kind and any brand colour. If it only makes sense for one product, it is not a block.

**Step 1. Add its shape** to the `Block` union in `types.ts`, with a one-line comment saying what it is for. Give it a `label: string` if it is a section with a heading. Use `Media` for any picture.

```ts
/** Prices side by side, one marked as the pick. */
| { type: 'pricing'; label: string; plans: { name: string; price: string; points: string[]; pick?: boolean }[] }
```

**Step 2. Write the component** in `detail/blocks/Pricing.tsx`.

```tsx
// Prices side by side; the picked plan takes the product's colour.
import { useId, useRef } from 'react';
import { gsap, MOTION } from '../../motion';
import { Label, useBlockMotion, type BlockProps } from './shared';
import '../../styles/blocks-content.css';

export function Pricing({ block }: BlockProps<'pricing'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();

  useBlockMotion(root, ({ q, qa, enter }) => {
    const grid = q('.bc-plans');
    if (grid) gsap.from(qa('.bc-plan'), { y: 28, autoAlpha: 0, duration: MOTION.enter, stagger: MOTION.stagger, scrollTrigger: enter(grid) });
  });

  return (
    <section className="dt-block dt-sec pp-wrap" ref={root} aria-labelledby={id}>
      <Label id={id}>{block.label}</Label>
      <ul className="bc-plans">
        {block.plans.map(p => (
          <li key={p.name} className="bc-plan" data-pick={p.pick ? '' : undefined}>
            <h3 className="pp-lede">{p.name}</h3>
            <p className="pp-display">{p.price}</p>
            <ul>{p.points.map(pt => <li key={pt}>{pt}</li>)}</ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

**Step 3. Register it.** One line in `registry` in `detail/blocks/index.tsx`. The file will not compile until every block type has one.

**Step 4. Style it** in `blocks-content.css` (words and data) or `blocks-visual.css` (pictures), with that file's prefix.

**Step 5. Show it.** Use it on a real product's page and look at it in the browser, and add it to `CATALOG` in `playground/catalog.ts` (its group, its use, a glyph and, if it fits any product, sample content), so the playground and the system page offer it. `doc.test.ts` fails for a block in the catalogue with nothing to start from.

**Or write it in the playground first.** Write a block (section 19) gives you a starter in TSX and CSS, runs it in the canvas on any page, and on the dev server saves it as `detail/blocks/saved/<Name>.tsx`, used through the `custom` block. Move it to its own block type, as above, once it has earned one.

### Contract every block must meet

- Numbers that count up use `countUp()` from `shared.tsx`; do not write another.
- The root element has the class `dt-block`, exactly once, with no `dt-block` nested inside. The outline scrolls to blocks by counting these.
- Sections add `dt-sec pp-wrap`. A full-bleed block leaves `pp-wrap` off the root and puts it on an inner element (see `Get.tsx`).
- A labelled block renders `<Label id={id}>` (with an optional `aside`) and sets `aria-labelledby={id}` on its `<section>`. The label is the `h2`; headings inside are `h3`.
- Motion goes through `useBlockMotion`, using `enter()` for entrances. See [Motion](#6-motion).
- Colour comes from tokens only. Use `--acc` and `--on-acc` for the product's colour; never a hex, never `--brand` directly.
- Pictures go through `MediaView`. Images inside use `loading="lazy"`; if they pin or slide, call `usePreload(root)`.
- It works at 390 wide, with a pale, a dark and a vivid brand, with reduced motion, and by keyboard.
- Non-trivial logic (a layout routine, a parser) lives in its own file with a test beside it. See `bentoLayout.ts` and `bentoLayout.test.ts`.
- Reuse what exists: `pad` (`format.ts`), `scrollToEl` (`scroll.ts`), `KindFrame`, and from `shared.tsx` `Label`, `Out`, `countUp`, `useCopy`, `SwapLabel`, `CopyStatus`, `StoreButtons`, `usePreload`.

---

## 12. Add a kind, a stage or a live demo

**A new kind** (say, a command-line tool):

1. Add it to `Kind` and to `KINDS` in `types.ts` (`label`, `plural`, a three-letter `tag`, and `fact`, the heading for the last entry of `facts`). The catalogue filter and the hero meta pick it up.
2. Decide its frame in `KindFrame` in `stage/Frames.tsx`, which the blocks use. `home/Preview.tsx` and `stage/Stage.tsx` arrange frames their own way; add the kind there too.
3. Give it its own small mark in the catalogue list (`[data-kind='…'] .cat-k i` in `home.css`): a shape, not a colour.
4. Add a stage for it (below).

**A new stage:** add its name to `StageKind` in `types.ts` and a `case` in `stage/Stage.tsx`. The switch is exhaustive, so TypeScript flags a missing case. Add a width for it in `detail.css` (`.dt-stage--<name>`) and check it on a featured slide (`.ft-stage[data-stage]` in `home.css`).

**A live demo** is the strongest thing a product can have: a small, playable copy of the product's main idea. `PrDemo.tsx` and `MdDemo.tsx` are the models.

- Its props are `DemoProps`: `active`, `onTally`, and an optional `scene`, the scene to play by itself (undefined means the visitor drives).
- A filmed demo builds its camera and pointer from `stage/film.ts` (`camera`, `pointer`), so every product's film moves the same way. Mark the pointer's glow and click ring `data-glow` and `data-click`.
- A demo of a real product's behaviour should be checked against the product's own code where it can be: Markwright's `md.test.ts` asserts the demo writes the same bytes the plugin writes for the same edits (`mwData.gen.ts`); PR Dashboard's `pr.test.ts` pins its blocker rule to the plugin's output (`prRules.gen.ts`), and its prompts and alerts are the plugin's own (`prData.gen.ts`). Jira Board's demo groups, filters and dates its tickets with the plugin's own rules (`jiraRules.ts`), and `jiraScenes.test.ts` counts each scene's inputs against its cost tag. Usage Explorer's `usageRules.test.ts` reproduces every line of the plugin's own limits screenshot through the copied rules.
- While a `scenes` reel plays, its demo is only to watch: it is `inert`, under a clear "Try it" layer that hands it over on a click, a tap or Enter, without passing that click on (a click meant for a button would cut a scene off half built). From then the visitor drives, until Play again.
- A scene that ends with no scene after it (taken over, or scrolled away) lands on its end before it stops: `tl.progress(1)`, then `stop()`. So a demo is handed over whole, never half built. Where the landing's changes `flushSync`, it runs in a microtask just after the commit (`DashDemo`, `PrDemo`).
- A demo that listens to keys on the whole page (Jira Board's) dispatches a bubbling `scene-take` when one of them takes over, since those keys never pass through the stage. Mid-scene, that first key only hands the demo over; it does not act too. For Your turn it dispatches `scene-goal` (the goal's id) and `scene-input` (each key it answers).
- A heavy demo can load on its own. `Stage.tsx` lazy-loads every demo but bb Dashboards': Jira Board's on idle behind `JiraHold`, the OpenUI demo behind `OUI_HOLD`, Markwright's and PR Dashboard's behind their empty windows. Each placeholder is the demo's own window box drawn by the same stylesheet, so its height is exact at every width. Do the same for another demo only with a placeholder that matches it to the pixel.
- A demo with scenes lists how many in `SCENES` in `stage/names.ts`. A `scenes` block must have exactly that many.
- A scene's timeline must end inside the block's hold (`HOLD_SCENE` in `blocks/Cases.tsx`, 8.5 s). When a scene spends what its `cost` says (its model call), the demo dispatches a bubbling `scene-cost` event from its root; the block ticks the cost tag then.
- A scene may be filmed (the bb Dashboards demo: a camera, overlays, a versions deck), but taking over must leave the demo whole and flat at once: every tween that touches the product is landed (`finish()`), every film layer goes back to its CSS rest (`rest()` in `dashFilm.ts`), and nothing filmed shows when the visitor drives. Move the camera only by scale and translate while anything is measured or aimed at; tilt only between those moments.
- Listen to the keyboard only while `active` is true, and never while the visitor is typing in a field. Two demos can be on one page.
- Report the headline number with `onTally` if it has one. It is shown, on the featured stage and the detail page, only when the stage has an entry in `TALLY` in `stage/Stage.tsx` saying what the number counts.
- Draw the product's interface in the product's own colours, scoped under its own prefix. This is the one place a product's full palette appears.
- It must be usable by keyboard and by touch. No drag on coarse pointers: it blocks page scroll.
- Use made-up but plausible content (`acme-software`, `ACME-124`). Never real names, tickets or repositories.
- Every moving piece goes through Flip or a `contextSafe` tween so it cleans up on unmount.

---

## 13. Writing

- **Real products: only what is true.** Every claim, number and feature comes from the product's README or the product itself. If the README does not say it, the page does not say it. Check numbers at the source (the film lengths were once wrong until measured with `ffprobe`).
- **Samples are fictional and marked.** `sample: true` shows a "Sample" tag everywhere. Sample copy says it is a sample.
- Plain, direct sentences. Say what the product does for the person using it.
- Sentence case for everything a person reads. Uppercase comes from the type classes, not from the text.
- In a caption, put code in backticks (`` `- [x]` ``): it is drawn as code, in mono, in its own case.
- `line` is one sentence. `hook` is a short question or claim. `hint` is an instruction.
- Each product's copy is its own. Don't reuse a pattern across pages: not a "Why…?" hook on every product, not the same tour title ("… itself, in bb."). A demo says it is redrawn once, in its label's tag, not in a sentence.
- Feature titles are two to four words; feature bodies are one sentence.
- Use the product's own words for its own things (tab names, button labels), spelled as the product spells them.
- No em dashes, no arrows in prose, no filler ("simply", "just", "powerful").

---

## 14. Accessibility

- Every interactive thing is a real `<button>` or `<a>`. In-app links use `Link` from `router.tsx`, which is a real `<a href>` (new tab and copy link still work).
- Focus is visible: the global `:focus-visible` ring uses `--acc`. Do not remove outlines.
- `prefers-reduced-motion` is honoured in three places: `useBlockMotion` skips setup, `reducedMotion()` guards imperative tweens, and `base.css` flattens CSS transitions. With it on, there is no smooth scrolling, no pinning and no curtain travel, and every block is in its final state.
- Decorative elements carry `aria-hidden="true"`. Split letters are hidden and the heading carries the full text in `aria-label`.
- Things that change announce themselves: copy confirmation (`CopyStatus`, `role="status"`), counts and tallies (`aria-live="polite"`).
- Toggles use `aria-pressed`; the focused row in a demo uses `aria-current`.
- Tabs, toggles, radio groups and checkboxes are ui-sdk components (`@ui-sdk/react/<name>`), which bring their keyboard handling, focus and ARIA. They render no styles: keep the classes and `data-on`, and style `aria-selected`, `aria-pressed` and `aria-checked` as before. Menus, popovers and the slash-command list in the demos stay hand-rolled: ui-sdk opens menus in the top layer, outside the film camera's transform.
- Real images have `alt` that says what the screen shows. Posters and thumbs beside a text name use `alt=""`.
- Text on a brand colour uses `--on-acc`, which `brandVars` picks for contrast. Secondary text and hints use `--dim`; `--faint` is never text.
- Touch: make targets comfortable to tap, and never make anything depend on hover. `touch-action: manipulation` is already set, so a tap acts at once.

---

## 15. Check your work

Run from the repository root.

```bash
npm run check
```

Typecheck, lint (`oxlint --type-aware --deny-warnings`) and tests. All three must pass.

```bash
npx vite build
```

Confirms the products entry builds.

Then look at it. Start the dev server (`npm run dev`, port 5174) and open `/products` and the page you changed. Look at 1440, 900 and 390 wide, and once with reduced motion on.

**Capture and measuring tools** are in `motion-lab/products-directions/`. They drive headless Chrome against the dev server on port 5174, so start it first, and run them from that folder.

| Tool | What it does |
|---|---|
| `node fullpage.mjs out/full /products/<slug>` | Photographs a whole page top to bottom, with reduced motion, so every block is in its final state. `WIDTH`, `HEIGHT` and `MOTION=1` change the viewport and turn motion on. |
| `npx tsx pages.ts`, then open `overview.html` | Every detail page side by side with its block list, to check the pages differ. |
| `node perf.mjs /products /products/<slug>` | Scrolls a page and reports frame times. Frames should land about every 16.7 ms, with none over 25 ms. |
| `node transition.mjs` | Times a page change, from click to fully revealed. About 0.95 s today. |

**Playground checks** are in `scripts/playground-check/`, in the repository. They drive headless Chrome too. Run them after any change to the playground, the canvas, `scripts/playground.ts` or `vercel.json`, against the dev server and against `npm run build && npm run preview` (port 4174):

| Check | What must hold |
|---|---|
| `node scripts/playground-check/sandbox.mjs http://localhost:5174` | A hostile block, written through the editor, tries every escape (the editor's DOM, cookies, storage, fetch and every other way to the network, popups, frames, workers, module imports, scripts from elsewhere, forms, fonts, the clipboard, WebRTC, the Save endpoint): each must be refused. The canvas's origin is opaque; opened on its own it refuses to run; another site cannot frame it. |
| `node scripts/playground-check/trouble.mjs http://localhost:5174` | Page code that is not a page is refused with where and why, and never run; an endless loop is stopped by its guard (also one built with `new Function`); a hung canvas is taken down with the way out; a block that navigates the canvas is caught and the written blocks stop; the editor never navigates and logs no errors. |
| `node scripts/playground-check/system.mjs http://localhost:5174` | Every block on `/products/system` mounts and draws live, with no errors (`MOTION=1` with motion on). |
| `node scripts/playground-check/layout.mjs http://localhost:5174` | With real mouse and keys: the side panes hide and come back (their buttons, `[`, `]`, `/`) and are remembered; the handles resize across the canvas, by keys, never past the canvas's room, and reset on a double click; sections folding away (and staying folded after a reload, but never hiding what a search finds); the canvas bar's width and scale; full screen and back (headless Chrome never grants the browser's own, so it checks the window fallback); Esc and Page settings let go of a block; the search; removing with Undo; the delete question for a written block; the dialogs (Esc, a click outside, the save question sending nothing); tabs by arrow keys; the shortcuts sheet. |
| `node scripts/playground-check/save.mjs 5174` | Save refuses a missing or wrong token, another Origin, cross-site fetch metadata, a rebound Host, a GET, a non-JSON body, names and slugs that climb out, unknown block types, prototype keys, CSS without its import, and an oversized body. Nothing is written. |
| `node steptest.mjs` | Featured: one gesture moves one product, in both directions. Catalogue: the list's bottom edge does not jump on a filter change. |
| `node picktest.mjs` | Car hero: hover is steady, one click pins, and each area picks only its own part. |

Measure timing with these scripts, not in a browser tab that is in the background: background tabs get no animation frames.

**Checklist for any change**

- [ ] `npm run check` and `npx vite build` pass
- [ ] Looked at 1440, 900 and 390 wide
- [ ] Looked right with a pale brand, a dark brand and a vivid brand
- [ ] Reduced motion: everything visible, nothing pinned
- [ ] Keyboard: every control reachable, focus visible
- [ ] No new colour on the page chrome, no hex in block CSS, no raw value where a token exists (`tokens.test.ts`)
- [ ] Nothing jumps when content loads, filters change or fonts arrive
- [ ] `perf.mjs` shows no slow frames on the page you touched
- [ ] If you changed the featured section, `steptest.mjs` passes
- [ ] If you changed the car, `picktest.mjs` passes
- [ ] Real product copy checked against its README

---

## Search engines

The build gives every products URL its own HTML file (`scripts/products-seo.ts`, run by `scripts/prerender.ts`): its own title, description, canonical address, link-preview tags and structured data, plus the page's words as plain HTML that the app replaces when it starts: a header with the site's links, each block as a section inside `<main>`, and a footer, so a reader without JavaScript still gets the page's landmarks. Titles and descriptions come from `seo.ts`, which the browser tab uses too.

- A real product is in the sitemap as soon as it is in `data.ts`. Give it a `seo` field.
- A sample product is marked `noindex` and left out of the sitemap.
- A new block needs nothing: its text fields are written into the plain HTML by name. If a block adds a field that is a setting or a file path, not words, add its name to `NOT_COPY` in `scripts/products-seo.ts`.
- Write keywords into the copy, not around it. The meta keywords tag is not used; search engines ignore it.

---

## 16. Known gaps

Things an agent will hit. Fix the one you need, as part of the work that needs it.

- **The catalogue preview takes one image.** `home/Preview.tsx` shows `thumb`, or a sample screen without one. It does not read `shots`.
- **Store buttons are disabled.** `StoreButtons` in `blocks/shared.tsx` has no URLs to link. When a real app ships, add the store links to the `get` block's `stores` variant and link them.
- **Films have no captions.** The `film` block has no captions track. Add an optional captions path when a film has speech.
- **Only PR Dashboard has a finish on the featured stage** (the flood and the Ready to merge stamp; the plugin itself never merges). It is tied to `stage === 'pr-demo'` in `Featured.tsx`. A second demo with an ending should turn that into something the demo reports, not a second special case.
- **One demo is still in the products bundle.** The Jira Board, OpenUI, Markwright and PR Dashboard demos are their own chunks, each behind a placeholder of its exact size (`Stage.tsx`). Any products page fetches the Jira chunk once it is idle. The OpenUI kit is fetched by its own page and by the main page, at load, because the featured section mounts every featured stage, OpenUI's among them; other product pages never load it. Mounting a featured stage only as it nears the screen would keep the kit off the main page too. The bb Dashboards demo sizes itself by its content, so an empty box would jump when it arrives; and the Dashboards and Markwright kits are also used by live screens (`dash:*`, `md:tpl-*`) that `live.tsx` imports directly, so they stay in the bundle either way.
- **The Jira Board demo's panes do not scroll by wheel**, for the same reason as Markwright's: it keeps the ring and an open menu in view itself.
- **The Markwright demo's panes do not scroll by wheel.** On the featured section a scrolling pane would catch the page's scroll, so the demo scrolls its panes itself to keep each change in view; a long inserted template is seen in full in the template deck instead.
- **The playground cannot free a hung canvas in place.** Loops a block writes, or builds at run time, are guarded, so this needs something like a runaway regular expression. Chrome keeps every sandboxed frame of the site in one process and does not end a hung one while its tab is open, so a new canvas would hang too: the canvas is taken down and the visitor closes the tab and opens the playground again (the page is kept), or, if it is still stuck, quits the browser. Headless Chrome does not always free the process even after the tab closes. A loop the guard cannot see (a for-of over an endless iterator, a builtin walking a huge length) is caught only by the watchdog, where the canvas has a process of its own (Chrome).
- **A block can try to navigate its own canvas.** The canvas's own policy cannot stop that, but the editor's can: its `frame-src 'self'` (in dev as in production) refuses any navigation of the canvas to another site, so nothing it holds can leave that way. The canvas then unloads, and the editor replaces it and stops the written blocks.
- **The editor's keys stop at the canvas.** A click in the canvas puts the keyboard focus in its frame, and the frame sends the editor no keys (the protocol has no message for them, on purpose), so Esc, F and the other shortcuts work again once something outside the canvas is clicked. The Page settings and full-screen buttons always work. Headless Chrome never grants the browser's own full screen, so the checks see only the window fallback.
- **The playground is checked in Chrome only.** Safari and Firefox treat sandboxed frames and their processes differently; check the canvas and drag in both before relying on them. On touch, a block is added by a tap (after the picked one), not dragged.
- **Not yet checked on real devices:** trackpad and mouse feel on the featured section, tablet widths, 1920 wide, and a real pointer drag on the compare handle. The car is small on phones.

---

## 17. Before publishing

- Done on 2026-11-11: every sample product, Block Library among them, and the `sample()` helper are gone from `data.ts`. The `sample` and `variant` fields, the sample branch of `Media`, the drawn sample screens and the `phone` and `browser` stages are kept on purpose, for the first real app or website.
- Check every link in `links` and every `get` target opens the right place.
- Confirm every film's `duration` against the file.
- Run the full checklist in [section 15](#15-check-your-work) once more.

---

## 18. The design system page

`/products/system` (`system/System.tsx`, `styles/system.css`, prefix `sy-`) shows the system to a person: each family opens as a specimen set large (the width axis to drag, the three headline levels, the space grid, the corners, the layers, the two eases drawn from their tokens with a dot that runs them), with its tokens as rows under it: the value as written, the value as this browser reads it (colours with their contrast on the ground, fluid sizes in px at this width), and what it is for. A brand switch tries the components in every product's colour and in a pale, a dark and a vivid test colour. It lists every block, and the values still off the scales.

Then **every block, live**, in one frame (`system/BlockFrame.tsx`): a list of every block, and a frame that shows one at a time, drawn by its real component on a page of its own (`/products/system?view=block`, `system/BlockView.tsx`, in a same-origin iframe) at a laptop's 1440 x 900, or a phone's 390 wide on a narrow screen, scaled to fit. A block taller than that screen is scaled inside it to fit whole, from the top; a shorter one sits in its middle. One push over the frame moves one block, but only while the whole frame is on screen below the sticky bar. A push is told from a trackpad's momentum the way the featured section tells it (the detector is copied into `BlockFrame.tsx`), so a second flick counts at once and a long tail never moves a second block. Scrolling in, the page stops with the whole frame on screen, and the push that brought it there moves no block; before then the scroll goes on to the page, and past the first or the last block a new push does (the tail of the push that got there does not). A step slides the block out and the next one in, the way the scroll went. The frame moves the page itself in those cases (`wheelToY()` in `scroll.ts`), because with smooth scrolling on a wheel inside the block page never reaches the page, and the stage carries `data-lenis-prevent-wheel` so the smooth scroller leaves the wheel over it alone. The scroll hint sits in the frame's header, not on the frame, where it would cover the block. The arrows, the list and the keys inside the frame move too, and Replay plays the block's entrance again. The list scrolls on its own (`data-lenis-prevent`), and the page's cursor dot follows the pointer onto the frame: the block page passes its pointer moves out, since they never reach the page. The frame has a bar of its own above the block. A block with sample content is shown on Acme Notes, a made-up product, in the colour picked from the swatches in that bar (Acme's own orange first); one that draws a real product (Scenes, Rules, Compose, Replay, Morph, Anatomy) is shown on that product, with its own data and colour (`sampleSource()` in `playground/catalog.ts` says which).

**The demo product.** Acme Notes' samples are full: every block has the content it would have on a real page, and its pictures are real-looking screens of Acme Notes (its panel, search, linked lines, branches, history, the light theme, a phone app and a website), drawn in code as live screens (`acme:<view>`, `stage/AcmeScreen.tsx`, `styles/acme.css`, loaded only where they show). Their accent is the product's colour, so they take whichever colour is picked, on the system page and in the playground. Each fills its box as a screenshot would (cover, from the top left): every length is a multiple of one design pixel, `--u`, worked out from the box. A `screens` gallery item can be `{ live }` instead of `{ src }` for this. Sample data that names Acme's own `#FF6B3D` (the palette's swatch) names the picked colour in the frame. The one exception is the 13-second film and its poster (`public/products-media/acme-notes/`): it is footage, in Acme's orange. The playground's templates use the same samples.

**Motion, live** (`system/MotionLive.tsx`) plays the motion language on real pieces, each with Replay: a product's name rising letter by letter (the detail hero), a block's label rule drawing in (`useBlockMotion`), the entrance stagger, a press and its spring, a label swap, a count up, the display width, a Flip reorder and the page-change curtain. A jump to a live block draws every block above it first and holds it in place while they settle, so it lands once.

Nothing on it is typed in by hand. It reads `tokens.css` itself (`styles/tokenList.ts`, the same reader the tests use), `OFF_SCALE` (`styles/offScale.ts`), `MOTION` and `CATALOG`, so a token added or removed shows on the page at once. A token's note is the comment on its line in `tokens.css`, or the comment line above it; its family is the `/* ---- Name ---- */` heading it sits under. Keep both when you add a token.

It is lazy-loaded (its own chunk), prerendered by `scripts/products-seo.ts` and in the sitemap. `system` and `playground` are reserved paths (`RESERVED` in `router.tsx`); a product can never have either as its slug.

---

## 19. The playground

`/products/playground` builds a detail page from the system. It is public: anyone can use it, and nothing they do leaves their browser. On the dev server it can also write into the repository.

**Using it**

- **Start from** a shape (eight, after the starting points in section 9) or a real product's page to remix. Starting again can be undone, like every change. The page is kept in this browser (`localStorage`), never sent anywhere.
- **Left:** the page's blocks, to drag into a new order (or Alt and an arrow key; Delete removes one, and the notice that says so has Undo), and under them every block there is, by group, to drag onto the page or click to add after the picked one. Find a block (`/`) narrows them; Enter adds the first match, Esc clears it. A block that needs a live demo with scenes is offered only on a product that has one.
- **Middle:** the page as the site draws it, in the product's colour (the swatch in the top bar changes it). The canvas's own bar sets its width (1440, 900 or 390), says how large the page is drawn there, and goes full screen (F; Esc leaves): the browser's full screen where it allows it, the window where it doesn't. The canvas frame itself can't go full screen (its iframe has `allow=""` and its policy `fullscreen=()`). Click a block to pick it (the one under the pointer is outlined); Esc, or Page settings over its fields, lets go.
- **Right:** the picked block's fields (built from the block's own data; fields it may have but doesn't yet are under Add a field) and the block as code; nothing picked, the page's own settings. Page code is the whole `blocks` array, both ways: edit it and the page follows, change the page and it follows. Write a block makes a new block in TSX, with its CSS and the props a new copy starts with. Run (⌘↵) draws it in the canvas. Delete asks first: Undo does not cover written blocks.
- **The layout.** Each side pane hides from its × (or `[` for the blocks, `]` for the edit pane; not ⌘B and ⌥⌘B, which Chrome on a Mac keeps for its bookmarks) and comes back from its button in the top bar. The handles between the panes, and the one between the page's blocks and every block, resize them: drag, or focus one and use the arrows; a double click resets it. The canvas column keeps at least 400 px. Sections fold from their headings: the page's blocks, each group of blocks (or all of them at once; a search shows every group open), a block's Fields and As code, New block once something is written, and each group or list inside the fields (those for as long as the block is picked). The layout and what is folded are kept in this browser (`pg-layout`, read field by field by `readLayout()`), apart from the page. On a phone, one pane shows at a time.
- **Copy code** copies the page's `blocks` array, ready for `data.ts`. **?** lists every shortcut. Tabs and choices move with the arrow keys.

**On the dev server only**, Save page writes a real product's page to `src/products/pages/<slug>.ts` (which replaces that product's `blocks` in `data.ts`; delete the file to go back), and Save block writes `src/products/detail/blocks/saved/<Name>.tsx` and `.css`, listed in `saved/index.ts` (and its name in `saved/names.ts`) and used by `{ type: 'custom', name }`. Each asks first and lists the files. A saved block is real code: it runs as soon as it is written, on every page of the dev server that uses it, outside any sandbox. Read every line before you write it, and run `npm run check`. On a real page, a saved block that throws draws nothing rather than taking the page down.

**How it is kept safe.** Everything a visitor writes runs in one place only, the canvas, and the canvas can reach nothing. Do not weaken any of this without asking.

1. **The canvas is a sandbox with an opaque origin.** `frame.html` is served with `Content-Security-Policy: … sandbox allow-scripts` (`FRAME_HEADERS` in `scripts/playground.ts`, the same in `vercel.json`, a test keeps them equal) and embedded with `sandbox="allow-scripts"`: no cookies, no storage, no access to the editor or the site, no popups, no forms, no top navigation.
2. **It has no network.** The same policy has `connect-src 'none'`, scripts, images, media and fonts from the site only, no frames, no workers, `form-action 'none'`, `base-uri 'none'`, and `frame-ancestors 'self'`, so no other site can embed it. WebRTC, which the policy does not cover, and `sendBeacon` are removed before any code runs.
3. **It loads nothing over CORS.** The canvas is built as one classic script with its fonts inlined (`vite.frame.config.ts`), in dev as in the build. An opaque-origin page could load a module or a font only with a CORS header, and the site sends none, so a written block cannot `import()` anything from the server either.
4. **It refuses to run anywhere else.** `frame/main.tsx` starts only when its origin is opaque, it is framed, and its parent is the site; opened on its own or framed by another page, it shows a refusal.
5. **Written blocks import only an allowlist** (`IMPORTS` in `frame/compile.ts`: react, the motion and format helpers, the block helpers, their own CSS), each by the path it would have in `detail/blocks/saved/`, so a saved block builds unchanged. Every loop gets a guard, so an endless one throws instead of freezing the canvas; so does code built at run time (`new Function`, `eval`, a timer given a string).
6. **The editor never runs code.** Page code and props are read by `literal.ts` (`parse()`), which knows only plain values and refuses anything else (with where and why), prototype keys among them; one shape check (`notABlock()` in `doc.ts`) guards what the editor itself shows, and an error boundary keeps the last good page if something still breaks. Its parsing and highlighting are linear, so no paste can freeze it. Everything shown is React text: no HTML from data, anywhere. It never imports a saved block (it reads `saved/names.ts`), so a block's code never runs in the page that holds the Save token. Its own page has a strict policy too: in a build `script-src 'self'`, and in dev and build alike `frame-src 'self'` (the canvas can be navigated nowhere else), `frame-ancestors 'none'` with `X-Frame-Options: DENY` (no clickjacked Save) and `Cross-Origin-Opener-Policy: same-origin`.
7. **Every message is checked.** The editor takes only the few messages in `protocol.ts` from the canvas's own window, rebuilt fresh, with numbers in range and text capped, at most 240 a second. A canvas that stops answering is taken down; one that navigates away is replaced and the written blocks stop.
8. **Every spelling of a path gets its headers.** `routeOf()` reads a request path as the servers do (decoded, with or without `.html` or a trailing slash), so `frame%2Ehtml` or `/frame` cannot reach the canvas without its sandbox.
9. **Save is dev-only and narrow.** It exists only in `configureServer`; a build and `vite preview` have none (the editor offers Save only when the dev server put its token on the page). It answers a POST from this machine (loopback) to `localhost` on the dev port, from the playground's own origin (Origin and `Sec-Fetch-Site`), as JSON, with this run's random token, under 400 KB. It chooses every path itself: a slug of a product in `data.ts`, a component name (`NAME`), resolved and proven to stay in its folder; files are written whole or not at all. A saved page is written by `print()` from plain data, so no text in it can become code. Save block takes only a block that compiled and drew in the canvas, and says plainly that the code runs as soon as it is written.

**Checks.** `literal.test.ts`, `protocol.test.ts`, `doc.test.ts`, `editor/layout.test.ts`, `frame/loopGuard.test.ts`, `scripts/playground.test.ts` and `styles/tokens.test.ts` run with `npm test`; the browser checks are in section 15.

