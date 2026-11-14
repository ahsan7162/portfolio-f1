// The car, drawn flat and side-on. No 3D: every part is a 2D shape in one 1600 x 520 drawing,
// grouped the way the car is built, so each group can arrive, be picked and leave on its own.
// Proportions follow a current F1 car: 5.5 m long, 3.6 m wheelbase, 720 mm wheels.
//
// The car faces right: ground y = 420, rear axle x = 291, front axle x = 1207, wheel radius 92.
// Its parts are numbered in the order of the work, and that order runs left to right along the car:
// 01 Design at the rear wing, through to 05 Front end at the front wing, and 06 Launch on the start
// line ahead of it.
import type { ReactNode } from 'react';

export const VIEW = { w: 1600, h: 520 };
export const AXLE = { rear: 291, front: 1207, y: 328, r: 92 };

/**
 * The parts, from the back of the car to the front. `layer` is the index into ME.layers the part
 * stands for; `at` is the point on the part its label points to, in drawing units.
 */
export const PARTS = [
  // Design comes first: it hangs from the rear wing, at the far left (picking it redraws the whole car as a blueprint).
  { id: 'body', layer: 0, at: [176, 268] },
  { id: 'floor', layer: 1, at: [400, 402] },
  { id: 'power', layer: 2, at: [640, 262] },
  { id: 'driver', layer: 3, at: [962, 252] },
  { id: 'wing', layer: 4, at: [1436, 398] },
  // Launch comes last, so its label sits ahead of the car, on the start line (the front wheel picks it too).
  { id: 'wheels', layer: 5, at: [1560, 410] },
] as const;
export type PartId = (typeof PARTS)[number]['id'];

/** A part: the outer group is moved by picking (CSS), the inner one by the build (GSAP). */
function Part({ id, children }: { id: PartId; children: ReactNode }) {
  return <g className="hc-part" data-part={id}><g className="hc-in">{children}</g></g>;
}

/** What a picked part shows that it does not show at rest. */
function Reveal({ id, children }: { id: PartId; children: ReactNode }) {
  return <g className="hc-rv" data-for={id}>{children}</g>;
}

function Wheel({ x, front = false }: { x: number; front?: boolean }) {
  return (
    <g transform={`translate(${x} ${AXLE.y})`} className="hc-wheel" data-front={front ? '' : undefined}>
      {/* nested groups, one per mover: picked (CSS), wheelspin (CSS), fitted (the build), turning (the build and the launch) */}
      <g className="hc-pop"><g className="hc-rev"><g className="hc-seat">
        <g className="hc-spin">
          <circle r="92" className="c-tyre" />
          <circle r="91" className="c-tyre-edge" />
          {/* the sidewall marking: two arcs, so the turn of the wheel can be seen */}
          <circle r="76" className="c-wall" strokeDasharray="150 88.76" />
          <circle r="60" className="c-rim" />
          <circle r="60" className="c-rim-edge" />
          <circle r="47" className="c-rim-ring" />
          <path d="M-47 0H-22M22 0H47M0 -47V-22M0 22V47" className="c-rim-ring" />
          <circle r="13" className="c-nut" />
          <path d="M0 -8.5 7.4 -4.2V4.2L0 8.5 -7.4 4.2V-4.2Z" className="c-nut-hex" />
        </g>
      </g></g></g>
    </g>
  );
}

