// Live screens: screens drawn in code, looked up by the name a block's `media` gives.
import { lazy, Suspense, type ComponentType } from 'react';
import type { LiveProps } from '../types';
import { DASHES } from './dash';
import { DashView } from './DashView';
import { JiraRow } from './JiraRow';
import { MdPage } from './MdPage';
import type { DashName, LiveName, OuiName } from './names';

// The OpenUI kit is the heaviest drawing on the site: it loads only when one of its screens is about to show.
const OuiLive = lazy(() => import('./oui/OuiLive'));

const dash = (name: DashName) => (p: LiveProps) => <DashView dash={DASHES[name]} {...p} />;
const page = (template: string) => (p: LiveProps) => <MdPage template={template} {...p} />;

/** Name to component. Typed by LiveName, so a name with no component does not compile. */
const LIVE: Record<Exclude<LiveName, OuiName>, ComponentType<LiveProps>> = {
  'dash:sales': dash('dash:sales'),
  'dash:branch': dash('dash:branch'),
  'dash:bench': dash('dash:bench'),
  'dash:orders': dash('dash:orders'),
  'dash:pricing': dash('dash:pricing'),
  'md:tpl-readme': page('readme'),
  'md:tpl-meeting-notes': page('meeting-notes'),
  'md:tpl-adr': page('adr'),
  'md:tpl-prd': page('prd'),
  'md:tpl-rfc': page('rfc'),
  'md:tpl-changelog': page('changelog'),
  'md:tpl-bug-report': page('bug-report'),
  'md:tpl-runbook': page('runbook'),
  'md:tpl-pr-description': page('pr-description'),
  'md:tpl-postmortem': page('postmortem'),
  'md:tpl-weekly-status': page('weekly-status'),
  'jira:row': JiraRow,
};

export function LiveScreen({ name, ...props }: LiveProps & { name: LiveName }) {
  if (name.startsWith('oui:')) {
    return <Suspense fallback={<div className="oul" aria-label={props.alt} role="img" />}><OuiLive name={name as OuiName} {...props} /></Suspense>;
  }
  const C = LIVE[name as Exclude<LiveName, OuiName>];
  return <C {...props} />;
}
