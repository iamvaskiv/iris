/**
 * A card is the visual answer the assistant puts in the center of the screen.
 * New kinds of cards: add a `type` here, describe it in the agent's show_card tool,
 * and register a component in `registry.ts`. Unknown types fall back to TextCard.
 */
export type CardItem = {
	title: string;
	subtitle?: string;
	description?: string;
	/** Seconds into the video, if the item points at a moment. */
	time?: number;
};

export type Card = {
	id: string;
	type: 'video' | 'list' | 'quotes' | 'text' | (string & {});
	title: string;
	subtitle?: string;
	body?: string;
	items?: CardItem[];
	/** Free-form extras, e.g. `videoId` and `streamUrl` for video cards. */
	data?: Record<string, unknown>;
};

/** What the assistant did to the cards this turn, in order. */
export type CardOp = { op: 'add'; card: Card } | { op: 'update'; card: Card } | { op: 'focus'; id: string };

export type ChatResponse = {
	text: string;
	ops: CardOp[];
	/** Opaque conversation history; send it back with the next message. */
	history: unknown[];
	/** Project name/summary after this turn (the assistant may rename it). */
	project?: { name: string; summary?: string };
	error?: string;
};
