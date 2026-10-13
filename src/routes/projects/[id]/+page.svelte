<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import AiDock from '#lib/components/AiDock.svelte';
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

	async function upload(file: File) {
		error = '';
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
				if (e.lengthComputable) replaceCard({ ...card, data: { ...card.data, progress: Math.round((e.loaded / e.total) * 100) } });
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

	/** Polls Lumiere until processing finishes, then asks the assistant to analyse the new video. */
	async function watch(card: Card) {
		while (true) {
			const res = await fetch(`/api/projects/${project.id}/upload?ingestionId=${card.data!.ingestionId}`);
			if (!res.ok) return;
			const status = await res.json();
			if (status.status === 'completed') {
				project.cards = project.cards.filter((c) => c.id !== card.id);
				send(`I uploaded "${status.fileName}" (video ${status.videoId}) and Lumiere has finished processing it. Give me the full analysis.`);
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

	async function focus(id: string | undefined, behavior: ScrollBehavior = 'smooth') {
		project.focusedId = id;
		await tick();
		const el = id && document.getElementById(`card-${id}`);
		if (!el) return;
		// The dock covers the bottom of the screen, so tall cards are aligned to the top instead of centered.
		const block = el.offsetHeight > scroller.clientHeight - 240 ? 'start' : 'center';
		el.scrollIntoView({ behavior, block });
	}

	async function send(message: string) {
		draft = '';
		error = '';
		thinking = true;
		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ projectId: project.id, message })
			});
			const data: ChatResponse = await res.json();
			project.reply = data.text;
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

<svelte:head><title>{project.name} · Jinn</title></svelte:head>

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
		<div class="pointer-events-none absolute inset-4 z-10 flex items-center justify-center rounded-xl bg-card/90 shadow-raised">
			<p class="text-title">Drop a video to analyse it</p>
		</div>
	{/if}
	<AppHeader crumbs={[{ label: 'Projects', href: '/' }, { label: project.name }]} />

	<main bind:this={scroller} class="flex-1 overflow-y-auto">
		{#if project.cards.length === 0}
			<div class="flex h-full flex-col items-center justify-center gap-8 pb-40">
				<div class="relative size-20" role="img" aria-label="Lumi AI">
					<div class="absolute inset-0 rounded-full bg-brand blur-sm"></div>
				</div>
				<h1 class="text-heading">What are we analysing?</h1>
				<p class="text-body text-muted-foreground">Ask about a video, or drop one here to upload it.</p>
			</div>
		{:else}
			<!-- Newest card sits just above the dock; older ones are pushed up. -->
			<div class="mx-auto flex min-h-full max-w-3xl flex-col justify-end gap-5 px-4 pt-8 pb-56">
				{#each project.cards as card (card.id)}
					{@const CardView = cardComponent(card.type)}
					<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
					<div
						id="card-{card.id}"
						class={['scroll-my-24 transition-opacity', card.id !== project.focusedId && 'opacity-60 hover:opacity-100']}
						onclick={() => (project.focusedId = card.id)}
					>
						<CardView {card} />
					</div>
				{/each}
			</div>
		{/if}
	</main>

	<AiDock reply={project.reply} {thinking} {error} bind:draft onsubmit={send} onupload={upload} />
</div>
