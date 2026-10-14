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
	type: 'video' | 'list' | 'quotes' | 'table' | 'text' | 'upload' | (string & {});
	title: string;
	subtitle?: string;
	body?: string;
	items?: CardItem[];
	/** Table cards: column headings and rows of cells (first column labels the row). */
	columns?: string[];
	rows?: (string | number)[][];
	/** Free-form extras, e.g. `videoId` and `streamUrl` for video cards. */
	data?: Record<string, unknown>;
};

/** What a video card shows besides its title and summary; filled in on the server, URLs are signed. */
export type VideoCardData = {
	videoId: string;
	streamUrl?: string;
	poster?: string;
	duration?: number;
	scenes?: { title: string; start: number; thumb?: string }[];
	characters?: { name: string; role?: string; actor?: string; image?: string }[];
	themes?: { name: string; description?: string }[];
	/** `time`: seconds where the brand first shows up. */
	brands?: { name: string; category?: string; time?: number }[];
};

/** What the assistant did to the cards this turn, in order. */
export type CardOp =
	{ op: 'add'; card: Card } | { op: 'update'; card: Card } | { op: 'focus'; id: string };

export type ChatResponse = {
	text: string;
	ops: CardOp[];
	/** Opaque conversation history; send it back with the next message. */
	history: unknown[];
	/** Project name/summary after this turn (the assistant may rename it). */
	project?: { name: string; summary?: string };
	/** Answers the assistant offers; shown as buttons in place of the input until the user replies. */
	choices?: string[];
	error?: string;
};
