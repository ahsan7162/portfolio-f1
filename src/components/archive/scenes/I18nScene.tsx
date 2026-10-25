import { PALETTE } from '@/art/palette';
import { AC, CARBON, FG, type Fx, label, LINE, MUTE, t } from '@/components/scene-kit';
import { Scene, type SceneProps, Win } from '../scene';

// Product localization: the same settings screen in four languages

const LANGS = [
  { code: 'EN', title: 'Settings', lang: 'Language', value: 'English', notif: 'Notifications', date: 'Date format', cancel: 'Cancel', save: 'Save' },
  { code: 'IT', title: 'Impostazioni', lang: 'Lingua', value: 'Italiano', notif: 'Notifiche', date: 'Formato data', cancel: 'Annulla', save: 'Salva' },
  { code: 'DE', title: 'Einstellungen', lang: 'Sprache', value: 'Deutsch', notif: 'Mitteilungen', date: 'Datumsformat', cancel: 'Abbrechen', save: 'Speichern' },
  { code: 'FR', title: 'Paramètres', lang: 'Langue', value: 'Français', notif: 'Notifications', date: 'Format de date', cancel: 'Annuler', save: 'Enregistrer' },
] as const;
const KEYS = ['title', 'lang', 'value', 'notif', 'date', 'cancel', 'save'] as const;

function buildI18n({ tl, q, qa, scramble }: Fx) {
  const mark = q('[data-mark]'), codes = qa('[data-code]');
  tl.fromTo(q('[data-win]'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 }, 0);
  // EN → IT → DE → FR → EN: every string scrambles into the next language together.
  const order = [0, 1, 2, 3, 0];
  order.slice(1).forEach((li, step) => {
    const at = 0.65 + step * 1.1, A = LANGS[order[step]], B = LANGS[li];
    KEYS.forEach((k, j) => scramble(q(`[data-l="${k}"]`), A[k], B[k], at + j * 0.025, 0.4));
    tl.to(mark, { x: li * 18, duration: 0.3 }, at);
    codes.forEach((c, n) => tl.to(c, { fill: n === li ? PALETTE.fg : PALETTE.mute, duration: 0.15 }, at));
  });
}

export function I18nScene(p: SceneProps) {
  const L = LANGS[0];
  return (
    <Scene build={buildI18n} {...p}>
      <g data-win>
        <Win x={34} y={14} w={252} h={172} title="resources.resx" right={<text x="276" y="26.2" textAnchor="end" {...label()}>I18N</text>} />
        <text data-l="title" x="48" y="56" {...t(11, FG, 700)}>{L.title}</text>
        <text data-l="lang" x="48" y="80" {...t(6.8, MUTE)}>{L.lang}</text>
        <rect x="160" y="71" width="112" height="14" rx="2" fill={CARBON} stroke={LINE} />
        <text data-l="value" x="166" y="80.5" {...t(6.8)}>{L.value}</text>
        <path d="M262 76.5 l3 3 l3 -3" stroke={MUTE} />
        <text data-l="notif" x="48" y="104" {...t(6.8, MUTE)}>{L.notif}</text>
        <rect x="252" y="97" width="20" height="10" rx="5" fill={AC} />
        <circle cx="267" cy="102" r="3.4" fill={CARBON} />
        <text data-l="date" x="48" y="128" {...t(6.8, MUTE)}>{L.date}</text>
        <text x="272" y="128" textAnchor="end" {...t(6.8)}>DD/MM/YYYY</text>
        <line x1="34" y1="142" x2="286" y2="142" stroke={LINE} />
        {LANGS.map((l, i) => <text key={l.code} data-code x={48 + i * 18} y="166" {...label(i ? MUTE : FG)}>{l.code}</text>)}
        <rect data-mark x="47" y="170" width="11" height="1.5" fill={AC} />
        <rect x="166" y="156" width="50" height="16" rx="2" fill="none" stroke={LINE} />
        <text data-l="cancel" x="191" y="166.5" textAnchor="middle" {...t(6.6)}>{L.cancel}</text>
        <rect x="222" y="156" width="54" height="16" rx="2" fill={AC} />
        <text data-l="save" x="249" y="166.5" textAnchor="middle" {...t(6.6, CARBON, 700)}>{L.save}</text>
      </g>
    </Scene>
  );
}
