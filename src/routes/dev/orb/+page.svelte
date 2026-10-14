<script lang="ts">
	import { onMount } from 'svelte';
	import { Badge, Button, Card } from '@latitudelabs/design-system';
	import AppHeader from '#lib/components/AppHeader.svelte';
	import Orb, { ORB_VARIANTS, type OrbState, type OrbVariant } from '#lib/components/Orb.svelte';
	import { loadOrbVariant, orbVariant, useOrbVariant } from '#lib/orb-variant.svelte.js';
	import { createDialKitController } from 'dialkit/svelte';
	import { EYE_DEFAULTS as D, type EyeTune } from '#lib/components/ShaderOrb.svelte';

	onMount(loadOrbVariant);

	// Live tuning for the spiral eye (DialKit panel). [default, min, max, step]; defaults come from EYE_DEFAULTS,
	// the single source for the app too. Values are saved in this browser.
	const dial = createDialKitController(
		'Eye · Spiral',
		{
			reset: { type: 'action', label: 'Reset to defaults' },
			Motion: {
				tempo: [D.tempo, 0, 1, 0.01],
				wander: [D.wander, 0, 0.4, 0.01],
				gaze: [D.gaze, 0, 0.8, 0.01],
				maxDistance: [D.maxDistance, 0, 0.8, 0.01],
				gazeReach: [D.gazeReach, 40, 600, 10],
				gazeEase: [D.gazeEase, 0.3, 10, 0.1],
				attention: [D.attention, 1, 30, 1]
			},
			Spiral: {
				curl: [D.curl, 0, 2, 0.01],
				arms: [D.arms, 1, 8, 1],
				twist: [D.twist, 0, 12, 0.1],
				spin: [D.spin, 0, 6, 0.1],
				flow: [D.flow, 0, 4, 0.05]
			},
			Light: {
				core: [D.core, 0, 2, 0.01],
				coreSize: [D.coreSize, 0.3, 3, 0.05],
				halo: [D.halo, 0, 1, 0.01],
				saturation: [D.saturation, 0.5, 2, 0.01]
			},
			Body: {
				edge: [D.edge, 0.02, 0.6, 0.01],
				wobble: [D.wobble, 0, 0.3, 0.01]
			}
		},
		{ persist: true, onAction: (action) => action === 'reset' && dial.resetValues() }
	);
	const eye = dial.values;

	// Per-value reset: double-click a slider to put just that value back to its default. DialKit has no per-control
	// reset, so this matches the slider's label ("Max Distance") to its key (maxDistance) and uses dial.setValue.
	const paths = Object.fromEntries(
		Object.entries(eye).flatMap(([folder, group]) =>
			typeof group === 'object'
				? Object.keys(group).map((key) => [key.toLowerCase(), `${folder}.${key}`])
				: []
		)
	);
	function ondblclick(e: MouseEvent) {
		const slider = (e.target as HTMLElement).closest('.dialkit-slider-wrapper');
		const label = slider?.querySelector('[aria-label]')?.getAttribute('aria-label');
		const path = label && paths[label.replace(/\s+/g, '').toLowerCase()];
		if (!path) return;
		const key = path.split('.')[1] as keyof EyeTune;
		dial.setValue(path, D[key]);
	}
	const eyeTune: EyeTune = $derived({ ...eye.Motion, ...eye.Spiral, ...eye.Light, ...eye.Body });

	const about: Record<OrbVariant, { name: string; description: string }> = {
		'breathe-swirl': {
			name: 'Breathe + swirl',
			description: 'CSS. The brand gradient breathing and slowly swirling.'
		},
		'eye-spiral': {
			name: 'Eye · Spiral',
			description:
				'WebGL. A bright point near the centre that looks towards your cursor, with colour spiralling out.'
		}
	};

	let mood = $state<OrbState>('idle');
	const states: { value: OrbState; label: string }[] = [
		{ value: 'idle', label: 'Idle' },
		{ value: 'thinking', label: 'Thinking' }
	];

	// Bumping a variant's counter replays its new-message pop.
	let pops = $state<Record<string, number>>({});
	const pop = (variant: OrbVariant) => (pops[variant] = (pops[variant] ?? 0) + 1);
</script>

<svelte:window {ondblclick} />

<svelte:head><title>Orb · Iris</title></svelte:head>

<div class="min-h-dvh bg-background">
	<AppHeader />

	<main class="mx-auto mt-12 flex w-full max-w-[970px] flex-col gap-4 px-4 pb-16">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div class="flex flex-col gap-1">
				<h1 class="text-heading">Orb</h1>
				<p class="text-body text-muted-foreground">
					Iris’s avatar. “Use in app” applies a variant to the dock in this browser. Tune the spiral
					eye live in the panel at the bottom right.
				</p>
			</div>
			<div class="flex gap-1" role="radiogroup" aria-label="State">
				{#each states as s (s.value)}
					<Button
						variant={mood === s.value ? 'secondary' : 'ghost'}
						size="sm"
						role="radio"
						aria-checked={mood === s.value}
						onclick={() => (mood = s.value)}
					>
						{s.label}
					</Button>
				{/each}
			</div>
		</div>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			{#each ORB_VARIANTS as variant (variant)}
				{@const inUse = orbVariant.current === variant}
				<Card.Root>
					<Card.Header>
						<Card.Title>{about[variant].name}</Card.Title>
						<Card.Description>{about[variant].description}</Card.Description>
						<Card.Action>
							{#if inUse}
								<Badge variant="secondary">In use</Badge>
							{:else}
								<Button variant="secondary" size="sm" onclick={() => useOrbVariant(variant)}
									>Use in app</Button
								>
							{/if}
						</Card.Action>
					</Card.Header>
					<Card.Content>
						<div class="flex items-center justify-center gap-10 rounded-sm bg-background p-10">
							<Orb size={96} {variant} state={mood} pulse={pops[variant]} {eyeTune} />
							<Orb size={40} {variant} state={mood} pulse={pops[variant]} {eyeTune} />
						</div>
						<div class="flex justify-end">
							<Button variant="ghost" size="sm" onclick={() => pop(variant)}
								>Pop (new message)</Button
							>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	</main>
</div>
