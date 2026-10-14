<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import AiDock, { timeOfDayGreeting } from '#lib/components/AiDock.svelte';
	import AppHeader from '#lib/components/AppHeader.svelte';
	import { cardComponent } from '#lib/cards/registry.js';
	import type { Card, CardOp, ChatResponse } from '#lib/cards/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Local copy of the project that this page edits as the conversation goes on.
	// svelte-ignore state_referenced_locally
	let project = $state(structuredClone(data.project));
	let thinking = $state(false);
	let error = $state('');
	let draft = $state('');
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
		if (q) {
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

		// XHR rather than fetch, for upload progress.
		const ok = await new Promise<boolean>((resolve) => {
			const xhr = new XMLHttpRequest();
			xhr.open('PUT', `/api/projects/${project.id}/upload?ingestionId=${card.data!.ingestionId}`);
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
	const snapArea = $derived(viewHeight - HEADER - dockHeight - DOCK_GAP);

	// Just enough space before the first and after the last card to center them in the visible area (a tall card
	// gets a small gap instead). With a single short card the content fits the view exactly: nothing to scroll.
	const edgeSpace = (id: string | undefined, chrome: number) => {
		const h = id ? (cardHeights[id] ?? 0) : 0;
		return chrome + (h && h < snapArea ? (snapArea - h) / 2 : 32);
	};
	const padTop = $derived(edgeSpace(project.cards[0]?.id, HEADER));
	const padBottom = $derived(edgeSpace(project.cards.at(-1)?.id, dockHeight + DOCK_GAP));

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
		const target = height <= available ? r.top + (available - height) / 2 : r.top + PEEK;
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
		if (autoScrolling || frame) return;
		frame = requestAnimationFrame(() => {
			frame = 0;
			const id = mostVisible();
			if (id) project.focusedId = id;
		});
	}

	function onscrollend() {
		// The app's own scroll keeps the card it chose, even if it landed short (e.g. clamped at the end).
		if (autoScrolling) return void (autoScrolling = false);
		// The last scroll frame (or the browser's snap) may not have been processed yet.
		const id = mostVisible();
		if (id) project.focusedId = id;
	}

	async function send(message: string) {
		draft = '';
		error = '';
		thinking = true;
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
		class="flex-1 snap-y snap-proximity overflow-y-auto"
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
			<div
				class="mx-auto flex max-w-3xl flex-col gap-5 px-4"
				style:padding-top="{padTop}px"
				style:padding-bottom="{padBottom}px"
			>
				{#each project.cards as card (card.id)}
					{@const CardView = cardComponent(card.type)}
					<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
					<div
						id="card-{card.id}"
						bind:offsetHeight={cardHeights[card.id]}
						class={[
							'transition-[opacity,scale] duration-300',
							(cardHeights[card.id] ?? 0) <= snapArea && 'snap-center',
							card.id !== project.focusedId && 'scale-90 opacity-60 hover:opacity-100'
						]}
						onclick={() => focus(card.id)}
					>
						<CardView {card} />
					</div>
				{/each}
			</div>
		{/if}
	</main>

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
		bind:height={dockHeight}
		onsubmit={send}
	/>
</div>
