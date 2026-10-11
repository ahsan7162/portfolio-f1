"""
Builds the site's web fonts into src/assets/fonts/, trimmed to what the CSS uses.

  python3 -m pip install fonttools brotli
  python3 scripts/fonts.py "path/to/Monaspace Krypton Var.ttf"

Sources:
- Hubot Sans (headings) and Mona Sans (text): the Fontsource files in node_modules,
  already cut to the latin set.
- Monaspace Krypton: "Monaspace Krypton Var.ttf" from monaspace-variable-v*.zip on
  https://github.com/githubnext/monaspace/releases (built from v1.400).

Each variable font keeps only the axis ranges the CSS asks for, which roughly halves
the download. If you use a new weight
or width, widen the range here and run the script again. Every "0" on the site is
plain, without a font-feature-settings rule: Krypton's plain zero (alternate cv01=1)
replaces its dotted one, and Hubot's zero loses the bar across its middle.
"""
from __future__ import annotations

import sys
from io import BytesIO
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._g_l_y_f import GlyphCoordinates
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'src/assets/fonts'
MONA = ROOT / 'node_modules/@fontsource-variable/mona-sans/files'
HUBOT = ROOT / 'node_modules/@fontsource-variable/hubot-sans/files'

# Basic Latin, Latin-1 (· ×), dashes, quotes and arrows.
UNICODES = 'U+0020-007E,U+00A0-00FF,U+2010-2027,U+2190-2193,U+2212'


def drop_contour(font: TTFont, glyph: str, index: int, points: int) -> None:
    """Deletes one contour of a glyph and its variation deltas (the glyphs have no hinting)."""
    variations = font['gvar'].variations.get(glyph, [])  # read before glyf changes: they are decoded by point count
    g = font['glyf'][glyph]
    ends = list(g.endPtsOfContours)
    start = ends[index - 1] + 1 if index else 0
    stop = ends[index] + 1
    if stop - start != points:
        raise SystemExit(f'{glyph}: contour {index} has {stop - start} points, expected {points}; the source font changed')
    g.coordinates = GlyphCoordinates(list(g.coordinates[:start]) + list(g.coordinates[stop:]))
    g.flags = g.flags[:start] + g.flags[stop:]
    g.endPtsOfContours = ends[:index] + [e - (stop - start) for e in ends[index + 1:]]
    g.numberOfContours -= 1
    for v in variations:
        v.coordinates = v.coordinates[:start] + v.coordinates[stop:]


def build(src: Path, out: str, axes: dict, features: str = '*', remap: dict | None = None, bars: tuple = ()) -> None:
    # Saved and reloaded between steps: the subsetter can't read the instancer's lazily loaded
    # tables. The source's timestamp is kept, so running the script again gives the same files.
    buf = BytesIO()
    instancer.instantiateVariableFont(TTFont(src, recalcTimestamp=False), axes).save(buf)
    buf.seek(0)
    font = TTFont(buf, recalcTimestamp=False)
    for glyph in bars:
        drop_contour(font, glyph, index=2, points=4)
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
    # Headings (.display): expanded (125%) only, 700 for supporting display, 800 for
    # headings, 900 for the name and 450+. The italic is the red accent words (700 and
    # 800) and the helmet livery (800).
    # The bar across Hubot's zero is its third contour, a 4-point rectangle over the counter.
    zeros = ('zero', 'zero.tf')
    build(HUBOT / 'hubot-sans-latin-standard-normal.woff2', 'hubot-sans.woff2', {'wght': (700, 900), 'wdth': 125}, bars=zeros)
    build(HUBOT / 'hubot-sans-latin-standard-italic.woff2', 'hubot-sans-italic.woff2', {'wght': (700, 800), 'wdth': 125}, bars=zeros)
    # Text: body 450 to the 600 small headings (700 for <strong>), normal (100%) to
    # semi-expanded (112.5%).
    build(MONA / 'mona-sans-latin-standard-normal.woff2', 'mona-sans.woff2', {'wght': (400, 700), 'wdth': (100, 112.5)})
    # Mono: 400 to 700 at normal width, upright. Contextual alternates (calt) keep
    # Monaspace's texture healing; the code ligature sets (ss01 to ss08) are dropped.
    build(Path(sys.argv[1]), 'monaspace-krypton.woff2', {'wght': (400, 700), 'wdth': 100, 'slnt': 0},
          features='calt,ccmp,locl,case', remap={0x30: 'zero.alt01'})


if __name__ == '__main__':
    main()
