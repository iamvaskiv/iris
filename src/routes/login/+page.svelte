<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Card, Input, Label } from '@latitudelabs/design-system';
	import Logo from '#lib/components/Logo.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let password = $state('');
	let sending = $state(false);
	// The error clears as soon as the password is edited.
	// svelte-ignore state_referenced_locally
	let wrong = $state(!!form?.wrong);
	$effect(() => void (wrong = !!form?.wrong));
</script>

<svelte:head><title>Sign in · Iris</title></svelte:head>

<main class="flex min-h-dvh flex-col items-center justify-center gap-8 bg-background px-4">
	<Logo class="h-10" />
	<Card.Root class="w-full max-w-sm">
		<Card.Header>
			<Card.Title>Sign in</Card.Title>
			<Card.Description>Enter the team password to try Iris.</Card.Description>
		</Card.Header>
		<Card.Content>
			<form
				method="POST"
				class="flex flex-col gap-4"
				use:enhance={() => {
					sending = true;
					return async ({ update }) => {
						await update({ reset: false });
						sending = false;
					};
				}}
			>
				<div class="flex flex-col gap-2">
					<Label for="password">Password</Label>
					<Input
						id="password"
						name="password"
						type="password"
						autocomplete="current-password"
						required
						autofocus
						bind:value={password}
						oninput={() => (wrong = false)}
						aria-invalid={wrong ? 'true' : undefined}
						aria-describedby={wrong ? 'password-error' : undefined}
					/>
					{#if wrong}
						<p id="password-error" class="text-caption text-destructive">
							That's not the team password. Check it and try again.
						</p>
					{/if}
				</div>
				<Button type="submit" disabled={sending}>Sign in</Button>
			</form>
		</Card.Content>
	</Card.Root>
</main>
