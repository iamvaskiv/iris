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
