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

---

## 2. Where everything lives

```
products/index.html              the page's HTML entry (second Vite entry beside the portfolio's)
public/products-media/<slug>/    a product's screenshots, thumb, poster and film
src/products/
  main.tsx                       mounts <App />, loads styles/base.css
  App.tsx                        the shell: route, smooth scroll, the page-change curtain
  router.tsx                     /products and /products/<slug>; Link, navigate
  data.ts                        EVERY PRODUCT. The only file you touch to add one.
  types.ts                       Product, Kind, StageKind, Media, and the Block union
  brand.ts                       brandVars(): a product's colour as CSS variables
  motion.ts                      the one GSAP import: plugins registered, defaults set
  format.ts                      pad(): 1 -> "01", the one numbering helper
  arrive.ts                      onReveal(): run when the curtain lifts
  scroll.ts                      scrollToY(), scrollToEl(), stepToY(), the wheel gate
  Cursor.tsx                     the pointer label ("Open") on links with data-cursor
  home/                          the main page
    Home.tsx                     hero, featured, catalogue, footer
    Header.tsx                   SiteHeader, the top bar used by the hero and the featured section
    hero/                        the introduction (see section 7)
    Featured.tsx                 featured products, one full screen each
    Catalogue.tsx                every product: filters, search, list and wall
    Preview.tsx                  a product's small picture in the catalogue
  stage/                         how a product is shown "live"
    Stage.tsx                    picks the demo or frame from product.stage; TALLY, what a demo's number counts
    PrDemo.tsx, JiraDemo.tsx     playable demos of the two plugins
    Frames.tsx                   PhoneFrame, BrowserFrame, WindowFrame, KindFrame (the frame for a kind), SampleScreen
  detail/                        a product's own page
    Detail.tsx                   top bar, hero, outline, the blocks, the Next band
    fit.ts                       useFit(): sizes a name to fill its width
    blocks/index.tsx             the registry: block type -> component; numbered(), the blocks with their numbers
    blocks/shared.tsx            BlockProps, Label, useBlockMotion, countUp, useCopy, usePreload
    blocks/<Name>.tsx            one file per block type
    blocks/MediaView.tsx         a Media value in the frame its product's kind calls for
  styles/                        plain CSS, one file per area
  products.test.ts               routes and product integrity
```

Routing: `/products/<slug>` has no file. `productsFallback()` in `vite.config.ts` serves the products page for it in dev and preview, and the `rewrites` entry in `vercel.json` does the same in production. A new product needs no routing change.

CSS class prefixes, one per area. Keep to them so nothing collides:

| Prefix | File | Area |
|---|---|---|
| `pp-` | `base.css`, `shell.css` | tokens, type, buttons, curtain, cursor |
| `hd-`, `ft-`, `cat-`, `ftr-` | `home.css` | top bar, featured, catalogue, footer |
| `hc-`, `r-`, `c-` | `hero-car.css` | car hero, its reveals, its paint |
| `dt-` | `detail.css` | detail page furniture and the first ten blocks |
| `bv-` | `blocks-visual.css` | split, showcase, compare, bento, marquee, MediaView |
| `bc-` | `blocks-content.css` | scores, timeline, faq, quote, palette |
| `stg-`, `frm-` | `stage.css`, `frames.css` | stages and device frames |
| `prd-`, `jrd-` | `pr-demo.css`, `jira-demo.css` | the two live demos |

---

## 3. Colour

All tokens are in `styles/base.css`.

| Token | Value | Use |
|---|---|---|
| `--black`, `--bone`, `--white` | `#000000`, `#ECE9DF`, `#FFFFFF` | the raw colours; every other token is made from these |
| `--ground` | `--black` | the page |
| `--raise`, `--raise-2` | `#0E0E0D`, `#181817` | panels, cards, frames lifted off the ground |
| `--ink` | `--bone` | text |
| `--dim`, `--faint` | bone at 58%, 34% | secondary text, hints |
| `--line` | bone at 14% | hairlines and borders |
| `--acc`, `--on-acc` | bone, black | the highlight and the text on it |
| `--paper`, `--paper-2`, `--paper-ink`, `--paper-dim`, `--paper-line` | light set | a light-themed product shown on the dark page |
| `--bad`, `--warn` | `#FF5A4C`, `#F2C14E` | status inside a product's own interface only |
| `--shadow-faint`, `--shadow`, `--shadow-deep` | black at 12%, 50%, 72% | drop shadows under frames and demos |

