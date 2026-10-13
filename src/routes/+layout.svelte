<script lang="ts">
	import './layout.css';
	import { ModeWatcher } from 'mode-watcher';
	import { dev } from '$app/env';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

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
