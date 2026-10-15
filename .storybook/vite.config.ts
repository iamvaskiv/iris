import tailwindcss from '@tailwindcss/vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

// Storybook builds with plain Svelte rather than the app's SvelteKit + Cloudflare config.
export default defineConfig({
	plugins: [
		tailwindcss(),
		svelte({
			compilerOptions: {
				// Runes everywhere except libraries, as in the app (see vite.config.ts).
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			}
		})
	]
});
