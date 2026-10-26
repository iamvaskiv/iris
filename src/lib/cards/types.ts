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
	type:
		| 'video'
		| 'insights'
		| 'comparison'
		| 'list'
		| 'quotes'
		| 'table'
		| 'text'
		| 'upload'
		| 'study'
		| (string & {});
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

/** Viewer insights card data: what an audience made of a video. */
export type Insights = {
	videoId: string;
	/** Estimated viewing sessions over the last year, not unique viewers. */
	views?: number;
	responses: number;
	rating?: { average: number; max: number; count: number };
	/** Comment sentiment counts. */
	sentiment?: { positive: number; neutral: number; negative: number };
	/** Answers to questions shown during the video: an average for sliders and ratings, counts per option otherwise. */
	questions: {
		question: string;
		type: string;
		responses: number;
		average?: number;
		max?: number;
		options?: { label: string; count: number }[];
	}[];
	/** Most positive and most negative comments, with the second of the video they were left at. */
	liked: InsightComment[];
	disliked: InsightComment[];
	fetchedAt: string;
};

export type InsightComment = { text: string; time: number; sentiment: number; emotions?: string[] };

/** Comparison card data: one column per video. The assistant's own rows live in the card's `rows`. */
export type ComparisonData = {
	videoIds: string[];
	/** Which rows to show: what's in the videos, how audiences responded, or both (default). */
	focus?: 'all' | 'content' | 'audience';
	videos: ComparedVideo[];
};

export type ComparedVideo = {
	videoId: string;
	name: string;
	poster?: string;
	duration?: number;
	/** Without an analysis there are no scenes, characters, themes or brands. */
	analysed: boolean;
	scenes?: number;
	/** Names, most relevant first. */
	characters?: string[];
	themes?: string[];
	brands?: string[];
	/** Viewer insights, when the video was shown to an audience. */
	audience?: Insights;
};

/**
 * Study card data: questions to share with people. Sharing isn't built yet; `sample` holds made-up results Lumi
 * writes for a demo (Share → Fake responses), shown instead of the setup while `enabled`.
 */
export type StudyData = {
	questions: Question[];
	sample?: { enabled: boolean; results?: SampleResults };
};

/** Made-up study results. All numbers and text are invented; the card labels them "Sample data". */
export type SampleResults = {
	/** The questions these results were written for; regenerated when they change. */
	basis: string;
	views: number;
	/** Percentages. */
	completion: number;
	rating: number;
	sentiment: { positive: number; neutral: number; negative: number };
	summary: string;
	insights: { title: string; body: string }[];
	quote: { text: string; who: string };
	/**
	 * By question id: how many answered, votes per option (multiple choice) and some individual responses (a sample of
	 * everyone who answered, newest first).
	 */
	questions: Record<string, { responses: number; counts?: number[]; people?: SampleResponse[] }>;
	/** Written by Lumi, or generic filler when Lumi couldn't be reached. */
	by: 'lumi' | 'filler';
};

/** One (made-up) person's answer to a question. */
export type SampleResponse = {
	/** "Respondent 23". */
	respondent: number;
	/** Age band, e.g. "24–32". */
	age: string;
	/** When they answered, e.g. "2 days ago". */
	when: string;
	/** Open questions: what they wrote, and how it reads. */
	text?: string;
	sentiment?: 'positive' | 'neutral' | 'negative';
	/** Multiple choice: the option they picked (index). */
	option?: number;
};

export type Question = {
	id: string;
	/** `open`: a free-text answer. `choice`: one of `options`. */
	type: 'open' | 'choice';
	text: string;
	/** Open questions: hint in the empty answer field, e.g. "My name is…". */
	placeholder?: string;
	/** Multiple choice: the answers to pick from. */
	options?: string[];
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
