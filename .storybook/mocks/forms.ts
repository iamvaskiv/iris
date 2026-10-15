// Stand-in for $app/forms: forms stay on the page instead of posting.
export function enhance(form: HTMLFormElement) {
	const stop = (e: SubmitEvent) => e.preventDefault();
	form.addEventListener('submit', stop);
	return { destroy: () => form.removeEventListener('submit', stop) };
}
export const applyAction = async () => {};
export const deserialize = (s: string) => JSON.parse(s);
