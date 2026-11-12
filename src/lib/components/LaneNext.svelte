<script lang="ts">
	import { ArrowRight } from '@latitudelabs/design-system/icons';

	/**
	 * The empty slot one step past a lane's last card (and the empty lane below the last lane): what Lumi could add next,
	 * as next steps written as the user's request, each in Lumi's dock colours (her wash, ink and tinted edge). Picking
	 * one sends it to Lumi. Without any, a line points to her dock.
	 */
	type Props = {
		/** Names the list for screen readers: "Next steps", "Something new". */
		label: string;
		suggestions: string[];
		onselect?: (suggestion: string) => void;
		disabled?: boolean;
		class?: string;
	};
	let { label, suggestions, onselect, disabled = false, class: className }: Props = $props();
</script>

{#if suggestions.length}
	<ul class={['flex w-96 max-w-full flex-col gap-2', className]} aria-label={label}>
		{#each suggestions as suggestion (suggestion)}
			<li>
				<button
					type="button"
					{disabled}
					class="lumi-step group relative isolate flex min-h-12 w-full items-center justify-between gap-3 overflow-hidden rounded-lg bg-card py-3 pr-4 pl-5 text-left text-body-lg shadow-raised outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
					onclick={() => onselect?.(suggestion)}
				>
					<!-- Lumi's colours, faintly, as on her dock. -->
					<span class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
						<span class="blob absolute -top-12 -left-8 size-32 rounded-full bg-brand-3 blur-2xl"
						></span>
						<span
							class="blob absolute -right-10 -bottom-14 size-36 rounded-full bg-brand-2 blur-2xl"
						></span>
						<span class="blob absolute top-2 left-1/2 size-20 rounded-full bg-brand-4 blur-2xl"
						></span>
					</span>
					<span class="flex-1">{suggestion}</span>
					<ArrowRight
						class="arrow size-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
						aria-hidden="true"
					/>
				</button>
			</li>
		{/each}
	</ul>
{:else}
	<p class={['w-96 max-w-full text-body text-muted-foreground', className]}>
		Ask Lumi below, and she'll add a card for it.
	</p>
{/if}

<style>
	/* Dressed like Lumi's dock: her ink, a faint tinted edge over the card's shadow, and her wash, a little stronger on
	   hover. */
	.lumi-step {
		color: var(--lumi-ink);
		outline: 1px solid var(--lumi-edge-faint);
		outline-offset: -1px;
		transition: box-shadow 0.25s ease-out;
	}
	.lumi-step:enabled:hover {
		box-shadow:
			var(--shadow-raised),
			0 0 18px -4px var(--lumi-glow);
	}
	.lumi-step :global(.arrow) {
		color: var(--lumi-ink-soft);
	}
	.lumi-step .blob {
		opacity: 0.14;
		transition:
			opacity 0.4s ease-out,
			translate 0.8s ease-out;
	}
	.lumi-step:enabled:hover .blob {
		opacity: 0.22;
		translate: 12px 0;
	}
	:global(.dark) .lumi-step .blob {
		opacity: 0.24;
	}
	:global(.dark) .lumi-step:enabled:hover .blob {
		opacity: 0.32;
	}
	@media (prefers-reduced-motion: reduce) {
		.lumi-step .blob {
			transition: none;
		}
		.lumi-step:enabled:hover .blob {
			translate: none;
		}
	}
</style>
