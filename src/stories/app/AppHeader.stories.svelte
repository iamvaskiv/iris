<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AppHeader from '#lib/components/AppHeader.svelte';

	const { Story } = defineMeta({
		title: 'App/Header',
		component: AppHeader,
		tags: ['autodocs'],
		parameters: {
			layout: 'fullscreen',
			docs: {
				description: {
					component: `The sticky header with a progressive blur. On workspace pages: the logo and the nav (Projects is
current here). Inside a project: a breadcrumb instead.`
				}
			}
		}
	});
</script>

<Story name="Workspace" />

<Story
	name="Inside a project"
	args={{ crumbs: [{ label: 'Projects', href: '/' }, { label: 'Women Talking Trailer' }] }}
/>
