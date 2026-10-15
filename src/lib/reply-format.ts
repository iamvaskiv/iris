/**
 * The little formatting Lumi's replies may use: paragraphs (separated by a blank line), bullet lists ("- " lines)
 * and **bold**. Everything else stays plain text, so nothing in a reply is ever interpreted as HTML.
 */
export type Run = { text: string; bold: boolean };
export type Block = { kind: 'paragraph'; runs: Run[] } | { kind: 'list'; items: Run[][] };

const BULLET = /^\s*[-•*]\s+/;

/** Splits text into plain and **bold** runs. An unclosed ** is kept as text. */
export function runs(text: string): Run[] {
	const out: Run[] = [];
	const re = /\*\*(.+?)\*\*/g;
	let last = 0;
	for (const m of text.matchAll(re)) {
		if (m.index > last) out.push({ text: text.slice(last, m.index), bold: false });
		out.push({ text: m[1], bold: true });
		last = m.index + m[0].length;
	}
	if (last < text.length) out.push({ text: text.slice(last), bold: false });
	return out;
}

export function blocks(text: string): Block[] {
	const out: Block[] = [];
	let paragraph: string[] = [];
	const flush = () => {
		if (paragraph.length) out.push({ kind: 'paragraph', runs: runs(paragraph.join(' ')) });
		paragraph = [];
	};
	for (const line of text.trim().split('\n')) {
		if (!line.trim()) {
			flush();
		} else if (BULLET.test(line)) {
			flush();
			const item = runs(line.replace(BULLET, '').trim());
			const prev = out.at(-1);
			if (prev?.kind === 'list') prev.items.push(item);
			else out.push({ kind: 'list', items: [item] });
		} else {
			paragraph.push(line.trim());
		}
	}
	flush();
	return out;
}
