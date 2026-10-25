import { github, type Account } from '@/content/github';
import { cn } from '@/lib/utils';

// What each badge is for, short, after GitHub's own descriptions (unknown ones show their name only).
const ABOUT: Record<string, string> = {
  'pair-extraordinaire': 'Co-authored commits on merged pull requests',
  quickdraw: 'Closed an issue or pull request within 5 minutes',
  'arctic-code-vault-contributor': 'Code in the 2020 GitHub Archive Program',
  yolo: 'Merged a pull request without a review',
  'galaxy-brain': 'Answered discussions',
  starstruck: 'Created a repository with many stars',
  'public-sponsor': 'Sponsored open source work',
};
// Pull Shark's levels as merged pull requests: the counts GitHub's own badge page lists
// (2nd, 16th, 128th merged). Other badges show their level only, as GitHub does.
const PULL_SHARK = [2, 16, 128, 1024];
const about = (slug: string, tier: number) => (slug === 'pull-shark' ? `${PULL_SHARK[tier - 1]}+ pull requests merged` : ABOUT[slug]);
const ACCOUNT_NAME: Record<Account, string> = { careem: 'Careem', personal: 'Personal' };

type Badge = { slug: string; name: string; tier: number; image: string; on: { who: Account; tier: number }[] };

/** Each badge once, at its highest level and with that level's art, plus every account that holds it. */
export const BADGES = (() => {
  const by = new Map<string, Badge>();
  for (const who of ['careem', 'personal'] as const) for (const a of github.achievements[who]) {
    const b = by.get(a.slug) ?? { ...a, on: [] };
    if (a.tier > b.tier) Object.assign(b, { tier: a.tier, image: a.image });
    b.on.push({ who, tier: a.tier });
    by.set(a.slug, b);
  }
  for (const b of by.values()) b.on.sort((x, y) => y.tier - x.tier);
  return [...by.values()].sort((a, b) => b.tier - a.tier || a.name.localeCompare(b.name));
})();

/**
 * The badges as on a GitHub profile: hover or focus one for what it is, click through to
 * the account's badge page.
 */
export function Badges() {
  return (
    <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
      <p className="label">Achievements</p>
      <ul className="relative flex flex-wrap gap-3 md:gap-4">
        {BADGES.map((b, i) => (
          <li key={b.slug} data-badge className="group md:relative">
            <a href={`https://github.com/${github.logins[b.on[0].who]}?achievement=${b.slug}&tab=achievements`} target="_blank" rel="noreferrer"
              aria-describedby={`badge-${b.slug}`} className="relative block rounded-full">
              <img src={`./github-badges/${b.image}`} alt={`${b.name}${b.tier > 1 ? `, level ${b.tier}` : ''}`} width={72} height={72} loading="lazy" decoding="async"
                className="size-16 transition-transform duration-(--dur-hit) ease-out-expo group-hover:scale-110 md:size-[72px]" />
              {b.tier > 1 && <span aria-hidden="true" className="absolute -right-1 bottom-0 rounded-full bg-fg px-1.5 font-mono text-[10px] font-semibold leading-4 text-carbon">x{b.tier}</span>}
            </a>
            {/* Never leaves the screen: on phones it starts where the row starts; wider, it
                opens from its badge toward the middle of the row. */}
            <div id={`badge-${b.slug}`} role="tooltip"
              className={cn('pointer-events-none invisible absolute bottom-full z-10 mb-3 w-max max-w-60 border border-line bg-panel px-3 py-2 text-xs opacity-0 shadow-lg transition-opacity duration-(--dur-hit)',
                'left-0 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100', i >= BADGES.length / 2 && 'md:left-auto md:right-0')}>
              <span className="block font-semibold text-fg">{b.name}{b.tier > 1 ? ` x${b.tier}` : ''}</span>
              {about(b.slug, b.tier) && <span className="mt-0.5 block text-mute">{about(b.slug, b.tier)}</span>}
              <span className="mt-1 block font-mono text-[11px] text-dim">{b.on.map(o => `${ACCOUNT_NAME[o.who]}${o.tier > 1 ? ` x${o.tier}` : ''}`).join(' · ')}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
