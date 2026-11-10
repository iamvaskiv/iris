<script lang="ts">
	import { Button, Card, Popover, buttonVariants, cn } from '@latitudelabs/design-system';
	import { CircleCheck, Icon } from '@latitudelabs/design-system/icons';
	import { checklist, dismissChecklist, STEPS, type Checklist } from '#lib/checklist.svelte.js';
	import { newProject } from '#lib/new-project.js';

	/**
	 * The "Getting started" checklist. `tile`: the first tile on the projects page, the same size as a project's.
	 * `pill`: pinned at the top right of a project page, the next step on a button that opens the whole list.
	 * Shows nothing once dismissed.
	 */
	let {
		variant,
		checklist: shown,
		class: className
	}: {
		variant: 'tile' | 'pill';
		/** Stories only: show this state instead of the browser's. */
		checklist?: Checklist;
		class?: string;
	} = $props();

	const state = $derived(shown ?? checklist());
	const doneCount = $derived(state.done.length);
	const allDone = $derived(doneCount === STEPS.length);
	const next = $derived(STEPS.find((s) => !state.done.includes(s.id)));
</script>

<!-- `fill`: in the tile, the steps spread out to fill the card's height. -->
{#snippet list(fill = false)}
	<ol class={['flex flex-col', fill ? 'flex-1 justify-between' : 'gap-2']}>
		{#each STEPS as step (step.id)}
			{@const done = state.done.includes(step.id)}
			<li class="flex gap-2">
				{#if done}
					<Icon icon={CircleCheck} class="mt-0.5 size-4 shrink-0 text-success" label="Done" />
				{:else}
					<span
						class="mt-0.5 size-4 shrink-0 rounded-full border border-muted-foreground"
						aria-hidden="true"
					></span>
				{/if}
				<span class="flex min-w-0 flex-col gap-1">
					<span
						class={['text-body', done && 'text-muted-foreground', step === next && 'font-medium']}
						>{step.label}</span
					>
					{#if step === next}
						<span class="text-caption text-muted-foreground">{step.hint}</span>
						{#if step.id === 'upload'}
							<Button size="sm" variant="secondary" class="self-start" onclick={() => newProject()}
								>Start a project</Button
							>
						{/if}
					{/if}
				</span>
			</li>
		{/each}
	</ol>
{/snippet}

{#snippet finished()}
	<div class="flex flex-col items-start gap-3">
		<p class="text-body text-muted-foreground">
			You've done every step. Lumi's here whenever you have a new video.
		</p>
		<Button size="sm" variant="secondary" onclick={dismissChecklist}>Hide checklist</Button>
	</div>
{/snippet}

{#if !state.dismissed}
	{#if variant === 'tile'}
		<Card.Root
			class={cn('h-72 overflow-hidden', className)}
			aria-labelledby="getting-started-title"
		>
			<Card.Header>
				<Card.Title id="getting-started-title"
					>{allDone ? "You're all set" : 'Getting started'}</Card.Title
				>
			</Card.Header>
			<Card.Content class="flex flex-1 flex-col gap-4">
				{#if allDone}{@render finished()}{:else}{@render list(true)}{/if}
			</Card.Content>
		</Card.Root>
	{:else}
		<Popover.Root>
			<Popover.Trigger
				class={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'max-w-80', className)}
			>
				<span class="truncate">{next ? `Next: ${next.label}` : "You're all set"}</span>
				<span class="text-muted-foreground">{doneCount}/{STEPS.length}</span>
			</Popover.Trigger>
			<Popover.Content align="end" class="flex w-80 flex-col gap-4" aria-label="Getting started">
				<p class="text-title">Getting started</p>
				{#if allDone}{@render finished()}{:else}{@render list()}{/if}
			</Popover.Content>
		</Popover.Root>
	{/if}
{/if}
