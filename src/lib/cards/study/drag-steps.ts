import { popsUp, type FlatStep } from './question-types';

/** Where a dragged step goes: before or after `target`, one of its siblings. */
export type StepMove = { step: FlatStep; target: FlatStep; after: boolean };

/**
 * Drag and drop for a Steps list of study steps (`{@attach dragSteps(steps, onmove)}`), which the design system's Steps
 * can't do yet. A step moves among its siblings, with everything inside it: steps among the study's steps, a channel's
 * videos within it. Questions inside a video keep their time order, so they don't drag. A line shows where it will go.
 */
export const dragSteps =
	(steps: FlatStep[], onmove: (move: StepMove) => void) => (list: HTMLElement) => {
		const items = () => [...list.querySelectorAll<HTMLElement>(':scope > li')];
		const movable = (step: FlatStep | undefined) => !!step && !popsUp(step);
		/** The step's index and the last index of what's inside it (steps after it, deeper). */
		const block = (at: number) => {
			let end = at;
			while (steps[end + 1] && steps[end + 1].depth > steps[at].depth) end++;
			return [at, end] as const;
		};
		/** The dragged step's sibling that the step at `at` is (or is inside), if any. */
		const siblingAt = (at: number, of: FlatStep) => {
			for (let i = at; i >= 0; i--) {
				if (steps[i].depth < of.depth) return;
				if (steps[i].depth === of.depth) return steps[i].parent === of.parent ? i : undefined;
			}
		};

		items().forEach((li, i) => {
			const button = li.querySelector('button');
			if (button) button.draggable = movable(steps[i]);
		});

		let from: number | undefined;
		let drop: { at: number; after: boolean } | undefined;
		const mark = () => {
			items().forEach((li, i) => {
				const [start, end] = from === undefined ? [-1, -1] : block(from);
				li.style.opacity = i >= start && i <= end ? '0.4' : '';
				li.style.boxShadow = '';
			});
			if (!drop) return;
			const [start, end] = block(drop.at);
			const edge = items()[drop.after ? end : start];
			if (edge) edge.style.boxShadow = `0 ${drop.after ? 2 : -2}px 0 var(--color-primary)`;
		};
		const indexOf = (e: Event) => items().indexOf((e.target as Element).closest('li')!);

		const ondragstart = (e: DragEvent) => {
			const at = indexOf(e);
			if (!movable(steps[at])) return;
			from = at;
			e.dataTransfer!.effectAllowed = 'move';
			e.dataTransfer!.setData('text/plain', steps[at].q.id); // Firefox only drags with some data
			mark();
		};
		const ondragover = (e: DragEvent) => {
			if (from === undefined) return;
			const at = indexOf(e);
			const sibling = at >= 0 && at < steps.length ? siblingAt(at, steps[from]) : undefined;
			if (sibling === undefined) {
				drop = undefined;
				return mark();
			}
			e.preventDefault();
			e.dataTransfer!.dropEffect = 'move';
			// Before or after the sibling's whole block (it and what's inside it), by the pointer's side of its middle.
			const [start, end] = block(sibling);
			const top = items()[start].getBoundingClientRect().top;
			const bottom = items()[end].getBoundingClientRect().bottom;
			drop = { at: sibling, after: e.clientY > (top + bottom) / 2 };
			mark();
		};
		const ondrop = (e: DragEvent) => {
			e.preventDefault();
			if (from !== undefined && drop && drop.at !== from)
				onmove({ step: steps[from], target: steps[drop.at], ...drop });
			ondragend();
		};
		const ondragend = () => {
			from = drop = undefined;
			mark();
		};

		list.addEventListener('dragstart', ondragstart);
		list.addEventListener('dragover', ondragover);
		list.addEventListener('drop', ondrop);
		list.addEventListener('dragend', ondragend);
		return () => {
			list.removeEventListener('dragstart', ondragstart);
			list.removeEventListener('dragover', ondragover);
			list.removeEventListener('drop', ondrop);
			list.removeEventListener('dragend', ondragend);
		};
	};