export function Car() {
  return (
    <svg className="hc-svg" viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="hc-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="g-body-hi" /><stop offset="0.55" className="g-body-mid" /><stop offset="1" className="g-body-lo" />
        </linearGradient>
        <linearGradient id="hc-pod" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="g-body-mid" /><stop offset="0.5" className="g-body-lo" /><stop offset="1" className="g-body-deep" />
        </linearGradient>
        <linearGradient id="hc-carbon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="g-carbon-hi" /><stop offset="1" className="g-carbon-lo" />
        </linearGradient>
        <linearGradient id="hc-sheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="0.5" stopColor="#fff" stopOpacity="0.55" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="hc-pool" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" className="g-pool" stopOpacity="0.16" /><stop offset="1" className="g-pool" stopOpacity="0" />
        </radialGradient>
        <pattern id="hc-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" className="b-grid" />
        </pattern>
        {/* everything painted in body colour, for the sheen to stay inside */}
        <clipPath id="hc-skin">
          <path d="M1486 370C1440 352 1380 338 1320 324C1270 312 1240 300 1207 290L1090 272L1062 268L1046 286H902L880 262L870 198C852 176 822 170 790 172C700 180 600 215 520 250C450 280 380 300 330 312L322 342L420 372C470 388 505 395 545 396H1168L1206 374C1262 374 1380 378 1486 378Z" />
          <path d="M112 200H226C234 200 238 206 238 214V318L206 338H160V290C160 262 140 244 112 236Z" />
        </clipPath>
      </defs>

      {/* the ground: a line, and a pool of light the car sits in */}
      <ellipse className="hc-pool" cx="790" cy="424" rx="760" ry="46" fill="url(#hc-pool)" />
      <path className="hc-ground" d="M40 420.5H1590" />
      {/* the start line, ahead of the nose: where the launch happens */}
      <g className="hc-start">
        <path d="M1544 404h8v8h-8zM1560 404h8v8h-8zM1552 412h8v8h-8zM1568 412h8v8h-8z" />
        <rect x="1544" y="404" width="32" height="16" />
      </g>

      {/* Design, picked: the drawing sheet behind the car, and its dimensions */}
      <Reveal id="body">
        <rect className="b-sheet" x="40" y="96" width="1520" height="324" fill="url(#hc-grid)" />
        <g className="b-dim">
          <path pathLength={1} d="M112 126V150M112 138H1506M1506 126V150" />
          <rect x="747" y="128" width="124" height="20" className="b-gap" />
          <text x="809" y="143" textAnchor="middle">5 500 mm</text>
          <path pathLength={1} d="M291 432V452M291 442H1207M1207 432V452" />
          <rect x="669" y="432" width="160" height="20" className="b-gap" />
          <text x="749" y="447" textAnchor="middle">wheelbase 3 600</text>
          <path pathLength={1} d="M54 172H82M68 172V420" />
          <text x="58" y="300" textAnchor="middle" transform="rotate(-90 58 300)">950</text>
          <text x="1207" y="212" textAnchor="middle">Ø 720</text>
          <path pathLength={1} d="M1207 220V236" />
        </g>
      </Reveal>

      <g>
        <g className="hc-drive">
          {/* speed, only seen when the car leaves */}
          <g className="hc-streaks">
            <path d="M-520 250H60M-380 300H40M-640 350H70M-300 388H90" />
          </g>

          {/* Front end, picked: the air, from the wing back over the whole car */}
          <Reveal id="wing">
            <g className="r-air">
              <path d="M1590 332C1480 324 1380 302 1260 270C1150 242 1080 196 960 176C860 160 760 158 640 188C520 218 400 246 250 188C200 170 140 168 30 170" />
              <path d="M1590 358C1500 354 1420 342 1320 316C1220 294 1120 258 1040 246C940 232 900 292 760 286C600 280 420 300 300 280C220 268 140 262 30 264" />
              <path d="M1590 386C1500 386 1440 372 1380 372C1300 372 1260 384 1180 384C1000 384 700 384 420 372C320 368 200 350 30 338" />
              <path d="M1590 414C1400 416 1000 416 600 416C400 416 250 408 30 394" />
            </g>
          </Reveal>

          <g className="hc-shake">
            <Part id="floor">
              <path className="c-carbon" d="M318 396H1168L1200 388L1206 396L1190 408H300Z" />
              {/* diffuser, kicking up behind the rear axle */}
              <path className="c-carbon" d="M318 396L300 408L236 404L150 364V352L252 374Z" />
              {/* floor edge fences */}
              <path className="c-carbon-2" d="M1078 396L1094 378H1150L1166 396Z" />
              <path className="c-edge" d="M300 408H1190M318 396H1168" />
              {/* the plank */}
              <path className="c-plank" d="M420 409.5H1100" />
            </Part>

            <Part id="driver">
              {/* helmet, low in the cockpit */}
              <circle className="c-helmet" cx="962" cy="262" r="25" />
              <path className="c-visor" d="M966 248C978 250 986 257 987 266L962 268Z" />
              <path className="c-helmet-line" d="M938 262C946 254 956 250 966 248" />
              {/* halo: the front pillar, and the hoop running back to the airbox */}
              <path className="c-halo" d="M1076 270C1066 240 1018 218 962 214C930 213 902 222 884 236" />
              <path className="c-halo-hi" d="M1073 262C1060 238 1016 219 962 215.5C932 214.5 906 222 890 233" />
            </Part>

            <Part id="power">
              {/* engine cover: from the roll hoop down to the gearbox */}
              <path className="c-body" d="M880 262L870 198C852 176 822 170 790 172C700 180 600 215 520 250C450 280 380 300 330 312L322 342L420 372C470 388 505 395 545 396H880Z" />
              {/* airbox intake */}
              <path className="c-dark" d="M873 190C886 198 886 224 877 234H866C873 222 873 202 866 190Z" />
              {/* T-camera */}
              <path className="c-carbon-2" d="M800 171L811 158H838L844 171Z" />
              {/* shark fin and a panel line */}
              <path className="c-carbon-2" d="M660 196L440 256V262L660 205Z" />
              <path className="c-seam" d="M876 266C770 270 640 296 470 350" />
              {/* exhaust */}
              <ellipse className="c-dark" cx="326" cy="326" rx="6" ry="9" />
              {/* the number */}
              <text className="c-number" x="716" y="282" textAnchor="middle" transform="translate(716 282) skewX(-10) translate(-716 -282)">04</text>
            </Part>

            <Part id="body">
              {/* rear crash structure and wing mount */}
              <path className="c-carbon" d="M322 340L150 350V362L322 374Z" />
              <path className="c-carbon" d="M304 312L252 250L240 222L249 219L264 244L320 304Z" />
              {/* rear wing: endplate, two elements, beam wing, rain light */}
              <path className="c-body" d="M112 200H226C234 200 238 206 238 214V318L206 338H160V290C160 262 140 244 112 236Z" />
              <path className="c-dark" d="M124 210L226 206V214L124 220ZM128 226L224 222V229L128 234Z" />
              <path className="c-carbon-2" d="M170 300L238 296V303L170 308Z" />
              <rect className="c-light" x="144" y="352" width="8" height="12" rx="1.5" />
              {/* the tub and nose */}
              <path className="c-body" d="M1486 370C1440 352 1380 338 1320 324C1270 312 1240 300 1207 290L1090 272L1062 268L1046 286H902L880 262V396H1168L1206 374C1262 374 1380 378 1486 378Z" />
              {/* dark underside of the nose, a carbon lower band, and the number again */}
              <path className="c-carbon-2" d="M1206 374C1262 374 1380 378 1486 378L1480 372C1380 366 1270 362 1206 362Z" />
              <path className="c-carbon-2" d="M880 382H1186L1168 396H880Z" />
              <text className="c-number c-number--nose" x="1330" y="351" textAnchor="middle" transform="rotate(13 1330 351)">04</text>
              <path className="c-seam" d="M1207 291V372" />
              {/* antennae and a mirror */}
              <path className="c-fine" d="M1296 316V300M1272 309V297" />
              <path className="c-fine" d="M1036 268L1040 254" />
              <rect className="c-body-flat" x="1024" y="243" width="30" height="12" rx="3.5" />
              {/* sidepod: inlet high at the front, a deep undercut, a top that ramps down ahead of the rear wheel */}
              <path className="c-pod" d="M1010 298L1019 350C990 360 950 372 900 380C820 388 700 392 560 394C600 372 640 340 690 318C740 300 800 293 860 292L960 291Z" />
              <path className="c-dark" d="M1010 300L1018 348L992 352C984 334 984 316 992 301Z" />
              <path className="c-seam" d="M992 320C900 318 800 322 706 334" />
              {/* suspension: what shows either side of the wheels */}
              <path className="c-arm" d="M1207 300L1126 292M1207 300L1286 302M1207 356L1118 372M1207 356L1290 366M291 300L372 296M291 300L210 306M291 356L384 372M291 356L200 362" />
            </Part>

            <Part id="wing">
              {/* pylons from the nose down to the wing */}
              <path className="c-carbon" d="M1438 372H1452L1458 394H1432Z" />
              {/* mainplane and three flaps */}
              <path className="c-carbon" d="M1504 398C1470 392 1420 392 1390 396V403L1504 405Z" />
              <path className="c-body-flat" d="M1500 390C1462 380 1430 377 1396 378L1394 386C1430 385 1462 388 1498 397Z" />
              <path className="c-body-flat" d="M1476 376C1448 366 1424 363 1398 363L1396 371C1424 371 1448 374 1474 383Z" />
              <path className="c-body-flat" d="M1452 362C1434 354 1418 351 1400 350L1398 358C1418 359 1434 362 1450 369Z" />
              {/* endplate, nearest the eye */}
              <path className="c-body" d="M1390 372L1470 382C1492 386 1505 395 1507 405H1388Z" />
              <path className="c-seam" d="M1392 392H1500" />
            </Part>

            {/* a band of light that crosses the bodywork now and then */}
            <g clipPath="url(#hc-skin)"><g className="hc-sheen"><rect x="-260" y="150" width="260" height="260" fill="url(#hc-sheen)" transform="skewX(-24)" /></g></g>

            <Part id="wheels">
              <Wheel x={AXLE.rear} />
              <Wheel x={AXLE.front} front />
            </Part>
          </g>

          {/* Back end, picked: what sits under the engine cover */}
          <Reveal id="power">
            <g className="r-engine">
              {/* radiator, in the sidepod */}
              <path className="r-solid" pathLength={1} d="M900 302H984L962 374H878Z" />
              <path className="r-thin" pathLength={1} d="M912 302L890 374M930 302L908 374M948 302L926 374M966 302L944 374" />
              {/* gearbox, tapering back to the rear axle */}
              <path className="r-solid" pathLength={1} d="M566 300L352 320V372L566 386Z" />
              <path className="r-thin" pathLength={1} d="M500 306V380M430 313V376" />
              {/* the V6: block, heads and plenum */}
              <path className="r-solid" pathLength={1} d="M600 278H790L802 302V374H588V302Z" />
              <path className="r-solid" pathLength={1} d="M628 242H762L774 278H616Z" />
              <path className="r-thin" pathLength={1} d="M640 290V362M690 290V362M740 290V362" />
              <circle className="r-solid" pathLength={1} cx="612" cy="350" r="13" />
              {/* intake duct from the airbox */}
              <path className="r-line" pathLength={1} d="M868 212C846 224 806 228 770 242" />
              {/* turbo, its manifold, and the exhaust running out the back */}
              <path className="r-line" pathLength={1} d="M640 242C620 226 590 240 566 268M690 242C650 214 600 232 560 266M740 242C690 200 610 222 556 264" />
              <circle className="r-solid" pathLength={1} cx="548" cy="288" r="24" />
              <circle className="r-thin" pathLength={1} cx="548" cy="288" r="9" />
              <path className="r-pipe" pathLength={1} d="M528 276C490 268 450 286 410 304L336 324" />
            </g>
          </Reveal>

          {/* Architecture, picked: the points everything bolts to */}
          <Reveal id="floor">
            <g className="r-bolts">
              <path d="M420 398V430M600 398V430M780 398V430M960 398V430M1120 398V430" />
              <circle cx="420" cy="396" r="5" /><circle cx="600" cy="396" r="5" /><circle cx="780" cy="396" r="5" /><circle cx="960" cy="396" r="5" /><circle cx="1120" cy="396" r="5" />
            </g>
          </Reveal>

          {/* AI, picked: what the driver hears, and where the driver is looking */}
          <Reveal id="driver">
            <g className="r-signal">
              <path d="M939.5 161A26 26 0 0 1 984.5 161" />
              <path d="M923.9 152A44 44 0 0 1 1000.1 152" />
              <path d="M908.3 143A62 62 0 0 1 1015.7 143" />
            </g>
            <path className="r-sight" pathLength={1} d="M992 200L1540 384" />
            <g className="r-reticle"><circle cx="1552" cy="388" r="12" /><path d="M1552 370V378M1552 398V406M1534 388H1542M1562 388H1570" /></g>
          </Reveal>

          {/* where the pointer picks each part: these never move, so a lifted part cannot slip out from under it */}
          <g className="hc-hits">
            <path data-hit="floor" d="M300 386H1200V414H300Z" />
            {/* Design is picked at the rear wing only. The sidepod belongs to Back end (the radiator is under it); the nose belongs to Front end. */}
            <path data-hit="body" d="M104 194H244V346H104Z" />
            <path data-hit="power" d="M330 310L520 248L790 168L876 194L882 290H1022V386H560L420 374L322 344Z" />
            <path data-hit="driver" d="M882 196H1086V288H882Z" />
            <path data-hit="wing" d="M1380 336H1514V412H1380ZM1090 270L1500 364V388H1090Z" />
            {/* Launch is picked at the front wheel only; the rear wheel picks nothing, not even the parts behind it */}
            <circle className="hc-dead" cx={AXLE.rear} cy={AXLE.y} r="96" />
            <circle data-hit="wheels" cx={AXLE.front} cy={AXLE.y} r="96" />
            <path data-hit="wheels" d="M1530 392H1592V426H1530Z" />
          </g>
        </g>
      </g>

      {/* Launch, picked: five lights, then lights out */}
      <Reveal id="wheels">
        <g className="r-gantry">
          <rect x="624" y="98" width="352" height="62" rx="12" />
          {[0, 1, 2, 3, 4].map(i => <circle key={i} className="r-lamp" data-i={i} cx={680 + i * 60} cy="129" r="17" />)}
        </g>
      </Reveal>

      {/* the line from each label up to its part, drawn when that part is picked */}
      {PARTS.map(p => (
        <g className="hc-lead" data-for={p.id} key={p.id}>
          <path pathLength={1} d={`M${p.at[0]} 446V${p.at[1]}`} />
          <circle cx={p.at[0]} cy={p.at[1]} r="4" />
        </g>
      ))}
    </svg>
  );
}
