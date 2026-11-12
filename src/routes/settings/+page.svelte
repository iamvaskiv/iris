<script lang="ts">
	import { setMode, setTheme, theme, userPrefersMode } from 'mode-watcher';
	import {
		Button,
		Card,
		Kbd,
		Label,
		Orb,
		SegmentedControl,
		Switch,
		type OrbVariant
	} from '@latitudelabs/design-system';
	import { onMount } from 'svelte';
	import { dev } from '$app/env';
	import AppHeader from '#lib/components/AppHeader.svelte';
	import { restartOnboarding, RESTART_KEYS } from '#lib/workspace-chat.svelte.js';
	import { loadOrbVariant, orbVariant, useOrbVariant } from '#lib/orb-variant.svelte.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let error = $state('');
	// Restarting rebuilds the example before leaving for the projects page, which takes a moment.
	let restarting = $state(false);

	const themes = [
		{ value: 'light', label: 'Light' },
		{ value: 'dark', label: 'Dark' },
		{ value: 'classic', label: 'Classic' },
		{ value: 'system', label: 'System' }
	];
	// Classic is a dark theme from the design system: the `classic` theme on top of dark mode.
	const currentTheme = $derived(theme.current === 'classic' ? 'classic' : userPrefersMode.current);
	function chooseTheme(value: string) {
		if (value === 'classic') {
			setTheme('classic');
			setMode('dark');
		} else {
			setTheme('');
			setMode(value as 'light' | 'dark' | 'system');
		}
	}

	const orbs: { value: OrbVariant; label: string }[] = [
		{ value: 'eye-spiral', label: 'Eye · Spiral' },
		{ value: 'breathe-swirl', label: 'Breathe + swirl' }
	];
	onMount(() => {
		loadOrbVariant();
	});
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
					<SegmentedControl
						aria-labelledby="theme-label"
						options={themes}
						value={currentTheme}
						onValueChange={chooseTheme}
					/>
				</div>
				<div class="flex items-center justify-between gap-4">
					<div class="flex flex-col gap-1">
						<Label id="orb-label">Orb</Label>
						<p class="text-caption text-muted-foreground">How Lumi looks next to its messages.</p>
						{#if dev}
							<!-- Dev only: the orb page with the live tuning panel. -->
							<Button variant="link" size="sm" href="/dev/orb" class="h-auto self-start p-0"
								>Try in dev</Button
							>
						{/if}
					</div>
					<div class="flex items-center gap-3">
						<!-- Live preview of the chosen orb. -->
						<Orb size={28} variant={orbVariant.current} label="Lumi" />
						<SegmentedControl
							aria-labelledby="orb-label"
							options={orbs}
							value={orbVariant.current}
							onValueChange={(v) => useOrbVariant(v as OrbVariant)}
						/>
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
							off, it only knows the videos in your projects and never mentions Lumiere. Not
							available for now.
						</p>
					</div>
					<!-- Switched off for now (see settings.ts): shown, but can't be turned on. -->
					<Switch
						id="library-access"
						aria-describedby="library-access-description"
						checked={data.settings.libraryAccess}
						disabled
					/>
				</div>
				<div class="flex items-start justify-between gap-4">
					<div class="flex flex-col gap-1">
						<Label id="welcome-label">Onboarding</Label>
						<p class="text-caption text-muted-foreground">
							Start over as someone new: Lumi's welcome on the projects page, and the demo project
							as it first opens. Only on this device (the demo resets for everyone).
						</p>
					</div>
					<div class="flex shrink-0 items-center gap-3">
						<Kbd>{RESTART_KEYS.label}</Kbd>
						<Button
							variant="secondary"
							size="sm"
							aria-describedby="welcome-label"
							aria-keyshortcuts="Alt+Shift+O"
							disabled={restarting}
							onclick={async () => {
								restarting = true;
								await restartOnboarding();
							}}>{restarting ? 'Restarting…' : 'Restart'}</Button
						>
					</div>
				</div>
				{#if error}<p class="text-caption text-destructive" role="alert">{error}</p>{/if}
			</Card.Content>
		</Card.Root>
	</main>
</div>
