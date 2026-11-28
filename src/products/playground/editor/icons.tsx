// The editor's icons, drawn as strokes so they are sharp at any size and in every font (the arrows and boxes they
// replace came from whatever font had them). Each is decoration: the button around it carries the name.
const PATHS = {
  undo: 'M7 4.5 3.5 8 7 11.5M3.5 8h8.25a4.25 4.25 0 0 1 0 8.5H9',
  redo: 'M13 4.5 16.5 8 13 11.5M16.5 8H8.25a4.25 4.25 0 0 0 0 8.5H11',
  up: 'M10 15.5v-11M5.5 9 10 4.5 14.5 9',
  down: 'M10 4.5v11M5.5 11 10 15.5 14.5 11',
  copy: 'M7.5 7.5h9v9h-9zM12.5 7.5v-4h-9v9h4',
  remove: 'M4 6h12M8 6V4h4v2M5.5 6l.75 10.5h7.5L14.5 6',
  close: 'M5.5 5.5l9 9M14.5 5.5l-9 9',
  left: 'M3.5 4.5h13v11h-13zM8 4.5v11',
  right: 'M3.5 4.5h13v11h-13zM12 4.5v11',
  full: 'M3.5 7.5v-4h4M12.5 3.5h4v4M16.5 12.5v4h-4M7.5 16.5h-4v-4',
  unfull: 'M7.5 3.5v4h-4M16.5 7.5h-4v-4M12.5 16.5v-4h4M3.5 12.5h4v4',
  back: 'M12 4.5 6.5 10l5.5 5.5',
} as const;

export type IconName = keyof typeof PATHS;

export const Icon = ({ name }: { name: IconName }) => (
  <svg className="pg-svg" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={PATHS[name]} />
  </svg>
);

/** The key that goes with a shortcut's letter here: ⌘ on Apple devices, Ctrl+ elsewhere. */
export const MOD = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+';
