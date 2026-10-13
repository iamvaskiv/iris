# Jinn

Created with `npm create @latitudelabs`, using the [Latitude design system](https://github.com/latitudelabs/test-design-system).

## Develop

```bash
export GITHUB_TOKEN=<a GitHub token with read:packages>   # needed to install @latitudelabs packages
npm install
npm run dev
```

## Using the design system

- Components: `import { Button, Card, Input } from '@latitudelabs/design-system'`. Check Storybook before building
  anything new.
- Styling: Tailwind with the design system's tokens, e.g. `bg-card text-muted-foreground text-caption`. Use roles,
  never raw colors (`bg-[#fff]`), so light/dark and future brand updates just work.
- Theme: light/dark is handled by `mode-watcher` in `src/routes/+layout.svelte`. Toggle with `toggleMode()`.
- Updates: `npm update @latitudelabs/design-system`.
