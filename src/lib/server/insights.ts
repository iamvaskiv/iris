import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { lumiere } from './lumiere.js';
import type { Insights } from '#lib/cards/types.js';

/**
 * Viewer insights (views, ratings, sentiment, answers to on-video questions, comments) for videos that were shown
 * to an audience. Built from the raw responses and cached in data/insights.json, since a video can have hundreds.
 */
const FILE = 'data/insights.json';
const TTL = 6 * 60 * 60 * 1000;
const TOP_COMMENTS = 4;

type Cached = { fetchedAt: string; insights: Insights | null };

type Response = {
	featureId: string;
	feedbackType: string;
	time: number;
	featureData: {
		question?: string;
		amount?: number;
		max?: number;
		value?: {
			slider?: number;
			rating?: number;
			choice?: { label: string }[];
			hotspot?: { label: string }[];
			'persistent-comment'?: string;
		};
		analysis?: { gptNLP?: { sentiment?: number; emotions?: string[] } };
	};
};

type Aggregations = {
	totalResponses: number;
	global: {
		sentiment: { sentiment: 'positive' | 'neutral' | 'negative'; count: number }[];
		feedbackTypes: { key: string; count: number }[];
		ratingAverage: number | null;
		ratingDistribution: { key: string; count: number }[];
	};
};

function read(): Record<string, Cached> {
	return existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : {};
}

function write(all: Record<string, Cached>) {
	mkdirSync('data', { recursive: true });
	writeFileSync(FILE, JSON.stringify(all, null, '\t'));
}

async function allResponses(videoId: string) {
	const out: Response[] = [];
	for (let offset = 0; ; offset += 500) {
		const page = await lumiere.feedback(videoId, offset);
		out.push(...(page.feedback as Response[]));
		if (!page.pagination.hasMore) return out;
	}
}

const round = (n: number) => Math.round(n * 10) / 10;
const countBy = (labels: string[]) => {
	const counts = new Map<string, number>();
	for (const l of labels.filter(Boolean)) counts.set(l, (counts.get(l) ?? 0) + 1);
	return [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
};

async function build(videoId: string): Promise<Insights | null> {
	const [views, aggregations, responses] = await Promise.all([
		lumiere.sessionCount(videoId).catch(() => undefined),
		lumiere.feedbackAggregations(videoId) as Promise<Aggregations>,
		allResponses(videoId)
	]);
	if (!views && !responses.length) return null;

	const byFeature = new Map<string, Response[]>();
	for (const r of responses) {
		// The same question is sometimes placed twice in a video; count it once.
		const key = r.featureData.question
			? `${r.feedbackType}:${r.featureData.question}`
			: r.featureId;
		byFeature.set(key, [...(byFeature.get(key) ?? []), r]);
	}

	const questions: Insights['questions'] = [];
	for (const group of byFeature.values()) {
		const { feedbackType: type, featureData } = group[0];
		if (!featureData.question) continue;
		const base = { question: featureData.question, type, responses: group.length };
		const values = group.map((r) => r.featureData.value);
		if (type === 'slider' || type === 'rating') {
			const nums = values
				.map((v) => (type === 'slider' ? v?.slider : v?.rating))
				.filter((n) => n !== undefined);
			questions.push({
				...base,
				average: round(nums.reduce((a, b) => a + b, 0) / nums.length),
				max:
					(type === 'rating' ? featureData.amount : featureData.max) ?? (type === 'rating' ? 5 : 10)
			});
		} else if (type === 'choice' || type === 'hotspot') {
			const labels = values.flatMap((v) => (v?.choice ?? v?.hotspot ?? []).map((o) => o.label));
			questions.push({ ...base, options: countBy(labels) });
		}
	}
	questions.sort((a, b) => b.responses - a.responses);

	const comments = responses
		.filter((r) => r.featureData.value?.['persistent-comment'])
		.map((r) => ({
			text: r.featureData.value!['persistent-comment']!.trim(),
			time: r.time,
			sentiment: r.featureData.analysis?.gptNLP?.sentiment ?? 0,
			emotions: r.featureData.analysis?.gptNLP?.emotions?.filter((e) => e !== 'neutral')
		}))
		.sort((a, b) => b.sentiment - a.sentiment);

	const bucket = (s: string) =>
		aggregations.global.sentiment.find((x) => x.sentiment === s)?.count ?? 0;
	const sentiment = {
		positive: bucket('positive'),
		neutral: bucket('neutral'),
		negative: bucket('negative')
	};
	// As the service reports it: across rating questions and star ratings attached to comments.
	const { ratingAverage } = aggregations.global;
	const ratingCount = aggregations.global.ratingDistribution.reduce((sum, r) => sum + r.count, 0);
	const ratingMax = questions.find((q) => q.type === 'rating')?.max ?? 5;

	return {
		videoId,
		views,
		responses: aggregations.totalResponses,
		rating: ratingAverage !== null ? { average: round(ratingAverage), max: ratingMax, count: ratingCount } : undefined,
		sentiment: sentiment.positive + sentiment.neutral + sentiment.negative ? sentiment : undefined,
		questions,
		liked: comments.filter((c) => c.sentiment > 0.2).slice(0, TOP_COMMENTS),
		disliked: comments
			.filter((c) => c.sentiment < -0.2)
			.reverse()
			.slice(0, TOP_COMMENTS),
		fetchedAt: new Date().toISOString()
	};
}

export const insights = {
	/** Cached for a few hours; `null` when nobody has watched or responded yet. */
	async get(videoId: string): Promise<Insights | null> {
		const cached = read()[videoId];
		if (cached && Date.now() - Date.parse(cached.fetchedAt) < TTL) return cached.insights;
		try {
			const fresh = await build(videoId);
			write({ ...read(), [videoId]: { fetchedAt: new Date().toISOString(), insights: fresh } });
			return fresh;
		} catch (e) {
			// Serve stale data rather than nothing if the refresh fails.
			if (cached) return cached.insights;
			throw e;
		}
	}
};
