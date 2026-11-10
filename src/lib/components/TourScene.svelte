<script lang="ts">
	import { fade } from 'svelte/transition';
	import { Badge, cn } from '@latitudelabs/design-system';
	import {
		ChartColumn,
		Icon,
		Play,
		Sparkles,
		Users,
		Video
	} from '@latitudelabs/design-system/icons';

	/**
	 * The small looping scene under Lumi during the first-visit tour (TOUR_STEPS in intro.ts), one per thing Lumi does
	 * (steps 1-4; her hello, step 0, has none): a video broken down, a study drafted, viewers' feelings over time, two videos compared (one marked as preferred). Decorative: what Lumi says
	 * above it carries the meaning. Every scene loops every 6s and shows its finished state with reduced motion.
	 */
	let { step, class: className }: { step: number; class?: string } = $props();
</script>

<div
	class={cn(
		'relative h-56 w-full max-w-md overflow-hidden rounded-xl bg-card shadow-hairline',
		className
	)}
	aria-hidden="true"
>
	{#key step}
		<div
			class="absolute inset-0"
			in:fade={{ duration: 300, delay: 100 }}
			out:fade={{ duration: 150 }}
		>
			{#if step === 1}
				<!-- Video analysis: the poster, its scenes filling the timeline, then what's in it. -->
				<div class="scene-analysis flex h-full items-center gap-5 p-6">
					<div class="flex w-48 shrink-0 flex-col gap-2">
						<div class="relative isolate flex aspect-video items-center justify-center">
							<div class="absolute inset-0 -z-10 rounded-sm bg-brand opacity-50"></div>
							<span
								class="flex size-8 items-center justify-center rounded-full bg-card/80 text-foreground"
								><Icon icon={Play} class="size-4" /></span
							>
						</div>
						<div class="flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted">
							<div class="seg seg-1 rounded-full bg-brand-3/50"></div>
							<div class="seg seg-2 rounded-full bg-brand-2/50"></div>
							<div class="seg seg-3 rounded-full bg-brand-1/50"></div>
							<div class="seg seg-4 rounded-full bg-brand-4/50"></div>
						</div>
						<div class="h-2 w-3/4 rounded-full bg-muted"></div>
					</div>
					<div class="flex flex-col items-start gap-2">
						<span class="text-caption text-muted-foreground">Characters</span>
						<div class="flex flex-wrap gap-1">
							<span class="chip chip-1"><Badge variant="secondary">Joy</Badge></span>
							<span class="chip chip-2"><Badge variant="secondary">Anxiety</Badge></span>
						</div>
						<span class="text-caption text-muted-foreground">Themes</span>
						<div class="flex flex-wrap gap-1">
							<span class="chip chip-3"><Badge variant="secondary">Growing up</Badge></span>
						</div>
					</div>
				</div>
			{:else if step === 2}
				<!-- Viewer studies: questions slide in, each pinned to a moment on the video's timeline. -->
				<div class="scene-study flex h-full flex-col gap-3 p-6">
					<div class="flex items-center gap-3">
						<div class="aspect-video w-20 shrink-0 rounded-sm bg-brand opacity-50"></div>
						<div class="relative h-1.5 flex-1 rounded-full bg-muted">
							<span
								class="pin pin-1 absolute top-1/2 left-1/4 size-3 -translate-1/2 rounded-full bg-category-green/60"
							></span>
							<span
								class="pin pin-2 absolute top-1/2 left-3/4 size-3 -translate-1/2 rounded-full bg-category-orange/60"
							></span>
						</div>
					</div>
					<div class="flex flex-col gap-2">
						<div class="row row-1 flex items-center gap-3 rounded-sm bg-muted px-3 py-2">
							<span class="text-caption text-muted-foreground">1</span>
							<span class="flex-1 truncate text-caption"
								>How do you feel about the new emotions?</span
							>
							<span class="text-caption text-category-green">Slider</span>
						</div>
						<div class="row row-2 flex items-center gap-3 rounded-sm bg-muted px-3 py-2">
							<span class="text-caption text-muted-foreground">2</span>
							<span class="flex-1 truncate text-caption">What went through your mind here?</span>
							<span class="text-caption text-category-orange">Open</span>
						</div>
						<div class="row row-3 flex items-center gap-3 rounded-sm bg-muted px-3 py-2">
							<span class="text-caption text-muted-foreground">3</span>
							<span class="flex-1 truncate text-caption">Which emotion do you want more of?</span>
							<span class="text-caption text-category-magenta">Choice</span>
						</div>
					</div>
				</div>
			{:else if step === 3}
				<!-- Insights: the numbers, then how viewers felt along the video, and a comment from its high point. -->
				<div class="scene-insights flex h-full flex-col gap-3 p-6">
					<div class="stats flex gap-6">
						<div class="flex flex-col">
							<span class="text-title">4.7 / 5</span>
							<span class="text-caption text-muted-foreground">Rating</span>
						</div>
						<div class="flex flex-col">
							<span class="text-title">174</span>
							<span class="text-caption text-muted-foreground">Responses</span>
						</div>
						<div class="flex flex-col">
							<span class="text-title">57%</span>
							<span class="text-caption text-muted-foreground">Positive</span>
						</div>
					</div>
					<div class="relative flex-1">
						<svg
							viewBox="0 0 300 80"
							preserveAspectRatio="none"
							class="absolute inset-0 h-full w-full"
						>
							<path
								class="area"
								d="M0 60 C 30 55, 50 40, 80 45 S 130 70, 160 50 S 210 10, 240 18 S 280 40, 300 30 L 300 80 L 0 80 Z"
							/>
							<path
								class="curve"
								pathLength="1"
								d="M0 60 C 30 55, 50 40, 80 45 S 130 70, 160 50 S 210 10, 240 18 S 280 40, 300 30"
							/>
						</svg>
						<span
							class="comment absolute top-0 right-6 rounded-md bg-secondary px-2 py-1 text-caption text-secondary-foreground shadow-raised"
							>“Love the transition”</span
						>
					</div>
				</div>
			{:else}
				<!-- Comparison: two videos side by side, their scores racing, one marked as landing better. -->
				<div class="scene-compare grid h-full grid-cols-2 gap-4 p-6">
					{#each [{ poster: 'bg-brand opacity-50', bar: 'bar-a', label: 'Trailer' }, { poster: 'bg-brand-4/50', bar: 'bar-b', label: 'Teaser' }] as v, i (v.label)}
						<div class="flex flex-col gap-2">
							<div class={['aspect-video w-full rounded-sm', v.poster]}></div>
							<div class="flex items-center justify-between gap-2">
								<span class="text-caption">{v.label}</span>
								{#if i === 0}<span class="lead"><Badge variant="success">Preferred</Badge></span
									>{/if}
							</div>
							<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
								<div
									class={[
										'h-full rounded-full',
										v.bar,
										i === 0 ? 'bg-brand-2/50' : 'bg-brand-4/50'
									]}
								></div>
							</div>
							<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
								<div
									class={[
										'h-full rounded-full',
										v.bar,
										'second',
										i === 0 ? 'bg-brand-3/50' : 'bg-brand-1/50'
									]}
								></div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/key}
</div>

<style>
	.scene-analysis .seg,
	.scene-analysis .chip,
	.scene-study .pin,
	.scene-study .row,
	.scene-insights .stats,
	.scene-insights .curve,
	.scene-insights .area,
	.scene-insights .comment,
	.scene-compare .bar-a,
	.scene-compare .bar-b,
	.scene-compare .lead {
		animation: 6s ease-out infinite both;
	}

	/* Video analysis: the timeline fills scene by scene, then the chips pop in. */
	.seg-1 {
		animation-name: seg-1;
	}
	.seg-2 {
		animation-name: seg-2;
	}
	.seg-3 {
		animation-name: seg-3;
	}
	.seg-4 {
		animation-name: seg-4;
	}
	@keyframes seg-1 {
		0%,
		5% {
			width: 0;
		}
		15%,
		92% {
			width: 22%;
		}
		100% {
			width: 0;
		}
	}
	@keyframes seg-2 {
		0%,
		15% {
			width: 0;
		}
		25%,
		92% {
			width: 30%;
		}
		100% {
			width: 0;
		}
	}
	@keyframes seg-3 {
		0%,
		25% {
			width: 0;
		}
		35%,
		92% {
			width: 26%;
		}
		100% {
			width: 0;
		}
	}
	@keyframes seg-4 {
		0%,
		35% {
			width: 0;
		}
		45%,
		92% {
			width: 22%;
		}
		100% {
			width: 0;
		}
	}
	.chip {
		display: inline-flex;
	}
	.chip-1 {
		animation-name: pop-50;
	}
	.chip-2 {
		animation-name: pop-58;
	}
	.chip-3 {
		animation-name: pop-66;
	}

	/* Viewer studies: rows slide in one after the other, each pin lands with its question. */
	.row-1 {
		animation-name: slide-15;
	}
	.row-2 {
		animation-name: slide-30;
	}
	.row-3 {
		animation-name: slide-45;
	}
	.pin-1 {
		animation-name: pop-20;
	}
	.pin-2 {
		animation-name: pop-35;
	}

	/* Insights: numbers first, then the curve draws, then a comment from its high point. */
	.stats {
		animation-name: fade-5;
	}
	.curve {
		fill: none;
		stroke: color-mix(in oklab, var(--brand-2) 60%, transparent);
		stroke-width: 2.5;
		stroke-linecap: round;
		stroke-dasharray: 1;
		vector-effect: non-scaling-stroke;
		animation-name: draw;
	}
	.area {
		fill: color-mix(in oklab, var(--brand-2) 8%, transparent);
		animation-name: fade-50;
	}
	.comment {
		animation-name: pop-62;
	}
	@keyframes draw {
		0%,
		15% {
			stroke-dashoffset: 1;
		}
		55%,
		92% {
			stroke-dashoffset: 0;
		}
		100% {
			stroke-dashoffset: 1;
			opacity: 0;
		}
	}

	/* Comparison: both videos' bars race, the trailer pulls ahead, then it's marked. */
	.bar-a {
		animation-name: bar-a;
	}
	.bar-b {
		animation-name: bar-b;
	}
	.bar-a.second {
		animation-name: bar-a2;
	}
	.bar-b.second {
		animation-name: bar-b2;
	}
	.lead {
		display: inline-flex;
		animation-name: pop-62;
	}
	@keyframes bar-a {
		0%,
		10% {
			width: 0;
		}
		50%,
		92% {
			width: 88%;
		}
		100% {
			width: 0;
		}
	}
	@keyframes bar-b {
		0%,
		10% {
			width: 0;
		}
		50%,
		92% {
			width: 58%;
		}
		100% {
			width: 0;
		}
	}
	@keyframes bar-a2 {
		0%,
		15% {
			width: 0;
		}
		55%,
		92% {
			width: 74%;
		}
		100% {
			width: 0;
		}
	}
	@keyframes bar-b2 {
		0%,
		15% {
			width: 0;
		}
		55%,
		92% {
			width: 63%;
		}
		100% {
			width: 0;
		}
	}

	/* Shared: pop in, slide in or fade in at a point in the loop (the number is where, in %), out at the end. */
	@keyframes pop-20 {
		0%,
		20% {
			opacity: 0;
			scale: 0.6;
		}
		27%,
		92% {
			opacity: 1;
			scale: 1;
		}
		100% {
			opacity: 0;
		}
	}
	@keyframes pop-35 {
		0%,
		35% {
			opacity: 0;
			scale: 0.6;
		}
		42%,
		92% {
			opacity: 1;
			scale: 1;
		}
		100% {
			opacity: 0;
		}
	}
	@keyframes pop-50 {
		0%,
		50% {
			opacity: 0;
			scale: 0.6;
		}
		57%,
		92% {
			opacity: 1;
			scale: 1;
		}
		100% {
			opacity: 0;
		}
	}
	@keyframes pop-58 {
		0%,
		58% {
			opacity: 0;
			scale: 0.6;
		}
		65%,
		92% {
			opacity: 1;
			scale: 1;
		}
		100% {
			opacity: 0;
		}
	}
	@keyframes pop-62 {
		0%,
		62% {
			opacity: 0;
			scale: 0.6;
		}
		69%,
		92% {
			opacity: 1;
			scale: 1;
		}
		100% {
			opacity: 0;
		}
	}
	@keyframes pop-66 {
		0%,
		66% {
			opacity: 0;
			scale: 0.6;
		}
		73%,
		92% {
			opacity: 1;
			scale: 1;
		}
		100% {
			opacity: 0;
		}
	}
	@keyframes slide-15 {
		0%,
		15% {
			opacity: 0;
			translate: 0 8px;
		}
		24%,
		92% {
			opacity: 1;
			translate: 0 0;
		}
		100% {
			opacity: 0;
		}
	}
	@keyframes slide-30 {
		0%,
		30% {
			opacity: 0;
			translate: 0 8px;
		}
		39%,
		92% {
			opacity: 1;
			translate: 0 0;
		}
		100% {
			opacity: 0;
		}
	}
	@keyframes slide-45 {
		0%,
		45% {
			opacity: 0;
			translate: 0 8px;
		}
		54%,
		92% {
			opacity: 1;
			translate: 0 0;
		}
		100% {
			opacity: 0;
		}
	}
	@keyframes fade-5 {
		0%,
		5% {
			opacity: 0;
		}
		14%,
		92% {
			opacity: 1;
		}
		100% {
			opacity: 0;
		}
	}
	@keyframes fade-50 {
		0%,
		45% {
			opacity: 0;
		}
		60%,
		92% {
			opacity: 1;
		}
		100% {
			opacity: 0;
		}
	}

	/* Without motion: every scene shows its finished state, still. */
	@media (prefers-reduced-motion: reduce) {
		.scene-analysis .seg,
		.scene-analysis .chip,
		.scene-study .pin,
		.scene-study .row,
		.scene-insights .stats,
		.scene-insights .curve,
		.scene-insights .area,
		.scene-insights .comment,
		.scene-compare .bar-a,
		.scene-compare .bar-b,
		.scene-compare .lead {
			animation: none;
		}
		.seg-1,
		.seg-4 {
			width: 22%;
		}
		.seg-2 {
			width: 30%;
		}
		.seg-3 {
			width: 26%;
		}
		.curve {
			stroke-dashoffset: 0;
		}
		.bar-a {
			width: 88%;
		}
		.bar-b {
			width: 58%;
		}
		.bar-a.second {
			width: 74%;
		}
		.bar-b.second {
			width: 63%;
		}
	}
</style>
