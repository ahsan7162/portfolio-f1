// The full stop (DESIGN.md, "The full stop"). Its own small module so the index can use it without the detail blocks' code.

/** A one-sentence label, caption or headline has no full stop; a line of two or more sentences keeps its stops. */
export const bare = (text: string) => (/[^.]\.$/.test(text) && (text.match(/[.!?](\s|$)/g) ?? []).length === 1 ? text.slice(0, -1) : text);

/** A display line (a scene headline, a hook) keeps its full stop as the house mark, in the product's colour. */
export const Stop = ({ text }: { text: string }) => (/[^.]\.$/.test(text) ? <>{text.slice(0, -1)}<span className="pp-stop">.</span></> : <>{text}</>);
