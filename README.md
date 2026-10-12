# Portfolio v2

F1-themed portfolio for a senior full-stack developer, inspired by landonorris.com.
The v1 site in `../portfolio` is untouched.

```bash
npm install
npm run dev        # http://localhost:5174
npm run build      # client build + SSR build + prerender into dist/
npm run preview    # http://localhost:4174
npm run check      # typecheck + lint (both must pass with no warnings)
```

## Linting

`npm run lint` runs [oxlint](https://oxc.rs/docs/guide/usage/linter) with type-aware rules
(`oxlint-tsgolint`); `npm run lint:fix` applies the safe fixes. It is oxlint rather than ESLint
because typescript-eslint parses through the TypeScript compiler API, which TypeScript 7 (used
here) doesn't ship. Rules and the reason for each override are in `.oxlintrc.json`. Where code
breaks a rule on purpose, an `oxlint-disable-next-line` comment says why.

## How it fits together

- **Scroll:** Lenis smooth scroll runs from the GSAP ticker and updates ScrollTrigger in the
  same frame (`src/motion/SmoothScroll.tsx`), so pins, scrubbed tweens and WebGL never drift.
- **Motion patterns:** `src/motion/patterns.ts` (SplitText masked reveals, clip-path wipes,
  scrubbed parallax, digit rolls, DrawSVG lines, `gridSlot`, the scrubbed letter-by-letter
  heading entrance, `barReveal`, the red bar line reveal, and `curtainReveal`, the oval curtain
  on project visuals). Sections use them through `useSectionMotion`, which does nothing with
  reduced motion. Display headings marked `data-speed` lean with scroll speed
  (`src/motion/useSpeedSkew.ts`); button and menu labels marked `data-letter-roll` roll their
  letters on hover (`src/motion/useLetterRoll.ts`); Projects becomes a CSS-sticky card deck when
  a card fits the screen; the custom cursor is `src/components/Cursor.tsx` (states via `data-cursor`).
- **Intro:** F1 start lights (`src/components/Intro.tsx`) play the shared timeline in
  `src/motion/intro.ts`. First visit only; skipped with a URL hash, `?nointro` or reduced motion.
- **WebGL:** lazy-loaded three.js (`src/gl/Stage.ts`) on two canvases. Behind the page: the
  contour-line background, or the 3D lap while it is pinned (light pulses run along its racing
  line with the scroll; its S1/S2/S3 marks are DOM, projected from the track). Above the page,
  see-through and click-through: the procedural helmet (`src/gl/helmet/`, built entirely in
  code), so it can fly in front of the text. It flies cubic Béziers between layout boxes marked
  `data-helmet-anchor` (the hero, a slot after "fast." in About, the P3 step, beside 450+), in
  back-to-back scroll windows (`src/gl/flight/route.ts`, `flight.ts`). Both render only while
  something moves and pause when the tab is hidden or a dialog is open.
- **One animation engine:** every JS animation is GSAP (plus Lenis on its ticker). Counters use
  `digitRoll`, scrambled labels `ScrambleTextPlugin` (`src/components/Scramble.tsx`), project
  cards play a short SVG scene of the product in use (`src/components/ProjectVisuals.tsx`: the
  markup is the last frame; it loops only while on screen, once on touch), and the logo marquee moves
  only with scroll velocity. In the details dialogs each row lands as it scrolls into view: its
  stat rolls and, where the highlight has a before/after `delta` in `data.ts`, two bars race at
  the same speed (`src/components/Dialogs.tsx`). The Contact map grows out of Karachi and draws
  an arc to each place worked with (`src/components/WorldMap.tsx`). Durations and eases come
  from `src/motion/tokens.ts`; CSS hover transitions share them through `--dur-hit`,
  `--dur-split` and `--dur-wipe`.
- **Shared pieces:** colours for SVG, canvas and WebGL come from `src/art/palette.ts` (the same
  values as the CSS variables in `src/index.css`); GLSL used by more than one shader (noise, the
  contour isolines, the helmet's dissolve edge) is in `src/gl/glsl.ts`; small helpers (focus trap,
  lap-time format, idle callback) are in `src/lib/`. Both dialogs are one `DialogFrame`.
- **Type:** three GitHub families. Hubot Sans for headings (`.display`, expanded), Mona Sans
  for text and small headings, Monaspace Krypton for labels, buttons and data. All are
  self-hosted from `src/assets/fonts/`, trimmed by `scripts/fonts.py` to the weights and widths
  in use (which also makes every zero plain), and preloaded (the plugin in `vite.config.ts`).
  Display sizes are the `--text-display-*` roles in `src/index.css` (hero, section, lead, stat,
  card, small); widths are expanded (display), semi-expanded (small headings) and normal
  (text). Arrows are the `<Arrow />` SVG, because the → character isn't in the fonts.
- **SEO:** the page is prerendered to static HTML (`scripts/prerender.ts`) and hydrated.
  Headings and copy use plain developer terms; F1 details are decorative and `aria-hidden`.
- **Social card and touch icon:** `public/og.jpg` and `public/apple-touch-icon.png` are stills
  made from the site's own type, contours and helmet. No video is used on the site.

## Debug flags

`?nointro` skip the loader · `?nomotion` static page · `?nogl` no WebGL · `?debug` ScrollTrigger markers

## Content and TODOs

- All copy lives in `src/content/data.ts`, including `SECTIONS`, the one list of page sections that
  the menu, the track map and the scroll rail read.
- Project screenshots: add files to `src/assets/projects/` and set `image` on each project.
- Set `SITE_URL` in `src/content/data.ts` (or pass it to the build): the prerender then writes
  canonical, `og:url` and `og:image`. A sitemap is still to do.