**How a product's colour gets on the page**

1. The product declares `brand` (a 6-digit hex taken from its own interface).
2. A surface that belongs to the product sets the variables: `style={brandVars(product.brand)}`. This gives `--brand` and `--on-brand` (black or bone, whichever reads on the colour).
3. The surface adds the class `pp-branded`, which swaps `--acc` and `--on-acc` to the brand pair.
4. Everything inside keeps using `--acc` and `--on-acc`. Never write a product's hex in CSS.

Where the brand is allowed: a product's featured stage, its tile preview on the wall, its peek preview, its whole detail page (`<main class="dt pp-branded">`), and the page-change curtain, which takes a deep shade of the destination product (`color-mix(in oklch, <brand> 46%, #000000)`).

Where it is not: the hero, the catalogue chrome (filters, search, rows), the footer, the top bar.

**Do not**

- Write a hex or `rgb()` value anywhere outside the token block in `base.css`. The one exception is a drawing's own local palette, declared once as custom properties on its root (the car's greys on `.hc`). For a tint, use `color-mix()` on a token.
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
| `pp-display` | weight 900, uppercase, narrow (`wdth` 68), line-height 0.84 | product names, section titles, huge numbers |
| `pp-lede` | weight 600, wide (`wdth` 108), tight tracking | pitches, block headlines, feature titles |
| `pp-mono` | 12px, uppercase, tracked | labels, metadata, counts, captions |
| body | 17px Archivo at `wdth` 100, line-height 1.5 | paragraphs |

Rules:

- The display width is the custom property `--wdth`, registered with `@property`, so it can be tweened. Set `--wdth` on an element to change its width; do not write a new `font-variation-settings` rule.
- A name that must fill its line uses `useFit(ref, maxVh)` from `detail/fit.ts`. Do not hand-tune a font size per product.
- Mono text is always uppercase and small. Do not use it for sentences longer than a caption.
- Size type with `clamp()`, never a fixed pixel size above 20px.

---

## 5. Layout and breakpoints

- Side padding is `--pad` (`clamp(20px, 3.6vw, 56px)`), applied with `pp-wrap`. Full-bleed bands (the Get block, the Next band) put `pp-wrap` on an inner element.
- Vertical rhythm between blocks is `--dt-gap` (`clamp(96px, 12vw, 180px)`), applied as `padding-top` by `.dt-block`. A block that needs less sets `--dt-gap` on itself (see `.dt-sec--stats`). Do not add margins between blocks.
- Easing for CSS transitions is `--ease`; a pressed control springing back uses `--spring`.
- Text for screen readers only uses the class `pp-sr`.

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
import { gsap, ScrollTrigger, Flip, Draggable, SplitText, useGSAP, reducedMotion } from '../motion';
```

It registers the plugins once and sets the defaults (`ease: 'expo.out'`, `duration: 0.9`).

**Rules**

1. **Start entrances when the page is seen.** A curtain covers every page change. Anything that plays on arrival starts through `onReveal()` from `arrive.ts`, not on mount, or it plays behind the curtain.
2. **Blocks use `useBlockMotion`.** It handles reduced motion, the reveal, the pin query and cleanup. Do not build a bare `ScrollTrigger` in a block.
3. **Every tween is a `from` or a `fromTo`.** CSS never hides content waiting for JavaScript. With reduced motion the block is simply its final state.
4. **Entrances play once and never leave content hidden.** Use the `enter(el)` trigger from `useBlockMotion`: scrolled past fast, it lands on its end state.
5. **Animate transforms, opacity and `clip-path`.** Not width, height, top or left. The one exception is the catalogue list's height during a filter change, which exists to stop its bottom edge jumping.
6. **Keep it brisk.** Entrances run 0.45 to 0.75 s with staggers of 0.04 to 0.08 s. The page change is 0.45 s down and 0.55 s up. A reader should see content within about 0.8 s of the reveal.
7. **Nothing trails the hand.** Smooth scrolling is Lenis at `lerp: 0.13`. Scrubbed animations use `scrub: true`, not a number, so they do not add a second layer of lag.
8. **Scroll through the scroller.** Any programmatic scroll calls `scrollToY()` from `scroll.ts`. `window.scrollTo` fights Lenis.
9. **No blend modes or filters on full-screen layers.** They are recomposited on every scroll frame. The grain is plain opacity for this reason.
10. **Decode images before they move.** A block with images that pin or slide calls `usePreload(root)`.
11. **Layout changes use Flip.** Capture state, change the DOM with `flushSync`, then `Flip.from`. See `Catalogue.tsx` and `JiraDemo.tsx`.
12. **Controls respond at once.** A press is immediate (about 0.07 s) and the release springs back (`.pp-btn`). Label swaps slide, they do not jump (`SwapLabel`).

Sections that take over the wheel do so through `setWheelGate()` in `scroll.ts` (the featured section is the only one). Only wheel input is stepped; keys, the scrollbar and touch scroll freely. Do not add a second gate without checking it against `steptest.mjs`.

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

**Footer.** A marquee of the kinds, and a link back to the portfolio.

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
| `stage` | yes | `'pr-demo'`, `'jira-demo'`, `'openui-demo'`, `'window'`, `'phone'` or `'browser'`. The last three show `shots` in frames; use `'window'` for a plugin or desktop tool with no live demo. |
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
top bar          All products · position (opens a list of every product to jump to) · Prev · Next
hero             meta row · the name, fitted to the width · pitch · buttons · facts · "On this page"
blocks           product.blocks, in the order the product gives        <- you design this
Next band        the next product's name, full width
```

