import type { InsightComment, ViewerData } from './types';

/** Where a moment sits along a video, as a percentage of its length (kept within it). */
export const along = (time: number, duration: number) =>
	duration ? Math.min(100, Math.max(0, (time / duration) * 100)) : 0;

/** A video's scenes as segments, each running to its end (or the next one's start, or the video's end). */
export const sceneSegments = <S extends { start: number; end?: number }>(
	scenes: S[],
	duration: number
) => scenes.map((s, i) => ({ ...s, end: s.end ?? scenes[i + 1]?.start ?? duration }));

/**
 * A smooth curve through scattered values along a video (ratings or comment sentiment), for a small area chart: each
 * sample is the average of the values near it, weighted by how near (a Gaussian about `spread` seconds wide). Where
 * few are near, it eases back to `baseline`, so the curve is flat where nobody answered and rises or dips where they
 * did. Values and the result run from 0 to 1.
 */
export function smoothCurve(
	points: { time: number; value: number }[],
	duration: number,
	{ baseline = 0, samples = 200, spread = Math.max(3, duration / 60) } = {}
) {
	return Array.from({ length: samples }, (_, i) => {
		const t = (i / (samples - 1)) * duration;
		let weight = 0;
		let sum = 0;
		for (const p of points) {
			const w = Math.exp(-(((p.time - t) / spread) ** 2) / 2);
			weight += w;
			sum += w * p.value;
		}
		// Confidence: near 1 with a few values close by, near 0 with none.
		const sure = weight / (weight + 0.5);
		return weight ? baseline + (sum / weight - baseline) * sure : baseline;
	});
}

/** The curve as SVG paths in a 1000 × 100 box (0 at the bottom): its line, and the area under it. */
export function curvePaths(ys: number[]) {
	const pts = ys.map(
		(y, i) => `${((i / (ys.length - 1)) * 1000).toFixed(1)},${(100 - y * 100).toFixed(1)}`
	);
	const line = `M${pts.join('L')}`;
	return { line, area: `${line}L1000,100L0,100Z` };
}

/**
 * Comment sentiment along a video as curves, one per list of comments, about a neutral midline (0.5). Scaled together
 * so the biggest swing of any of them nearly fills the height: comments are often mildly positive throughout, and a
 * true scale would leave near-flat lines. Above the midline is still positive, below it negative.
 */
export function sentimentCurves(lists: InsightComment[][], duration: number) {
	const curves = lists.map((comments) =>
		smoothCurve(
			comments.map((c) => ({ time: c.time, value: (c.sentiment + 1) / 2 })),
			duration,
			{ baseline: 0.5 }
		)
	);
	const swing = Math.max(0, ...curves.flat().map((y) => Math.abs(y - 0.5)));
	return curves.map((ys) =>
		curvePaths(swing ? ys.map((y) => 0.5 + ((y - 0.5) / swing) * 0.45) : ys)
	);
}

/** The average rating along a video as a curve, from the lowest mark (one star, or 0 on a slider) to full marks. */
export function ratingCurve(ratings: NonNullable<ViewerData['ratings']>, duration: number) {
	if (!ratings.length) return null;
	return curvePaths(
		smoothCurve(
			ratings.map((r) => {
				const min = r.min ?? 1;
				return { time: r.time, value: (r.value - min) / (r.max - min || 1) };
			}),
			duration
		)
	);
}
