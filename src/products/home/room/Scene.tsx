// The room, drawn once. Nothing here moves by itself: day.ts drives every part marked data-r (a part)
// or data-j (a joint of the character, rotated about the point in data-at).

/** Code on the monitor: [indent, width]. A width of 0 is a blank line. */
export const CODE: [number, number][] = [
  [0, 40], [1, 54], [1, 30], [2, 46], [2, 24], [1, 16], [0, 8], [0, 0], [0, 36], [1, 50], [2, 38], [2, 20],
  [3, 44], [2, 12], [1, 28], [0, 8], [0, 0], [0, 30], [1, 42], [1, 56], [2, 34], [1, 18], [0, 8], [0, 0],
  [0, 44], [1, 26], [2, 48], [2, 30], [1, 14], [1, 40], [0, 8], [0, 0], [0, 34], [1, 52], [1, 22], [0, 8],
];
export const CODE_STEP = 5.6;
const LINES = CODE.flatMap(([indent, w], i) => (w ? [{ indent, w, y: 321 + i * CODE_STEP }] : []));

const STARS = [[148, 170], [178, 200], [205, 166], [290, 176], [312, 214], [160, 232], [250, 206], [226, 244], [318, 168]];
const LIT = [[150, 318], [158, 306], [178, 326], [196, 300], [214, 318], [236, 310], [258, 326], [266, 302], [292, 316], [310, 306], [322, 324]];

