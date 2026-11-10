import type { Attachment } from 'svelte/attachments';

/**
 * Ask Lumi: anything on a card can offer a question about itself. Mark an element with
 * `{@attach askable((e, el) => question)}`; over it, the page's AskLumi layer (one per page, see
 * `components/AskLumi.svelte`) shows a glow by the cursor, and right-clicking sends that question to Lumi. The
 * question is worked out from the right-click, so a chart can ask about the moment under the pointer. Return nothing for "no question here". The innermost askable element under the pointer wins.
 * Without an AskLumi layer on the page (Storybook without one, other pages) the marks do nothing.
 *
 * The question function gets the pointer event and the marked element (to work out where along it the pointer is).
 */
export type Question = (e: MouseEvent, el: Element) => string | null | undefined | false;

const questions = new WeakMap<Element, Question>();

export function askable(question: Question | string | null | undefined | false): Attachment {
	return (el) => {
		if (!question) return;
		questions.set(el, typeof question === 'string' ? () => question : question);
		el.setAttribute('data-askable', '');
		return () => {
			questions.delete(el);
			el.removeAttribute('data-askable');
		};
	};
}

/** The innermost askable element at the pointer and its question there, if any. */
export function questionAt(e: MouseEvent): { el: Element; question: string } | null {
	let node = e.target instanceof Element ? e.target.closest('[data-askable]') : null;
	while (node) {
		const ask = questions.get(node);
		const question = ask?.(e, node);
		if (question) return { el: node, question };
		node = node.parentElement?.closest('[data-askable]') ?? null;
	}
	return null;
}

/** “Title”, for quoting a card or item in a question. */
export const quoted = (s: string) => `“${s}”`;

/** The pointer's position along an element, 0 to 1 (for questions about a moment on a timeline). */
export function fractionAlong(e: MouseEvent, el: Element) {
	const box = el.getBoundingClientRect();
	return box.width ? Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)) : 0;
}
