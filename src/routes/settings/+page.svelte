<script lang="ts">
	import { Card, Label, Switch } from '@latitudelabs/design-system';
	import AppHeader from '#lib/components/AppHeader.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	// svelte-ignore state_referenced_locally
	let libraryAccess = $state(data.settings.libraryAccess);
	let error = $state('');

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

<svelte:head><title>Settings · Jinn</title></svelte:head>

<div class="min-h-dvh bg-background">
	<AppHeader crumbs={[{ label: 'Projects', href: '/' }, { label: 'Settings' }]} />

	<main class="mx-auto mt-12 flex w-full max-w-[640px] flex-col gap-4 px-4">
		<h1 class="text-heading">Settings</h1>
		<Card.Root>
			<Card.Header>
				<Card.Title>Assistant</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="flex items-start justify-between gap-4">
					<div class="flex flex-col gap-1">
						<Label for="library-access">Lumiere library</Label>
						<p id="library-access-description" class="text-caption text-muted-foreground">
							Let the assistant browse and use any video in the connected Lumiere workspace. When off, it only
							knows the videos in your projects and never mentions Lumiere.
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
