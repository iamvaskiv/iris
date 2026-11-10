/**
 * The pointer's position along an element, from 0 at its left edge to 1 at its right (clamped): for timelines, curves
 * and lanes, to turn a click, a drag or a hover into a moment (`fractionAlong(e, el) * duration`).
 */
export function fractionAlong(e: MouseEvent, el: Element) {
	const box = el.getBoundingClientRect();
	return box.width ? Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)) : 0;
}
