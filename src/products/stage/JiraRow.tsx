// One Jira Board ticket row, drawn large for the anatomy block. Given a `part`, every other part dims and that one is
// drawn in its `state`: a type, a status, a priority, an age, or the parent named through a board.
import type { LiveProps } from '../types';
import { ACME, ISSUES, ROW_AGES, ROW_PRIORITY, ROW_STATUS, ROW_TYPES, STATUS_CAT, ageOf, ticketOf } from './jira';
import { catOf, Ring, RowView } from './jiraParts';
import '../styles/jira-demo.css';

const LEVEL: Record<string, number> = { Initiative: 2, Epic: 1, 'Sub-task': -1 };

export function JiraRow({ alt, part, state = 0 }: LiveProps) {
  const base = ticketOf(ISSUES, ACME);
  const t = { ...base };
  let age = ageOf(ISSUES[ACME].updated);
  let via = false;
  if (part === 'type') { const ty = ROW_TYPES[state % ROW_TYPES.length]; t.type = ty; t.level = LEVEL[ty] ?? 0; }
  if (part === 'status') { const st = ROW_STATUS[state % ROW_STATUS.length]; t.status = st; t.category = STATUS_CAT[st]; }
  if (part === 'priority') t.priority = ROW_PRIORITY[state % ROW_PRIORITY.length];
  if (part === 'age') age = ageOf(ROW_AGES[state % ROW_AGES.length]);
  if (part === 'parent') via = state % 2 === 1;
  const cat = catOf(t.category);
  return (
    <div className="jbd" style={{ height: '100%' }}><div className="jbd-live" data-show={part} role="img" aria-label={alt}>
      <ul className="jbd-rows">
        <RowView t={t} parent={t.epic} via={via} age={age} status={<span className="jbd-st"><Ring cat={cat} /></span>} />
      </ul>
    </div></div>
  );
}
