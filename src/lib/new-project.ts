import { goto } from '$app/navigation';

/** Creates an empty project and opens it. */
export async function newProject() {
	const { id } = await fetch('/api/projects', { method: 'POST' }).then((r) => r.json());
	await goto(`/projects/${id}`);
}
