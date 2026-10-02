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
  scrubbed parallax, digit rolls, DrawSVG lines). Sections use them through
  `useSectionMotion`, which does nothing with reduced motion.
- **Intro:** F1 start lights (`src/components/Intro.tsx`) play the shared timeline in
  `src/motion/intro.ts`. First visit only; skipped with a URL hash, `?nointro` or reduced motion.
- **WebGL:** one lazy-loaded three.js renderer (`src/gl/Stage.ts`) draws the contour-line
  background, the procedural helmet (`src/gl/helmet/`, built entirely in code) and the 3D lap.
  It only renders while something moves and pauses when the tab is hidden or a dialog is open.
  The helmet's per-section poses are in `src/gl/helmetPath.ts`.
- **One animation engine:** every JS animation is GSAP (plus Lenis on its ticker). Counters use
  `digitRoll`, scrambled labels `ScrambleTextPlugin` (`src/components/Scramble.tsx`), project
  diagrams draw once with DrawSVG and pulse on hover with MotionPath, and the logo marquee moves
  only with scroll velocity. Durations and eases come from `src/motion/tokens.ts`; CSS hover
  transitions share them through `--dur-hit`, `--dur-split` and `--dur-wipe`.
- **SEO:** the page is prerendered to static HTML (`scripts/prerender.ts`) and hydrated.
  Headings and copy use plain developer terms; F1 details are decorative and `aria-hidden`.

## Debug flags

`?nointro` skip the loader · `?nomotion` static page · `?nogl` no WebGL · `?debug` ScrollTrigger markers

## Content and TODOs

- All copy lives in `src/content/data.ts`.
- Project screenshots: add files to `src/assets/projects/` and set `image` on each project.
- Set `SITE_URL` in `src/content/data.ts`, then add canonical, `og:url`, `og:image` and a sitemap.
