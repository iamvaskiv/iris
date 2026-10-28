/** One message of a conversation as people see it: what they typed and what Lumi answered. */
export type TranscriptMessage = { from: 'user' | 'assistant'; text: string };

/** Added to the user's turn when the model stops without a reply (see runLoop); never shown as theirs. */
export const REPLY_NUDGE = 'Now write your reply to the user.';

type Block = { type: string; text?: string };
type Message = { role: 'user' | 'assistant'; content: string | Block[] };

const texts = (content: Message['content']) =>
	typeof content === 'string'
		? [content]
		: content.flatMap((b) => (b.type === 'text' && b.text ? [b.text] : []));

/**
 * The readable conversation in an LLM history (Anthropic messages), oldest first. Tool calls and results are left
 * out, and each turn keeps only Lumi's final answer (the text she wrote after her last tool call), the one the dock
 * showed at the time.
 */
export function transcript(history: unknown[]): TranscriptMessage[] {
	const out: TranscriptMessage[] = [];
	let answer: string | undefined;
	const endTurn = () => {
		if (answer) out.push({ from: 'assistant', text: answer });
		answer = undefined;
	};
	for (const m of history as Message[]) {
		if (m.role === 'assistant') {
			const text = texts(m.content).join('\n').trim();
			if (text) answer = text;
			continue;
		}
		// Tool results go back to the model as user messages; they belong to Lumi's turn, not a new one.
		if (typeof m.content !== 'string' && m.content.some((b) => b.type === 'tool_result')) continue;
		const text = texts(m.content)
			.filter((t) => t !== REPLY_NUDGE)
			.join('\n')
			.trim();
		if (!text) continue;
		endTurn();
		out.push({ from: 'user', text });
	}
	endTurn();
	return out;
}
