// Stand-in for $app/navigation: navigation is logged, not performed.
const log =
	(name: string) =>
	(...args: unknown[]) =>
		console.info(`[$app/navigation] ${name}`, ...args);
export const goto = async (...args: unknown[]) => log('goto')(...args);
export const invalidate = async () => {};
export const invalidateAll = async () => {};
export const replaceState = log('replaceState');
export const pushState = log('pushState');
export const preloadData = async () => ({ type: 'loaded', status: 200, data: {} });
export const preloadCode = async () => {};
export const beforeNavigate = () => {};
export const afterNavigate = () => {};
export const onNavigate = () => {};
