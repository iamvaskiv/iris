import { json } from '@sveltejs/kit';
import { projects } from '#lib/server/projects.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => json({ id: projects.create().id });
