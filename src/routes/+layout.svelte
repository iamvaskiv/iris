<script lang="ts">
	import './layout.css';
	import { ModeWatcher } from 'mode-watcher';
	import { dev } from '$app/env';
	import favicon from '#lib/assets/favicon.svg';
	import { restartOnboarding, RESTART_KEYS } from '#lib/workspace-chat.svelte.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<!-- Fathom analytics, on the deployed site only (the dev server would count every local visit). It follows the
	     app's own page changes by itself. -->
	{#if !dev}
		<script src="https://cdn.usefathom.com/script.js" data-site="SFRJLREY" defer></script>
	{/if}
</svelte:head>

<!-- Restart onboarding from anywhere (also in Settings → Assistant). -->
<svelte:window
	onkeydown={(e) => {
		if (!RESTART_KEYS.matches(e)) return;
		e.preventDefault();
		restartOnboarding();
	}}
/>

<!-- Follows the system light/dark setting and remembers the user's choice. -->
<ModeWatcher />

{@render children()}

<!-- DialKit: live-tuning panels registered by pages (e.g. /dev/orb). Loaded in development only, so production
     bundles don't carry it. -->
{#if dev}
	{#await import('dialkit/svelte') then { DialRoot }}
		<DialRoot position="bottom-right" />
	{/await}
{/if}
