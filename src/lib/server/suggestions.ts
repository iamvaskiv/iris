import type Anthropic from '@anthropic-ai/sdk';
import { lanes, type Lane } from '#lib/cards/lanes.js';
import { laneSuggestions, MAX_SUGGESTIONS } from '#lib/cards/suggestions.js';
import type { Card, CardOp } from '#lib/cards/types.js';
import type { Project } from '#lib/projects.js';
import { transcript } from '#lib/transcript.js';
import { claude, FAST_MODEL } from './llm.js';

/**
 * Lumi's next steps for each lane after a turn (experimental lanes; see `cards/suggestions.ts`). A lane keeps its
 * suggestions until its cards change or all of them have been asked; then Lumi writes new ones, in one small call for
 * every lane that needs them.
 */
export async function nextSuggestions(project: Project, ops: CardOp[], history: unknown[]) {
	const all = lanes(project.cards).filter((l) => l.slots.some((s) => s.card.type !== 'upload'));
	const changed = new Set(ops.flatMap((op) => (op.op === 'focus' ? [] : [op.card.id])));
	const conversation = transcript(history);
	const asked = conversation.filter((m) => m.from === 'user').map((m) => m.text);

	const kept: Record<string, string[]> = {};
	for (const lane of all) {
		const fresh = laneSuggestions(lane, project.suggestions, asked);
		if (fresh.length && !lane.slots.some((s) => changed.has(s.card.id))) kept[lane.key] = fresh;
	}
	const needed = all.filter((l) => !kept[l.key]);
	if (!needed.length) return kept;
	try {
		return { ...kept, ...(await write(project, needed, conversation.slice(-6))) };
	} catch (e) {
		console.warn('No lane suggestions:', String(e));
		return kept;
	}
}

const schema = {
	type: 'object',
	properties: {
		lanes: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					topic: { type: 'string', description: 'The topic, exactly as given.' },
					suggestions: { type: 'array', items: { type: 'string' } }
				},
				required: ['topic', 'suggestions'],
				additionalProperties: false
			}
		}
	},
	required: ['lanes'],
	additionalProperties: false
};

/** One line per card: what the next steps can build on. */
const describe = (c: Card) =>
	`  - ${c.type} "${c.title}"${c.subtitle ? ` (${c.subtitle})` : ''}${c.body ? `: ${c.body.slice(0, 160)}` : ''}${
		c.items?.length
			? ` | ${c.items
					.map((i) => i.title)
					.join('; ')
					.slice(0, 200)}`
			: ''
	}`;

async function write(
	project: Project,
	needed: Lane[],
	conversation: { from: string; text: string }[]
): Promise<Record<string, string[]>> {
	const topics = needed
		.map(
			(l) =>
				`Topic "${l.title}":\n${[...new Set(l.slots.map((s) => s.card))].map(describe).join('\n')}`
		)
		.join('\n\n');
	const talk = conversation.map((m) => `${m.from}: ${m.text.slice(0, 400)}`).join('\n');
	const res = await claude().messages.create({
		model: FAST_MODEL,
		max_tokens: 1000,
		output_config: { format: { type: 'json_schema', schema } },
		messages: [
			{
				role: 'user',
				content: `You are Lumi, the assistant in Iris, an app for understanding videos and asking audiences about them. A project's cards are grouped by topic, and after each topic's last card the user sees 2-3 next steps they can click to ask you. Write them for each topic below.

Each next step is written as the user's request to you, 2-6 words ("What will people think about it?", "Compare the endings", "Add a question about Anxiety"). Make them specific to that topic's cards and to what the user is trying to do, and don't suggest what the cards or conversation already answer.

Project: "${project.name}"${project.summary ? ` (${project.summary})` : ''}

${topics}

Recent conversation:
${talk || '(none yet)'}`
			}
		]
	});
	const text = res.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text;
	if (!text) throw new Error('No suggestions written');
	const out: Record<string, string[]> = {};
	for (const { topic, suggestions } of (
		JSON.parse(text) as { lanes: { topic: string; suggestions: string[] }[] }
	).lanes) {
		const lane = needed.find((l) => l.title.toLowerCase() === topic.trim().toLowerCase());
		const list = [...new Set(suggestions.map((s) => s.trim()).filter(Boolean))].slice(
			0,
			MAX_SUGGESTIONS
		);
		if (lane && list.length) out[lane.key] = list;
	}
	return out;
}
