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
		| 'sources'
		| 'viewers'
		| (string & {});
	title: string;
	subtitle?: string;
	/**
	 * The topic the card belongs to, set by Lumi: cards with the same topic share a lane (experimental lanes). Without
	 * one, rules in `lanes.ts` place the card.
	 */
	topic?: string;
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
	scenes?: { title: string; start: number; end?: number; thumb?: string }[];
	characters?: {
		name: string;
		role?: string;
		actor?: string;
		image?: string;
		appearances?: Span[];
	}[];
	themes?: { name: string; description?: string; appearances?: Span[] }[];
	/** `time`: seconds where the brand first shows up. */
	brands?: { name: string; category?: string; time?: number; appearances?: Span[] }[];
	/** What viewers made of it, when it was shown to an audience. */
	viewers?: Insights;
};

/**
 * Where something shows up in a video, in seconds. From Lumiere's moments (spans of about ten seconds that list who
 * and what is in them), with back-to-back moments joined into one.
 */
export type Span = { start: number; end: number };

/** Sources card data: one video, to compare its viewer data across sources (Lumiere's, and the project's studies). */
export type SourcesData = {
	videoId: string;
	videoName?: string;
	duration?: number;
	scenes?: { title: string; start: number; end?: number }[];
	/** Lumiere's viewer data, when it was shown to an audience there. */
	viewers?: Insights;
};

/**
 * Viewers card data: several videos, to compare how their viewers reacted. Each video's viewer data comes from Lumiere
 * (`viewers`) or, picked on the card, from one of the project's studies that shows it.
 */
export type ViewersData = {
	videoIds: string[];
	videos: ViewersVideo[];
};

export type ViewersVideo = {
	videoId: string;
	name: string;
	poster?: string;
	streamUrl?: string;
	duration?: number;
	/** Lumiere's viewer data, when it was shown to an audience there. */
	viewers?: Insights;
};

/**
 * What viewers made of a video, from any source (Lumiere's real viewers, or a study's sample results): how many, the
 * rating and sentiment, and every comment and rating at the moment it was given.
 */
export type ViewerData = {
	/** Estimated viewing sessions (Lumiere: over the last year, not unique viewers). */
	views?: number;
	/** How many responded (Lumiere) or watched (a study). */
	responses: number;
	rating?: { average: number; max: number; count: number };
	/** Comment sentiment counts. */
	sentiment?: { positive: number; neutral: number; negative: number };
	/** Every comment, in the order of where in the video it was left. */
	comments?: InsightComment[];
	/** Every rating, where in the video it was given: from `min` (1 star, unless set) to `max`. */
	ratings?: { time: number; value: number; max: number; min?: number }[];
};

/** Viewer insights card data: what an audience made of a video on Lumiere, with its on-video questions. */
export type Insights = ViewerData & {
	videoId: string;
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
	 * By question id: how many answered (or, for a video, watched; for a channel, reached it), votes per option (multiple
	 * choice), per value 0–10 (slider), per sentiment (video: positive, neutral, negative) or how many opened each of
	 * its videos (channel, in order; people open several, so these add up to more), and some individual responses (a sample of
	 * everyone who answered, newest first; for a video, their reactions).
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
	/** Slider: the number they picked, 0–10. */
	value?: number;
	/** Videos: when in it they left their comment (seconds), and the stars (1–5) they gave it. */
	time?: number;
	rating?: number;
};

export type Question = {
	id: string;
	/**
	 * `open`: a free-text answer. `choice`: one of `options`. `scale`: a slider from 0 to 10. `video`: one of the
	 * user's videos (assets), shown to people; `text` isn't shown (older steps may have a line in it). `channel`: a collection of
	 * `videos` people browse as a grid and open full screen; `text` is the channel's name.
	 */
	type: 'open' | 'choice' | 'scale' | 'video' | 'channel';
	text: string;
	/** Open questions: hint in the empty answer field, e.g. "My name is…". */
	placeholder?: string;
	/** Multiple choice: the answers to pick from. */
	options?: string[];
	/** Video steps: which video (asset id), and its name for showing without a lookup. */
	videoId?: string;
	videoName?: string;
	/** Video steps: questions that pop up while the video plays, in time order (never videos themselves). */
	questions?: Question[];
	/** Questions inside a video: when they pop up, in seconds from the start. */
	time?: number;
	/** Channels: their videos, in grid order; each a video step (with its own questions). */
	videos?: Question[];
	/** Channels: in full screen, people move between videos by sliding up and down (else left and right). */
	vertical?: boolean;
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
	/** Lumi's next steps for each lane, by lane key, after this turn (see `server/suggestions.ts`). */
	suggestions?: Record<string, string[]>;
	error?: string;
};