You design a page by choosing blocks and their order. Use any block, any number of times, in any order.

**Numbering and the outline.** Blocks with a `label` are numbered 01, 02, … down the page. The hero's "On this page" lists every block in order and scrolls to it. A block without a label shows there under a default name (The product, In numbers, Notes, Feature, Showcase, Marquee, Quote).

### How to arrange a page

1. **Open on the strongest thing the product has.** Something to play with: `stage`. A sharp reason to exist: `statement`. A look worth seeing: `showcase` or `screens`. A story: `text`.
2. **Give every page a different opening and order from its neighbours in the list.** If the two products before it open on `stage`, open on something else.
3. **Alternate dense and open.** Follow a wall of words (`features`, `faq`, `text`) with something visual (`split`, `showcase`, `stats`, `marquee`).
4. **Match length to substance.** A small product is three blocks. Do not pad a page to look important.
5. **Let numbers and proof come after the claim.** `stats`, `scores` and `quote` support a `statement`; they do not open a page.
6. **End on `get`.** It is a full-bleed band in the product's colour and closes the page. A `film`, if there is one, sits just before it.
7. **Use `split` in runs.** Alternate `side` left and right. Give the first a `label` and leave the rest without one: they read as one section.
8. **One `marquee` at most**, and only on a long page, as a breath between halves.

### Starting points by kind

These are starting points, not templates. Reorder them.

| Kind | A full page | A short page |
|---|---|---|
| Plugin | `stage`, `statement`, `features`, `split` x2, `steps`, `stats`, `screens`, `keys`, `faq`, `film`, `get` | `statement`, `screens`, `get` |
| Mobile app | `stage`, `statement`, `showcase`, `features`, `split` x2, `stats`, `timeline`, `faq`, `get` | `screens`, `statement`, `get` |
| Website | `text`, `stage`, `compare`, `palette`, `scores`, `statement`, `get` | `text`, `stage`, `get` |

### See it

