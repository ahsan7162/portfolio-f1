"""
Builds the site's three web fonts into src/assets/fonts/, trimmed to what the CSS uses.

  python3 -m pip install fonttools brotli
  python3 scripts/fonts.py "path/to/Monaspace Krypton Var.ttf"

Sources:
- Mona Sans: the Fontsource files in node_modules (already cut to the latin set).
- Monaspace Krypton: "Monaspace Krypton Var.ttf" from monaspace-variable-v*.zip on
  https://github.com/githubnext/monaspace/releases (built from v1.400).

Each variable font keeps only the axis ranges the CSS asks for. This takes the three
files from 238 KB (with JetBrains Mono) down to about 130 KB. If you use a new weight
or width, widen the range here and run the script again. Krypton's plain zero
(alternate cv01=1) replaces the default dotted one, so every "0" is plain without a
font-feature-settings rule.
"""
from __future__ import annotations

import sys
from io import BytesIO
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'src/assets/fonts'
MONA = ROOT / 'node_modules/@fontsource-variable/mona-sans/files'

# Basic Latin, Latin-1 (· ×), dashes, quotes and arrows.
UNICODES = 'U+0020-007E,U+00A0-00FF,U+2010-2027,U+2190-2193,U+2212'


def build(src: Path, out: str, axes: dict, features: str = '*', remap: dict | None = None) -> None:
    # Saved and reloaded between steps: the subsetter can't read the instancer's lazily loaded tables.
    buf = BytesIO()
    instancer.instantiateVariableFont(TTFont(src), axes).save(buf)
    buf.seek(0)
    font = TTFont(buf)
    for table in font['cmap'].tables:
        for code, glyph in (remap or {}).items():
            if code in table.cmap:
                table.cmap[code] = glyph
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = features.split(',')
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=subset.parse_unicodes(UNICODES))
    sub.subset(font)
    font.flavor = 'woff2'
    font.save(OUT / out)
    print(f'{out}: {(OUT / out).stat().st_size / 1024:.1f} KB')


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    OUT.mkdir(parents=True, exist_ok=True)
    # Upright: body 450 to the 900 hero, normal (100%) to expanded (125%).
    build(MONA / 'mona-sans-latin-standard-normal.woff2', 'mona-sans.woff2', {'wght': (400, 900), 'wdth': (100, 125)})
    # Italic: only the expanded accent words (700 and 800) and the helmet livery (800).
    build(MONA / 'mona-sans-latin-standard-italic.woff2', 'mona-sans-italic.woff2', {'wght': (700, 800), 'wdth': 125})
    # Mono: 400 to 700 at normal width, upright. Contextual alternates (calt) keep
    # Monaspace's texture healing; the code ligature sets (ss01 to ss08) are dropped.
    build(Path(sys.argv[1]), 'monaspace-krypton.woff2', {'wght': (400, 700), 'wdth': 100, 'slnt': 0},
          features='calt,ccmp,locl,case', remap={0x30: 'zero.alt01'})


if __name__ == '__main__':
    main()
