<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import AiDock from '#lib/components/AiDock.svelte';
	import AppHeader from '#lib/components/AppHeader.svelte';
	import { cardComponent } from '#lib/cards/registry.js';
	import type { CardOp, ChatResponse } from '#lib/cards/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Local copy of the project that this page edits as the conversation goes on.
	// svelte-ignore state_referenced_locally
	let project = $state(structuredClone(data.project));
	let thinking = $state(false);
	let error = $state('');
	let draft = $state('');
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
	});

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

<div class="flex h-dvh flex-col bg-background">
	<AppHeader crumbs={[{ label: 'Projects', href: '/' }, { label: project.name }]} />

	<main bind:this={scroller} class="flex-1 overflow-y-auto">
		{#if project.cards.length === 0}
			<div class="flex h-full flex-col items-center justify-center gap-8 pb-40">
				<div class="relative size-20" role="img" aria-label="Lumi AI">
					<div class="absolute inset-0 rounded-full bg-brand blur-sm"></div>
				</div>
				<h1 class="text-heading">What are we analysing?</h1>
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

	<AiDock reply={project.reply} {thinking} {error} bind:draft onsubmit={send} />
</div>
