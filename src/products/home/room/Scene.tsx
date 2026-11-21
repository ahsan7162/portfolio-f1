// The room, drawn once. Nothing here moves by itself: day.ts drives every part marked data-r (a part)
// or data-j (a joint of the character, rotated about the point in data-at).

/** Code on the monitor: [indent, width]. A width of 0 is a blank line. */
export const CODE: [number, number][] = [
  [0, 40], [1, 54], [1, 30], [2, 46], [2, 24], [1, 16], [0, 8], [0, 0], [0, 36], [1, 50], [2, 38], [2, 20],
  [3, 44], [2, 12], [1, 28], [0, 8], [0, 0], [0, 30], [1, 42], [1, 56], [2, 34], [1, 18], [0, 8], [0, 0],
  [0, 44], [1, 26], [2, 48], [2, 30], [1, 14], [1, 40], [0, 8], [0, 0], [0, 34], [1, 52], [1, 22], [0, 8],
];
export const CODE_STEP = 5.6, CODE_TOP = 311;
const LINES = CODE.flatMap(([indent, w], i) => (w ? [{ indent, w: w * 0.8, y: CODE_TOP + i * CODE_STEP }] : []));

/** The two agent panes beside the code. A line starting ">" is what I (or the cat) typed. */
export const CLAUDE = ['> add retries to sync', '● reading sync.ts', '● editing sync.ts', '✓ +12 −3, tests in', '> ship it', '✓ build passed'];
export const CODEX = ['> fjjjj;;;;gggggf', '● looks like a cat', "> review claude's diff", '● reviewing 2 files', '✓ approved, 1 nit'];
const said = (line: string) => (line.startsWith('●') ? 'ink-dim' : 'ink');

const STARS = [[148, 170], [178, 200], [205, 166], [290, 176], [312, 214], [160, 232], [250, 206], [226, 244], [318, 168]];
const LIT = [[150, 318], [158, 306], [178, 326], [196, 300], [214, 318], [236, 310], [258, 326], [266, 302], [292, 316], [310, 306], [322, 324]];

/** The clock face's twelve ticks. */
const TICKS = Array.from({ length: 12 }, (_, i) => {
  const a = (i * Math.PI) / 6, r1 = i % 3 ? 21.6 : 19.6;
  return `M${(470 + r1 * Math.sin(a)).toFixed(2)} ${(214 - r1 * Math.cos(a)).toFixed(2)} L${(470 + 23.4 * Math.sin(a)).toFixed(2)} ${(214 - 23.4 * Math.cos(a)).toFixed(2)}`;
}).join(' ');

/** A fan's six blades, for the PC (rotated as one by day.ts). */
function blades(cx: number, cy: number, r: number) {
  const at = (rad: number, a: number) => `${(cx + rad * Math.cos(a)).toFixed(2)} ${(cy + rad * Math.sin(a)).toFixed(2)}`;
  return Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI) / 3;
    return `M${at(3.6, a - 0.3)} Q${at(r * 0.72, a - 0.05)} ${at(r, a + 0.35)} Q${at(r * 0.5, a + 0.5)} ${at(3.6, a + 0.42)} Z`;
  }).join(' ');
}

// The parts of me, each drawn about its joint (see data-at in Scene).
const thigh = (c: string) => (
  <>
    <g><rect className={c} x="-10" y="-10" width="20" height="74" rx="10" /><rect className="f-tube" x="-10" y="-10" width="20" height="74" rx="10" /><path className="f-d" d="M3.5 -2 V58" /></g>
  </>
);
const shin = (c: string) => (
  <>
    <g><rect className={c} x="-9" y="-9" width="18" height="69" rx="9" /><rect className="f-tube" x="-9" y="-9" width="18" height="69" rx="9" /><path className="f-d" d="M-8.6 52 H8.6" /></g>
  </>
);
const shoe = (c: string) => (
  <>
    <path className={c} d="M-10 -7 Q-10 -9 -8 -9 H3 Q7 -9 9 -6 L12 -3 Q22 -2 27 2 Q29.5 4 29 7 V8 H-10 Z" />
    <path className="cl2" d="M-11 6.6 H29.6 Q30 10.6 27 10.6 H-9 Q-11 10.6 -11 6.6 Z" />
    <path className="f-d" d="M6 -6.6 L9 -3.8 M9.6 -7.2 L12.6 -4.2" />
    <path className="f-tube" d="M-10 -7 Q-10 -9 -8 -9 H3 Q7 -9 9 -6 L12 -3 Q22 -2 27 2 Q29.5 4 29 7 V8 H-10 Z" />
  </>
);
const upperArm = (c: string) => (
  <>
    <g><rect className={c} x="-7.5" y="-7.5" width="15" height="53.5" rx="7.5" /><rect className="f-tube" x="-7.5" y="-7.5" width="15" height="53.5" rx="7.5" /><path className="f-d" d="M-2.5 41 Q0 43 3 41" /></g>
  </>
);
const foreArm = (c: string) => (
  <>
    <g><rect className={c} x="-7" y="-7" width="14" height="49" rx="7" /><rect className="f-tube" x="-7" y="-7" width="14" height="49" rx="7" /><rect className="f-s" x="-7" y="32" width="14" height="6" rx="1" /></g>
  </>
);
const hand = (c: string) => (
  <>
    <path className={c} d="M-5 -5.5 C-1 -8 6 -8 9.5 -5.5 C12.5 -3.5 12.5 3 9.5 5 C6 7.5 -1 7.5 -5 5 C-7.5 3 -7.5 -3.5 -5 -5.5 Z" />
    <path className={c} d="M1 -6 C3 -11 9 -12 10.5 -8.5 C10 -6.5 7 -5 4 -4 Z" />
    <path className="f-tube" d="M-5 -5.5 C-1 -8 6 -8 9.5 -5.5 C12.5 -3.5 12.5 3 9.5 5 C6 7.5 -1 7.5 -5 5 C-7.5 3 -7.5 -3.5 -5 -5.5 Z" />
    <path className="f-d" d="M7.4 -1.6 H11 M7.4 2 H10.6" />
  </>
);
const torso = () => (
  <>
    <g>
      <path className="cl" d="M-19 8 C-23 -30 -24 -70 -18 -92 C-14 -106 -2 -112 8 -111 C20 -110 26 -100 25 -86 L22 8 Z" />
      <path className="f-tube" d="M-19 8 C-23 -30 -24 -70 -18 -92 C-14 -106 -2 -112 8 -111 C20 -110 26 -100 25 -86 L22 8 Z" />
      <path className="f-s" d="M-19.4 0 H22.2 L22 8 H-19 Z" />
      <path className="f-d" d="M3 -42 Q12 -40 22.6 -42 M3 -42 Q1 -26 5 -12" />
      <path className="cl2" d="M-19 -86 C-28 -90 -30 -106 -21 -112 C-13 -117 -3 -114 3 -105 L1 -97 C-5 -102 -12 -99 -14 -91 Z" />
      <path className="f-s" d="M-16 -94 C-22 -98 -22 -106 -17 -109 C-11 -112 -4 -109 -1 -104 C-6 -104 -12 -100 -16 -94 Z" />
      <path className="f-d" d="M-24 -96 C-22 -91 -19 -88 -15 -87" />
      <path className="det" d="M13 -100 L14 -80 M17 -101 L18 -84" style={{ stroke: 'var(--cl3)' }} />
    </g>
  </>
);
const head = () => (
  <>
    <rect className="sk" x="-5" y="-20" width="12" height="22" />
    <path className="f-s" d="M-5 -18 H7 V-9 C3 -11 -1 -13 -5 -13 Z" />
    <circle className="sk" cx="5" cy="-38" r="23" />
    <circle className="f-tube" cx="5" cy="-38" r="23" />
    <path className="sk" d="M-9 -32 C-7 -18 4 -11 16 -11 C22 -11 26 -15 27 -23 L28 -32 Z" />
    <path className="sk" d="M26 -46 C29.5 -43 33 -37 33 -33 C32 -30.8 29 -30.4 26 -31 Z" />
    <path className="hr" d="M3.5 -43 L6.5 -43 C7 -34 9.8 -28.6 15 -27.2 C20 -26.4 25 -27.4 30.4 -28.6 L31.2 -22 C31 -12 23 -4.5 13 -4.5 C3.5 -4.5 -2.6 -12 -3 -24 C-3.2 -31 0 -37 3.5 -43 Z" />
    <path className="hr" d="M17 -29.6 C22 -32.8 28 -32.8 32.6 -28.6 L31.6 -25.6 C26 -27.6 21 -27.6 18 -25.6 Z" />
    <path className="sk2" d="M21 -25.2 C24 -24.2 27 -24.2 30 -25.4 L29.4 -23.4 C27 -22.4 24 -22.6 21.6 -23.8 Z" />
    <path className="f-bd" d="M6 -20 l1.6 2.6 M11 -14 l1.2 2.8 M17 -11.5 l0.8 3 M23 -14 l0.4 3 M2 -28 l1.4 2.4 M26.5 -19 l-0.4 2.6" />
    <ellipse className="sk2" cx="-1" cy="-37" rx="4.5" ry="6.5" />
    <path className="f-d" d="M-1.6 -41 Q1.4 -38 -0.6 -33.6" />
    <path className="hr" d="M-17.5 -34 C-22 -55 -8 -67 8 -66 C21 -66 30 -59 31 -50 L27.5 -50.5 L29 -46.5 C23 -48.5 17 -48.5 12 -46.5 C8.5 -45 5 -44 1.5 -44.5 L-1.5 -39 L-5 -33 C-10 -31 -15 -31 -17.5 -34 Z" />
    <path className="f-sheen" d="M-9 -55 C-2 -62.5 11 -63.5 21 -59.5" />
    <path className="brow" d="M14 -48 C18 -50 23 -50 27 -48" />
    <ellipse data-r="eye" className="eye" cx="21" cy="-40.5" rx="1.9" ry="1.9" />
    <rect className="ln" x="14" y="-45" width="13.5" height="9.5" rx="3" />
    <path className="frl" d="M14 -41 L-1 -39.5 M27.5 -41 L30 -41" />
    <path className="glint" d="M17 -43.5 L19.5 -41" />
    <path className="f-rim" d="M26 -58 C29.6 -54 31.4 -50 31 -46.5 M33.2 -34 C33 -31.6 31.8 -30 31 -29.6" />
    <g data-r="headset" opacity="0">
      <path className="hand" d="M-14 -52 C-8 -72 18 -72 22 -58" style={{ stroke: 'var(--o)', strokeWidth: 4 }} />
      <ellipse className="o" cx="-1" cy="-37" rx="7" ry="9" />
      <path className="hand" d="M2 -30 C8 -20 16 -17 24 -19" style={{ stroke: 'var(--o)', strokeWidth: 2 }} />
    </g>
  </>
);

