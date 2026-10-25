import { useEffect, useRef, useState } from 'react';
import { PHONE, PHONE_DISPLAY } from '@/content/data';

/** Copies the phone number; where the clipboard is out, it shows the number instead. */
export function CopyPhone({ className }: { className: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'shown'>('idle');
  const t = useRef(0);
  useEffect(() => () => clearTimeout(t.current), []);
  const copy = () => {
    if (!navigator.clipboard?.writeText) { setState('shown'); return; }
    navigator.clipboard.writeText(PHONE).then(() => {
      setState('copied');
      clearTimeout(t.current);
      t.current = window.setTimeout(() => setState(s => (s === 'copied' ? 'idle' : s)), 1800);
    }).catch(() => setState('shown'));
  };
  return (
    <button type="button" onClick={copy} aria-live="polite" className={className}>
      {/* Keyed by state: a new label mounts unsplit when the text changes (useLetterRoll). */}
      <span key={state} data-letter-roll>{state === 'shown' ? PHONE_DISPLAY : state === 'copied' ? 'Copied' : 'Copy phone'}</span>
    </button>
  );
}
