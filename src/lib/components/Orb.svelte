<script lang="ts" module>
	export type OrbState = 'idle' | 'thinking' | 'speaking';
	/** 'breathe-swirl': CSS, the brand gradient breathing and swirling. 'eye-spiral': WebGL spiral eye. */
	export type OrbVariant = 'breathe-swirl' | 'eye-spiral';
	export const ORB_VARIANTS: OrbVariant[] = ['breathe-swirl', 'eye-spiral'];
</script>

<script lang="ts">
	import ShaderOrb, { type EyeTune } from './ShaderOrb.svelte';

	/**
	 * Lumi's avatar: the brand-gradient orb, alive.
	 * CSS layers, each with its own animation so transforms don't fight:
	 *   .orb > pop wrapper (pop when `pulse` changes) > .breath (breathing scale/glow) > .core (gradient swirl).
	 * `state` changes the tempo: thinking speeds everything up; speaking swirls a little faster.
	 * 'eye-spiral' draws with WebGL instead and falls back to the CSS orb if WebGL is unavailable.
	 */
	let {
		size = 40,
		state: mood = 'idle',
		variant = 'breathe-swirl',
		pulse,
		transitionName,
		eyeTune,
		class: className
	}: {
		/** Diameter in px. */
		size?: number;
		state?: OrbState;
		variant?: OrbVariant;
		/** Change this value (e.g. to the latest reply) to play a one-off "pop". */
		pulse?: unknown;
		/** View-transition name, so the orb can morph between layouts. */
		transitionName?: string;
		/** Tuning for the spiral eye (defaults if omitted). */
		eyeTune?: EyeTune;
		class?: string;
	} = $props();

	const blur = $derived(Math.max(3, Math.round(size * 0.09)));

	let webglFailed = $state(false);
	// Pressing the eye makes it flinch, on press down (see ShaderOrb's `tap`).
	let taps = $state(0);
	const useShader = $derived(variant === 'eye-spiral' && !webglFailed);

	// Replay the pop by restarting its CSS animation; the breathing and swirl layers keep running undisturbed.
	let popEl: HTMLElement;
	let first = true;
	$effect(() => {
		void pulse;
		if (first) return void (first = false); // no pop on first render
		popEl.classList.remove('popping');
		void popEl.offsetWidth; // reflow so the animation starts again
		popEl.classList.add('popping');
	});
</script>

<!-- The tap is a playful flourish, not an action, so the orb stays an image rather than a button. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class={['orb relative shrink-0', className, useShader && 'cursor-pointer']}
	onpointerdown={() => useShader && taps++}
	style:width="{size}px"
	style:height="{size}px"
	style:view-transition-name={transitionName}
	data-state={mood}
	role="img"
	aria-label="Lumi"
>
	{#if useShader}
		<ShaderOrb
			{size}
			state={mood}
			{pulse}
			tap={taps}
			tune={eyeTune}
			onfail={() => (webglFailed = true)}
		/>
	{/if}
	<div bind:this={popEl} class="absolute inset-0" hidden={useShader}>
		<div class="breath absolute inset-0">
			<div class="core absolute inset-0 rounded-full bg-brand" style:filter="blur({blur}px)"></div>
		</div>
	</div>
</div>

<style>
	.breath {
		animation: breathe 5s ease-in-out infinite;
	}
	.core {
		animation: swirl 14s linear infinite;
	}

	/* Thinking: faster and stronger. */
	[data-state='thinking'] .breath {
		animation: breathe-strong 1.4s ease-in-out infinite;
	}
	[data-state='thinking'] .core {
		animation-duration: 2.5s;
	}

	/* Speaking: a little livelier while the reply reveals. */
	[data-state='speaking'] .core {
		animation-duration: 6s;
	}

	/* New message: one-off pop. Added from script (see the effect above), hence :global. */
	.orb :global(.popping) {
		animation: pop 520ms cubic-bezier(0.3, 1.6, 0.5, 1) both;
	}

	@keyframes breathe {
		50% {
			transform: scale(1.05);
			filter: brightness(1.08) saturate(1.1);
		}
	}
	@keyframes breathe-strong {
		50% {
			transform: scale(1.12);
			filter: brightness(1.15) saturate(1.2);
		}
	}
	@keyframes swirl {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes pop {
		0% {
			transform: scale(1);
		}
		35% {
			transform: scale(1.18);
		}
		100% {
			transform: scale(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.orb * {
			animation: none !important;
		}
	}
</style>