export function Scene() {
  return (
    <svg className="rm-svg" viewBox="0 120 1600 460" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="rm-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="sky1" /><stop offset="1" className="sky2" /></linearGradient>
        <linearGradient id="rm-dawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0.3" className="gl" stopOpacity="0" /><stop offset="1" className="gl" stopOpacity="0.55" /></linearGradient>
        <radialGradient id="rm-glow"><stop offset="0" className="gl" stopOpacity="0.32" /><stop offset="0.45" className="gl" stopOpacity="0.1" /><stop offset="1" className="gl" stopOpacity="0" /></radialGradient>
        <radialGradient id="rm-warm"><stop offset="0" className="gl" stopOpacity="0.26" /><stop offset="1" className="gl" stopOpacity="0" /></radialGradient>
        <linearGradient id="rm-beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="gl" stopOpacity="0.2" /><stop offset="1" className="gl" stopOpacity="0" /></linearGradient>
        <radialGradient id="rm-ao"><stop offset="0" stopColor="#000" stopOpacity="0.5" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
        <linearGradient id="rm-wallao" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#000" stopOpacity="0" /><stop offset="0.55" stopColor="#000" stopOpacity="0.06" /><stop offset="1" stopColor="#000" stopOpacity="0.3" /></linearGradient>
        <linearGradient id="rm-tube" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#000" stopOpacity="0.34" /><stop offset="0.5" stopColor="#000" stopOpacity="0" /><stop offset="0.7" stopColor="#FFF" stopOpacity="0" /><stop className="rim-s" offset="1" stopColor="#FFF" /></linearGradient>
        <clipPath id="rm-win"><rect x="136" y="156" width="198" height="198" /></clipPath>
        <clipPath id="rm-mon"><rect x="1008" y="298" width="140" height="88" rx="2" /></clipPath>
        <clipPath id="rm-ed"><rect x="1008" y="305" width="75" height="81" /></clipPath>
        <clipPath id="rm-tv"><rect x="1474" y="300" width="106" height="64" rx="2" /></clipPath>
      </defs>

      {/* the box: shows by day */}
      <rect className="wall" x="24" y="132" width="1552" height="428" rx="6" />
      <rect className="base" x="24" y="560" width="1552" height="14" rx="3" />
      <rect className="f-wallao" x="24" y="450" width="1552" height="99" />
      <rect className="o2" x="24" y="549" width="1552" height="11" />
      <path className="f-h" d="M24 549.6 H1576" />
      <line className="floor" x1="0" y1="560" x2="1600" y2="560" />

      {/* window: the clock of the room */}
      <rect className="o2" x="126" y="146" width="218" height="218" rx="4" />
      <path className="f-h" d="M130 146.8 H340" />
      <rect x="136" y="156" width="198" height="198" fill="url(#rm-sky)" />
      <g clipPath="url(#rm-win)">
        <rect data-r="dawn" x="136" y="156" width="198" height="198" fill="url(#rm-dawn)" opacity="0" />
        <g data-r="stars">{STARS.map(([x, y]) => <circle key={`${x}-${y}`} className="star" cx={x} cy={y} r="1.4" />)}</g>
        <g data-r="sun"><circle className="sun" r="30" opacity="0.18" /><circle className="sun" r="17" /></g>
        <g data-r="moon"><circle r="36" fill="url(#rm-warm)" /><circle className="moon" r="17" /><circle className="o4" cx="-6" cy="-5" r="3" opacity="0.25" /><circle className="o4" cx="6" cy="7" r="2.2" opacity="0.25" /><circle className="o4" cx="5" cy="-8" r="1.4" opacity="0.2" /></g>
        <path className="city city-far" d="M136 354 V302 H144 V290 H156 V298 H166 V280 H174 V274 H180 V280 H190 V296 H202 V284 H214 V292 H226 V276 H236 V294 H246 V286 H258 V272 H266 V286 H280 V292 H294 V280 H304 V296 H316 V286 H334 V354 Z" />
        <path className="city" d="M136 354 V312 H152 V296 H170 V318 H186 V288 L195 280 L204 288 V308 H220 V296 H238 V314 H252 V290 H260 V283 H264 V290 H272 V312 H288 V298 H306 V318 H318 V302 H334 V354 Z" />
        <rect className="city" x="155" y="283" width="12" height="9" rx="2" />
        <path className="det" d="M157.5 296 L158.5 291 M164.5 296 L163.5 291 M195 280 V271 M262 283 V275" />
        <g data-r="lit">{LIT.map(([x, y]) => <rect key={`${x}-${y}`} className="lit" x={x} y={y} width="3" height="4" />)}</g>
        <path className="f-s" d="M136 156 H334 V162 H142 V354 H136 Z" />
        <path className="f-glass" d="M136 156 H216 L152 354 H136 Z" />
      </g>
      <rect className="o2" x="233" y="156" width="4" height="198" />
      <rect className="o2" x="136" y="253" width="198" height="4" />
      <rect className="o3" x="116" y="362" width="238" height="9" rx="2" />
      <path className="f-h" d="M118 362.7 H352" /><path className="f-s" d="M118 368.6 H352 V369 Q352 371 350 371 H120 Q118 371 118 369 Z" />
      <path className="cl3" d="M344 140 C356 190 340 240 354 290 C362 320 350 350 360 382 L378 382 C370 330 384 270 372 210 C368 180 378 160 370 140 Z" />
      <path className="f-sl" d="M360 146 C367 196 355 246 366 296 C371 326 363 352 369 378" style={{ strokeWidth: 4 }} />
      <path className="f-h" d="M346 144 C357 192 342 240 356 290" />
      <path className="cl3" d="M126 140 C114 190 130 240 116 290 C108 320 120 350 110 382 L92 382 C100 330 86 270 98 210 C102 180 92 160 100 140 Z" />
      <path className="f-sl" d="M110 146 C103 196 115 246 104 296 C99 326 107 352 101 378" style={{ strokeWidth: 4 }} />
      <rect className="o3" x="88" y="136" width="304" height="5" rx="2.5" />
      <circle className="o3" cx="88" cy="138.5" r="4.6" /><circle className="o3" cx="392" cy="138.5" r="4.6" />
      <path className="f-h" d="M92 136.7 H388" />
      <path data-r="beam" d="M146 366 L334 366 L246 560 L40 560 Z" fill="url(#rm-beam)" />

      {/* wall clock */}
      <circle className="f-s" cx="472.5" cy="217.5" r="30" />
      <circle className="o2" cx="470" cy="214" r="30" /><circle className="f-tube" cx="470" cy="214" r="30" />
      <circle className="o4" cx="470" cy="214" r="25" />
      <path className="f-d" d={TICKS} style={{ strokeWidth: 1.4 }} />
      <line data-r="hourHand" className="hand" x1="470" y1="214" x2="470" y2="200" />
      <line data-r="minHand" className="hand" x1="470" y1="214" x2="470" y2="194" style={{ strokeWidth: 1.8 }} />
      <circle className="o" cx="470" cy="214" r="2.5" />
      <path className="f-glass" d="M447 208 A24 24 0 0 1 486 196 A30 30 0 0 0 447 208 Z" />

      {/* shelf over the desk */}
      <path className="o3" d="M962 244 V258 L976 244 Z M1140 244 V258 L1126 244 Z" />
      <rect className="wd" x="944" y="236" width="214" height="8" rx="2" />
      <path className="f-h" d="M946 236.7 H1156" /><path className="f-s" d="M944 241.5 H1158 V242 Q1158 244 1156 244 H946 Q944 244 944 242 Z" />
      <path className="o2" d="M953 218 H975 L972.5 236 H955.5 Z" /><path className="f-s" d="M967 218 H975 L972.5 236 H967 Z" /><rect className="o3" x="951" y="215" width="26" height="4" rx="1.5" />
      <path className="leaf" d="M964 216 C952 204 954 192 962 186 C966 198 968 206 964 216 Z M966 216 C978 206 984 196 982 186 C972 192 968 204 966 216 Z" />
      <path className="leaf" d="M956 230 C946 248 944 270 950 292 C956 272 958 252 958 232 Z M972 230 C978 250 978 266 974 280 C968 264 968 248 970 232 Z" />
      <rect className="o3" x="994" y="200" width="10" height="36" rx="1" /><rect className="o4" x="1005" y="206" width="9" height="30" rx="1" /><rect className="o2" x="1015" y="196" width="11" height="40" rx="1" />
      <path className="f-d" d="M995.5 206 H1002.5 M995.5 228 H1002.5 M1006.5 212 H1012.5 M1016.5 202 H1024.5 M1016.5 230 H1024.5" />
      <rect className="o3" x="1027" y="210" width="22" height="8" rx="1" transform="rotate(-24 1027 218)" />
      <path className="o4" d="M1066 236 L1068 228 L1084 226 L1090 220 L1100 220 L1104 226 L1130 228 L1134 236 Z" />
      <circle className="o" cx="1074" cy="236" r="5" /><circle className="o" cx="1124" cy="236" r="5" />

      {/* poster: the hero car */}
      <rect className="f-s" x="1293" y="188" width="150" height="100" rx="3" />
      <rect className="o2" x="1290" y="184" width="150" height="100" rx="3" /><path className="f-h" d="M1293 184.7 H1437" />
      <rect className="cl3" x="1296" y="190" width="138" height="88" />
      <rect className="o" x="1302" y="196" width="126" height="76" />
      <path className="f-d" d="M1306 240 H1328 M1304 248 H1320 M1310 232 H1326" />
      <path className="o4" d="M1310 254 L1314 246 L1340 244 L1350 232 L1366 232 L1372 242 L1414 246 L1420 254 Z" />
      <path className="f-s" d="M1310 254 H1420 L1418 251 H1312 Z" />
      <circle className="o2" cx="1324" cy="255" r="7" /><circle className="o2" cx="1408" cy="255" r="7" />
      <circle className="o4" cx="1324" cy="255" r="2.4" /><circle className="o4" cx="1408" cy="255" r="2.4" />
      <rect className="o3" x="1306" y="263" width="30" height="2" rx="1" />
      <path className="f-glass" d="M1302 196 H1360 L1330 272 H1302 Z" />

      {/* pendant over the table */}
      <line className="wire" x1="700" y1="120" x2="700" y2="256" />
      <rect className="o3" x="695" y="254" width="10" height="7" rx="2" />
      <path className="o3" d="M668 284 C669 270 683 260 700 260 C717 260 731 270 732 284 Z" />
      <path className="f-tube" d="M668 284 C669 270 683 260 700 260 C717 260 731 270 732 284 Z" />
      <path className="f-h" d="M681 266 C689 262 696 261 704 261" />
      <ellipse className="o" cx="700" cy="284" rx="32" ry="2.6" />
      <circle data-r="bulb" className="sun" cx="700" cy="288" r="5" opacity="0" />
      <circle className="o4" cx="700" cy="288" r="5" opacity="0.5" />

      {/* floor lamp behind the couch */}
      <path className="wire" d="M1238 552 L1238 262 C1238 222 1290 206 1322 238" style={{ strokeWidth: 3.4 }} />
      <path className="o3" d="M1302 260 C1303 246 1312 238 1323 238 C1334 238 1343 246 1344 260 Z" />
      <path className="f-tube" d="M1302 260 C1303 246 1312 238 1323 238 C1334 238 1343 246 1344 260 Z" />
      <ellipse className="o" cx="1323" cy="260" rx="21" ry="2" />
      <circle data-r="floorBulb" className="sun" cx="1323" cy="261" r="5" opacity="0" />
      <ellipse className="f-ao" cx="1238" cy="560" rx="24" ry="3" />
      <path className="o2" d="M1222 560 Q1222 553 1238 552.5 Q1254 553 1254 560 Z" /><path className="f-h" d="M1228 555 Q1238 553 1248 555" />

      {/* bed */}
      <ellipse className="f-ao" cx="250" cy="561" rx="196" ry="4.5" />
      <rect className="wd" x="58" y="404" width="20" height="156" rx="5" /><rect className="f-tube" x="58" y="404" width="20" height="156" rx="5" />
      <path className="f-h" d="M62 404.8 H74" /><path className="f-d" d="M64.5 420 V488" />
      <rect className="wd" x="424" y="462" width="16" height="98" rx="4" /><rect className="f-tube" x="424" y="462" width="16" height="98" rx="4" /><path className="f-h" d="M427 462.8 H437" />
      <rect className="wd" x="84" y="516" width="10" height="44" /><rect className="wd" x="408" y="516" width="10" height="44" />
      <path className="f-s" d="M89 516 H94 V560 H89 Z M413 516 H418 V560 H413 Z" />
      <rect className="wd" x="70" y="498" width="362" height="18" rx="3" />
      <path className="f-s" d="M70 511 H432 V513 Q432 516 429 516 H73 Q70 516 70 513 Z" /><path className="f-h" d="M73 498.7 H429" />
      <rect className="o3" x="74" y="468" width="352" height="32" rx="9" />
      <path className="f-s" d="M76 492 H424 Q426 500 417 500 H83 Q74 500 76 492 Z" />
      <path className="f-d" d="M84 474 H416" /><path className="f-h" d="M84 468.7 H416" />
      <rect className="o4" x="86" y="446" width="76" height="26" rx="13" /><rect className="f-tube" x="86" y="446" width="76" height="26" rx="13" />
      <path className="f-h" d="M98 446.8 H150" /><path className="f-d" d="M108 451 Q114 458 110 467" />
      <g data-r="blanketOff" opacity="0">
        <path className="cl3" d="M168 470 C214 452 262 476 316 458 C356 446 396 462 428 466 L430 500 L168 500 Z" />
        <path className="f-s" d="M168 488 C230 482 320 492 430 485 L430 500 L168 500 Z" />
        <path className="f-h" d="M176 466 C214 452 262 474 316 457 C356 445 396 460 426 464" />
        <path className="det" d="M210 470 C240 476 270 468 300 474 M340 466 C362 470 380 466 400 470" />
      </g>

      {/* bedside: alarm clock and a lamp */}
      <ellipse className="f-ao" cx="489" cy="560" rx="38" ry="3" />
      <rect className="wd" x="460" y="556" width="6" height="4" /><rect className="wd" x="512" y="556" width="6" height="4" />
      <rect className="wd" x="456" y="478" width="66" height="79" rx="3" />
      <path className="f-h" d="M459 478.7 H519" /><path className="f-s" d="M456 552 H522 V554 Q522 557 519 557 H459 Q456 557 456 554 Z" />
      <path className="f-d" d="M461 506 H517 M461 532 H517" />
      <path className="det" d="M484 492 H494 M484 519 H494 M484 545 H494" style={{ strokeWidth: 2 }} />
      <g data-r="alarm">
        <rect className="o" x="464" y="456" width="40" height="22" rx="6" />
        <path className="f-h" d="M469 456.7 H499" />
        <text data-r="digits" className="txt" x="484" y="471" fontSize="10.5" textAnchor="middle">01:30</text>
        <path data-r="ring" className="ink-line" d="M460 452 L454 446 M508 452 L514 446 M484 448 L484 440" opacity="0" />
      </g>
      <path className="o3" d="M503 478 Q503 470 512 470 Q521 470 521 478 Z" />
      <path className="o3" d="M512 470 L512 448" style={{ stroke: 'var(--wire)', strokeWidth: 2 }} />
      <path className="o4" d="M499 448 L525 448 L520 432 L504 432 Z" /><path className="f-tube" d="M499 448 L525 448 L520 432 L504 432 Z" />
      <ellipse className="o" cx="512" cy="448" rx="13" ry="1.4" />

      {/* dining */}
      <ellipse className="f-ao" cx="612" cy="560" rx="40" ry="3" /><ellipse className="f-ao" cx="807" cy="560" rx="40" ry="3" /><ellipse className="f-ao" cx="711" cy="560" rx="36" ry="3" />
      <rect className="wd" x="580" y="404" width="13" height="22" rx="4" /><path className="wd" d="M582.5 420 H590.5 V560 H583.5 Z" />
      <rect className="f-tube" x="580" y="404" width="13" height="156" rx="4" />
      <rect className="wd" x="588" y="532" width="48" height="4" rx="2" />
      <path className="wd" d="M634 508 H642 L641 560 H635 Z" /><path className="f-s" d="M638.5 508 H642 L641 560 H638.5 Z" />
      <rect className="wd" x="582" y="498" width="62" height="10" rx="3" /><path className="f-s" d="M582 505 H644 V505.5 Q644 508 641 508 H585 Q582 508 582 505.5 Z" />
      <rect className="o3" x="587" y="493" width="54" height="6" rx="3" /><path className="f-h" d="M590 493.6 H638" />
      <rect className="wd" x="826" y="404" width="13" height="22" rx="4" /><path className="wd" d="M828.5 420 H836.5 V560 H829.5 Z" />
      <rect className="f-tube" x="826" y="404" width="13" height="156" rx="4" />
      <rect className="wd" x="784" y="532" width="48" height="4" rx="2" />
      <path className="wd" d="M778 508 H786 L785 560 H779 Z" /><path className="f-s" d="M782.5 508 H786 L785 560 H782.5 Z" />
      <rect className="wd" x="776" y="498" width="61" height="10" rx="3" /><path className="f-s" d="M776 505 H837 V505.5 Q837 508 834 508 H779 Q776 508 776 505.5 Z" />
      <rect className="o3" x="779" y="493" width="54" height="6" rx="3" /><path className="f-h" d="M782 493.6 H830" />
      <path className="wd" d="M707 439 H715 L717 548 H705 Z" /><path className="f-tube" d="M707 439 H715 L717 548 H705 Z" />
      <path className="wd" d="M678 560 Q680 548 711 547 Q742 548 744 560 Z" /><path className="f-h" d="M690 551 Q711 548 732 551" />
      <rect className="wd" x="650" y="428" width="122" height="11" rx="3" />
      <path className="f-s" d="M650 435.6 H772 V436 Q772 439 769 439 H653 Q650 439 650 436 Z" /><path className="f-h" d="M653 428.7 H769" />
      {/* a glass of water */}
      <path className="glassb" d="M749 428 L751 400 H767 L769 428 Z" />
      <path className="water" d="M749.8 427.4 L751.2 410 H766.8 L768.2 427.4 Z" />
      <path className="f-h" d="M753.6 403 L752.6 424" />
      {/* biryani */}
      <g data-r="rice">
        <path className="sk" d="M686 424 Q690 404 712 401 Q734 404 738 424 Z" />
        <path className="f-s" d="M712 401 Q734 404 738 424 H718 Q722 412 712 401 Z" />
        <path className="wd" d="M716 405 C722 399 732 402 731 410 C730 415 723 416 719 413 Z" /><circle className="cl2" cx="714.6" cy="404" r="2" />
        <path className="leaf" d="M698 406 C701 401 707 401 708 405 C705 407 701 407 698 406 Z" />
        <circle className="o4" cx="700" cy="416" r="2" /><circle className="cl" cx="707" cy="412" r="1.6" /><circle className="o4" cx="726" cy="419" r="2" /><circle className="cl3" cx="709" cy="420" r="1.8" /><circle className="o4" cx="694" cy="420" r="1.5" /><circle className="cl" cx="719" cy="420" r="1.4" />
        <path className="f-d" d="M693 416 l2 -1 M722 417 l2 1 M703 410 l1.6 1" />
      </g>
      <path className="cl2" d="M676 424 H748 Q747 427 742 430 H682 Q677 427 676 424 Z" />
      <path className="f-s" d="M680 428 H744 L742 430 H682 Z" /><path className="f-h" d="M678 424.6 H746" />
      <g data-r="steamA"><path className="steam" d="M700 398 C696 390 706 386 702 378 M714 396 C710 388 720 384 716 374 M726 398 C722 392 730 388 727 382" /></g>

      {/* desk chair */}
      <ellipse className="f-ao" cx="892" cy="560" rx="48" ry="5" />
      <path className="o" d="M850 384 C846 364 852 352 866 352 C879 352 885 361 884 377 L880 468 C879 482 873 491 862 492 L857 492 C853 462 852 420 850 384 Z" />
      <path className="f-tube" d="M850 384 C846 364 852 352 866 352 C879 352 885 361 884 377 L880 468 C879 482 873 491 862 492 L857 492 C853 462 852 420 850 384 Z" />
      <path className="f-h" d="M856 361 C859 355 872 354 879 360" />
      <path className="f-d" d="M858 418 C864 422 874 422 880 418" />
      <rect className="o2" x="886" y="505" width="12" height="22" rx="2" /><path className="f-s" d="M892 505 H898 V525 Q898 527 896 527 H892 Z" />
      <rect className="o3" x="889" y="526" width="6" height="18" />
      <path className="o" d="M851 499 Q849 492 858 492 H926 Q935 492 935 499 Q935 506 926 506 H860 Q851 506 851 499 Z" />
      <path className="f-h" d="M858 492.8 H926" />
      <path className="f-s" d="M853 503 Q856 506 860 506 H926 Q932 506 934 502 Z" />
      <path className="o2" d="M854 548 Q892 538 930 548 V552 H854 Z" /><path className="f-h" d="M860 545.4 Q892 538.6 924 545.4" />
      {[860, 892, 924].map(x => <g key={x}><circle className="o3" cx={x} cy="555" r="5" /><circle className="f-s" cx={x} cy="556.4" r="3.4" /></g>)}

      {/* desk, seen from its side */}
      <ellipse className="f-ao" cx="939" cy="560" rx="15" ry="3" /><ellipse className="f-ao" cx="1101" cy="560" rx="15" ry="3" />
      <path className="o3" d="M934 441 H944 L943 560 H935 Z M1096 441 H1106 L1105 560 H1097 Z" />
      <path className="f-s" d="M940 441 H944 L943 560 H940 Z M1102 441 H1106 L1105 560 H1102 Z" />
      <rect className="wd" x="1004" y="441" width="96" height="17" rx="2" /><path className="f-s" d="M1004 441 H1100 V445 H1004 Z" />
      <path className="det" d="M1042 451 H1062" />
      <rect className="wd" x="922" y="430" width="192" height="12" rx="3" />
      <path className="f-s" d="M922 438.6 H1114 V439 Q1114 442 1111 442 H925 Q922 442 922 439 Z" />
      <path className="f-h" d="M925 430.7 H1111" />
      <ellipse className="f-ao" cx="1074" cy="430" rx="30" ry="2.2" />
      <path className="o2" d="M1068 380 H1080 L1079 426 H1069 Z" /><path className="f-s" d="M1075 380 H1080 L1079 426 H1075 Z" />
      <path className="o2" d="M1048 430 Q1048 425 1053 425 H1095 Q1100 425 1100 430 Z" /><path className="f-h" d="M1053 425.7 H1095" />
      <g transform="skewY(-4) translate(0 74)">
        <rect className="o" x="1004" y="294" width="148" height="96" rx="5" />
        <path className="f-h" d="M1009 294.7 H1147" />
        <rect className="scr" x="1008" y="298" width="140" height="88" rx="2" />
        <g data-r="monOn" opacity="0" clipPath="url(#rm-mon)">
          {/* the editor on the left, Claude and Codex on the right */}
          <g data-r="mCode">
            <rect className="ink-dim" x="1008" y="298" width="140" height="7" opacity="0.35" />
            <text className="txt" x="1012" y="303.4" fontSize="3.8" opacity="0.8">sync.ts</text>
            <g clipPath="url(#rm-ed)">
              <g data-r="code">
                {LINES.map(l => <rect key={l.y} data-code={l.w} className={l.indent % 2 ? 'code2' : 'code'} x={1014 + l.indent * 5} y={l.y} width="0" height="2.6" rx="1.3" />)}
              </g>
              <g data-r="mDiff" opacity="0">
                {[333.6, 339.2, 344.8].map(y => <rect key={y} className="ink" x="1008" y={y - 1.4} width="75" height="5.4" opacity="0.12" />)}
                {[333.6, 339.2, 344.8].map(y => <text key={y} className="txt" x="1009" y={y + 2.6} fontSize="4.4">+</text>)}
              </g>
            </g>
            <rect className="ink-dim" x="1083" y="305" width="0.8" height="81" />
            <rect className="ink-dim" x="1084" y="344.5" width="64" height="0.8" />
            <text className="txt" x="1087" y="311" fontSize="4.6">claude</text>
            <circle data-r="dotA" className="led" cx="1142" cy="309.4" r="1.5" opacity="0.35" />
            {CLAUDE.map((line, i) => <text key={line} data-msg="a" data-text={line} className={`txt ${said(line)}`} x="1087" y={316.8 + i * 4.9} fontSize="4.2" />)}
            <text className="txt" x="1087" y="351" fontSize="4.6">codex</text>
            <circle data-r="dotB" className="led" cx="1142" cy="349.4" r="1.5" opacity="0.35" />
            {CODEX.map((line, i) => <text key={line} data-msg="b" data-text={line} className={`txt ${said(line)}`} x="1087" y={357.4 + i * 5} fontSize="4.2" />)}
          </g>
          <g data-r="mPass" opacity="0">
            <rect className="ink" x="1042" y="333" width="72" height="22" rx="4" />
            <text className="txt-dark" x="1078" y="346.6" fontSize="7" textAnchor="middle">✓ BUILD PASSED</text>
          </g>
          <g data-r="mRace" opacity="0">
            <rect className="ink-dim" x="1008" y="298" width="140" height="18" opacity="0.22" />
            <path className="ink-dim" d="M1008 316 L1024 306 L1036 312 L1052 302 L1068 312 L1084 304 L1100 313 L1116 303 L1132 311 L1148 305 V316 Z" opacity="0.5" />
            <path className="ink-dim" d="M1074 316 L1082 316 L1148 386 L1008 386 Z" />
            <path className="ink-line" d="M1074 316 L1008 386 M1082 316 L1148 386" style={{ strokeDasharray: '4 4', opacity: 0.7 }} />
            <path className="ink-dim-line" d="M1008 316 H1148" />
            <g data-r="raceDash">{[0, 1, 2, 3, 4, 5].map(n => <rect key={n} className="ink" x="1076.8" y={312 + n * 14} width="2.5" height="6" />)}</g>
            <path className="ink" d="M1076 334.5 H1086 L1087.5 338.5 H1074.5 Z" opacity="0.7" />
            <path className="ink" d="M1062 368 L1094 368 L1099 382 L1057 382 Z" />
            <rect className="ink" x="1054" y="377" width="7" height="7" rx="1" /><rect className="ink" x="1095" y="377" width="7" height="7" rx="1" />
            <path className="scr" d="M1066 370 H1090 L1092 375 H1064 Z" opacity="0.6" />
            <text data-r="raceWin" className="txt" x="1013" y="312" fontSize="8" opacity="0.5">P1</text>
            <text className="txt" x="1143" y="307" fontSize="4.6" textAnchor="end" opacity="0.75">LAP 2/3</text>
            <text className="txt ink-dim" x="1143" y="371" fontSize="4" textAnchor="end">KM/H</text>
            <text className="txt" x="1143" y="381" fontSize="9" textAnchor="end">248</text>
          </g>
          <g data-r="mAim" opacity="0">
            <path className="ink-dim" d="M1008 386 L1058 350 H1098 L1148 386 Z" opacity="0.25" />
            <path className="ink-dim" d="M1008 298 L1058 330 H1098 L1148 298 Z" opacity="0.12" />
            <path className="ink-dim-line" d="M1008 298 L1058 330 M1148 298 L1098 330 M1008 386 L1058 350 M1148 386 L1098 350 M1058 330 H1098 V350 H1058 Z" />
            <path className="ink-dim-line" d="M1028 311 V372 M1044 321 V362 M1128 311 V372 M1112 321 V362" style={{ opacity: 0.6 }} />
            <g className="ink-dim"><circle cx="1070" cy="334" r="2.2" /><rect x="1067" y="337" width="6" height="8" rx="1.5" /></g>
            <g className="ink-dim"><circle cx="1120" cy="333" r="3.4" /><rect x="1115.4" y="337.4" width="9.2" height="13" rx="2" /></g>
            <g data-r="cross"><circle className="ink-line" r="6" /><path className="ink-line" d="M-10 0 H-3 M3 0 H10 M0 -10 V-3 M0 3 V10" /></g>
            <circle className="ink-dim-line" cx="1019" cy="309" r="7" /><circle className="ink" cx="1019" cy="309" r="1.2" />
            <rect className="ink-dim" x="1014" y="378" width="30" height="3" rx="1" /><rect className="ink" x="1014" y="378" width="22" height="3" rx="1" />
            <text className="txt" x="1143" y="381" fontSize="7" textAnchor="end">24/90</text>
            <text data-r="aimWin" className="txt" x="1078" y="322" fontSize="8" textAnchor="middle" opacity="0">+100</text>
          </g>
        </g>
        <path className="f-glass" d="M1008 298 H1074 L1044 386 H1008 Z" clipPath="url(#rm-mon)" />
      </g>
      <ellipse className="f-ao" cx="980" cy="430" rx="33" ry="2" />
      <path className="o3" d="M950 430 L952.5 425.2 Q953.3 424 955 424 H1005 Q1006.7 424 1007.5 425.2 L1010 430 Z" />
      <path className="f-hf" d="M955 424.6 H1005 L1005.6 425.6 H954.4 Z" />
      <path className="f-d" d="M957 427 H1003" style={{ strokeDasharray: '3 1.6' }} />
      <ellipse className="f-ao" cx="1026" cy="428.4" rx="12" ry="1.8" />
      <path className="o4" d="M1016 406 L1018 428 L1034 428 L1036 406 Z" />
      <path className="f-s" d="M1029 406 H1036 L1034 428 H1029 Z" />
      <ellipse className="o" cx="1026" cy="406.5" rx="9.2" ry="1.3" />
      <path d="M1036 411 C1045 411 1045 423 1035 423" style={{ fill: 'none', stroke: 'var(--o4)', strokeWidth: 2.6 }} />
      <g data-r="steamB"><path className="steam" d="M1022 400 C1018 392 1028 388 1024 380 M1030 400 C1026 392 1036 388 1032 378" /></g>
      {/* the wheel, clamped on for racing */}
      <g data-r="wheel" opacity="0">
        <rect className="o2" x="928" y="413" width="36" height="9" rx="2.5" /><path className="f-h" d="M931 413.7 H961" />
        <path className="o3" d="M952 413 L955 399 H964 L962 413 Z" />
        <ellipse cx="962" cy="396" rx="9" ry="22" style={{ fill: 'none', stroke: 'var(--o4)', strokeWidth: 5.4 }} />
        <path d="M955.6 381 Q959 375.6 963 374.6" style={{ fill: 'none', stroke: 'var(--hl)', strokeWidth: 1.4, strokeLinecap: 'round' }} />
        <circle className="o3" cx="962" cy="396" r="5.4" /><circle className="led" cx="962" cy="396" r="1.4" />
      </g>

      {/* PC with a glass side */}
      <ellipse className="f-ao" cx="1151" cy="561" rx="40" ry="4" />
      <rect className="o2" x="1125" y="556" width="12" height="5" rx="1.5" /><rect className="o2" x="1165" y="556" width="12" height="5" rx="1.5" />
      <rect className="o" x="1122" y="444" width="58" height="113" rx="5" />
      <path className="f-h" d="M1127 444.7 H1175" />
      <path className="f-d" d="M1132 448 H1170" style={{ strokeDasharray: '2 2' }} />
      <rect className="o2" x="1128" y="452" width="46" height="99" rx="3" />
      <circle className="fan" cx="1151" cy="478" r="13" /><circle className="fan" cx="1151" cy="520" r="13" />
      <path data-r="fanA" className="ink-dim" d={blades(1151, 478, 11.6)} />
      <path data-r="fanB" className="ink-dim" d={blades(1151, 520, 11.6)} />
      <circle className="o2" cx="1151" cy="478" r="3.6" /><circle className="o2" cx="1151" cy="520" r="3.6" />
      <circle className="led" cx="1151" cy="478" r="1.5" /><circle className="led" cx="1151" cy="520" r="1.5" />
      <path className="f-glass" d="M1128 455 Q1128 452 1131 452 H1152 L1128 506 Z" />

      {/* couch, facing the TV */}
      <rect className="o3" x="1236" y="558" width="230" height="4" rx="2" opacity="0.6" />
      <ellipse className="f-ao" cx="1352" cy="561" rx="112" ry="4" />
      <path className="wd" d="M1266 552 H1274 L1273 560 H1267 Z M1430 552 H1438 L1437 560 H1431 Z" />
      <rect className="o2" x="1250" y="404" width="44" height="134" rx="18" /><rect className="f-tube" x="1250" y="404" width="44" height="134" rx="18" />
      <path className="f-h" d="M1263 404.8 H1281" />
      <circle className="f-s" cx="1272" cy="436" r="1.8" /><circle className="f-s" cx="1272" cy="466" r="1.8" />
      <path className="o4" d="M1252 418 C1262 408 1284 408 1294 420 L1296 468 C1290 476 1285 468 1280 476 C1274 484 1266 472 1262 480 C1256 486 1252 476 1250 468 Z" />
      <path className="f-s" d="M1250 452 C1262 456 1282 456 1296 450 L1296 468 C1290 476 1285 468 1280 476 C1274 484 1266 472 1262 480 C1256 486 1252 476 1250 468 Z" />
      <path className="det" d="M1262 422 C1266 440 1264 458 1268 474 M1282 420 C1284 436 1282 452 1284 470" />
      <rect className="o2" x="1424" y="476" width="28" height="62" rx="12" /><rect className="f-tube" x="1424" y="476" width="28" height="62" rx="12" /><path className="f-h" d="M1432 476.8 H1444" />
      <rect className="o3" x="1262" y="496" width="170" height="34" rx="12" />
      <path className="f-h" d="M1272 496.8 H1422" /><path className="f-d" d="M1347 499 V527" />
      <path className="f-s" d="M1264 520 H1430 Q1432 530 1420 530 H1274 Q1262 530 1264 520 Z" />
      <rect className="o2" x="1254" y="526" width="200" height="26" rx="8" /><path className="f-s" d="M1256 544 H1452 Q1454 552 1446 552 H1262 Q1254 552 1256 544 Z" />
      <rect className="o4" x="1286" y="458" width="30" height="40" rx="10" transform="rotate(-12 1301 478)" />
      <rect className="f-tube" x="1286" y="458" width="30" height="40" rx="10" transform="rotate(-12 1301 478)" />
      <path className="f-d" d="M1296 470 Q1302 478 1298 488" transform="rotate(-12 1301 478)" />

      {/* TV on the wall, the console below */}
      <g transform="skewY(4) translate(0 -104)">
        <rect className="f-s" x="1473.5" y="300" width="114" height="72" rx="4" />
        <rect className="o" x="1470" y="296" width="114" height="72" rx="4" /><path className="f-h" d="M1474 296.7 H1580" />
        <rect className="scr" x="1474" y="300" width="106" height="64" rx="2" />
        <g data-r="tvOn" opacity="0" clipPath="url(#rm-tv)">
          <g data-r="tMenu" opacity="0">
            <rect className="ink-dim" x="1478" y="304" width="98" height="31" rx="1.5" opacity="0.5" />
            <path className="ink-dim" d="M1528 335 L1544 316 L1554 325 L1564 312 L1576 322 V335 Z" />
            <circle className="ink" cx="1558" cy="311" r="3" opacity="0.7" />
            <rect className="ink" x="1482" y="315" width="34" height="4" rx="1" /><rect className="ink-dim" x="1482" y="322" width="24" height="2" />
            <rect className="ink" x="1482" y="327" width="13" height="4.5" rx="1" /><path className="txt-dark" d="M1485.4 328 L1488 329.25 L1485.4 330.5 Z" />
            {[0, 1, 2, 3].map(n => <g key={n}><rect className="ink-dim" x={1478 + n * 25} y="340" width="22" height="15" rx="1.5" /><rect className="ink-dim" x={1480 + n * 25} y="351" width={8 + (n % 2) * 6} height="1.6" /></g>)}
            <rect data-r="tSel" className="ink-line" x="1477.5" y="339.5" width="23" height="16" rx="2" />
          </g>
          <g data-r="tShow" opacity="0">
            <rect className="ink-dim" x="1474" y="300" width="106" height="45" opacity="0.3" />
            <circle className="ink" cx="1562" cy="312" r="5" opacity="0.75" />
            <path className="ink-dim" d="M1474 345 V330 H1482 V322 H1490 V334 H1500 V318 H1508 V328 H1520 V336 H1532 V324 H1540 V345 Z" opacity="0.55" />
            <path className="ink-dim-line" d="M1474 345 H1580" />
            <circle className="ink" cx="1506" cy="328" r="4" /><path className="ink" d="M1501 345 V336 Q1501 333 1504 333 H1508 Q1511 333 1511 336 V345 Z" />
            <g data-r="tFig"><circle className="ink" cx="1548" cy="328" r="4" /><path className="ink" d="M1543 345 V336 Q1543 333 1546 333 H1550 Q1553 333 1553 336 V345 Z" /></g>
            <rect className="ink" x="1505" y="351" width="44" height="2.5" rx="1" />
            <rect className="ink-dim" x="1478" y="359" width="98" height="1.5" />
            <rect data-r="tProg" className="ink" x="1478" y="359" width="0" height="1.5" />
          </g>
          <g data-r="tNext" opacity="0">
            <rect className="scr" x="1474" y="300" width="106" height="64" opacity="0.85" />
            <text className="txt" x="1527" y="322" fontSize="6.5" textAnchor="middle">NEXT EPISODE</text>
            <circle className="ink-dim-line" cx="1527" cy="340" r="10" />
            <text data-r="tCount" className="txt" x="1527" y="344.5" fontSize="12" textAnchor="middle">5</text>
          </g>
          <g data-r="tStill" opacity="0">
            <rect className="scr" x="1474" y="300" width="106" height="64" opacity="0.9" />
            <text className="txt" x="1527" y="327" fontSize="8.5" textAnchor="middle">Still watching?</text>
            <rect className="ink" x="1494" y="336" width="30" height="12" rx="2" /><text className="txt-dark" x="1509" y="344.5" fontSize="6.5" textAnchor="middle">YES</text>
            <rect className="ink-dim-line" x="1530" y="336" width="30" height="12" rx="2" /><text className="txt" x="1545" y="344.5" fontSize="6.5" textAnchor="middle">NO</text>
          </g>
          <g data-r="tBall" opacity="0">
            {[0, 1, 2, 3, 4, 5].map(n => <rect key={n} className="ink-dim" x={1474 + n * 18} y="300" width="9" height="64" opacity="0.12" />)}
            <rect className="ink-dim-line" x="1480" y="305" width="94" height="54" />
            <path className="ink-dim-line" d="M1527 305 V359 M1480 322 H1490 V342 H1480 M1574 322 H1564 V342 H1574" />
            <circle className="ink-dim-line" cx="1527" cy="332" r="8" />
            <path className="ink-line" d="M1480 327 H1477 V337 H1480 M1574 327 H1577 V337 H1574" />
            <g data-r="tPlayers">{[0, 1, 2, 3, 4, 5].map(n => <circle key={n} data-p={n} className={n < 3 ? 'ink' : 'ink-dim'} r="2.4" />)}</g>
            <circle data-r="tBallDot" className="ink" r="1.7" />
            <rect className="scr" x="1478" y="302" width="36" height="8" rx="1" opacity="0.85" />
            <text className="txt" x="1496" y="308" fontSize="5" textAnchor="middle">2 – 1 · 88′</text>
            <text data-r="tGoal" className="txt" x="1527" y="338" fontSize="14" textAnchor="middle" opacity="0">GOAL!</text>
          </g>
          <g data-r="tJump" opacity="0">
            <path className="ink-dim" d="M1474 352 Q1490 330 1506 352 Q1524 324 1546 352 Q1562 334 1580 352 Z" opacity="0.35" />
            <ellipse className="ink-dim" cx="1500" cy="312" rx="8" ry="3" opacity="0.5" /><ellipse className="ink-dim" cx="1556" cy="318" rx="10" ry="3.4" opacity="0.5" />
            <g data-r="tBlocks">
              {Array.from({ length: 14 }, (_, n) => <rect key={n} className="ink-dim" x={1474 + n * 12} y="352" width="11" height="12" />)}
              <path className="ink-line" d="M1474 352.4 H1642" />
              {[0, 1, 2].map(n => <rect key={n} className="ink-dim" x={1510 + n * 48} y={n % 2 ? 320 : 330} width="22" height="5" rx="1" />)}
              {[0, 1, 2].map(n => <circle key={n} className="ink" cx={1521 + n * 48} cy={n % 2 ? 312 : 322} r="2" />)}
            </g>
            <g data-r="tHero"><rect className="ink" x="1496" y="341" width="8" height="10" rx="2.5" /><circle className="ink" cx="1500" cy="337" r="3.6" /><path className="ink-line" d="M1500 333.4 V330.6" /><circle className="scr" cx="1501.6" cy="336.6" r="0.9" /></g>
            <text className="txt" x="1478" y="308" fontSize="5">● ×12</text>
            <text data-r="tClear" className="txt" x="1527" y="332" fontSize="11" textAnchor="middle" opacity="0">CLEAR!</text>
          </g>
        </g>
        <path className="f-glass" d="M1474 300 H1532 L1506 364 H1474 Z" clipPath="url(#rm-tv)" />
      </g>
      <ellipse className="f-ao" cx="1525" cy="561" rx="66" ry="3.5" />
      <rect className="o3" x="1470" y="555" width="6" height="5" /><rect className="o3" x="1574" y="555" width="6" height="5" />
      <rect className="wd" x="1464" y="496" width="122" height="60" rx="3" />
      <path className="f-d" d="M1525 502 V550" /><path className="det" d="M1519 518 V530 M1531 518 V530" style={{ strokeWidth: 2 }} />
      <path className="f-s" d="M1464 550 H1586 V553 Q1586 556 1583 556 H1467 Q1464 556 1464 553 Z" />
      <rect className="wd" x="1460" y="489" width="130" height="8" rx="2.5" /><path className="f-h" d="M1463 489.7 H1587" /><path className="f-s" d="M1460 494.6 H1590 V497 H1460 Z" />
      <path className="o3" d="M1476 489 L1478 478 Q1479 476 1482 476 H1512 Q1515 476 1516 478 L1518 489 Z" /><path className="f-h" d="M1482 476.7 H1512" />
      <path className="ink-line" d="M1484 483 H1508" style={{ opacity: 0.45 }} />
      <circle className="led" cx="1512" cy="483" r="1.4" />
      <rect className="o3" x="1236" y="558" width="230" height="4" rx="2" opacity="0.6" />

      {/* me */}
      <g data-r="me">
        <g data-j="thighF" data-at="-3,0">{thigh('pn2')}
          <g data-j="shinF" data-at="0,64">{shin('pn2')}
            <g data-j="footF" data-at="0,60">{shoe('sh2')}</g></g></g>
        <g data-j="thighN" data-at="3,0">{thigh('pn')}
          <g data-j="shinN" data-at="0,64">{shin('pn')}
            <g data-j="footN" data-at="0,60">{shoe('sh')}</g></g></g>
        <g data-j="spine" data-at="0,0">
          <g data-j="uarmF" data-at="0,-92">{upperArm('cl3')}
            <g data-j="farmF" data-at="0,46">{foreArm('cl3')}
              <g data-j="handF" data-at="0,42">{hand('sk2')}</g></g></g>
          {torso()}
          <g data-j="head" data-at="4,-104">
            {head()}
          </g>
          <g data-j="uarmN" data-at="2,-92">{upperArm('cl')}
            <g data-j="farmN" data-at="0,46">{foreArm('cl')}
              <g data-j="handN" data-at="0,42">
                <g data-r="spoon" opacity="0"><path className="o4" d="M0 -2 L13 -6 L13.6 -4 L0.6 0 Z" /><ellipse className="o4" cx="15" cy="-5.5" rx="3.5" ry="2" /></g>
                <g data-r="pad" opacity="0"><path className="o" d="M-6 -8 C-11 -8 -13 0 -10 6 C-8 9 -4 8 -2 4 L12 4 C14 8 18 9 20 6 C23 0 21 -8 16 -8 Z" /><circle className="led" cx="12" cy="-3" r="1" /></g>
                <g data-r="phone" opacity="0"><ellipse cx="6" cy="-4" rx="34" ry="26" fill="url(#rm-warm)" /><rect className="o" x="0" y="-10" width="7" height="12" rx="1.5" /><rect className="ink" x="1" y="-9" width="5" height="10" rx="1" /></g>
                {hand('sk')}
              </g></g></g>
        </g>
      </g>
      {/* the blanket over me while I sleep */}
      <g data-r="blanketOn">
        <path className="cl3" d="M176 470 C180 444 200 430 236 428 C286 426 334 432 374 436 C402 438 422 448 428 466 L430 500 L176 500 Z" />
        <path className="f-s" d="M176 488 C240 482 330 492 430 486 L430 500 L176 500 Z" />
        <path className="f-h" d="M190 444 C210 432 250 428 300 430 C340 432 380 436 404 442" />
        <path className="cl" d="M176 470 C180 448 196 436 222 431 L228 440 C204 446 190 457 186 472 Z" />
        <path className="det" d="M220 446 C260 440 300 444 340 442 M300 470 C330 466 360 470 400 466" />
      </g>

      {/* the cat: a grey tabby */}
      <g data-r="cat" className="rm-cat" data-cursor="Pet">
        <g data-r="catSit">
          <path data-r="tailSit" className="cat" d="M-12 -2 C-27 0 -39 -7 -36.5 -21 C-35.5 -27.5 -30 -30.5 -27 -28.4 C-25.8 -26.6 -28.6 -24.6 -29.6 -20.4 C-31 -11 -24 -6.6 -12 -7.4 Z" />
          <path className="cat" d="M-19 0 C-25 -14 -20 -34 -4 -37 C8 -39 15 -30 16 -18 C17 -8 13 0 6 0 Z" />
          <path className="f-st" d="M-15 -27 q4 2 3 7 M-9.5 -33 q4 2.4 3.4 7.4 M-3.5 -35.6 q3.4 2.6 3.2 7" />
          <path className="f-d" d="M-16 -5 C-13 -16 -3 -19 1 -9" />
          <path className="f-sl" d="M-15 -3 C-19 -14 -17 -26 -10 -32" style={{ strokeWidth: 4 }} />
          <path className="cat" d="M9.6 -18 H15.6 V-2 Q15.6 0 13.6 0 H9.6 Z" />
          <path className="cat" d="M3.6 -18 H11 V-2 Q11 0 9 0 H4.4 Q2.4 0 2.4 -2 Z" />
          <path className="f-d" d="M6.6 -1.6 V0 M9 -1.6 V0" />
          <path className="cat" d="M-1 -50 L0 -64 L8 -54 Z M10 -55 L18 -64 L19 -48 Z" />
          <path className="f-in" d="M1.4 -52.6 L1.9 -60 L6 -54.6 Z M11.6 -54.6 L16.6 -60 L17.1 -51.6 Z" />
          <ellipse className="cat" cx="8" cy="-44" rx="12.6" ry="11.6" />
          <path className="f-st" d="M5 -55 v3.4 M8 -55.6 v4 M11 -55 v3.4" />
          <g data-r="blinkS"><circle className="ceye" cx="3.5" cy="-45" r="3" /><circle className="ceye" cx="12.5" cy="-45" r="3" />
            <g data-r="pupS"><ellipse className="cpup" cx="3.5" cy="-45" rx="0.9" ry="2.3" /><ellipse className="cpup" cx="12.5" cy="-45" rx="0.9" ry="2.3" /></g></g>
          <path className="hr" d="M6.7 -40.6 H9.3 L8 -39 Z" />
          <path className="f-d" d="M8 -39 Q6.6 -37.2 5.2 -37.8 M8 -39 Q9.4 -37.2 10.8 -37.8" />
          <path className="f-w" d="M1.6 -39.6 L-7 -41 M1.6 -38 L-7 -37.4 M14.4 -39.6 L23 -41 M14.4 -38 L23 -37.4" />
        </g>
        <g data-r="catWalk" opacity="0">
          <path data-r="tailWalk" className="cat" d="M-22 -26 C-33 -30 -38 -44 -31 -52 C-29 -54.4 -25.6 -53.4 -26.6 -51 C-31.6 -44 -29.6 -33 -20 -21 Z" />
          <g data-r="legsA"><path className="cat" d="M-20 -16 H-13 L-14 -2 Q-14 0 -16 0 H-19 Q-21 0 -21 -2 Z M10 -16 H17 L16 -2 Q16 0 14 0 H11 Q9 0 9 -2 Z" /></g>
          <g data-r="legsB" opacity="0"><path className="cat" d="M-13 -16 H-6 L-7 -2 Q-7 0 -9 0 H-12 Q-14 0 -14 -2 Z M17 -16 H24 L23 -2 Q23 0 21 0 H18 Q16 0 16 -2 Z" /></g>
          <path className="cat" d="M-26 -22 C-26 -30 -16 -33 -2 -32 C12 -31 22 -30 24 -22 C25 -14 18 -11 4 -11 C-10 -11 -26 -12 -26 -22 Z" />
          <path className="f-st" d="M-16 -31 q2 4 0 8 M-9 -32 q2 4 0 8 M-2 -32 q2 4 0 8 M5 -31.6 q2 4 0 8" />
          <path className="f-sl" d="M-20 -14.4 C-8 -12.6 8 -12.6 18 -14" style={{ strokeWidth: 3.4 }} />
          <path className="cat" d="M18 -36 L19 -48 L26 -39 Z M28 -40 L34 -48 L35 -33 Z" />
          <path className="f-in" d="M20 -38.6 L20.6 -44.6 L24 -39.6 Z M29.6 -40 L33 -44.6 L33.4 -35.6 Z" />
          <ellipse className="cat" cx="27" cy="-31" rx="11" ry="10.2" />
          <g data-r="blinkW"><circle className="ceye" cx="31" cy="-32" r="2.2" /><ellipse className="cpup" cx="31.6" cy="-32" rx="0.8" ry="1.8" /></g>
          <path className="hr" d="M36.4 -28.6 L38 -27.4 L36.4 -26.4 Z" />
          <path className="f-w" d="M33 -26.4 L42 -27.6 M33 -25 L42 -24.4" />
        </g>
        <g data-r="catLoaf" opacity="0">
          <path data-r="tailHang" className="cat" d="M-38 -8 C-52 -4 -56 16 -48.6 36 C-46 43 -47.6 51.6 -53 54 C-56 55 -57.4 52 -55.2 50.4 C-51.6 47.4 -50.6 42 -52.6 36.4 C-60 16 -55.4 -5.6 -38 -2.6 Z" />
          <path data-r="tailWrap" className="cat" d="M-36 -6 C-48 0 -42 7.6 -26 7.6 C-8 7.6 8 6.6 22 4.4 C23.4 2.4 21.6 1 19.4 1.6 C6 3 -10 3.4 -26 3.4 C-37 3.4 -39.6 0.4 -33 -1.4 Z" opacity="0" />
          <path className="cat" d="M-40 0 C-42 -20 -22 -27 2 -26 C26 -25 40 -16 39 0 Z" />
          <path className="f-st" d="M-26 -22 q2 4 0 8 M-17 -24.4 q2 4 0 8 M-8 -25.6 q2 4 0 8 M1 -25.8 q2 4 0 8" />
          <path className="f-sl" d="M-36 -2 C-20 0 10 0 34 -2" style={{ strokeWidth: 3.4 }} />
          <path className="cat" d="M16 -25 L18 -44 L29 -33 Z M34 -34 L44 -44 L45 -25 Z" />
          <path className="f-in" d="M18.6 -28 L19.6 -39.6 L26 -33 Z M36.4 -33 L42.6 -39.6 L43 -28 Z" />
          <ellipse className="cat" cx="31" cy="-21" rx="13.6" ry="12.6" />
          <path className="f-st" d="M27.6 -33 v3.6 M31 -33.6 v4.2 M34.4 -33 v3.6" />
          <g data-r="blinkL"><circle className="ceye" cx="25.5" cy="-22" r="3.2" /><circle className="ceye" cx="36.5" cy="-22" r="3.2" />
            <g data-r="pupL"><ellipse className="cpup" cx="25.5" cy="-22" rx="1" ry="2.5" /><ellipse className="cpup" cx="36.5" cy="-22" rx="1" ry="2.5" /></g></g>
          <path className="hr" d="M29.6 -17.4 H32.4 L31 -15.8 Z" />
          <path className="f-w" d="M24 -16 L14 -17.4 M24 -14.4 L14 -13.6 M38 -16 L48 -17.4 M38 -14.4 L48 -13.6" />
          <path className="cat" d="M24 0 C24 -6 32 -6 32 0 Z M30 0 C30 -6 38 -6 38 0 Z" />
        </g>
        <g data-r="catCurl" opacity="0">
          <path className="cat" d="M-27 -10 C-27 -22 -14 -27 0 -26 C14 -25 24 -20 24 -11 C24 -3 14 0 -2 0 C-18 0 -27 -2 -27 -10 Z" />
          <path className="f-st" d="M-18 -22 q2 4 0 8 M-10 -24.4 q2 4 0 8 M-2 -25.4 q2 4 0 8" />
          <path className="cat" d="M-24 -6 C-14 3 12 4.4 27 -1 C28.6 -2.6 27.6 -4.6 25.6 -4 C12 -0.4 -10 -1 -20 -8.6 Z" />
          <path className="f-sl" d="M-22 -3 C-8 1 10 1 22 -2" style={{ strokeWidth: 2.6 }} />
          <path className="cat" d="M10 -20 L12 -30 L18 -23 Z M20 -24 L27 -30 L28 -18 Z" />
          <path className="f-in" d="M12 -22 L12.8 -27 L16 -23.4 Z M21.6 -23.4 L25.6 -27 L26 -20 Z" />
          <ellipse className="cat" cx="18" cy="-14" rx="11" ry="10" />
          <path className="ink-line" d="M13 -14 Q15.5 -11.5 18 -14 M20 -14 Q22.5 -11.5 25 -14" style={{ opacity: 0.6 }} />
          <path className="hr" d="M17.6 -9.4 H20.4 L19 -8 Z" />
        </g>
      </g>

      {/* light: over everything it falls on */}
      <ellipse data-r="monGlow" cx="1060" cy="352" rx="300" ry="230" fill="url(#rm-glow)" opacity="0" />
      <ellipse data-r="tvGlow" cx="1470" cy="350" rx="300" ry="220" fill="url(#rm-glow)" opacity="0" />
      <circle data-r="pcGlow" cx="1151" cy="500" r="70" fill="url(#rm-warm)" opacity="0.4" />
      <ellipse data-r="pendGlow" cx="700" cy="360" rx="150" ry="170" fill="url(#rm-warm)" opacity="0" />
      <path data-r="floorCone" d="M1306 262 L1340 262 L1394 474 L1252 474 Z" fill="url(#rm-beam)" opacity="0" />
      <path data-r="bedCone" d="M502 450 L522 450 L546 478 L478 478 Z" fill="url(#rm-beam)" opacity="0" />
      <ellipse data-r="floorGlow" cx="1323" cy="380" rx="170" ry="190" fill="url(#rm-warm)" opacity="0" />
      <ellipse data-r="bedGlow" cx="512" cy="460" rx="130" ry="110" fill="url(#rm-warm)" opacity="0" />

      {/* what the room says */}
      <g data-r="zzz">{[0, 1, 2].map(n => <text key={n} data-z={n} className="bubble" fontSize={12 + n * 3}>z</text>)}</g>
      <path data-r="heart" className="ink" d="M0 0 C-6 -5 -8 -11 -4 -13 C-2 -14 0 -12 0 -10 C0 -12 2 -14 4 -13 C8 -11 6 -5 0 0 Z" opacity="0" />
      <text data-r="meow" className="txt" fontSize="11" textAnchor="middle" opacity="0">mrrp?</text>
    </svg>
  );
}
