// Stand-in for $app/paths: Storybook serves from the root, so paths resolve to themselves.
export const base = '';
export const assets = '';
export const resolve = (path: string) => path;
export const asset = (file: string) => file;
