<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import { MediaQuery } from 'svelte/reactivity';
	import { Button, Dialog, buttonVariants } from '@latitudelabs/design-system';
	import { ChevronLeft, ChevronRight, Icon, X } from '@latitudelabs/design-system/icons';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import AiDock, { timeOfDayGreeting, type DockMode } from '#lib/components/AiDock.svelte';
	import AppHeader from '#lib/components/AppHeader.svelte';
	import BirdsEyeIcon from '#lib/components/BirdsEyeIcon.svelte';
	import CardPagination from '#lib/components/CardPagination.svelte';
	import AssetsSidebar from '#lib/components/AssetsSidebar.svelte';
	import { cardUses } from '#lib/assets.js';
	import Tooltip from '#lib/components/Tooltip.svelte';
	import TooltipGroup from '#lib/components/TooltipGroup.svelte';
	import { cardComponent, cardSize } from '#lib/cards/registry.js';
	import { lanes, slotCardId, type Lane } from '#lib/cards/lanes.js';
	import { experimental, loadExperimental } from '#lib/experimental.svelte.js';
	import { shareProjectCards } from '#lib/cards/viewer-sources.js';
	import type { Card, CardOp, ChatResponse } from '#lib/cards/types.js';
	import { takePendingVideo } from '#lib/new-project.js';
	import { transcript, type TranscriptMessage } from '#lib/transcript.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Local copy of the project that this page edits as the conversation goes on.
	// svelte-ignore state_referenced_locally
	let project = $state(structuredClone(data.project));
	// A video card finds the project's studies that show its video, to switch its viewer data to their sample results.
	shareProjectCards(
		() => project.cards,
		(id, cardData) => {
			const card = project.cards.find((c) => c.id === id);
			if (card) card.data = cardData;
		}
	);
	let thinking = $state(false);
	let error = $state('');
	let draft = $state('');
	/** Lumi's dock size, changed with its pull tab. */
	let dockMode = $state<DockMode>('default');
	/** The conversation for the expanded dock; the message being sent shows right away, Lumi's answer when it lands. */
	// svelte-ignore state_referenced_locally
	let messages = $state<TranscriptMessage[]>(data.transcript);
	let dragging = $state(false);

	// Empty projects show the dock centred; when the first card arrives it morphs down to the bottom panel
	// (View Transitions where supported, an instant switch otherwise).
	let centered = $state(project.cards.length === 0);
	$effect(() => {
		const next = project.cards.length === 0;
		if (next === centered) return;
		if (!document.startViewTransition) return void (centered = next);
		document.startViewTransition(async () => {
			centered = next;
			await tick();
		});
	});
	let scroller: HTMLElement;

	onMount(() => {
		loadExperimental();
		// A question typed on the projects page arrives as ?q=…
		const q = page.url.searchParams.get('q');
		// A video dropped on the projects page arrives here to be uploaded into this new project.
		const video = takePendingVideo();
		if (video) {
			upload(video);
		} else if (q) {
			replaceState(resolve('/projects/[id]', { id: page.params.id ?? '' }), {});
			send(q);
		} else {
			focus(project.focusedId, 'instant');
		}
		// Resume watching uploads that were still processing when the page was left.
		for (const card of project.cards) {
			if (card.type === 'upload' && card.data?.phase === 'processing') watch(card);
		}
	});

	function replaceCard(card: Card) {
		const i = project.cards.findIndex((c) => c.id === card.id);
		if (i >= 0) project.cards[i] = card;
	}

	/**
	 * Drafts are saved the moment they get content; the URL then becomes the real project's. Only once, even when
	 * several uploads start together.
	 */
	let saving: Promise<void> | undefined;
	function ensureSaved() {
		if (project.id) return Promise.resolve();
		return (saving ??= (async () => {
			const res = await fetch('/api/projects', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name: project.name === 'New project' ? undefined : project.name })
			});
			project.id = (await res.json()).id;
			replaceState(resolve('/projects/[id]', { id: project.id }), {});
		})());
	}

	/** Starts uploading a video: its upload card shows at once, and the file goes up in the background. */
	async function upload(file: File) {
		error = '';
		await ensureSaved();
		const res = await fetch(`/api/projects/${project.id}/upload`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ fileName: file.name, fileSize: file.size })
		});
		if (!res.ok) return void (error = `Couldn't start the upload (${res.status}).`);
		const card: Card = await res.json();
		project.cards.push(card);
		focus(card.id);
		transfer(file, card);
	}

	async function transfer(file: File, card: Card) {
		// Straight to the signed storage URL first: faster, and no size limit from the app's host. If the browser
		// isn't allowed to (the storage bucket's CORS rules), send it through the app instead.
		const put = (url: string) =>
			// XHR rather than fetch, for upload progress.
			new Promise<boolean>((resolve) => {
				const xhr = new XMLHttpRequest();
				xhr.open('PUT', url);
				xhr.setRequestHeader('content-type', file.type || 'video/mp4');
				xhr.upload.onprogress = (e) => {
					if (e.lengthComputable)
						replaceCard({
							...card,
							data: { ...card.data, progress: Math.round((e.loaded / e.total) * 100) }
						});
				};
				xhr.onload = () => resolve(xhr.status < 300);
				xhr.onerror = () => resolve(false);
				xhr.send(file);
			});
		const ok =
			(await put(card.data!.uploadUrl as string)) ||
			(await put(`/api/projects/${project.id}/upload?ingestionId=${card.data!.ingestionId}`));
		if (!ok) {
			replaceCard({ ...card, subtitle: 'Upload failed', data: { ...card.data, phase: 'failed' } });
			return;
		}
		watch(card);
	}

	/** Polls until processing finishes, then asks the assistant to analyse the new video. */
	async function watch(card: Card) {
		while (true) {
			const res = await fetch(
				`/api/projects/${project.id}/upload?ingestionId=${card.data!.ingestionId}`
			);
			if (!res.ok) return;
			const status = await res.json();
			if (status.status === 'completed') {
				project.cards = project.cards.filter((c) => c.id !== card.id);
				send(
					`I uploaded "${status.fileName}" (video ${status.videoId}) and it has finished processing. Give me the full analysis.`
				);
				return;
			}
			replaceCard(status.card);
			if (status.status === 'failed') return;
			await new Promise((r) => setTimeout(r, status.status === 'processing' ? 10_000 : 5_000));
		}
	}

	/** Every video dropped uploads. One at a time to start (the project saves each upload card before the next), then
	 * their files go up together; their video cards end up side by side in the "Videos" lane. */
	async function drop(e: DragEvent) {
		e.preventDefault();
		dragging = false;
		const files = [...(e.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith('video/'));
		for (const file of files) await upload(file);
	}

	function apply(op: CardOp) {
		if (op.op === 'add') project.cards.push(op.card);
		if (op.op === 'update') {
			const i = project.cards.findIndex((c) => c.id === op.card.id);
			if (i >= 0) project.cards[i] = op.card;
		}
		setFocus(op.op === 'focus' ? op.id : op.card.id);
	}

	// ── Focus & positioning ────────────────────────────────────────────────────────────────────────────
	// The card taking most of the visible area (between the sticky header and the dock) is the focused one.
	// User scrolling: the browser's own scroll snapping (proximity) centers cards that fit in the visible area;
	// taller cards have no snap point and stay where the user scrolls them.
	// App focusing (page load, new card, click): scrolled with JS, centered if it fits, otherwise its top is brought
	// into view with room above so the previous card still peeks in.

	const HEADER = 100; // AppHeader height
	const DOCK_GAP = 32; // the dock sits bottom-8
	const PEEK = 64; // space above a tall card, so the end of the previous card stays visible
	let autoScrolling = false;
	let autoScrollTimer: ReturnType<typeof setTimeout> | undefined;

	// Sizes that decide which cards can snap (bound below).
	let viewHeight = $state(0);
	let dockHeight = $state(0);
	let cardHeights = $state<Record<string, number>>({});
	/** Card widths, for the map of cards in the left safe zone. */
	let cardWidths = $state<Record<string, number>>({});
	let mapHeight = $state(0);
	const snapArea = $derived(viewHeight - HEADER - dockHeight - DOCK_GAP);

	// Full-size cards (studies) start a little below the header and run behind Lumi's dock down to its input, so they
	// keep their size however long Lumi's reply is. Their height is passed down as --card-height.
	const FULL_TOP = 16;
	const FULL_BOTTOM = DOCK_GAP + 56; // the dock's input (48) and padding (8)
	const fullHeight = $derived(viewHeight - HEADER - FULL_TOP - FULL_BOTTOM);
	const isFull = (id: string | undefined) => {
		const card = id ? project.cards.find((c) => c.id === id) : undefined;
		return !!card && cardSize(card) === 'full';
	};

	// Just enough space before the first and after the last card to center them in the visible area (a tall card
	// gets a small gap instead). With a single short card the content fits the view exactly: nothing to scroll.
	const edgeSpace = (id: string | undefined, chrome: number) => {
		const h = id ? (cardHeights[id] ?? 0) : 0;
		return chrome + (h && h < snapArea ? (snapArea - h) / 2 : 32);
	};
	const padTop = $derived(
		isFull(project.cards[0]?.id) ? HEADER + FULL_TOP : edgeSpace(project.cards[0]?.id, HEADER)
	);
	const padBottom = $derived(
		isFull(project.cards.at(-1)?.id)
			? FULL_BOTTOM
			: edgeSpace(project.cards.at(-1)?.id, dockHeight + DOCK_GAP)
	);

	/** Visible region for cards, in scroller coordinates (below the header, above the dock). */
	function region() {
		const box = scroller.getBoundingClientRect();
		const dock = document.querySelector('[data-dock]')?.getBoundingClientRect().top ?? box.bottom;
		return { top: HEADER, bottom: Math.min(dock, box.bottom) - box.top, box };
	}

	const cardEl = (id: string) => document.getElementById(`card-${id}`);

	/** Card layout box relative to the scroller viewport, ignoring the focus scale transform. */
	function layoutBox(el: HTMLElement, box: DOMRect) {
		const rect = el.getBoundingClientRect();
		const top = rect.top - (el.offsetHeight - rect.height) / 2 - box.top; // undo scale-around-center
		return { top, height: el.offsetHeight };
	}

	function position(id: string, behavior: ScrollBehavior) {
		if (lanesOn) return positionSlot(id, behavior);
		const el = cardEl(id);
		if (!el) return;
		const r = region();
		const { top, height } = layoutBox(el, r.box);
		const available = r.bottom - r.top;
		const target = isFull(id)
			? r.top + FULL_TOP
			: height <= available
				? r.top + (available - height) / 2
				: r.top + PEEK;
		guardScroll();
		scroller.scrollTo({ top: scroller.scrollTop + top - target, behavior });
	}

	/** The app is about to scroll: focus stays with the card it chose, not whichever passes by on the way. */
	function guardScroll() {
		autoScrolling = true;
		// scrollend may not fire if nothing moved; don't leave the guard stuck.
		clearTimeout(autoScrollTimer);
		autoScrollTimer = setTimeout(() => (autoScrolling = false), 800);
	}

	/**
	 * Card heights and the dock height are bound through resize observers, which report a frame after the DOM
	 * changes. The edge padding depends on them, so scrolling earlier can stop short of a new last card.
	 */
	async function settle() {
		await tick();
		await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
		await tick();
	}

	// Deleting a card: its × asks first, in a dialog naming it; then it goes (saved on the server), and the card next to
	// it takes focus.
	let deleting = $state<Card | null>(null);
	let deleteOpen = $state(false);
	let deleteError = $state('');
	function askDelete(card: Card) {
		deleting = card;
		deleteError = '';
		deleteOpen = true;
	}
	async function deleteCard() {
		const card = deleting;
		if (!card) return;
		const res = await fetch(`/api/projects/${project.id}/cards/${card.id}`, {
			method: 'DELETE'
		}).catch(() => null);
		if (!res?.ok) return void (deleteError = "Couldn't delete it. Try again in a moment.");
		deleteOpen = false;
		const at = project.cards.findIndex((c) => c.id === card.id);
		if (at < 0) return;
		project.cards.splice(at, 1);
		if (project.focusedId === card.id) focus((project.cards[at] ?? project.cards[at - 1])?.id);
	}

	/** In lanes `id` can also be a slot's key (a study's insights); a study's own id is its setup. */
	async function focus(id: string | undefined, behavior: ScrollBehavior = 'smooth') {
		setFocus(id);
		if (!id) return;
		await settle();
		position(id, behavior);
	}

	/** Picks the card covering the most of the visible region. */
	function mostVisible() {
		if (!scroller) return; // a scroll frame can land after the page is gone
		const r = region();
		let best: { id: string; visible: number } | undefined;
		for (const card of project.cards) {
			const el = cardEl(card.id);
			if (!el) continue;
			const rect = el.getBoundingClientRect();
			const visible =
				Math.min(rect.bottom - r.box.top, r.bottom) - Math.max(rect.top - r.box.top, r.top);
			if (visible > 0 && (!best || visible > best.visible)) best = { id: card.id, visible };
		}
		return best?.id;
	}

	function setFocus(id: string | undefined) {
		focusedSlot = id;
		project.focusedId = id && slotCardId(id);
	}

	let frame = 0;
	function onscroll() {
		if (autoScrolling || frame || birdsEye || lanesOn) return;
		frame = requestAnimationFrame(() => {
			frame = 0;
			const id = mostVisible();
			if (id) setFocus(id);
		});
	}

	function onscrollend() {
		// The app's own scroll keeps the card it chose, even if it landed short (e.g. clamped at the end).
		if (autoScrolling) return void (autoScrolling = false);
		if (birdsEye) return;
		if (lanesOn) return laneScrollEnd();
		// The last scroll frame (or the browser's snap) may not have been processed yet.
		const id = mostVisible();
		if (id) setFocus(id);
	}

	// ── Lanes (experimental) ───────────────────────────────────────────────────────────────────────────
	// With Settings → Experimental → Topic lanes on, cards are grouped by topic (`lanes.ts`): one horizontal lane per
	// topic, its cards aligned top left, the lanes stacked down the page. A lane is a little shorter than the visible area,
	// so the next one peeks in below; a card taller than its lane scrolls inside it, on its own. The wheel moves a whole
	// lane at a time (shift + wheel, or a sideways swipe: a card), but only after some travel and once per gesture, so a
	// fling, or the end of a card's own scrolling, doesn't jump on. Touch and the scrollbar scroll natively and snap to
	// lanes and cards. Arrows under each lane's title step through its cards; clicking a card brings it in.

	const lanesOn = $derived(experimental.lanes);
	const laneList = $derived(lanes(project.cards));
	/** The focused slot (a card, or one side of a study); `project.focusedId` is its card. */
	let focusedSlot = $state<string | undefined>(project.focusedId);
	/** Each lane's current card: where it stays while another lane has focus. */
	let laneCurrent = $state<Record<string, string>>({});
	const laneEls: Record<string, HTMLElement> = {};
	const rowEls: Record<string, HTMLElement> = {};
	const LANE_TOP = 16; // below the header, like full-size cards
	const LANE_GAP = 48; // from a lane's cards to the next lane's, with a line halfway
	const LANE_PEEK = 112; // kept at the bottom of the view for the next lane (LANE_GAP of it before the lane starts)
	const LANE_TITLE = 224; // the lane titles' column (sm:w-56 below): room for a name of a few words on one line
	const ROW_PAD = 8; // inside a lane's row, so the cards' delete buttons and shadows aren't clipped
	const CARD_GAP = 40;
	const WHEEL_STEP = 150; // wheel travel (px) before moving on to the next lane or card
	const GESTURE_GAP = 250; // ms: wheel events closer together than this are one gesture
	/** How tall a lane's cards can be (full-size ones are exactly this); taller ones scroll inside. */
	const laneHeight = $derived(Math.max(320, viewHeight - HEADER - LANE_TOP - LANE_PEEK));
	/**
	 * Where a lane's cards start: after its title. The row itself runs the full width, under the title, so a card
	 * scrolled past is cut at the window's edge, as on the right.
	 */
	const sideTitles = new MediaQuery('min-width: 640px');
	const rowStart = $derived((sideTitles.current ? LANE_TITLE : 0) + ROW_PAD);

	const laneOf = (key: string | undefined) =>
		laneList.find((l) => l.slots.some((s) => s.key === key));
	const currentOf = (lane: Lane) =>
		lane.slots.find((s) => s.key === laneCurrent[lane.key]) ?? lane.slots[0];

	const scrollRow = (row: HTMLElement, el: HTMLElement, behavior: ScrollBehavior) =>
		row.scrollTo({
			left:
				row.scrollLeft +
				el.getBoundingClientRect().left -
				row.getBoundingClientRect().left -
				rowStart,
			behavior
		});

	/** Brings a slot's lane up under the header, and the slot to the lane's left edge. */
	function positionSlot(key: string, behavior: ScrollBehavior) {
		const lane = laneOf(key);
		const el = cardEl(key);
		const section = lane && laneEls[lane.key];
		const row = lane && rowEls[lane.key];
		if (!lane || !el || !section || !row) return;
		laneCurrent[lane.key] = key;
		guardScroll();
		const top = section.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
		scroller.scrollTo({ top: scroller.scrollTop + top - HEADER, behavior });
		scrollRow(row, el, behavior);
	}

	/** Moves to a slot already on the page: no waiting for layout, as `focus` does for new cards. */
	function go(key: string) {
		setFocus(key);
		positionSlot(key, 'smooth');
	}

	function stepLane(by: number) {
		const at = laneList.indexOf(laneOf(focusedSlot)!);
		const lane = laneList[at < 0 ? 0 : at + by];
		if (lane) go(currentOf(lane).key);
	}

	function stepCard(lane: Lane | undefined, by: number) {
		if (!lane) return;
		const slot = lane.slots[lane.slots.indexOf(currentOf(lane)) + by];
		if (slot) go(slot.key);
	}

	/**
	 * Whether something in the focused card under the pointer (the card, taller than its lane, or a list in it) can still
	 * scroll that way. Over any other card (one scrolled past, under the lane's title, or one peeking in) the wheel moves
	 * on instead.
	 */
	function scrollsInside(target: Element, sideways: boolean, delta: number) {
		const card = target.closest('[data-lane-row] > [id^="card-"]');
		if (!card || card.id !== `card-${focusedSlot}`) return false;
		for (let el: Element | null = target; el && el !== card; el = el.parentElement) {
			const [at, size, view] = sideways
				? [el.scrollLeft, el.scrollWidth, el.clientWidth]
				: [el.scrollTop, el.scrollHeight, el.clientHeight];
			// Sizes first (cheap): only something that overflows can scroll, and only then is its style looked up.
			if (size <= view + 1 || !(delta > 0 ? at + view < size - 1 : at > 0.5)) continue;
			const style = getComputedStyle(el);
			if (/auto|scroll/.test(sideways ? style.overflowX : style.overflowY)) return true;
		}
		return false;
	}

	let gesture = { at: -Infinity, sum: 0, spent: false, sideways: false };
	function onwheel(e: WheelEvent) {
		if (!lanesOn || birdsEye || e.ctrlKey) return; // ctrl: pinch to zoom
		const sideways = e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY);
		const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? viewHeight : 1; // lines, pages
		const delta = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * unit;
		if (e.timeStamp - gesture.at > GESTURE_GAP || sideways !== gesture.sideways)
			gesture = { at: 0, sum: 0, spent: false, sideways };
		gesture.at = e.timeStamp;
		// Scrolling inside a card takes the whole gesture: reaching its end doesn't carry on to the next lane.
		if (scrollsInside(e.target as Element, sideways, delta)) return void (gesture.spent = true);
		e.preventDefault();
		if (gesture.spent) return;
		gesture.sum += delta;
		if (Math.abs(gesture.sum) < WHEEL_STEP) return;
		gesture.spent = true;
		if (!sideways) return stepLane(Math.sign(gesture.sum));
		// Sideways: the lane under the pointer (it may be the one peeking in), else the focused one.
		const under = (e.target as Element).closest<HTMLElement>('[data-lane]')?.dataset.lane;
		stepCard(laneList.find((l) => l.key === under) ?? laneOf(focusedSlot), Math.sign(gesture.sum));
	}

	/** Wheel events can only be held back (resistance) from a listener that isn't passive. */
	function wheelSteps(node: HTMLElement) {
		node.addEventListener('wheel', onwheel, { passive: false });
		return () => node.removeEventListener('wheel', onwheel);
	}

	/** The item whose element's edge (`top` or `left`) is nearest `at`. */
	function nearest<T>(
		items: T[],
		el: (item: T) => Element | undefined | null,
		edge: 'top' | 'left',
		at: number
	) {
		let best: { item: T; distance: number } | undefined;
		for (const item of items) {
			const rect = el(item)?.getBoundingClientRect();
			const distance = rect ? Math.abs(rect[edge] - at) : Infinity;
			if (!best || distance < best.distance) best = { item, distance };
		}
		return best?.item;
	}

	/** After the page scrolled some other way (touch, the scrollbar, keys): the lane under the header takes focus. */
	function laneScrollEnd() {
		const top = scroller.getBoundingClientRect().top + HEADER;
		const lane = nearest(laneList, (l) => laneEls[l.key], 'top', top);
		if (lane && lane !== laneOf(focusedSlot)) setFocus(currentOf(lane).key);
	}

	/** After a lane scrolled sideways by itself (touch): the card at its left edge is its current one. */
	function rowScrollEnd(lane: Lane) {
		if (autoScrolling || birdsEye) return;
		const left = (rowEls[lane.key]?.getBoundingClientRect().left ?? 0) + rowStart;
		const slot = nearest(lane.slots, (s) => cardEl(s.key), 'left', left);
		if (!slot) return;
		laneCurrent[lane.key] = slot.key;
		if (laneOf(focusedSlot) === lane) setFocus(slot.key);
	}

	// ── Bird's eye view ────────────────────────────────────────────────────────────────────────────────
	// Every card shrinks by one shared scale (so they keep their relative sizes, like the map) and wraps into a grid,
	// at the largest scale that fits the whole set on screen when it can. A card keeps rendering at its full size
	// inside and is only scaled visually, so its contents don't reflow; its measured size (bound on that inner box)
	// stays the list size. Cards fly between their place in the list and in the grid (FLIP: measure before and after
	// the switch, then animate the difference away). Click a card, or press Escape, to go back to it.

	let birdsEye = $state(false);
	let birdScale = $state(0.3);
	/** While cards fly back to the list: the list's "out of focus" shrink waits, so they land exactly. */
	let flying = $state(false);
	const BIRD_GAP = 24;

	/** Bird's eye's groups of card element ids: a group per lane (a study has two, its setup and its insights), or the
	 * whole column as one. */
	const birdGroups = $derived(
		lanesOn ? laneList.map((l) => l.slots.map((s) => s.key)) : [project.cards.map((c) => c.id)]
	);

	/**
	 * The largest scale (0.4 down to 0.12) at which the wrapped grid fits the space between header and dock. In lanes,
	 * each lane wraps on its own, beside its title.
	 */
	function fitScale() {
		const wide = sideTitles.current;
		const sides = lanesOn ? (wide ? LANE_TITLE : 0) + 32 : wide ? 160 : 32;
		const width = scroller.clientWidth - sides;
		const height = snapArea - 2 * BIRD_GAP;
		// In lanes a card shows as much as its lane does.
		const size = (key: string) => [
			cardWidths[key] ?? 0,
			Math.min(cardHeights[key] ?? 0, lanesOn ? laneHeight : Infinity)
		];
		const groups = birdGroups.map((keys) => keys.map(size));
		for (let scale = 0.4; scale > 0.12; scale -= 0.02) {
			let total = 0;
			for (const sizes of groups) {
				let rowWidth = 0;
				let rowHeight = 0;
				let lane = 0;
				for (const [w, h] of sizes) {
					if (rowWidth && rowWidth + BIRD_GAP + w * scale > width) {
						lane += rowHeight + BIRD_GAP;
						rowWidth = rowHeight = 0;
					}
					rowWidth += (rowWidth ? BIRD_GAP : 0) + w * scale;
					rowHeight = Math.max(rowHeight, h * scale);
				}
				total += (total ? 2 * BIRD_GAP : 0) + lane + rowHeight;
			}
			if (total <= height) return scale;
		}
		return 0.12;
	}

	async function setBirdsEye(on: boolean, focusId = focusedSlot) {
		if (on === birdsEye || !project.cards.length) return;
		const keys = birdGroups.flat();
		const first = new Map(keys.map((k) => [k, cardEl(k)?.getBoundingClientRect()]));
		if (on) birdScale = fitScale();
		else flying = true;
		birdsEye = on;
		setFocus(focusId);
		await tick();
		if (on) scroller.scrollTop = 0;
		else {
			// Every lane back at its current card, the focused one's lane under the header.
			if (lanesOn)
				for (const lane of laneList) {
					const row = rowEls[lane.key];
					const el = cardEl(currentOf(lane).key);
					if (row && el) scrollRow(row, el, 'instant');
				}
			if (focusId) position(focusId, 'instant');
		}
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const flights = keys.map((key) => {
			const el = cardEl(key);
			const from = first.get(key);
			if (!el || !from || reduce) return;
			const to = el.getBoundingClientRect();
			if (!to.width) return;
			const dx = from.left - to.left;
			const dy = from.top - to.top;
			const k = from.width / to.width;
			return el.animate(
				[{ transform: `translate(${dx}px, ${dy}px) scale(${k})` }, { transform: 'none' }],
				{ duration: 500, easing: 'cubic-bezier(0.3, 0, 0, 1)' }
			).finished;
		});
		await Promise.allSettled(flights);
		flying = false;
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key !== 'Escape' || e.defaultPrevented) return;
		if (assetsOpen) closeAssets();
		else if (birdsEye) setBirdsEye(false);
	}

	// ── Assets pane ────────────────────────────────────────────────────────────────────────────────────
	// The vertical "Assets" tab in the right safe zone opens a pane of the project's videos, sliding in over the page
	// from the right. While it's open a click anywhere outside closes it, without also landing on whatever is
	// underneath; so does Escape. The page's scrollbar turns transparent meanwhile (keeping its width, so nothing
	// shifts).

	const ASSETS_WIDTH = 400;
	/** Dims the page behind the open pane, like the design system's dialog overlay (there's no role for it). */
	const SCRIM = 'bg-black/30 supports-backdrop-filter:backdrop-blur-xs dark:bg-black/60'; // audit-ignore: the design system's own dialog overlay colours
	/** The page's scrollbar width: the closed pane's tab rests just left of it rather than on top of it. */
	let scrollerWidth = $state(0);
	let scrollerInnerWidth = $state(0);
	const scrollbarWidth = $derived(Math.max(0, scrollerWidth - scrollerInnerWidth));
	let assetsOpen = $state(false);
	let assetsPane = $state<HTMLElement | null>(null);
	let assetsTab = $state<HTMLElement | null>(null);
	/** Videos the focused card shows: marked current in the pane. */
	const focusedAssets = $derived.by(() => {
		const focused = project.cards.find((c) => c.id === project.focusedId);
		return focused ? data.assets.filter((a) => cardUses(focused, a.id)).map((a) => a.id) : [];
	});
	/** How many cards show each of the project's videos. */
	const assetUsage = $derived(
		Object.fromEntries(
			data.assets.map((a) => [a.id, project.cards.filter((c) => cardUses(c, a.id)).length])
		)
	);
	async function openAssets() {
		assetsOpen = true;
		await tick();
		assetsPane?.focus({ preventScroll: true });
	}
	function closeAssets() {
		assetsOpen = false;
		assetsTab?.focus({ preventScroll: true });
	}

	/**
	 * Lumi's turns, one after another: uploads finishing together each ask for an analysis, and every turn builds on
	 * the conversation so far.
	 */
	let turns = Promise.resolve();
	function send(message: string) {
		turns = turns.then(() => turn(message));
		return turns;
	}

	async function turn(message: string) {
		draft = '';
		error = '';
		thinking = true;
		messages = [...messages, { from: 'user', text: message }];
		try {
			await ensureSaved();
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ projectId: project.id, message })
			});
			const data: ChatResponse = await res.json();
			project.reply = data.text;
			project.choices = data.choices;
			if (!data.error) messages = transcript(data.history);
			error = data.error ?? '';
			if (data.project) Object.assign(project, data.project);
			data.ops.forEach(apply);
			if (data.ops.length) await focus(project.focusedId);
		} catch (e) {
			error = String(e);
		} finally {
			thinking = false;
		}
	}