- `/products/block-library` shows every block type once, in one page. Use it to pick.
- The eight other products each use a different order. Read their `blocks` in `data.ts` as worked examples.
- To see all pages side by side as images, see [section 15](#15-check-your-work).

---

## 10. Block reference

The shapes are in `types.ts` (the `Block` union) with a comment on each. TypeScript will tell you the exact fields. This table is for choosing.

| Type | Label | What it shows | Use it for |
|---|---|---|---|
| `stage` | none | The product itself: its live demo, or its screens in device frames, with the hint under it | Letting the visitor try or see the product |
| `statement` | required | One big sentence, a paragraph beside it, optional short points | Why it exists. Wrap words to accent in `*asterisks*`. |
| `text` | optional | Paragraphs under an optional heading | The parts of a story that need sentences in a row |
| `features` | required | A grid of title plus one sentence | What it does. Six items sit best; keep each body to one sentence. |
| `steps` | required | Connected steps, each with a tag, title and body | How a request travels, or how to set it up. Three or four. |
| `stats` | none | A few huge numbers with labels | Proof in numbers. Three reads best. `unit` is optional. |
| `keys` | required | Keycaps and what they do | Keyboard shortcuts |
| `screens` | required | A sideways gallery, pinned to the scroll on desktop, a swipe row on touch | Many screenshots, each with a title and caption |
| `film` | required | A poster with a play button, then the video | The product's film. The first one is the target of the hero's button. |
| `split` | optional | A screen on one side, words and points on the other | Walking through one feature at a time |
| `showcase` | optional | Two or three screens fanned out, large | Showing off the look |
| `compare` | required | Before and after under a handle the visitor drags | A redesign, or light against dark |
| `bento` | required | A grid of mixed tiles: number, text or screen | A summary where no single form fits. The layout closes its own holes. |
| `marquee` | none | A band of big moving words | A break on a long page |
| `scores` | required | Rings filled to a value out of a maximum | Performance and accessibility scores, a rating |
| `timeline` | required | Releases or milestones in order | Version history, how it got here |
| `faq` | required | Questions that open and close | The questions a README answers |
| `quote` | none | One large pull quote with a name and role | Something a real user said. Never invent one for a real product. |
| `palette` | required | The product's own colours and typefaces | A site or app whose identity is part of the work |
| `code` | required | A panel of code with Copy; optionally the screen it produces beside it | A config snippet, or what the user writes and what they get. Plain text, not highlighted. |
| `specs` | required | Rows of a name and a value, with an optional line of detail | Requirements, costs, where the data comes from |
| `notes` | required | Cards of small print; a warning takes the product's colour | Limits and things to know before installing. Keep them honest. |
| `chips` | required | A wall of names as pills | What it works with or supports |
| `get` | required | An install command with Copy, store buttons, or a link, on a band in the product's colour | How to get it. Always last. |

**Media.** `split`, `showcase`, `compare` and `bento` take a `Media` value:

- `{ src, alt }`: a real image. Write `alt` as what the screen shows.
- `{ sample, dark? }`: a drawn placeholder screen. For dummy products only.

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
import { gsap } from '../../motion';
import { Label, useBlockMotion, type BlockProps } from './shared';
import '../../styles/blocks-content.css';

export function Pricing({ block, n }: BlockProps<'pricing'>) {
  const root = useRef<HTMLElement>(null);
  const id = useId();

  useBlockMotion(root, ({ q, qa, enter }) => {
    const grid = q('.bc-plans');
    if (grid) gsap.from(qa('.bc-plan'), { y: 28, autoAlpha: 0, duration: 0.5, stagger: 0.05, scrollTrigger: enter(grid) });
  });

  return (
    <section className="dt-block dt-sec pp-wrap" ref={root} aria-labelledby={id}>
      <Label n={n} id={id}>{block.label}</Label>
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

**Step 5. Show it.** Use it on a real product's page and look at it in the browser. (There is no sample page any more: the sample products, Block Library among them, were removed on 2026-11-11.)

**Step 6. If it has no label,** add its name to `UNLABELLED` in `Detail.tsx`. Otherwise the outline shows its raw type.

### Contract every block must meet

- Numbers that count up use `countUp()` from `shared.tsx`; do not write another.
- The root element has the class `dt-block`, exactly once, with no `dt-block` nested inside. The outline scrolls to blocks by counting these.
- Sections add `dt-sec pp-wrap`. A full-bleed block leaves `pp-wrap` off the root and puts it on an inner element (see `Get.tsx`).
- A labelled block renders `<Label n={n} id={id}>` and sets `aria-labelledby={id}` on its `<section>`. The label is the `h2`; headings inside are `h3`.
- Motion goes through `useBlockMotion`, using `enter()` for entrances. See [Motion](#6-motion).
- Colour comes from tokens only. Use `--acc` and `--on-acc` for the product's colour; never a hex, never `--brand` directly.
- Pictures go through `MediaView`. Images inside use `loading="lazy"`; if they pin or slide, call `usePreload(root)`.
- It works at 390 wide, with a pale, a dark and a vivid brand, with reduced motion, and by keyboard.
- Non-trivial logic (a layout routine, a parser) lives in its own file with a test beside it. See `bentoLayout.ts` and `bentoLayout.test.ts`.
- Reuse what exists: `pad` (`format.ts`), `scrollToEl` (`scroll.ts`), `KindFrame`, and from `shared.tsx` `Label`, `Out`, `countUp`, `useCopy`, `SwapLabel`, `CopyStatus`, `StoreButtons`, `usePreload`.

---

## 12. Add a kind, a stage or a live demo

**A new kind** (say, a command-line tool):

1. Add it to `Kind` and to `KINDS` in `types.ts` (`label`, `plural`, a three-letter `tag`, and `fact`, the heading for the last entry of `facts`). The catalogue filter, the footer marquee and the hero meta pick it up.
2. Decide its frame in `KindFrame` in `stage/Frames.tsx`, which the blocks use. `home/Preview.tsx` and `stage/Stage.tsx` arrange frames their own way; add the kind there too.
3. Give it its own small mark in the catalogue list (`[data-kind='…'] .cat-k i` in `home.css`): a shape, not a colour.
4. Add a stage for it (below).

**A new stage:** add its name to `StageKind` in `types.ts` and a `case` in `stage/Stage.tsx`. The switch is exhaustive, so TypeScript flags a missing case. Add a width for it in `detail.css` (`.dt-stage--<name>`) and check it on a featured slide (`.ft-stage[data-stage]` in `home.css`).

**A live demo** is the strongest thing a product can have: a small, playable copy of the product's main idea. `PrDemo.tsx` and `JiraDemo.tsx` are the models.

- Its props are `DemoProps`: `active` and `onTally`.
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
- `line` is one sentence. `hook` is a short question or claim. `hint` is an instruction.
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
- Real images have `alt` that says what the screen shows. Posters and thumbs beside a text name use `alt=""`.
- Text on a brand colour uses `--on-acc`, which `brandVars` picks for contrast. Keep `--dim` for secondary text and `--faint` for hints only.
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
| `node steptest.mjs` | Featured: one gesture moves one product, in both directions. Catalogue: the list's bottom edge does not jump on a filter change. |
| `node picktest.mjs` | Car hero: hover is steady, one click pins, and each area picks only its own part. |

Measure timing with these scripts, not in a browser tab that is in the background: background tabs get no animation frames.

**Checklist for any change**

- [ ] `npm run check` and `npx vite build` pass
- [ ] Looked at 1440, 900 and 390 wide
- [ ] Looked right with a pale brand, a dark brand and a vivid brand
- [ ] Reduced motion: everything visible, nothing pinned
- [ ] Keyboard: every control reachable, focus visible
- [ ] No new colour on the page chrome, no hex in block CSS
- [ ] Nothing jumps when content loads, filters change or fonts arrive
- [ ] `perf.mjs` shows no slow frames on the page you touched
- [ ] If you changed the featured section, `steptest.mjs` passes
- [ ] If you changed the car, `picktest.mjs` passes
- [ ] Real product copy checked against its README

---

## Search engines

The build gives every products URL its own HTML file (`scripts/products-seo.ts`, run by `scripts/prerender.ts`): its own title, description, canonical address, link-preview tags and structured data, plus the page's words as plain HTML that the app replaces when it starts. Titles and descriptions come from `seo.ts`, which the browser tab uses too.

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
- **Only PR Dashboard has a finish on the featured stage** (the flood and the Merged stamp). It is tied to `stage === 'pr-demo'` in `Featured.tsx`. A second demo with an ending should turn that into something the demo reports, not a second special case.
- **Not yet checked on real devices:** trackpad and mouse feel on the featured section, tablet widths, 1920 wide, and a real pointer drag on the compare handle. The car is small on phones.

---

## 17. Before publishing

- Done on 2026-11-11: every sample product, Block Library among them, and the `sample()` helper are gone from `data.ts`. The `sample` and `variant` fields, the sample branch of `Media`, the drawn sample screens and the `phone` and `browser` stages are kept on purpose, for the first real app or website.
- Check every link in `links` and every `get` target opens the right place.
- Confirm every film's `duration` against the file.
- Run the full checklist in [section 15](#15-check-your-work) once more.
