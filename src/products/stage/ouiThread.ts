// The OpenUI Live Replies demo's conversation, without React: who said what, which reply answers which message,
// and the words a click sent. A click in a block sends its text (the plugin's exact words, planning.tsx) as the
// visitor's next message, and the agent answers from this short script.
import { AFTER_APPROVE, AFTER_CHANGE, ASK, DECISION, PLAN, type Reply } from './oui/programs';

export interface Msg {
  id: number;
  who: 'me' | 'agent';
  text: string;
  /** The block an agent's reply carries. */
  program?: string;
  /** The reply is arriving now: its words, then its block, stream in. */
  live?: boolean;
  /** A message a click sent, not one typed. */
  byClick?: boolean;
}

/** What the agent says to a message, or null when the script has nothing (the demo stays quiet). */
export function replyTo(text: string): Reply | null {
  if (text === ASK) return DECISION;
  if (text.startsWith('Go with ')) return PLAN;
  if (text === 'Approve the plan') return { prose: AFTER_APPROVE, program: '' };
  if (text.startsWith('I want to change something')) return { prose: AFTER_CHANGE, program: '' };
  return null;
}

export const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

/** The tally: words the visitor sent without typing them. */
export const clickedWords = (msgs: Msg[]) => msgs.filter((m) => m.who === 'me' && m.byClick).reduce((a, m) => a + words(m.text), 0);

/** The thread after `text` is sent: the message, then (unless `wait`) the agent's whole reply. */
export function send(msgs: Msg[], text: string, byClick: boolean, wait = false): Msg[] {
  let id = msgs.length ? msgs[msgs.length - 1].id + 1 : 1;
  const out = [...msgs, { id: id++, who: 'me' as const, text, byClick }];
  const r = replyTo(text);
  return r && !wait ? [...out, { id, who: 'agent', text: r.prose, program: r.program || undefined }] : out;
}

/** The agent's reply to the last message, arriving now. */
export function answer(msgs: Msg[]): Msg[] {
  const last = msgs[msgs.length - 1];
  const r = last?.who === 'me' ? replyTo(last.text) : null;
  return r ? [...msgs, { id: last.id + 1, who: 'agent', text: r.prose, program: r.program || undefined, live: true }] : msgs;
}

/** The thread the demo opens on, when the visitor drives: the question asked and answered. */
export const OPENING: Msg[] = send([], ASK, false);

/** Selectors the scenes click, the same buttons the visitor clicks. */
export const TUNE = [
  'button[aria-label="More weight on Throughput"]', 'button[aria-label="More weight on Throughput"]',
  'button[aria-label="Less weight on Ops cost"]', 'button[aria-label="Less weight on Ops cost"]',
  'button[aria-label="Less weight on Ops cost"]', 'button[aria-label="Less weight on Ops cost"]',
];
export const GO = '.oui-decision .oui-btn[data-primary]';
export const APPROVE = '.oui-plan .oui-btn[data-primary]';
