// Daily GitHub contribution counts and achievement badges for both accounts, written
// by scripts/github.ts from the public profile pages. Dates, integers, badge names and
// GitHub's badge art only: no token, repository or organisation name is ever stored here.
import raw from './github.json';

export type Account = 'personal' | 'careem';
/** One year: counts per day per account, index 0 is 1 January (the current year stops at asOf). */
export type GithubYear = { year: number } & Record<Account, number[]>;
/** A badge from the public achievements page; tier is 1 to 4 (the x2 to x4 on the badge), image is its art in public/github-badges/. */
export type Achievement = { slug: string; name: string; tier: number; image: string };
export type GithubData = { asOf: string; logins: Record<Account, string>; achievements: Record<Account, Achievement[]>; years: GithubYear[] };

/** Newest year first. */
export const github: GithubData = raw;
