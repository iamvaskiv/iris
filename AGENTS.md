# Notes for AI coding agents

Detailed guidance lives in the agent skills in `.claude/skills/` (refreshed on every install from the design
system package): **latitude-ui** for building UI and **latitude-ui-review** for auditing it
(`node .claude/skills/latitude-ui-review/scripts/audit.mjs src`).

This app uses the Latitude design system (`@latitudelabs/design-system`, Svelte 5 + Tailwind v4).

- Build UI from design-system components first: Button, Badge, Input, Textarea, Label, Separator, PromptInput,
  Steps, ChatMessage, and the compound Card, Avatar and Breadcrumb (`<Card.Root>`, `<Card.Title>`, …).
- Style only with semantic token utilities: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`,
  `border-border`, `bg-primary text-primary-foreground`, `text-destructive`. Never hardcode colors.
- Typography utilities: `text-heading`, `text-title`, `text-body-lg`, `text-body`, `text-caption`, `text-body-sm`.
  Weights are 400/500 only (`font-medium`), never bold.
- Radius: `rounded-sm` (8) · `rounded-md` (12) · `rounded-lg` (16) · `rounded-xl` (24, cards) · `rounded-full`.
  Elevation: `shadow-hairline` (cards, no borders) and `shadow-raised` (floating panels).
- The brand gradient (`bg-brand`) is reserved for the AI avatar and brand moments.
- Dark mode is automatic through the roles; don't add `dark:` color overrides.

## How we work

- **Diagrams.** Include a Mermaid diagram in plans, design docs and PR descriptions whenever there's a mechanism to
  explain: how components or services connect, how data and control flow, a protocol or request sequence, state
  transitions, processing stages. Pick the diagram type that explains it best (flowchart, sequence, state, ER…), label
  every participant, connection and step, and keep the diagram in step with the prose around it: when the design or
  change evolves, update the diagram too. In Iris that usually means the browser ↔ SvelteKit server ↔ Lumi (Claude) ↔
  Lumiere flow, the card operations a chat turn produces, upload and ingestion states, and storage (`store.ts`: JSON
  files in dev, D1 when deployed).
- **Changelog.** Add a line under today's date in `CHANGELOG.md` for every change people would notice (and the
  notable behind-the-scenes ones), grouped like the existing entries. The app Storybook shows it as its Changelog page.
- **Storybook.** The app has its own Storybook (`pnpm storybook`, port 6007; the design system's is separate) with
  Iris's cards, Lumi's dock, the header and the sign-in page, plus `docs/architecture.md` rendered with its diagrams.
  When you add a card type or a meaningful state, add a story for it. Stories use real cards captured in
  `src/stories/fixtures` (refresh with `pnpm storybook:fixtures` while `pnpm dev` runs); nothing calls the server.
