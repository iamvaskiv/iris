import { cubicOut } from 'svelte/easing';
import { fly } from 'svelte/transition';

/**
 * Vertical sliding between a channel's videos, like a short-video feed: going on to the next (`dir` 1), it comes up
 * through the bottom edge of `within` while the current one (`dir` -1 on its way out) leaves through the top; going
 * back, the other way round. `dir` 0 doesn't slide. For a {#key} block's `in:` and `out:`.
 */
export function feedSlide(
	node: HTMLElement,
	{ dir, within }: { dir: number; within?: Element | null }
) {
	const box = node.getBoundingClientRect();
	const edge = (within ?? node.parentElement)?.getBoundingClientRect();
	// From (or to) just past the edge: below it going down the feed, above it going up.
	const y = !edge ? dir * box.height : dir > 0 ? edge.bottom - box.top : edge.top - box.bottom;
	const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
	return fly(node, {
		duration: !dir || reduce ? 0 : 450,
		easing: cubicOut,
		opacity: 1,
		y: dir ? y : 0
	});
}
