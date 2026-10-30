<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import { ChevronLeft, Icon } from '@latitudelabs/design-system/icons';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import AiDock, { timeOfDayGreeting, type DockMode } from '#lib/components/AiDock.svelte';
	import AppHeader from '#lib/components/AppHeader.svelte';
	import BirdsEyeIcon from '#lib/components/BirdsEyeIcon.svelte';
	import CardPagination from '#lib/components/CardPagination.svelte';
	import AssetsSidebar from '#lib/components/AssetsSidebar.svelte';
	import { cardUses } from '#lib/assets.js';
	import Tooltip from '#lib/components/Tooltip.svelte';
	import TooltipGroup from '#lib/components/TooltipGroup.svelte';
	import { cardComponent, cardSize } from '#lib/cards/registry.js';
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
	shareProjectCards(() => project.cards);
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
	// svelte-ignore state_referenced_locally
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
		// A question typed on the projects page arrives as ?q=…
		const q = page.url.searchParams.get('q');
		// A video dropped on the projects page arrives here to be uploaded into this new project.
		const video = takePendingVideo();
		if (video) {
			upload(video);
		} else if (q) {
			replaceState(page.url.pathname, {});
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

	/** Drafts are saved the moment they get content; the URL then becomes the real project's. */
	async function ensureSaved() {
		if (project.id) return;
		const res = await fetch('/api/projects', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name: project.name === 'New project' ? undefined : project.name })
		});
		project.id = (await res.json()).id;
		replaceState(`/projects/${project.id}`, {});
	}

	async function upload(file: File) {
		error = '';
		await ensureSaved();
		const res = await fetch(`/api/projects/${project.id}/upload`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ fileName: file.name, fileSize: file.size })
		});
		if (!res.ok) return (error = `Couldn't start the upload (${res.status}).`);
		const card: Card = await res.json();
		project.cards.push(card);
		await focus(card.id);

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

	function drop(e: DragEvent) {
		e.preventDefault();
		dragging = false;
		const file = [...(e.dataTransfer?.files ?? [])].find((f) => f.type.startsWith('video/'));
		if (file) upload(file);
	}

	function apply(op: CardOp) {
		if (op.op === 'add') project.cards.push(op.card);
		if (op.op === 'update') {
			const i = project.cards.findIndex((c) => c.id === op.card.id);
			if (i >= 0) project.cards[i] = op.card;
		}
		project.focusedId = op.op === 'focus' ? op.id : op.card.id;
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
		autoScrolling = true;
		scroller.scrollTo({ top: scroller.scrollTop + top - target, behavior });
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

	async function focus(id: string | undefined, behavior: ScrollBehavior = 'smooth') {
		project.focusedId = id;
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

	let frame = 0;
	function onscroll() {
		if (autoScrolling || frame || birdsEye) return;
		frame = requestAnimationFrame(() => {
			frame = 0;
			const id = mostVisible();
			if (id) project.focusedId = id;
		});
	}

	function onscrollend() {
		// The app's own scroll keeps the card it chose, even if it landed short (e.g. clamped at the end).
		if (autoScrolling) return void (autoScrolling = false);
		if (birdsEye) return;
		// The last scroll frame (or the browser's snap) may not have been processed yet.
		const id = mostVisible();
		if (id) project.focusedId = id;
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

	/** The largest scale (0.4 down to 0.12) at which the wrapped grid fits the space between header and dock. */
	function fitScale() {
		const sides = window.matchMedia('(min-width: 640px)').matches ? 160 : 32;
		const width = scroller.clientWidth - sides;
		const height = snapArea - 2 * BIRD_GAP;
		const sizes = project.cards.map((c) => [cardWidths[c.id] ?? 0, cardHeights[c.id] ?? 0]);
		for (let scale = 0.4; scale > 0.12; scale -= 0.02) {
			let rowWidth = 0;
			let rowHeight = 0;
			let total = 0;
			for (const [w, h] of sizes) {
				if (rowWidth && rowWidth + BIRD_GAP + w * scale > width) {
					total += rowHeight + BIRD_GAP;
					rowWidth = rowHeight = 0;
				}
				rowWidth += (rowWidth ? BIRD_GAP : 0) + w * scale;
				rowHeight = Math.max(rowHeight, h * scale);
			}
			if (total + rowHeight <= height) return scale;
		}
		return 0.12;
	}

	async function setBirdsEye(on: boolean, focusId = project.focusedId) {
		if (on === birdsEye || !project.cards.length) return;
		const first = new Map(project.cards.map((c) => [c.id, cardEl(c.id)?.getBoundingClientRect()]));
		if (on) birdScale = fitScale();
		else flying = true;
		birdsEye = on;
		project.focusedId = focusId;
		await tick();
		if (on) scroller.scrollTop = 0;
		else if (focusId) position(focusId, 'instant');
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const flights = project.cards.map((c) => {
			const el = cardEl(c.id);
			const from = first.get(c.id);
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

	async function send(message: string) {
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

<div
	class="relative flex h-dvh flex-col bg-background"
	role="region"
	aria-label="Project"
	ondragover={(e) => {
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
		class={['flex-1 overflow-y-auto', !birdsEye && 'snap-y snap-proximity']}
		style:scrollbar-color={assetsOpen ? 'transparent transparent' : undefined}
		style:scroll-padding-top="{HEADER}px"
		style:scroll-padding-bottom="{dockHeight + DOCK_GAP}px"
		{onscroll}
		{onscrollend}
	>
		<!-- Sticky inside the scroll area (so the scrollbar stays outside the blur); the negative margin lets
		     cards scroll up underneath it instead of the header taking space in the flow. -->
		<AppHeader
			class="-mb-25"
			crumbs={[{ label: 'Projects', href: '/' }, { label: project.name }]}
		/>
		{#if project.cards.length > 0}
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
									'mx-auto w-full transition-[opacity,scale] duration-300',
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
					</div>
				{/each}
			</div>
		{/if}
	</main>

	{#if project.cards.length > 1 && !birdsEye}
		<!-- A map of the cards, centred in the left safe zone, between the header and Lumi's dock. -->
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
		<!-- Bird's eye toggle: bottom of the left safe zone, level with the bottom of Lumi's dock. -->
		<div class="absolute left-0 hidden w-20 justify-center sm:flex" style:bottom="{DOCK_GAP}px">
			<TooltipGroup>
				<Tooltip text={birdsEye ? 'Back to cards' : "Bird's eye"} side="right" describes={false}>
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
