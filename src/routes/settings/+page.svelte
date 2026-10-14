<script lang="ts">
	import { setMode, userPrefersMode } from 'mode-watcher';
	import { Button, Card, Label, Switch } from '@latitudelabs/design-system';
	import { onMount } from 'svelte';
	import { dev } from '$app/env';
	import AppHeader from '#lib/components/AppHeader.svelte';
	import Orb, { type OrbVariant } from '#lib/components/Orb.svelte';
	import { loadOrbVariant, orbVariant, useOrbVariant } from '#lib/orb-variant.svelte.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	// svelte-ignore state_referenced_locally
	let libraryAccess = $state(data.settings.libraryAccess);
	let error = $state('');

	const themes = [
		{ value: 'light', label: 'Light' },
		{ value: 'dark', label: 'Dark' },
		{ value: 'system', label: 'System' }
	] as const;

	const orbs: { value: OrbVariant; label: string }[] = [
		{ value: 'eye-spiral', label: 'Eye · Spiral' },
		{ value: 'breathe-swirl', label: 'Breathe + swirl' }
	];
	onMount(loadOrbVariant);

	// Applies immediately, like every switch.
	async function save(checked: boolean) {
		error = '';
		const res = await fetch('/api/settings', {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ libraryAccess: checked })
		});
		if (!res.ok) {
			libraryAccess = !checked;
			error = 'Couldn’t save the setting. Try again.';
		}
	}
</script>

<svelte:head><title>Settings · Iris</title></svelte:head>

<div class="min-h-dvh bg-background">
	<AppHeader />

	<main class="mx-auto mt-12 flex w-full max-w-[640px] flex-col gap-4 px-4">
		<h1 class="text-heading">Settings</h1>
		<Card.Root>
			<Card.Header>
				<Card.Title>Appearance</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="flex items-center justify-between gap-4">
					<Label id="theme-label">Theme</Label>
					<div class="flex gap-1" role="radiogroup" aria-labelledby="theme-label">
						{#each themes as t (t.value)}
							{@const selected = userPrefersMode.current === t.value}
							<Button
								variant={selected ? 'secondary' : 'ghost'}
								size="sm"
								role="radio"
								aria-checked={selected}
								onclick={() => setMode(t.value)}
							>
								{t.label}
							</Button>
						{/each}
					</div>
				</div>
				<div class="flex items-center justify-between gap-4">
					<div class="flex flex-col gap-1">
						<Label id="orb-label">Orb</Label>
						<p class="text-caption text-muted-foreground">How Iris looks next to its messages.</p>
						{#if dev}
							<!-- Dev only: the orb page with the live tuning panel. -->
							<Button variant="link" size="sm" href="/dev/orb" class="h-auto self-start p-0"
								>Try in dev</Button
							>
						{/if}
					</div>
					<div class="flex items-center gap-3">
						<!-- Live preview of the chosen orb. -->
						<Orb size={28} variant={orbVariant.current} />
						<div class="flex gap-1" role="radiogroup" aria-labelledby="orb-label">
							{#each orbs as o (o.value)}
								{@const selected = orbVariant.current === o.value}
								<Button
									variant={selected ? 'secondary' : 'ghost'}
									size="sm"
									role="radio"
									aria-checked={selected}
									onclick={() => useOrbVariant(o.value)}
								>
									{o.label}
								</Button>
							{/each}
						</div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Assistant</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="flex items-start justify-between gap-4">
					<div class="flex flex-col gap-1">
						<Label for="library-access">Lumiere library</Label>
						<p id="library-access-description" class="text-caption text-muted-foreground">
							Let the assistant browse and use any video in the connected Lumiere workspace. When
							off, it only knows the videos in your projects and never mentions Lumiere.
						</p>
					</div>
					<Switch
						id="library-access"
						aria-describedby="library-access-description"
						bind:checked={libraryAccess}
						onCheckedChange={save}
					/>
				</div>
				{#if error}<p class="text-caption text-destructive" role="alert">{error}</p>{/if}
			</Card.Content>
		</Card.Root>
	</main>
</div>