</script>

<svelte:head><title>{project.name} · Iris</title></svelte:head>

<svelte:window {onkeydown} />

<!-- Delete, on the card's corner (over its edge, clear of buttons in its header); shown on hover or keyboard focus.
     Asks first. -->
{#snippet deleteButton(card: Card)}
	<Button
		variant="secondary"
		size="icon-xs"
		aria-label="Delete {card.title}"
		class="absolute -top-2 -right-2 z-10 rounded-full opacity-0 shadow-raised transition-opacity group-focus-within/card:opacity-100 group-hover/card:opacity-100 focus-visible:opacity-100 motion-reduce:transition-none"
		onclick={(e: MouseEvent) => {
			e.stopPropagation();
			askDelete(card);
		}}
	>
		<X />
	</Button>
{/snippet}

<div
	class="relative flex h-dvh flex-col bg-background"
	role="region"
	aria-label="Project"
	ondragover={(e) => {
		// Files only: dragging something inside the page (a study's steps) isn't an upload.
		if (!e.dataTransfer?.types.includes('Files')) return;
		e.preventDefault();
		dragging = true;
	}}
	ondragleave={(e) => {
		if (e.currentTarget === e.target) dragging = false;
	}}
	ondrop={drop}
>
	{#if dragging}
		<div
			class="pointer-events-none absolute inset-4 z-10 flex items-center justify-center rounded-xl bg-card/90 shadow-raised"
		>
			<p class="text-title">Drop a video to analyse it</p>
		</div>
	{/if}
	<main
		bind:this={scroller}
		bind:clientHeight={viewHeight}
		bind:offsetWidth={scrollerWidth}
		bind:clientWidth={scrollerInnerWidth}
		class={[
			'flex-1 overflow-y-auto',
			!birdsEye && (lanesOn ? 'snap-y snap-mandatory' : 'snap-y snap-proximity')
		]}
		style:scrollbar-color={assetsOpen ? 'transparent transparent' : undefined}
		style:scroll-padding-top="{HEADER}px"
		style:scroll-padding-bottom="{dockHeight + DOCK_GAP}px"
		{onscroll}
		{onscrollend}
		{@attach wheelSteps}
	>
		<!-- Sticky inside the scroll area (so the scrollbar stays outside the blur); the negative margin lets
		     cards scroll up underneath it instead of the header taking space in the flow. -->
		<AppHeader
			class="-mb-25"
			crumbs={[{ label: 'Projects', href: '/' }, { label: project.name }]}
		/>
		{#if project.cards.length > 0 && lanesOn}
			<!-- Lanes (experimental): one per topic, its title (and arrows) on the left, its cards in a row that scrolls
			     sideways. In bird's eye view each lane's cards wrap beside its title, from the top left. -->
			<div
				class={['flex flex-col', birdsEye && 'pr-8']}
				style:gap={birdsEye ? `${2 * BIRD_GAP}px` : undefined}
				style:padding-top="{HEADER + (birdsEye ? BIRD_GAP : 0)}px"
				style:padding-bottom="{birdsEye
					? dockHeight + DOCK_GAP + BIRD_GAP
					: LANE_PEEK - LANE_GAP}px"
				style:--card-height="{laneHeight}px"
			>
				{#each laneList as lane (lane.key)}
					{@const current = currentOf(lane)}
					{@const at = lane.slots.indexOf(current)}
					{@const last = lane.slots.at(-1)!}
					<!-- A click anywhere in a lane that isn't the focused one (its title, the room beside its cards) brings it
					     in, at its current card; a click on one of its cards brings in that card instead (handled there
					     first). The keyboard has the cards and the arrows. -->
					<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
					<section
						bind:this={laneEls[lane.key]}
						data-lane={lane.key}
						aria-label={lane.title}
						class={['relative flex shrink-0 flex-col sm:flex-row', !birdsEye && 'snap-start']}
						style:height={birdsEye ? undefined : `${LANE_TOP + laneHeight + LANE_GAP}px`}
						style:padding-top={birdsEye ? undefined : `${LANE_TOP - ROW_PAD}px`}
						onclick={() => {
							if (!birdsEye && laneOf(focusedSlot) !== lane) go(current.key);
						}}
					>
						<!-- Over the row's start (except in bird's eye): clicks and the wheel pass through to a card under it,
						     all but the arrows. -->
						<div
							class={[
								'flex shrink-0 flex-col gap-2 px-4 sm:w-56 sm:pt-(--row-pad) sm:pr-4 sm:pl-6',
								!birdsEye && 'sm:pointer-events-none sm:absolute sm:left-0 sm:z-10'
							]}
							style:--row-pad="{ROW_PAD}px"
						>
							<h2 class="text-body font-medium">{lane.title}</h2>
							{#if lane.slots.length > 1 && !birdsEye}
								<div class="pointer-events-auto flex items-center gap-1">
									<Button
										variant="ghost"
										size="icon-sm"
										aria-label="Previous card in {lane.title}"
										disabled={at <= 0}
										onclick={() => stepCard(lane, -1)}
									>
										<ChevronLeft />
									</Button>
									<span class="text-caption text-muted-foreground tabular-nums"
										>{at + 1}/{lane.slots.length}</span
									>
									<Button
										variant="ghost"
										size="icon-sm"
										aria-label="Next card in {lane.title}"
										disabled={at >= lane.slots.length - 1}
										onclick={() => stepCard(lane, 1)}
									>
										<ChevronRight />
									</Button>
								</div>
							{/if}
						</div>
						<div
							bind:this={rowEls[lane.key]}
							data-lane-row
							class={[
								'flex min-w-0 flex-1 items-start',
								birdsEye
									? 'flex-wrap content-start'
									: 'snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto'
							]}
							style:gap="{birdsEye ? BIRD_GAP : CARD_GAP}px"
							style:padding={birdsEye ? undefined : `${ROW_PAD}px`}
							style:padding-left={birdsEye ? undefined : `${rowStart}px`}
							style:scroll-padding-left="{rowStart}px"
							onscrollend={() => rowScrollEnd(lane)}
						>
							{#each lane.slots as slot (slot.key)}
								{@const CardView = cardComponent(slot.card.type)}
								{@const size = cardSize(slot.card)}
								<!-- As in the column below: one element in both views, a button in bird's eye. -->
								<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
								<div
									id="card-{slot.key}"
									role={birdsEye ? 'button' : undefined}
									tabindex={birdsEye ? 0 : undefined}
									aria-label={birdsEye
										? `Open ${slot.card.title}${slot.part === 'insights' ? ' insights' : ''}`
										: undefined}
									class={birdsEye
										? 'shrink-0 cursor-pointer outline-offset-4 outline-ring/50 transition-[outline-color] hover:outline-2 focus-visible:outline-3'
										: [
												'group/card relative w-full shrink-0 snap-start transition-opacity duration-300',
												// Full-size cards leave room for the next card to peek in.
												{ normal: 'max-w-3xl', wide: 'max-w-5xl', full: 'max-w-[calc(100%-5rem)]' }[
													size
												],
												slot.key !== focusedSlot &&
													(flying ? 'opacity-60' : 'opacity-60 hover:opacity-100')
											]}
									style:width={birdsEye
										? `${(cardWidths[slot.key] ?? 0) * birdScale}px`
										: undefined}
									style:height={birdsEye
										? `${Math.min(cardHeights[slot.key] ?? 0, laneHeight) * birdScale}px`
										: undefined}
									style:border-radius={birdsEye
										? `calc(var(--radius-xl) * ${birdScale})`
										: undefined}
									onclick={() => {
										if (birdsEye) return void setBirdsEye(false, slot.key);
										if (slot.key !== focusedSlot) go(slot.key);
									}}
									onkeydown={(e) => {
										if (!birdsEye || (e.key !== 'Enter' && e.key !== ' ')) return;
										e.preventDefault();
										setBirdsEye(false, slot.key);
									}}
								>
									<!-- Scrolls a card taller than its lane, on its own; its padding (cancelled by the margin) keeps the
									     card's shadow from being clipped. In bird's eye view it shows the part the lane does. -->
									<div
										class={birdsEye
											? 'overflow-hidden'
											: '-m-1 overflow-y-auto overscroll-contain p-1'}
										style:max-height={birdsEye
											? `${laneHeight * birdScale}px`
											: `${laneHeight + 8}px`}
										style:border-radius={birdsEye ? 'inherit' : undefined}
									>
										<div
											bind:offsetHeight={cardHeights[slot.key]}
											bind:offsetWidth={cardWidths[slot.key]}
											inert={birdsEye}
											class:origin-top-left={birdsEye}
											style:width={birdsEye ? `${cardWidths[slot.key] ?? 0}px` : undefined}
											style:scale={birdsEye ? birdScale : undefined}
										>
											<CardView card={slot.card} part={slot.part} />
										</div>
									</div>
									<!-- A study's insights go with it: deleting is on its setup. -->
									{#if !birdsEye && slot.part !== 'insights'}{@render deleteButton(slot.card)}{/if}
								</div>
							{/each}
							{#if !birdsEye && lane.slots.length > 1}
								<!-- Room after the last card, so it too can come to the lane's left edge. -->
								<div
									aria-hidden="true"
									class="shrink-0"
									style:width="{Math.max(
										0,
										scrollerInnerWidth - rowStart - ROW_PAD - CARD_GAP - (cardWidths[last.key] ?? 0)
									)}px"
								></div>
							{/if}
						</div>
						{#if !birdsEye}
							<!-- The line between lanes, halfway down the gap. -->
							<div
								aria-hidden="true"
								class="absolute inset-x-0 border-t border-border"
								style:bottom="{LANE_GAP / 2}px"
							></div>
						{/if}
					</section>
				{/each}
			</div>
		{:else if project.cards.length > 0}
			<!-- sm:px-20: an 80px safe zone each side that cards never enter; the left one holds the pagination. In bird's
			     eye view the cards wrap into rows from the top left, below the header. -->
			<div
				class={[
					'flex px-4 sm:px-20',
					birdsEye ? 'flex-wrap content-start items-start justify-start' : 'flex-col gap-5'
				]}
				style:gap={birdsEye ? `${BIRD_GAP}px` : undefined}
				style:padding-top="{birdsEye ? HEADER + BIRD_GAP : padTop}px"
				style:padding-bottom="{birdsEye ? dockHeight + DOCK_GAP + BIRD_GAP : padBottom}px"
				style:--card-height="{fullHeight}px"
			>
				{#each project.cards as card (card.id)}
					{@const CardView = cardComponent(card.type)}
					<!-- One element in both views, so cards keep their state (players, selections) across the switch. In
					     bird's eye view it's the card's scaled-down footprint and opens the card in the list; its contents
					     stay full size inside (inert, so nothing in them can be clicked or focused) and are scaled to fit. -->
					<!-- The role and tabindex only apply together (bird's eye), which the checker can't see. -->
					<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
					<div
						id="card-{card.id}"
						role={birdsEye ? 'button' : undefined}
						tabindex={birdsEye ? 0 : undefined}
						aria-label={birdsEye ? `Open ${card.title}` : undefined}
						class={birdsEye
							? 'shrink-0 cursor-pointer outline-offset-4 outline-ring/50 transition-[outline-color] hover:outline-2 focus-visible:outline-3'
							: [
									'group/card relative mx-auto w-full transition-[opacity,scale] duration-300',
									{ normal: 'max-w-3xl', wide: 'max-w-5xl', full: '' }[cardSize(card)],
									cardSize(card) === 'full'
										? 'snap-start scroll-mt-4'
										: (cardHeights[card.id] ?? 0) <= snapArea && 'snap-center',
									card.id !== project.focusedId &&
										(flying ? 'opacity-60' : 'scale-90 opacity-60 hover:opacity-100')
								]}
						style:width={birdsEye ? `${(cardWidths[card.id] ?? 0) * birdScale}px` : undefined}
						style:height={birdsEye ? `${(cardHeights[card.id] ?? 0) * birdScale}px` : undefined}
						style:border-radius={birdsEye ? `calc(var(--radius-xl) * ${birdScale})` : undefined}
						onclick={() => {
							if (birdsEye) return void setBirdsEye(false, card.id);
							// Clicking a dimmed card brings it into focus; clicks inside the focused card (sections,
							// players) leave the scroll position alone.
							if (card.id !== project.focusedId) focus(card.id);
						}}
						onkeydown={(e) => {
							if (!birdsEye || (e.key !== 'Enter' && e.key !== ' ')) return;
							e.preventDefault();
							setBirdsEye(false, card.id);
						}}
					>
						<!-- Measured here, inside, so the sizes stay the card's own: bird's eye keeps this box at the list
						     width and only scales it. -->
						<div
							bind:offsetHeight={cardHeights[card.id]}
							bind:offsetWidth={cardWidths[card.id]}
							inert={birdsEye}
							class:origin-top-left={birdsEye}
							style:width={birdsEye ? `${cardWidths[card.id] ?? 0}px` : undefined}
							style:scale={birdsEye ? birdScale : undefined}
						>
							<CardView {card} />
						</div>
						{#if !birdsEye}{@render deleteButton(card)}{/if}
					</div>
				{/each}
			</div>
		{/if}
	</main>

	<Dialog.Root bind:open={deleteOpen}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Delete “{deleting?.title}”?</Dialog.Title>
				<Dialog.Description>
					This removes the card from the project. Lumi can make it again if you ask.
				</Dialog.Description>
			</Dialog.Header>
			{#if deleteError}<p class="text-caption text-destructive">{deleteError}</p>{/if}
			<Dialog.Footer>
				<Dialog.Close class={buttonVariants({ variant: 'secondary' })}>Cancel</Dialog.Close>
				<Button variant="destructive" onclick={deleteCard}>Delete card</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>

	{#if project.cards.length > 1 && !birdsEye && !lanesOn}
		<!-- A map of the cards (not with lanes yet), centred in the left safe zone, between the header and Lumi's dock. -->
		<div
			bind:clientHeight={mapHeight}
			class="pointer-events-none absolute left-0 hidden w-20 items-center justify-center py-4 sm:flex"
			style:top="{HEADER}px"
			style:bottom="{dockHeight + DOCK_GAP}px"
		>
			<CardPagination
				class="pointer-events-auto"
				cards={project.cards.map((c) => ({
					id: c.id,
					title: c.title,
					width: cardWidths[c.id] ?? 0,
					height: cardHeights[c.id] ?? 0
				}))}
				current={project.focusedId}
				maxHeight={mapHeight - 32}
				onselect={(id) => focus(id)}
			/>
		</div>
	{/if}

	{#if assetsOpen}
		<!-- Dims the page behind the pane (the design system's dialog overlay) and catches the click outside it: closes
		     the pane without reaching the card or control underneath. -->
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div
			transition:fade={{ duration: 300 }}
			class="absolute inset-0 z-40 {SCRIM}"
			onclick={closeAssets}
		></div>
	{/if}

	{#if project.cards.length > 1}
		<!-- Bird's eye toggle: bottom of the left safe zone, level with the bottom of Lumi's dock. With lanes the left side
		     holds their titles (the next lane's peeks in there), so it moves to the right, clear of the scrollbar. -->
		<div
			class={['absolute hidden w-20 justify-center sm:flex', !lanesOn && 'left-0']}
			style:right={lanesOn ? `${scrollbarWidth}px` : undefined}
			style:bottom="{DOCK_GAP}px"
		>
			<TooltipGroup>
				<Tooltip
					text={birdsEye ? 'Back to cards' : "Bird's eye"}
					side={lanesOn ? 'left' : 'right'}
					describes={false}
				>
					{#snippet children({ props })}
						<!-- Just the icon, no button surface: faint at rest, full strength on hover, focus or while the view is
						     on. -->
						<button
							{...props}
							type="button"
							class={[
								'flex rounded-sm transition-colors outline-none hover:text-foreground focus-visible:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
								birdsEye ? 'text-foreground' : 'text-foreground/40'
							]}
							aria-label="Bird's eye"
							aria-pressed={birdsEye}
							onclick={() => setBirdsEye(!birdsEye)}
						>
							<BirdsEyeIcon class="size-8" />
						</button>
					{/snippet}
				</Tooltip>
			</TooltipGroup>
		</div>
	{/if}

	<AiDock
		{centered}
		greeting={project.cards.length
			? `${timeOfDayGreeting()} What would you like to know about ${project.name}?`
			: `${timeOfDayGreeting()} Drop a video here, or ask me about one you already have.`}
		reply={project.reply}
		choices={project.choices}
		{thinking}
		{error}
		bind:draft
		bind:mode={dockMode}
		{messages}
		bind:height={dockHeight}
		onsubmit={send}
	/>
</div>

<!-- The assets pane, over the page, sliding in from the right edge: flush with the top, right and bottom,
     square-cornered. Its pull tab rides on its left edge, so it sits on the window's edge while the pane is closed and
     stays attached as it opens. -->
<div
	class="assets-slide fixed top-0 right-0 z-50 h-dvh"
	style:width="{ASSETS_WIDTH}px"
	style:translate={assetsOpen ? undefined : '100% 0'}
>
	{#if !birdsEye && project.cards.length}
		<!-- The pull tab, vertically centred between the header and the dock, its label reading bottom to top. Closed, it
		     rests against the page's scrollbar (not over it); open, against the pane, above its edge (so the pane's
		     shadow doesn't cut between them) and in the same surface, so the two read as one. 8px of it tuck behind that
		     edge, clipped there (the shadow may spill on the other sides); on hover or focus it slides out by those 8px,
		     as if to be pulled. -->
		<div
			class="assets-slide pointer-events-none absolute z-20 hidden items-center sm:flex"
			style:right={assetsOpen ? '100%' : `calc(100% + ${scrollbarWidth}px)`}
			style:top="{HEADER}px"
			style:bottom="{dockHeight + DOCK_GAP}px"
			style:clip-path="inset(-24px 0 -24px -24px)"
		>
			<button
				bind:this={assetsTab}
				type="button"
				class={[
					'pointer-events-auto relative flex translate-x-2 flex-col items-center gap-2 rounded-l-md bg-card py-4 pr-4 pl-2 text-body shadow-raised transition-[translate,color] duration-200 ease-out outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
					// Open, it's part of the pane: it stays put and lit, no pull-out on hover.
					assetsOpen
						? 'text-foreground'
						: 'text-muted-foreground hover:translate-x-0 hover:text-foreground focus-visible:translate-x-0 focus-visible:text-foreground'
				]}
				aria-expanded={assetsOpen}
				aria-controls="assets-sidebar"
				onclick={() => (assetsOpen ? closeAssets() : openAssets())}
			>
				<!-- Arrows either side of the label point the way the pane comes from; open, they turn to point back. -->
				{#snippet arrow()}
					<Icon
						icon={ChevronLeft}
						size="sm"
						class="transition-[rotate] duration-300 ease-out {assetsOpen ? 'rotate-180' : ''}"
					/>
				{/snippet}
				{@render arrow()}
				<!-- Its box trimmed to the lowercase letters (baseline to x-height), so it's those that centre between the
				     arrows, not the line box with its unused room for descenders. -->
				<span
					class="rotate-180"
					style:writing-mode="vertical-rl"
					style:text-box="trim-both ex alphabetic">Assets</span
				>
				{@render arrow()}
				<!-- Open: the inner corners where the tab meets the pane curve into its edge (12px, like the tab's own
				     corners). Each is a square of the card colour with a quarter circle cut out, 8px in from the button's
				     right side, where the pane's edge is (the rest is tucked under it). -->
				<span aria-hidden="true" class={['fillet fillet-top', assetsOpen && 'fillet-on']}></span>
				<span aria-hidden="true" class={['fillet fillet-bottom', assetsOpen && 'fillet-on']}></span>
			</button>
		</div>
	{/if}
	<!-- Inert while closed. -->
	<div id="assets-sidebar" class="relative z-10 flex h-full" inert={!assetsOpen}>
		<AssetsSidebar
			bind:ref={assetsPane}
			class="w-full"
			assets={data.assets}
			usage={assetUsage}
			current={focusedAssets}
			onselect={(id) => focus(project.cards.find((c) => cardUses(c, id))?.id)}
			onclose={closeAssets}
		/>
	</div>
</div>

<style>
	/* The tab's inner corners, against the pane's edge (see the tab). */
	.fillet {
		position: absolute;
		right: 0.5rem;
		width: 12px;
		height: 12px;
		opacity: 0;
		transition: opacity 300ms ease-out;
	}
	.fillet-on {
		opacity: 1;
	}
	.fillet-top {
		bottom: 100%;
		background: radial-gradient(circle at top left, transparent 12px, var(--color-card) 12.5px);
	}
	.fillet-bottom {
		top: 100%;
		background: radial-gradient(circle at bottom left, transparent 12px, var(--color-card) 12.5px);
	}
	/* The assets pane slides in and out (and its tab steps on or off the scrollbar's edge with it). */
	.assets-slide {
		transition:
			translate 300ms cubic-bezier(0.3, 0, 0, 1),
			right 300ms cubic-bezier(0.3, 0, 0, 1);
	}
	@media (prefers-reduced-motion: reduce) {
		.assets-slide {
			transition: none;
		}
	}
</style>
