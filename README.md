# Portfolio v2

F1-themed portfolio for a senior full-stack developer, inspired by landonorris.com.
The v1 site in `../portfolio` is untouched.

```bash
npm install
npm run dev        # http://localhost:5174
npm run build      # client build + SSR build + prerender into dist/
npm run preview    # http://localhost:4174
```

## How it fits together

- **Scroll:** Lenis smooth scroll runs from the GSAP ticker and updates ScrollTrigger in the
  same frame (`src/motion/SmoothScroll.tsx`), so pins, scrubbed tweens and WebGL never drift.
- **Motion patterns:** `src/motion/patterns.ts` (SplitText masked reveals, clip-path wipes,
  scrubbed parallax, digit rolls, DrawSVG lines, and `gridSlot`, the scrubbed letter-by-letter
  heading entrance). Sections use them through `useSectionMotion`, which does nothing with
  reduced motion. Display headings marked `data-speed` lean with scroll speed
  (`src/motion/useSpeedSkew.ts`); Projects becomes a CSS-sticky card deck when a card fits the
  screen; the custom cursor is `src/components/Cursor.tsx` (states via `data-cursor`).
- **Intro:** F1 start lights (`src/components/Intro.tsx`) play the shared timeline in
  `src/motion/intro.ts`. First visit only; skipped with a URL hash, `?nointro` or reduced motion.
- **WebGL:** one lazy-loaded three.js renderer (`src/gl/Stage.ts`) draws the contour-line
  background, the procedural helmet (`src/gl/helmet/`, built entirely in code) and the 3D lap.
  It only renders while something moves and pauses when the tab is hidden or a dialog is open.
  The helmet's per-section poses are in `src/gl/helmetPath.ts`.
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
- **SEO:** the page is prerendered to static HTML (`scripts/prerender.ts`) and hydrated.
  Headings and copy use plain developer terms; F1 details are decorative and `aria-hidden`.
- **Social card and touch icon:** HyperFrames stills in `motion-lab/` (the site's own type,
  contours and helmet); `node motion-lab/build.mjs` rebuilds `public/og.jpg` and
  `public/apple-touch-icon.png`. No video is used on the site.

## Debug flags

`?nointro` skip the loader · `?nomotion` static page · `?nogl` no WebGL · `?debug` ScrollTrigger markers

## Content and TODOs

- All copy lives in `src/content/data.ts`.
- Project screenshots: add files to `src/assets/projects/` and set `image` on each project.
- Set `SITE_URL` in `src/content/data.ts` (or pass it to the build): the prerender then writes
  canonical, `og:url` and `og:image`. A sitemap is still to do.
