import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/svelte-vite';

const mock = (name: string) => fileURLToPath(new URL(`./mocks/${name}.ts`, import.meta.url));

/**
 * The app's Storybook: Iris's own UI (cards, Lumi's dock, header, sign-in) built from the design system, rendered
 * with sample data. The design system's building blocks have their own Storybook in design-system-test.
 */
const config: StorybookConfig = {
	stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|svelte)'],
	addons: [
		'@storybook/addon-docs',
		'@storybook/addon-a11y',
		'@storybook/addon-svelte-csf',
		'@storybook/addon-themes'
	],
	framework: '@storybook/svelte-vite',
	// Card images captured by scripts/storybook-fixtures.mjs, served at /fixtures.
	staticDirs: [{ from: '../src/stories/fixtures/images', to: '/fixtures' }],
	core: {
		builder: {
			name: '@storybook/builder-vite',
			options: { viteConfigPath: '.storybook/vite.config.ts' }
		}
	},
	async viteFinal(config) {
		config.resolve ??= {};
		const existing = config.resolve.alias ?? [];
		// Stand-ins for the SvelteKit modules a few components use (there's no SvelteKit server in Storybook).
		config.resolve.alias = [
			{ find: /^\$app\/state$/, replacement: mock('state') },
			{ find: /^\$app\/navigation$/, replacement: mock('navigation') },
			{ find: /^\$app\/forms$/, replacement: mock('forms') },
			{ find: /^\$app\/env$/, replacement: mock('env') },
			...(Array.isArray(existing)
				? existing
				: Object.entries(existing).map(([find, replacement]) => ({ find, replacement })))
		];
		return config;
	}
};

export default config;
