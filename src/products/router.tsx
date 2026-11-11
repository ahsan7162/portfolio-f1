// Path routing for the products pages: /products is the main page, /products/<slug> a product.
import { useSyncExternalStore, type AnchorHTMLAttributes, type ReactNode } from 'react';

import { HOME } from './paths';

export { HOME, productPath } from './paths';

export type Route = { page: 'home' } | { page: 'detail'; slug: string };

export function parseRoute(pathname: string): Route {
  const slug = pathname.replace(/\/+$/, '').slice(HOME.length).replace(/^\/+/, '');
  return slug ? { page: 'detail', slug } : { page: 'home' };
}

type Leave = (to: string) => Promise<void>;
let leave: Leave | null = null;
/** The shell registers its page-leaving wipe here; navigate() waits for it before the URL changes. */
export function onLeave(fn: Leave | null) { leave = fn; }

const listeners = new Set<() => void>();
let busy = false;

export async function navigate(to: string) {
  if (busy || to === window.location.pathname) return;
  busy = true;
  try { await leave?.(to); } finally { busy = false; }
  window.history.pushState(null, '', to);
  listeners.forEach(l => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  window.addEventListener('popstate', l);
  return () => { listeners.delete(l); window.removeEventListener('popstate', l); };
}

export function usePath() {
  return useSyncExternalStore(subscribe, () => window.location.pathname, () => HOME);
}

/** An in-app link: a real <a href>, so it can be opened in a new tab, that navigates without a reload. */
export function Link({ to, children, onClick, ...rest }: { to: string; children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      href={to}
      onClick={e => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        void navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