export function Scene() {
  return (
    <svg className="rm-svg" viewBox="0 120 1600 460" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="rm-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="sky1" /><stop offset="1" className="sky2" /></linearGradient>
        <linearGradient id="rm-dawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0.3" className="gl" stopOpacity="0" /><stop offset="1" className="gl" stopOpacity="0.55" /></linearGradient>
        <radialGradient id="rm-glow"><stop offset="0" className="gl" stopOpacity="0.32" /><stop offset="0.45" className="gl" stopOpacity="0.1" /><stop offset="1" className="gl" stopOpacity="0" /></radialGradient>
        <radialGradient id="rm-warm"><stop offset="0" className="gl" stopOpacity="0.26" /><stop offset="1" className="gl" stopOpacity="0" /></radialGradient>
        <linearGradient id="rm-beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="gl" stopOpacity="0.2" /><stop offset="1" className="gl" stopOpacity="0" /></linearGradient>
        <clipPath id="rm-win"><rect x="136" y="156" width="198" height="198" /></clipPath>
        <clipPath id="rm-mon"><rect x="1027" y="315" width="100" height="64" rx="2" /></clipPath>
        <clipPath id="rm-tv"><rect x="1474" y="300" width="106" height="64" rx="2" /></clipPath>
      </defs>

      {/* the box: shows by day */}
      <rect className="wall" x="24" y="132" width="1552" height="428" rx="6" />
      <rect className="base" x="24" y="560" width="1552" height="14" rx="3" />
      <line className="floor" x1="0" y1="560" x2="1600" y2="560" />

      {/* window: the clock of the room */}
      <rect className="o2" x="126" y="146" width="218" height="218" rx="4" />
      <rect x="136" y="156" width="198" height="198" fill="url(#rm-sky)" />
      <g clipPath="url(#rm-win)">
        <rect data-r="dawn" x="136" y="156" width="198" height="198" fill="url(#rm-dawn)" opacity="0" />
        <g data-r="stars">{STARS.map(([x, y]) => <circle key={`${x}-${y}`} className="star" cx={x} cy={y} r="1.4" />)}</g>
        <g data-r="sun"><circle className="sun" r="30" opacity="0.18" /><circle className="sun" r="17" /></g>
        <g data-r="moon"><circle className="moon" r="17" /><circle className="o4" cx="-6" cy="-5" r="3" opacity="0.25" /><circle className="o4" cx="6" cy="7" r="2.2" opacity="0.25" /></g>
        <path className="city" d="M136 354 V312 H152 V296 H170 V318 H186 V286 H204 V308 H220 V296 H238 V314 H252 V290 H272 V312 H288 V298 H306 V318 H318 V302 H334 V354 Z" />
        <g data-r="lit">{LIT.map(([x, y]) => <rect key={`${x}-${y}`} className="lit" x={x} y={y} width="3" height="4" />)}</g>
      </g>
      <rect className="o2" x="233" y="156" width="4" height="198" />
      <rect className="o2" x="136" y="253" width="198" height="4" />
      <rect className="o3" x="116" y="362" width="238" height="9" rx="2" />
      <path className="cl3" d="M344 140 C356 190 340 240 354 290 C362 320 350 350 360 382 L378 382 C370 330 384 270 372 210 C368 180 378 160 370 140 Z" />
      <rect className="o3" x="104" y="136" width="284" height="5" rx="2.5" />
      <path data-r="beam" d="M146 366 L334 366 L246 560 L40 560 Z" fill="url(#rm-beam)" />

      {/* wall clock */}
      <circle className="o2" cx="470" cy="214" r="30" /><circle className="o4" cx="470" cy="214" r="25" />
      <line data-r="hourHand" className="hand" x1="470" y1="214" x2="470" y2="200" />
      <line data-r="minHand" className="hand" x1="470" y1="214" x2="470" y2="194" style={{ strokeWidth: 1.8 }} />
      <circle className="o" cx="470" cy="214" r="2.5" />

      {/* shelf over the desk */}
      <rect className="wd" x="944" y="236" width="214" height="8" rx="2" />
      <rect className="o2" x="954" y="216" width="20" height="20" rx="3" />
      <path className="leaf" d="M964 216 C952 204 954 192 962 186 C966 198 968 206 964 216 Z M966 216 C978 206 984 196 982 186 C972 192 968 204 966 216 Z" />
      <path className="leaf" d="M956 230 C946 248 944 270 950 292 C956 272 958 252 958 232 Z M972 230 C978 250 978 266 974 280 C968 264 968 248 970 232 Z" />
      <rect className="o3" x="994" y="200" width="10" height="36" rx="1" /><rect className="o4" x="1005" y="206" width="9" height="30" rx="1" /><rect className="o2" x="1015" y="196" width="11" height="40" rx="1" />
      <rect className="o3" x="1027" y="210" width="22" height="8" rx="1" transform="rotate(-24 1027 218)" />
      <path className="o4" d="M1066 236 L1068 228 L1084 226 L1090 220 L1100 220 L1104 226 L1130 228 L1134 236 Z" />
      <circle className="o" cx="1074" cy="236" r="5" /><circle className="o" cx="1124" cy="236" r="5" />

      {/* poster: the hero car */}
      <rect className="o2" x="1290" y="184" width="150" height="100" rx="3" />
      <rect className="o" x="1297" y="191" width="136" height="86" />
      <path className="o4" d="M1310 254 L1314 246 L1340 244 L1350 232 L1366 232 L1372 242 L1414 246 L1420 254 Z" />
      <circle className="o2" cx="1324" cy="255" r="7" /><circle className="o2" cx="1408" cy="255" r="7" />

      {/* pendant over the table */}
      <line className="wire" x1="700" y1="120" x2="700" y2="262" />
      <path className="o3" d="M670 284 L730 284 L718 260 L682 260 Z" />
      <circle data-r="bulb" className="sun" cx="700" cy="288" r="5" opacity="0" />
      <circle className="o4" cx="700" cy="288" r="5" opacity="0.5" />

      {/* floor lamp behind the couch */}
      <path className="wire" d="M1238 552 L1238 260 C1238 220 1290 206 1322 238" style={{ strokeWidth: 3 }} />
      <path className="o3" d="M1304 236 L1342 236 L1334 258 L1312 258 Z" />
      <circle data-r="floorBulb" className="sun" cx="1323" cy="260" r="5" opacity="0" />
      <ellipse className="o2" cx="1238" cy="556" rx="18" ry="4" />

      {/* bed */}
      <rect className="wd" x="58" y="404" width="20" height="156" rx="5" />
      <rect className="wd" x="424" y="462" width="16" height="98" rx="4" />
      <rect className="wd" x="70" y="498" width="362" height="18" rx="3" />
      <rect className="wd" x="84" y="516" width="10" height="44" /><rect className="wd" x="408" y="516" width="10" height="44" />
      <rect className="o3" x="74" y="468" width="352" height="32" rx="9" />
      <rect className="o4" x="86" y="446" width="76" height="26" rx="13" />
      <g data-r="blanketOff" opacity="0">
        <path className="cl3" d="M168 470 C214 452 262 476 316 458 C356 446 396 462 428 466 L430 500 L168 500 Z" />
        <path className="det" d="M210 470 C240 476 270 468 300 474 M340 466 C362 470 380 466 400 470" />
      </g>

      {/* bedside: alarm clock and a lamp */}
      <rect className="wd" x="456" y="478" width="66" height="82" rx="3" />
      <path className="det" d="M462 512 H516 M484 494 H494" />
      <g data-r="alarm">
        <rect className="o" x="464" y="456" width="40" height="22" rx="6" />
        <text data-r="digits" className="txt" x="484" y="471" fontSize="10.5" textAnchor="middle">01:30</text>
        <path data-r="ring" className="ink-line" d="M460 452 L454 446 M508 452 L514 446 M484 448 L484 440" opacity="0" />
      </g>
      <rect className="o3" x="507" y="470" width="10" height="8" rx="2" />
      <path className="o3" d="M512 470 L512 446" style={{ stroke: 'var(--wire)', strokeWidth: 2 }} />
      <path className="o4" d="M500 446 L524 446 L519 432 L505 432 Z" />

      {/* dining */}
      <rect className="wd" x="582" y="404" width="9" height="156" rx="3" />
      <rect className="wd" x="582" y="498" width="62" height="10" rx="3" />
      <rect className="wd" x="634" y="508" width="8" height="52" />
      <rect className="wd" x="828" y="404" width="9" height="156" rx="3" />
      <rect className="wd" x="776" y="498" width="61" height="10" rx="3" />
      <rect className="wd" x="778" y="508" width="8" height="52" />
      <rect className="wd" x="650" y="428" width="122" height="11" rx="3" />
      <rect className="wd" x="706" y="439" width="10" height="112" />
      <rect className="wd" x="680" y="550" width="62" height="10" rx="3" />
      <path className="o4" d="M748 428 L750 402 Q750 396 756 396 L762 396 Q768 396 768 402 L770 428 Z" opacity="0.7" />
      {/* biryani */}
      <g data-r="rice">
        <path className="sk" d="M688 424 Q712 400 736 424 Z" />
        <circle className="o4" cx="702" cy="416" r="2" /><circle className="cl" cx="716" cy="412" r="1.6" /><circle className="o4" cx="724" cy="419" r="2" /><circle className="cl3" cx="709" cy="420" r="1.8" />
      </g>
      <path className="o4" d="M680 424 L744 424 L738 430 L686 430 Z" />
      <g data-r="steamA"><path className="steam" d="M700 398 C696 390 706 386 702 378 M714 396 C710 388 720 384 716 374 M726 398 C722 392 730 388 727 382" /></g>

      {/* desk chair */}
      <path className="o" d="M852 372 Q848 360 860 358 L872 358 Q882 360 880 372 L876 500 L858 500 Z" />
      <rect className="o" x="852" y="496" width="80" height="12" rx="5" />
      <rect className="o2" x="888" y="508" width="8" height="40" />
      <path className="o2" d="M856 548 H928 V552 H856 Z" />
      <circle className="o3" cx="860" cy="555" r="5" /><circle className="o3" cx="924" cy="555" r="5" />

      {/* desk, seen from its side */}
      <rect className="wd" x="924" y="430" width="188" height="12" rx="3" />
      <rect className="wd" x="934" y="442" width="10" height="118" /><rect className="wd" x="1096" y="442" width="10" height="118" />
      <rect className="o2" x="1050" y="424" width="48" height="6" rx="3" />
      <rect className="o2" x="1068" y="380" width="12" height="46" />
      <g transform="skewY(-4) translate(0 74)">
        <rect className="o" x="1022" y="310" width="110" height="74" rx="5" />
        <rect className="scr" x="1027" y="315" width="100" height="64" rx="2" />
        <g data-r="monOn" opacity="0" clipPath="url(#rm-mon)">
          <g data-r="mCode">
            <g data-r="code">
              {LINES.map(l => <rect key={l.y} data-code={l.w} className={l.indent % 2 ? 'code2' : 'code'} x={1033 + l.indent * 7} y={l.y} width="0" height="2.6" rx="1.3" />)}
            </g>
          </g>
          <g data-r="mJunk" opacity="0">
            <text className="txt" x="1033" y="330" fontSize="7">fffffffffffff</text>
            <text className="txt" x="1033" y="340" fontSize="7">jjjjjjjjjj;;;;</text>
            <text className="txt" x="1033" y="350" fontSize="7">ggggggggggggg</text>
            <text className="txt" x="1033" y="360" fontSize="7">&gt;&gt;&gt;&gt;&gt;mrrrrrrr</text>
          </g>
          <g data-r="mPass" opacity="0">
            <rect className="ink" x="1041" y="334" width="72" height="24" rx="4" />
            <text className="txt-dark" x="1077" y="349.5" fontSize="7.5" textAnchor="middle">✓ BUILD PASSED</text>
          </g>
          <g data-r="mRace" opacity="0">
            <path className="ink-dim" d="M1074 333 L1080 333 L1127 379 L1027 379 Z" />
            <path className="ink-dim-line" d="M1027 333 H1127" />
            <g data-r="raceDash">{[0, 1, 2, 3, 4].map(n => <rect key={n} className="ink" x="1076" y={330 + n * 12} width="2" height="5" />)}</g>
            <path className="ink" d="M1064 364 L1090 364 L1094 376 L1060 376 Z" />
            <rect className="ink" x="1058" y="372" width="6" height="6" rx="1" /><rect className="ink" x="1090" y="372" width="6" height="6" rx="1" />
            <text data-r="raceWin" className="txt" x="1033" y="327" fontSize="8" opacity="0.5">P1</text>
          </g>
          <g data-r="mAim" opacity="0">
            <path className="ink-dim-line" d="M1027 352 H1127" />
            <rect className="ink-dim" x="1040" y="338" width="10" height="14" /><rect className="ink-dim" x="1096" y="332" width="12" height="20" /><rect className="ink-dim" x="1068" y="344" width="8" height="8" />
            <g data-r="cross"><circle className="ink-line" r="6" /><path className="ink-line" d="M-10 0 H-3 M3 0 H10 M0 -10 V-3 M0 3 V10" /></g>
            <text data-r="aimWin" className="txt" x="1077" y="330" fontSize="7.5" textAnchor="middle" opacity="0">+100</text>
          </g>
        </g>
      </g>
      <rect className="o3" x="952" y="424" width="56" height="6" rx="2" />
      <path className="o4" d="M1016 406 L1018 428 L1034 428 L1036 406 Z" /><path className="det" d="M1036 412 C1044 412 1044 422 1035 422" />
      <g data-r="steamB"><path className="steam" d="M1022 400 C1018 392 1028 388 1024 380 M1030 400 C1026 392 1036 388 1032 378" /></g>
      {/* the wheel, clamped on for racing */}
      <g data-r="wheel" opacity="0">
        <rect className="o2" x="930" y="414" width="34" height="8" rx="2" />
        <rect className="o2" x="956" y="400" width="8" height="16" />
        <ellipse className="o" cx="962" cy="396" rx="9" ry="22" style={{ fill: 'none', stroke: 'var(--o4)', strokeWidth: 5 }} />
        <circle className="o3" cx="962" cy="396" r="5" />
      </g>

      {/* PC with a glass side */}
      <rect className="o" x="1122" y="444" width="58" height="116" rx="5" />
      <rect className="o2" x="1128" y="450" width="46" height="104" rx="3" />
      <circle className="fan" cx="1151" cy="478" r="13" /><circle className="fan" cx="1151" cy="520" r="13" />
      <path data-r="fanA" className="ink-dim-line" d="M1151 468 V488 M1141 478 H1161" style={{ strokeWidth: 2 }} />
      <path data-r="fanB" className="ink-dim-line" d="M1151 510 V530 M1141 520 H1161" style={{ strokeWidth: 2 }} />
      <circle className="led" cx="1151" cy="478" r="2.5" /><circle className="led" cx="1151" cy="520" r="2.5" />

      {/* couch, facing the TV */}
      <rect className="o2" x="1250" y="404" width="44" height="134" rx="18" />
      <rect className="o3" x="1262" y="496" width="178" height="34" rx="12" />
      <rect className="o2" x="1254" y="526" width="194" height="26" rx="8" />
      <rect className="wd" x="1266" y="552" width="8" height="8" /><rect className="wd" x="1428" y="552" width="8" height="8" />
      <rect className="o4" x="1286" y="458" width="30" height="40" rx="10" transform="rotate(-12 1301 478)" />

      {/* TV on the wall, the console below */}
      <g transform="skewY(4) translate(0 -104)">
        <rect className="o" x="1470" y="296" width="114" height="72" rx="4" />
        <rect className="scr" x="1474" y="300" width="106" height="64" rx="2" />
        <g data-r="tvOn" opacity="0" clipPath="url(#rm-tv)">
          <g data-r="tMenu" opacity="0">
            <rect className="ink-dim" x="1478" y="304" width="98" height="31" rx="1.5" />
            <rect className="ink" x="1482" y="322" width="32" height="3" /><rect className="ink" x="1482" y="328" width="18" height="2" />
            {[0, 1, 2, 3].map(n => <rect key={n} className="ink-dim" x={1478 + n * 25} y="340" width="22" height="15" rx="1.5" />)}
            <rect data-r="tSel" className="ink-line" x="1477.5" y="339.5" width="23" height="16" rx="2" />
          </g>
          <g data-r="tShow" opacity="0">
            <path className="ink-dim-line" d="M1474 345 H1580" />
            <circle className="ink-dim" cx="1560" cy="314" r="6" />
            <circle className="ink" cx="1506" cy="328" r="4" /><rect className="ink" x="1502" y="333" width="8" height="12" rx="2" />
            <g data-r="tFig"><circle className="ink" cx="1548" cy="328" r="4" /><rect className="ink" x="1544" y="333" width="8" height="12" rx="2" /></g>
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
            <rect className="ink-dim-line" x="1480" y="305" width="94" height="54" />
            <path className="ink-dim-line" d="M1527 305 V359 M1480 322 H1490 V342 H1480 M1574 322 H1564 V342 H1574" />
            <circle className="ink-dim-line" cx="1527" cy="332" r="8" />
            <g data-r="tPlayers">{[0, 1, 2, 3, 4, 5].map(n => <circle key={n} data-p={n} className={n < 3 ? 'ink' : 'ink-dim'} r="2.4" />)}</g>
            <circle data-r="tBallDot" className="ink" r="1.7" />
            <text data-r="tGoal" className="txt" x="1527" y="338" fontSize="14" textAnchor="middle" opacity="0">GOAL!</text>
          </g>
          <g data-r="tJump" opacity="0">
            <g data-r="tBlocks">
              {Array.from({ length: 14 }, (_, n) => <rect key={n} className="ink-dim" x={1474 + n * 12} y="352" width="11" height="12" />)}
              {[0, 1, 2].map(n => <rect key={n} className="ink-dim" x={1510 + n * 48} y={n % 2 ? 320 : 330} width="22" height="5" />)}
              {[0, 1, 2].map(n => <circle key={n} className="ink" cx={1521 + n * 48} cy={n % 2 ? 312 : 322} r="2" />)}
            </g>
            <g data-r="tHero"><rect className="ink" x="1496" y="342" width="7" height="10" rx="1" /><rect className="ink" x="1497" y="337" width="5" height="5" rx="1" /></g>
            <text data-r="tClear" className="txt" x="1527" y="332" fontSize="11" textAnchor="middle" opacity="0">CLEAR!</text>
          </g>
        </g>
      </g>
      <rect className="wd" x="1462" y="494" width="126" height="66" rx="3" />
      <path className="det" d="M1525 500 V554" />
      <rect className="o3" x="1478" y="482" width="40" height="12" rx="3" />
      <circle className="led" cx="1512" cy="488" r="1.6" />
      <rect className="o3" x="1236" y="558" width="230" height="4" rx="2" opacity="0.6" />

      {/* me */}
      <g data-r="me">
        <g data-j="thighF" data-at="-3,0"><rect className="pn2" x="-10" y="-10" width="20" height="74" rx="10" />
          <g data-j="shinF" data-at="0,64"><rect className="pn2" x="-9" y="-9" width="18" height="69" rx="9" />
            <g data-j="footF" data-at="0,60"><path className="sh2" d="M-10 -5 H14 Q28 -4 28 6 V10 H-10 Z" /></g></g></g>
        <g data-j="thighN" data-at="3,0"><rect className="pn" x="-10" y="-10" width="20" height="74" rx="10" />
          <g data-j="shinN" data-at="0,64"><rect className="pn" x="-9" y="-9" width="18" height="69" rx="9" />
            <g data-j="footN" data-at="0,60"><path className="sh" d="M-10 -5 H14 Q28 -4 28 6 V10 H-10 Z" /></g></g></g>
        <g data-j="spine" data-at="0,0">
          <g data-j="uarmF" data-at="0,-92"><rect className="cl3" x="-7.5" y="-7.5" width="15" height="53.5" rx="7.5" />
            <g data-j="farmF" data-at="0,46"><rect className="cl3" x="-7" y="-7" width="14" height="49" rx="7" />
              <g data-j="handF" data-at="0,42"><circle className="sk2" r="7" /></g></g></g>
          <path className="cl" d="M-19 8 C-23 -30 -24 -70 -18 -92 C-14 -106 -2 -112 8 -111 C20 -110 26 -100 25 -86 L22 8 Z" />
          <path className="det" d="M-2 -34 H20" style={{ stroke: 'var(--cl3)' }} />
          <path className="cl2" d="M-15 -94 C-30 -100 -27 -122 -9 -121 L3 -108 Z" />
          <path className="det" d="M13 -100 L14 -80 M17 -101 L18 -84" style={{ stroke: 'var(--cl3)' }} />
          <g data-j="head" data-at="4,-104">
            <rect className="sk" x="-5" y="-20" width="12" height="22" />
            <circle className="sk" cx="5" cy="-38" r="23" />
            <path className="sk" d="M-9 -32 C-7 -18 4 -11 16 -11 C22 -11 26 -15 27 -23 L28 -32 Z" />
            <path className="sk" d="M26 -45 C30 -41 33 -35 32.5 -31.5 C31 -29.5 28 -29.5 25 -30.5 Z" />
            <path className="hr" d="M-4 -40 L1 -40 C2 -31 6 -26 13 -25 C18 -24 24 -26 29.5 -27.5 L30.5 -22 C30.5 -12 22 -5 12 -5 C2 -5 -6 -13 -7 -26 Z" />
            <path className="hr" d="M17 -29.5 C22 -32.5 28 -32.5 32.5 -28.5 L31.5 -25.5 C26 -27.5 21 -27.5 18 -25.5 Z" />
            <ellipse className="sk2" cx="-1" cy="-37" rx="4.5" ry="6.5" />
            <path className="hr" d="M-17.5 -34 C-22 -55 -8 -67 8 -66 C21 -66 30 -59 31 -50 L27.5 -50.5 L29 -46.5 C23 -48.5 17 -48.5 12 -46.5 C8.5 -45 5 -44 1.5 -44.5 L-1.5 -39 L-5 -33 C-10 -31 -15 -31 -17.5 -34 Z" />
            <path className="brow" d="M14 -48 C18 -50 23 -50 27 -48" />
            <ellipse data-r="eye" className="eye" cx="21" cy="-40.5" rx="1.9" ry="1.9" />
            <rect className="ln" x="14" y="-45" width="13.5" height="9.5" rx="3" />
            <path className="frl" d="M14 -41 L-1 -39.5 M27.5 -41 L30 -41" />
            <path className="glint" d="M17 -43.5 L19.5 -41" />
            <g data-r="headset" opacity="0">
              <path className="hand" d="M-14 -52 C-8 -72 18 -72 22 -58" style={{ stroke: 'var(--o)', strokeWidth: 4 }} />
              <ellipse className="o" cx="-1" cy="-37" rx="7" ry="9" />
              <path className="hand" d="M2 -30 C8 -20 16 -17 24 -19" style={{ stroke: 'var(--o)', strokeWidth: 2 }} />
            </g>
          </g>
          <g data-j="uarmN" data-at="2,-92"><rect className="cl" x="-7.5" y="-7.5" width="15" height="53.5" rx="7.5" />
            <g data-j="farmN" data-at="0,46"><rect className="cl" x="-7" y="-7" width="14" height="49" rx="7" />
              <g data-j="handN" data-at="0,42">
                <g data-r="spoon" opacity="0"><path className="o4" d="M0 -2 L13 -6 L13.6 -4 L0.6 0 Z" /><ellipse className="o4" cx="15" cy="-5.5" rx="3.5" ry="2" /></g>
                <g data-r="pad" opacity="0"><path className="o" d="M-6 -8 C-11 -8 -13 0 -10 6 C-8 9 -4 8 -2 4 L12 4 C14 8 18 9 20 6 C23 0 21 -8 16 -8 Z" /><circle className="led" cx="12" cy="-3" r="1" /></g>
                <g data-r="phone" opacity="0"><ellipse cx="6" cy="-4" rx="34" ry="26" fill="url(#rm-warm)" /><rect className="o" x="0" y="-10" width="7" height="12" rx="1.5" /><rect className="ink" x="1" y="-9" width="5" height="10" rx="1" /></g>
                <circle className="sk" r="7" />
              </g></g></g>
        </g>
      </g>
      {/* the blanket over me while I sleep */}
      <g data-r="blanketOn">
        <path className="cl3" d="M176 470 C180 444 200 430 236 428 C286 426 334 432 374 436 C402 438 422 448 428 466 L430 500 L176 500 Z" />
        <path className="det" d="M220 446 C260 440 300 444 340 442 M300 470 C330 466 360 470 400 466" />
      </g>

      {/* the cat */}
      <g data-r="cat" className="rm-cat" data-cursor="Pet">
        <g data-r="catSit">
          <path data-r="tailSit" className="tail" d="M-14 -4 C-30 -2 -36 -14 -30 -24" />
          <path className="cat" d="M-18 0 C-24 -18 -18 -36 -2 -38 C10 -38 16 -28 16 -14 C16 -4 12 0 6 0 Z" />
          <rect className="cat" x="5" y="-18" width="8" height="18" rx="4" />
          <path className="cat" d="M-1 -50 L0 -64 L8 -54 Z M10 -55 L18 -64 L19 -48 Z" />
          <circle className="cat" cx="8" cy="-44" r="12" />
          <circle className="ceye" cx="3.5" cy="-45" r="3" /><circle className="ceye" cx="12.5" cy="-45" r="3" />
          <g data-r="pupS"><ellipse className="cpup" cx="3.5" cy="-45" rx="0.9" ry="2.3" /><ellipse className="cpup" cx="12.5" cy="-45" rx="0.9" ry="2.3" /></g>
        </g>
        <g data-r="catWalk" opacity="0">
          <path data-r="tailWalk" className="tail" d="M-24 -24 C-36 -32 -36 -48 -26 -52" />
          <g data-r="legsA"><rect className="cat" x="-20" y="-16" width="7" height="16" rx="3" /><rect className="cat" x="10" y="-16" width="7" height="16" rx="3" /></g>
          <g data-r="legsB" opacity="0"><rect className="cat" x="-13" y="-16" width="7" height="16" rx="3" /><rect className="cat" x="17" y="-16" width="7" height="16" rx="3" /></g>
          <ellipse className="cat" cx="0" cy="-21" rx="26" ry="11" />
          <path className="cat" d="M18 -36 L19 -48 L26 -39 Z M28 -40 L34 -48 L35 -33 Z" />
          <circle className="cat" cx="27" cy="-31" r="10.5" />
          <circle className="ceye" cx="31" cy="-32" r="2.2" /><ellipse className="cpup" cx="31.6" cy="-32" rx="0.8" ry="1.8" />
        </g>
        <g data-r="catLoaf" opacity="0">
          <path data-r="tailHang" className="tail" d="M-38 -6 C-54 -2 -56 20 -47 40 C-43 50 -48 58 -54 54" />
          <path data-r="tailWrap" className="tail" d="M-36 -3 C-46 2 -40 6 -26 5 C-8 4 8 5 20 3" opacity="0" />
          <path className="cat" d="M-40 0 C-42 -20 -22 -27 2 -26 C26 -25 40 -16 39 0 Z" />
          <path className="cat" d="M16 -25 L18 -44 L29 -33 Z M34 -34 L44 -44 L45 -25 Z" />
          <circle className="cat" cx="31" cy="-21" r="13" />
          <circle className="ceye" cx="25.5" cy="-22" r="3.2" /><circle className="ceye" cx="36.5" cy="-22" r="3.2" />
          <g data-r="pupL"><ellipse className="cpup" cx="25.5" cy="-22" rx="1" ry="2.5" /><ellipse className="cpup" cx="36.5" cy="-22" rx="1" ry="2.5" /></g>
          <path className="cat" d="M26 0 C26 6 34 6 34 0 Z" />
        </g>
        <g data-r="catCurl" opacity="0">
          <ellipse className="cat" cx="-2" cy="-13" rx="25" ry="13" />
          <path className="tail" d="M-22 -4 C-8 6 16 6 26 -2" />
          <path className="cat" d="M10 -20 L12 -30 L18 -23 Z M20 -24 L27 -30 L28 -18 Z" />
          <circle className="cat" cx="18" cy="-14" r="10.5" />
          <path className="ink-line" d="M13 -14 Q15.5 -11.5 18 -14 M20 -14 Q22.5 -11.5 25 -14" style={{ opacity: 0.6 }} />
        </g>
      </g>

      {/* light: over everything it falls on */}
      <ellipse data-r="monGlow" cx="1060" cy="352" rx="300" ry="230" fill="url(#rm-glow)" opacity="0" />
      <ellipse data-r="tvGlow" cx="1470" cy="350" rx="300" ry="220" fill="url(#rm-glow)" opacity="0" />
      <circle data-r="pcGlow" cx="1151" cy="500" r="70" fill="url(#rm-warm)" opacity="0.4" />
      <ellipse data-r="pendGlow" cx="700" cy="360" rx="150" ry="170" fill="url(#rm-warm)" opacity="0" />
      <ellipse data-r="floorGlow" cx="1323" cy="380" rx="170" ry="190" fill="url(#rm-warm)" opacity="0" />
      <ellipse data-r="bedGlow" cx="512" cy="460" rx="130" ry="110" fill="url(#rm-warm)" opacity="0" />

      {/* what the room says */}
      <g data-r="zzz">{[0, 1, 2].map(n => <text key={n} data-z={n} className="bubble" fontSize={12 + n * 3}>z</text>)}</g>
      <path data-r="heart" className="ink" d="M0 0 C-6 -5 -8 -11 -4 -13 C-2 -14 0 -12 0 -10 C0 -12 2 -14 4 -13 C8 -11 6 -5 0 0 Z" opacity="0" />
      <text data-r="meow" className="txt" fontSize="11" textAnchor="middle" opacity="0">mrrp?</text>
    </svg>
  );
}
