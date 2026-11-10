<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn } from '@latitudelabs/design-system';

	/**
	 * The onboarding's main button (Next, Let's go, Got it), dressed like the Getting started card: a pastel wash of the
	 * brand colours with brand-purple text in light mode, the full colours with white text in dark mode. Its colours
	 * drift a little on hover, and a shimmer sweeps across the label now and then. Brand moments only; everything else uses the design system's Button.
	 * Candidate for the design system: a "brand" Button variant.
	 */
	let {
		children,
		class: className,
		...rest
	}: HTMLButtonAttributes & { children: Snippet; class?: string } = $props();
</script>

<button
	type="button"
	class={cn(
		'brand-button relative isolate inline-flex h-9 cursor-pointer items-center justify-center overflow-hidden rounded-md px-4 text-body font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
		className
	)}
	{...rest}
>
	<span class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
		<span class="blob blob-1 absolute -top-4 -left-3 size-12 rounded-full bg-brand-3 blur-md"
		></span>
		<span class="blob blob-2 absolute -right-4 -bottom-5 size-14 rounded-full bg-brand-2 blur-md"
		></span>
		<!-- The shimmer's band across the whole button, over its colours and under the label (in step with it). -->
		<span class="sheen absolute inset-y-0 -left-1/2 w-1/2"></span>
		<span class="blob blob-3 absolute top-2 left-1/2 size-8 rounded-full bg-brand-4 blur-md"></span>
	</span>
	<!-- The label, with a shimmer sweeping across it from left to right now and then. -->
	<span class="label">{@render children()}</span>
</button>

<style>
	.brand-button {
		--ink: var(--brand-4);
		--shine: color-mix(in oklab, var(--brand-2) 25%, var(--neutral-0));
		background: var(--neutral-0);
		color: var(--ink);
		box-shadow:
			0 0 0 1px color-mix(in oklab, var(--brand-4) 22%, transparent),
			0 0 14px -4px color-mix(in oklab, var(--brand-2) 40%, transparent);
		transition:
			box-shadow 0.25s ease-out,
			scale 0.15s ease-out;
	}
	.brand-button:hover {
		box-shadow:
			0 0 0 1px color-mix(in oklab, var(--brand-4) 30%, transparent),
			0 0 20px -2px color-mix(in oklab, var(--brand-3) 50%, transparent);
	}
	.brand-button:active {
		scale: 0.97;
	}
	.blob {
		opacity: 0.45;
		transition: translate 0.6s ease-out;
	}
	.brand-button:hover .blob-1 {
		translate: 10px 4px;
	}
	.brand-button:hover .blob-2 {
		translate: -12px -3px;
	}
	.brand-button:hover .blob-3 {
		translate: -8px 2px;
	}
	:global(.dark) .brand-button {
		--ink: var(--neutral-0);
		--shine: color-mix(in oklab, var(--brand-3) 25%, var(--neutral-0));
		background: var(--brand-4);
		color: var(--ink);
		box-shadow:
			0 0 0 1px color-mix(in oklab, var(--neutral-0) 25%, transparent),
			0 0 16px -2px color-mix(in oklab, var(--brand-2) 50%, transparent);
	}
	:global(.dark) .blob {
		opacity: 1;
	}
	/* The text is painted by a gradient (ink, a lighter band, ink) that slides left to right, then rests off to the side. */
	.label {
		background: linear-gradient(110deg, var(--ink) 42%, var(--shine) 50%, var(--ink) 58%);
		background-size: 250% 100%;
		background-clip: text;
		-webkit-background-clip: text;
		color: transparent;
		animation: shimmer 3.2s ease-in-out 1s infinite;
		background-position: 100% 0;
	}
	/* The band: a bright diagonal streak travelling from off the left edge to off the right, on the label's beat. */
	.sheen {
		background: linear-gradient(
			105deg,
			transparent 20%,
			color-mix(in oklab, var(--neutral-0) 85%, transparent) 50%,
			transparent 80%
		);
		animation: sheen 3.2s ease-in-out 1s infinite;
	}
	@keyframes sheen {
		0% {
			translate: 0 0;
		}
		55%,
		100% {
			translate: 300% 0;
		}
	}
	@keyframes shimmer {
		0% {
			background-position: 100% 0;
		}
		55%,
		100% {
			background-position: 0% 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.label {
			animation: none;
		}
		.sheen {
			display: none;
		}
		.blob {
			transition: none;
		}
		.brand-button:hover .blob {
			translate: none;
		}
	}
</style>
