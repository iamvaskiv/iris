import type { Card } from './cards/types.js';

export type Project = {
	id: string;
	name: string;
	/** One-line takeaway shown on the project tile; kept up to date by the assistant. */
	summary?: string;
	/** Short in-progress status, e.g. "Analysing video…". */
	status?: string;
	videoIds: string[];
	cards: Card[];
	focusedId?: string;
	/** Latest assistant reply, shown in the dock when the project is reopened. */
	reply?: string;
	/** Answers offered with the latest reply, still waiting for the user to pick one. */
	choices?: string[];
	/** Opaque LLM conversation history. */
	history: unknown[];
	createdAt: string;
	updatedAt: string;
};
