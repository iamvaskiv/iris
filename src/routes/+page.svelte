<script lang="ts">
	import { tick } from 'svelte';
	import { toggleMode } from 'mode-watcher';
	import { Breadcrumb, Button, ChatMessage, PromptInput } from '@latitudelabs/design-system';
	import { Moon, Sun } from '@latitudelabs/design-system/icons';
	import { cardComponent } from '#lib/cards/registry.js';
	import type { Card, CardOp, ChatResponse } from '#lib/cards/types.js';

	let cards = $state<Card[]>([]);
	let focusedId = $state<string>();
	let history = $state<unknown[]>([]);
	let reply = $state('');
	let draft = $state('');
	let thinking = $state(false);
	let error = $state('');
	let scroller: HTMLElement;

	const hour = new Date().getHours();
	const greeting = hour < 12 ? 'Good morning!' : hour < 18 ? 'Good afternoon!' : 'Good evening!';

	function apply(op: CardOp) {
		if (op.op === 'add') cards.push(op.card);
		if (op.op === 'update') {
			const i = cards.findIndex((c) => c.id === op.card.id);
			if (i >= 0) cards[i] = op.card;
		}
		focusedId = op.op === 'focus' ? op.id : op.card.id;
	}

	async function focus(id: string | undefined) {
		focusedId = id;
		await tick();
		const el = id && document.getElementById(`card-${id}`);
		if (!el) return;
		// The dock covers the bottom of the screen, so tall cards are aligned to the top instead of centered.
		const block = el.offsetHeight > scroller.clientHeight - 240 ? 'start' : 'center';
		el.scrollIntoView({ behavior: 'smooth', block });
	}

	async function send(message: string) {
		draft = '';
		error = '';
		thinking = true;
		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ message, history, cards, focusedId })
			});
			const data: ChatResponse = await res.json();
			reply = data.text;
			history = data.history;
			error = data.error ?? '';
			data.ops.forEach(apply);
			if (data.ops.length) await focus(focusedId);
		} catch (e) {
			error = String(e);
		} finally {
			thinking = false;
		}
	}
</script>

<div class="flex h-dvh flex-col bg-background">
	<header class="flex items-center justify-between px-8 py-8">
		<Breadcrumb.Root>
			<Breadcrumb.List>
				<Breadcrumb.Item><Breadcrumb.Link href="/">Projects</Breadcrumb.Link></Breadcrumb.Item>
				<Breadcrumb.Separator>/</Breadcrumb.Separator>
				<Breadcrumb.Item><Breadcrumb.Page>New</Breadcrumb.Page></Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>
		<Button variant="ghost" size="icon" onclick={toggleMode} aria-label="Toggle theme">
			<Sun class="dark:hidden" />
			<Moon class="hidden dark:block" />
		</Button>
	</header>

	<main bind:this={scroller} class="flex-1 overflow-y-auto">
		{#if cards.length === 0}
			<div class="flex h-full flex-col items-center justify-center gap-8 pb-40">
				<div class="relative size-20" role="img" aria-label="Lumi AI">
					<div class="absolute inset-0 rounded-full bg-brand blur-sm"></div>
				</div>
				<h1 class="text-heading">{greeting}</h1>
			</div>
		{:else}
			<!-- Newest card sits just above the dock; older ones are pushed up. -->
			<div class="mx-auto flex min-h-full max-w-3xl flex-col justify-end gap-5 px-4 pt-8 pb-56">
				{#each cards as card (card.id)}
					{@const CardView = cardComponent(card.type)}
					<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
					<div
						id="card-{card.id}"
						class={['scroll-my-24 transition-opacity', card.id !== focusedId && 'opacity-60 hover:opacity-100']}
						onclick={() => (focusedId = card.id)}
					>
						<CardView {card} />
					</div>
				{/each}
			</div>
		{/if}
	</main>

	<div class="fixed bottom-8 left-1/2 flex w-full max-w-md -translate-x-1/2 flex-col gap-5 rounded-xl bg-card p-2 shadow-raised">
		{#if thinking || reply || error}
			<ChatMessage class="items-center" aria-live="polite">
				{#if thinking}
					<span class="text-muted-foreground">hmm, give me a sec..</span>
				{:else if error}
					<span class="text-destructive">{error}</span>
				{:else}
					{reply}
				{/if}
			</ChatMessage>
		{/if}
		<PromptInput bind:value={draft} placeholder="What are we analysing today..?" disabled={thinking} onsubmit={send} />
	</div>
</div>
