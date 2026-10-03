# three.js plan: polish the 3D, add a few things nobody else has

Branch: `threejs`. **Separate from `SCROLL-WOW-PLAN.md` on purpose**: this one was optional. Tier 1 is
now implemented except the chequered wipe; see [Implementation status](#9-implementation-status) at the end.

Contents

1. [How this was put together](#1-how-this-was-put-together)
2. [What the 3D does today](#2-what-the-3d-does-today)
3. [What threejs.org offers that fits this site](#3-what-threejsorg-offers-that-fits-this-site)
4. [The ideas](#4-the-ideas) (tiered: do, maybe, no)
5. [Performance check](#5-performance-check)
6. [Order of work and verification](#6-order-of-work-and-verification)
7. [Do you need it? (recommendation)](#7-do-you-need-it-recommendation)
8. [Decisions](#8-decisions)
9. [Implementation status](#9-implementation-status)

---

## 1. How this was put together

- **threejs.org home page:** went through the showcase grid (about 110 projects). The ones closest to
  this site are racing projects (`apex-racing`, Patrick Heintzmann's `demoFormula`, mrdoob's
  `Starter-Kit-Racing`, `slowroads.io`, `polytrack`) and studio sites (`lusion.co`, `igloo.inc`,
  `unseen.co`, `basement.studio`, `bruno-simon.com`). I tried the two F1 ones: `demoFormula` stayed on
  its loader in the pane and `apex-racing` is a paused deployment, so I did not borrow from them
  directly.
- **Examples:** read the full list of **607** official examples and picked the ones relevant to a
  scroll-driven portfolio (materials, post-processing, instancing, modifiers, transitions).
- **Documentation:** read the docs index (core, addons, TSL nodes, post-processing) and the pages for
  `HTMLTexture`, `CarGenerator`, `InstancedFlow` (CurveModifier), `RenderTransitionPass` and
  `MeshSurfaceSampler`. Several of these are new or barely used on portfolio sites, which is where the
  "unique" ideas come from.
- **Checked the installed version:** `three@0.186.1`. Every addon used below is already in
  `node_modules` (no upgrade needed). `HTMLTexture` is in core but needs an experimental browser API
  (see 4.3, "no").
- **Measured the current scene** on the running site (1440 × 900): draw calls and triangles per scene,
  drawing-buffer size, bundle sizes.

---

## 2. What the 3D does today

| Piece | What it is | Cost today |
|---|---|---|
| Loading | `three` is lazy-loaded after the page is idle (`GLCanvas.tsx`), never blocks the first paint | `three` chunk **143 KB gzip**, `Stage` chunk 9 KB gzip |
| Background | Full-screen contour field shader (simplex fbm, isolines, red racing line), colours per section, scroll parallax and speed stretch | 1 draw, full-screen fragment shader |
| Helmet | Procedural shell with a canvas livery texture, visor, wireframe-to-solid reveal shader, poses scrubbed along the page (`helmetPath.ts`), perches on the P3 step | **11 draws, ~5.7k triangles** |
| Lap | Track ribbon, kerbs, centre line, 90 instanced light posts, red racing line drawn up to a **sphere "car"**, contour ground, colour veil for fade in and out | **12 draws, ~9.7k triangles** |
| Lighting | `RoomEnvironment` through PMREM (helmet), hemisphere + directional (lap). No shadows, no post-processing | — |
| Budget | Drawing buffer capped at 3.2 MP (DPR ≤ 1.5 desktop, 2 phones), **2160 × 1350** at 1440 × 900; adaptive resolution drops to 55% when frames miss vsync; renders only while something moves (30 fps idle drift); off for reduced motion, Save-Data, ≤ 4 cores | p99 9.3 ms per frame during a full scroll at 120 Hz (from the scroll plan's baseline) |

Honest read: the 3D is already lean and well built. The weakest spots visually are:
- **The car is a red sphere.** It is the one thing in the Lap that looks like a placeholder.
- **The helmet's reflections are generic.** `RoomEnvironment` gives soft grey boxes, so the visor never
  catches a highlight the way a real racing visor does.
- **Scene changes are colour fades.** The helmet stage → Lap → helmet stage changes happen behind a
  plain colour veil.
- **The helmet never leaves on purpose.** It drifts off the bottom after the finale. It got a
  wireframe-to-solid entrance but has no exit.

---

## 3. What threejs.org offers that fits this site

Filtered from the 607 examples and the docs, against two tests: does it make sense for an F1-themed
developer portfolio, and is it cheap enough for a page that also scrolls heavy DOM.

| Feature (doc / example) | What it does | Fit |
|---|---|---|
| `MeshPhysicalMaterial.iridescence`, `clearcoat` (`webgl_materials_physical_clearcoat`, `webgl_materials_car`) | Thin-film rainbow sheen; lacquer layer | **Visor** (real racing visors are iridescent) |
| `PMREMGenerator.fromScene` | Bakes any scene into a reflection map | A **procedural garage** of light strips: studio reflections, **no HDR download** |
| `InstancedFlow` / `Flow` (CurveModifier) | Bends meshes along a curve | **Trackside banners** bent along the circuit |
| `RenderTransitionPass` (`webgl_postprocessing_transition`) | Wipes from scene A to B through a texture | **Chequered-flag wipe** between the helmet stage and the Lap |
| `MeshSurfaceSampler` (`webgl_instancing_scatter`) | Random points on a mesh surface | **Helmet breaks into particles** at the finish |
| `UnrealBloomPass` (`webgl_postprocessing_unreal_bloom_selective`) | Glow on bright parts | Lap racing line, car, light caps (maybe) |
| `Lensflare` (`webgl_lensflares`) | Sprite flares from a light | Too "3D demo" for this site (no) |
| `DecalGeometry` (`webgl_decals`) | Stickers projected onto a mesh | "Sign the helmet" (no, see 4.3) |
| `HTMLTexture` (core, new) | Renders a live DOM element into a texture | Needs the experimental `texElementImage2D` API (Chrome flag only) (no) |
| `CarGenerator` (new city generators) | Instanced low-poly **road** cars (sedan, SUV, taxi) | Wrong kind of car for F1; a hand-built low-poly F1 car is smaller and fits (4.1.4) |
| WebGPU + TSL (`GodraysNode`, `SSGINode`, compute particles, `MeshSSSNodeMaterial`) | Next-gen renderer and node materials | Would mean rewriting every custom shader; too much risk for a portfolio (no) |
| SSR, GTAO, DOF / bokeh, motion blur | Screen-space effects | Full-screen depth passes on a 2.9 MP buffer behind a scrolling page (no) |

---

## 4. The ideas

### 4.1 Tier 1: do these if you do any 3D work (cheap, polished, on theme)

#### 4.1.1 Racing visor + procedural garage reflections

- Visor material → `MeshPhysicalMaterial` with `iridescence: 1`, `iridescenceIOR: 1.3`,
  `iridescenceThicknessRange: [250, 600]`, `clearcoat: 1`, smoked base colour. As the helmet turns on
  scroll, the visor shifts through purple, blue and gold, like a real Iridium visor.
- Environment → replace `RoomEnvironment` with a tiny procedural **garage**: a dark box with 4 long
  emissive light strips (pit-garage strip lights) and one red strip, baked once with
  `PMREMGenerator.fromScene`. Long strip reflections slide along the helmet shell and visor as it
  rotates, which is what makes product renders look expensive.
- Shell stays matte (your earlier choice); it gains crisper strip highlights only from the new
  environment.
- Cost: the physical material on the **visor only** (one small mesh); the PMREM bake is one-time at
  load (~5 ms), same as now. 0 KB download.

#### 4.1.2 A real car on the Lap (replaces the sphere)

- A hand-built **low-poly F1 car** from `ExtrudeGeometry` and boxes (nose, chassis, halo, front and
  rear wings, four wheels): ~600 to 900 triangles, red livery matching the helmet, about 3 draws
  (body, wheels, rear light).
- It faces along the track tangent (`curve.getTangentAt`), banks slightly in corners (rotation from
  the tangent's change), and wheels spin with the scrubbed progress.
- **Rain light:** the blinking red rear light F1 cars use, pulsing while the lap is scrubbed and
  holding steady when you stop. Tiny, very F1, very recognisable.
- Cost: +2 draws, +~800 triangles. Built in code, no model download, no licence question.

#### 4.1.3 Trackside banners with your career on them (`InstancedFlow`) (unique)

- Flat banner meshes **bent along the circuit** with `InstancedFlow`, placed at each career stage's
  sector: CAREEM, XTEL, ASTERA as trackside boards, plus a few shorter boards with the stack
  (GO / PYTHON / REACT / .NET).
- Text drawn once into a `CanvasTexture` with the site's own Mona Sans (already loaded as a web font),
  so there is **no typeface JSON** (TextGeometry would need a 50 to 100 KB font file).
- When the Lap card for a stage is active, that stage's banner lights up (emissive red), so the 3D
  scene and the DOM card say the same thing. The car passes "its" company board as you scroll.
- Cost: 1 instanced draw for all boards, 1 texture atlas (2048 × 256, ~2 MB GPU), the CurveModifier
  addon (~3 KB gzip).

#### 4.1.4 Chequered-flag wipe between scenes (`RenderTransitionPass`) (unique)

- Today the Lap arrives and leaves behind a colour veil. Replace it with `RenderTransitionPass`:
  scene A (field + helmet) → scene B (lap) through a **procedural chequer texture with a soft noise
  edge**, so the screen literally flips to the race through a chequered flag, scrubbed to the same
  scroll range the veil uses now (`top 35%` → `top top`, and back at the end of the pin).
- Only during the two transitions does it render both scenes (into render targets at the current
  adaptive resolution); the rest of the time the Stage renders as it does now.
- Cost: `EffectComposer` + `RenderTransitionPass` (~4 KB gzip), two render targets (~2 × 11 MB at
  2160 × 1350), double scene cost **only for ~35% of a viewport of scroll, twice**.

#### 4.1.5 Contour field reacts to the cursor (ties to the custom cursor plan)

- One `uPointer` uniform: isolines near the pointer bend outward slightly and the red racing line
  bends toward it, like heat haze. With the custom cursor (scroll plan 4.11), the ring looks like a
  lens moving over the map.
- Cost: a few ALU in the existing full-screen shader; the Stage already renders on pointer moves.
  Desktop with a fine pointer only.

#### 4.1.6 The helmet's exit: it breaks into particles at the finish (`MeshSurfaceSampler`) (unique)

- Bookends the intro: the helmet arrives as a wireframe that turns solid, and at the end it **leaves as
  particles**. On the existing `results → exit` segment, ~6,000 points sampled from the shell (taking
  the livery colour at each point's UV) peel off bottom to top through the same noise edge the reveal
  uses (the shell discards as the points appear) and stream away along the scroll direction, like tyre
  smoke and sparks. Scrolling back up pulls them back together.
- One `Points` draw with a small shader; positions are computed in the vertex shader from one
  scrubbed uniform (no per-frame CPU work).
- Cost: 1 draw, 6k points, only while the exit segment is on screen; MeshSurfaceSampler ~2 KB gzip,
  sampling once at load (~10 ms, done in idle time).

### 4.2 Tier 2: maybe (more cost or more risk; decide after Tier 1)

| Idea | What | Why only "maybe" |
|---|---|---|
| Selective bloom on the Lap | `UnrealBloomPass` at **half resolution** on the racing line, car, rain light, light caps and lit banner, only while the Lap pin is active | Big polish, but bloom is 5 to 10 full-screen blur passes: on a mid laptop it would likely trigger the adaptive resolution drop |
| Broadcast camera cuts | At each stage switch, the aerial camera eases down to a low TV angle beside the car, then back up | Free in GPU terms, but a scrubbed camera that dives can feel nauseating; needs a feel test |
| 3D chequered flag in Contact | A cloth-like flag (vertex-shader wave, procedural chequer, lit by the garage env) waving behind "Let's build something fast" | Overlaps with the DOM flag sweep in the scroll plan (4.9). Do one or the other, not both |
| Helmet hover: visor flips up | Raycast against the helmet's bounding sphere; the visor rotates open on hover | Fun, but it hides the iridescent visor (4.1.1), which is the better effect |

### 4.3 Tier 3: no (reasons)

- **WebGPU renderer and TSL** (`GodraysNode`, `SSGINode`, compute particles): every custom shader on
  the site (field, reveal, lap ground, veil) would have to be rewritten in TSL, for effects this page
  does not need.
- **`HTMLTexture`**: would let real DOM (project cards) live on 3D surfaces, but it depends on the
  experimental `texElementImage2D` API (Chrome flag only). Revisit when it ships.
- **`CarGenerator`**: road cars (sedan, SUV, taxi), not F1; 4.1.2 is smaller and fits.
- **SSR, GTAO, DOF, motion blur**: depth-based full-screen passes on a 2.9 MP buffer under a scrolling
  DOM page; high cost for subtle gains.
- **glTF car or helmet models**: downloads (hundreds of KB), licences, and a style mismatch with the
  procedural helmet.
- **Decals ("sign the helmet")**, **Lensflare**, **physics (Rapier)**, **Gaussian splats**, **Water / Sky**:
  read as tech demos, not as a portfolio.

---

## 5. Performance check

Same rules as the scroll plan's performance check: count draws, triangles, full-screen passes, GPU
memory, download size, and when each one actually runs. The Stage already has the right
infrastructure (render only when something moves, adaptive resolution, pixel budget, off on weak
devices), so each item below plugs into it.

| Item | Draws | Triangles / points | Full-screen passes | GPU memory | Download | When it runs | Verdict |
|---|---|---|---|---|---|---|---|
| 4.1.1 Visor + garage env | 0 | 0 | 0 | env map same size as now | 0 KB | always (helmet) | **Low.** Physical shader on one small mesh |
| 4.1.2 F1 car + rain light | +2 | +~800 | 0 | ~0 | ~1 KB code | Lap pin only | **Low** |
| 4.1.3 Banners (InstancedFlow) | +1 | +~1k | 0 | ~2 MB atlas, 1 data texture | ~3 KB | Lap pin only | **Low** |
| 4.1.4 Chequered wipe | 0 extra meshes | — | +1 (transition) and **2 scene renders** | +~22 MB (2 RTs) | ~4 KB | **only during the 2 transitions** | **Medium**, but brief. Render targets created lazily and freed after the Lap |
| 4.1.5 Field pointer ripple | 0 | 0 | 0 (same pass) | 0 | 0 | desktop pointer moves | **Very low** |
| 4.1.6 Helmet particles | +1 | 6k points | 0 | ~0.3 MB | ~2 KB | exit segment only | **Low** |
| T2 Bloom (if chosen) | 0 | — | **+5 to 10 (half res)** | +~15 MB | ~4 KB | Lap pin only | **High.** Only with the adaptive drop tested on a mid laptop |

Totals for Tier 1:
- **Download:** about **+10 KB gzip** on the lazy `Stage` chunk (addons + code). The 143 KB `three` chunk
  is unchanged, still loaded after idle, so first paint and the h1 are untouched.
- **Lap scene:** 12 → **15 draws**, ~9.7k → ~11.5k triangles. Negligible for any GPU that passes the
  current `glEnabled()` checks.
- **Helmet stage:** 11 → **12 draws** while the exit plays.
- **Peak extra GPU memory:** ~25 MB, only during the chequered transitions.
- **Frame-time target:** keep the scroll plan's budget (pane at 120 Hz: p99 ≤ 11 ms for the whole
  page), and **no adaptive-resolution drops** during a full scroll on this Mac (`__stage.quality.scale`
  stays 1). If either fails, 4.1.4 is the first item to cut, since it is the only one with extra passes.

Interplay with the scroll plan: none of these items add ScrollTriggers beyond reusing the existing ones
(`lapState`, `helmetPath` segments, the veil range), so the scroll plan's trigger budget is unaffected.

---

## 6. Order of work and verification

One commit each; each can be reverted alone.

| Step | Item | Size |
|---|---|---|
| 1 | 4.1.1 Visor + garage environment | small |
| 2 | 4.1.2 F1 car + rain light | small to medium |
| 3 | 4.1.3 Trackside banners | medium |
| 4 | 4.1.5 Field pointer ripple | small |
| 5 | 4.1.6 Helmet particle exit | medium |
| 6 | 4.1.4 Chequered-flag transition | medium (last: the only item with a real cost) |
| 7 | Tier 2, only the ones you pick after seeing 1 to 6 | — |

Verification after each step:
1. `npm run build` passes; note the `Stage` chunk size (target ≤ 20 KB gzip).
2. Scene counts from `__stage` (draws, triangles) against section 5.
3. Full-page scripted scroll in the pane with WebGL on (p50, p95, p99, frames over 20 ms) and
   `__stage.quality.scale` at the end (must stay 1).
4. `?nogl` and reduced motion: the page looks exactly as now (CSS contour fallback, no helmet).
5. Phone emulation (375 × 812): the new parts respect the phone DPR and pose rules; the banners and
   car read at small size.
6. Screenshots at the moments that matter: visor at three rotations, the car passing a lit banner,
   mid-transition, mid-particle exit.

---

## 7. Do you need it? (recommendation)

**Short answer: not before the scroll plan, and not all of it.**

- The site already has more real 3D than almost any developer portfolio: a procedural helmet that
  follows the page and perches on the podium, and a 3D lap scrubbed to scroll. What visitors miss today
  is mostly in the DOM (sections that stand still), which the scroll plan fixes; that gives more "wow"
  per hour of work.
- Where three.js work clearly pays off is the **few spots that look unfinished up close**: the sphere
  car and the generic visor reflections. Those two (4.1.1, 4.1.2) are small, cheap, and make the 3D
  look deliberate. **Recommended even if you skip everything else.**
- The **unique** pieces (career banners along the track, the chequered-flag scene wipe, the helmet
  breaking into particles at the finish) are what someone would remember and mention. Worth doing
  **after** the scroll plan lands, picked one at a time, with frame times measured after each.
- Skip Tier 3 outright, and treat bloom as a last experiment.

Suggested path: **scroll plan → 4.1.1 + 4.1.2 → pick from 4.1.3 / 4.1.4 / 4.1.6.**

---

## 8. Decisions

1. **Do any 3D work at all?** If yes, start with 4.1.1 and 4.1.2 (recommended).
2. **Which unique piece first:** banners (4.1.3), chequered wipe (4.1.4) or particle exit (4.1.6)?
   Recommended: banners, because they tie the 3D to your actual career content.
3. **Finale flag:** DOM sweep (scroll plan 4.9) or 3D cloth flag (Tier 2)? Recommended: DOM, because
   it is cheaper and works without WebGL.
4. **Bloom on the Lap:** try it as a measured experiment, or skip? Recommended: skip unless everything
   else is done and frame times have room.

---

## 9. Implementation status

| Item | Status | What changed from the plan |
|---|---|---|
| 4.1.1 Garage reflections | Done | Baked pit garage (strip lights, door panel, red accent, rim strip). The visor stays black on a standard material: the iridescent visor was removed earlier on purpose (`715eda3`), so only the reflections changed |
| 4.1.2 F1 car + rain light | Done | Car scaled up 1.25x to read from the air. At the old full-circuit framing it was still a speck, so the camera became a **helicopter shot**: 62% of the distance, leaning 55% toward the car (the minimap still shows the whole circuit). Phones shift the view up so the car rides above the stage card |
| 4.1.3 Career banners | Done, changed | Standing banners would be foreshortened from the steep aerial camera, so the companies are **painted flat on the run-off** beside each sector (one mesh, one canvas atlas, no `InstancedFlow`). Each faces the camera angle of its stage; the active stage's name lights red |
| 4.1.5 Pointer lens | Done | Magnifies and brightens the isolines under the cursor; fine pointers only, fades out when the pointer leaves |
| 4.1.6 Particle exit | Done | 6,000 sparks (2,500 on phones) in livery colours; the intro's reveal runs backwards (top first); the dissolve seam is turned down to a faint ember for the scrubbed exit; the inside of the shell renders as a dark liner |
| 4.1.4 Chequered wipe | **Skipped** | The only item with real GPU cost (two render targets, both scenes rendered during transitions), and the cost lands hardest on phones |
| Tier 2 | Not started | — |

Measurements (1440 x 900, headless Chrome, scripted full-page scroll over 24 s, WebGL on):
- Before: p50 16.7, p99 16.8, max 33.3 ms (one hitch entering the Lap).
- After: p50 16.7, p99 16.8, **max 16.8 ms, 0 frames over 20 ms**, also at 4x CPU throttle; adaptive scale stays 1.
  The Lap's and the sparks' shaders now compile (and the run-off atlas uploads) in idle time, which also
  removed the old hitch.
- Lap: 12 -> 15 draws, ~9.7k -> ~9.5k triangles (the sphere was heavier than the car).
- Bundle: `Stage` chunk 9 -> 12.9 KB gzip; `three` chunk 143 -> 145.7 KB gzip (BufferGeometryUtils and
  MeshSurfaceSampler). Both still load after idle; prerendered HTML unchanged at 116.2 KB.
