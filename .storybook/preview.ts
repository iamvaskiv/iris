import type { Preview } from '@storybook/svelte-vite';
import { withThemeByClassName } from '@storybook/addon-themes';
import './storybook.css';

const preview: Preview = {
	parameters: {
		layout: 'centered',
		controls: { matchers: { color: /(background|color)$/i } },
		// The canvas uses the theme's own bg-background (see storybook.css), so it follows light/dark.
		backgrounds: { disable: true },
		options: {
			storySort: { order: ['Docs', ['Changelog', 'Architecture'], 'Cards', 'Lumi', 'App'] }
		},
		a11y: { test: 'todo' }
	},
	decorators: [
		withThemeByClassName({
			themes: { Light: '', Dark: 'dark', Classic: 'dark classic' },
			defaultTheme: 'Light',
			parentSelector: 'html'
		})
	]
};

export default preview;
