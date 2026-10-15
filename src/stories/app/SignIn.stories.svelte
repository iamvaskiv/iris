<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import SignIn from '../../routes/login/+page.svelte';

	const { Story } = defineMeta({
		title: 'App/Sign in',
		component: SignIn,
		tags: ['autodocs'],
		parameters: {
			layout: 'fullscreen',
			docs: {
				description: {
					component: `The team-password page, shown only by the deployed app (\`src/hooks.server.ts\`). Submitting does
nothing here.`
				}
			}
		}
	});
</script>

<Story name="Default" args={{ data: {}, form: null, params: {} }} />

<Story name="Wrong password" args={{ data: {}, form: { wrong: true }, params: {} }} />
