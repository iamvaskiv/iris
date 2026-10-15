// Stand-in for $app/state: a fixed page at / (nothing navigates in Storybook, so it needn't be reactive).
export const page = {
	url: new URL('http://localhost/'),
	params: {},
	route: { id: '/' },
	status: 200,
	error: null,
	data: {},
	form: null,
	state: {}
};
export const navigating = { from: null, to: null, type: null };
export const updated = { current: false, check: async () => false };
