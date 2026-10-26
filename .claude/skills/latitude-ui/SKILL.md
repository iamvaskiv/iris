---
name: latitude-ui
description: Build user interfaces in a Latitude product with the Latitude design system (@latitudelabs/design-system, Svelte 5 + Tailwind v4). Use this skill whenever you create or change anything visual in this app — pages, layouts, forms, dialogs, cards, lists, empty states, buttons, icons, colors, spacing, typography, dark mode — even if the request doesn't mention the design system ("add a settings page", "make this look nicer", "add a delete button"). It tells you which components exist, which tokens to style with, and the patterns that keep every Latitude product consistent.
---

# Building UI with the Latitude design system

Every Latitude product shares one design system so that products look and behave the same and inherit brand,
accessibility and dark-mode fixes for free. Your job is to compose UI from it, not to restyle around it. If you
hand-roll a button or hardcode a color, that product silently drifts away from the others and stops getting updates.

## Workflow

1. **Look for an existing component first.** Check the catalog below (full API in `references/components.md`).
   Most screens are combinations of Card, Button, Input/PromptInput, Switch, Dialog, Steps, ChatMessage,
   Breadcrumb and Icon.
2. **Compose with layout utilities** (`flex`, `grid`, `gap-*`, `p-*`, `w-*`) and **style only with tokens**
   (tables below). Layout is yours; color, type, radius and elevation come from the system.
3. **Check the patterns** in `references/patterns.md` for page shells, forms, empty/error states and AI chat.
4. **If something is genuinely missing**, build it from tokens in the app, keep it small, and tell the user it's a
   candidate for the design system so it can be added for everyone.

## Imports

```svelte
<script lang="ts">
	import { Button, Card, Input, Label, PromptInput } from '@latitudelabs/design-system';
	import { Icon, Search, Trash } from '@latitudelabs/design-system/icons';
</script>
```

The stylesheet (`@import '@latitudelabs/design-system/theme.css'`) is already loaded in the root layout. Don't add
other CSS frameworks or global styles.

## Component catalog

| Need | Use |
| --- | --- |
| Action | `Button` — variants `default` (one per view), `secondary`, `outline`, `ghost`, `destructive`, `link` |
| Text field + label | `Label` + `Input` (or `Textarea`) |
| One-answer / AI prompt field with send (grows to 4 lines) | `PromptInput` |
| Answers the assistant offers, one click each | `ChoiceList` (+ a `PromptInput` with a `Kbd` for "something else") |
| How people answered a multiple-choice question | `ChoiceList` with `shares` (and `selected` to drill in) |
| On/off setting that applies immediately | `Switch` + `Label` |
| Pick an approximate value or range on a bounded scale | `Slider` + `Label` |
| Pick one of a few short options that apply immediately (theme, view) | `SegmentedControl` + `Label` |
| Upload / processing progress | `Progress` |
| Numbers or short facts across a few columns | `Table.Root` › `Table.Header`/`Body` › `Table.Row` › `Table.Head`/`Cell` |
| Confirm a destructive action, small focused form | `Dialog.Root` › `Dialog.Trigger` + `Dialog.Content` (`Header`, `Title`, `Description`, `Footer`, `Close`) |
| A few settings or a note anchored to a button (share options, filters) | `Popover.Root` › `Popover.Trigger` + `Popover.Content` |
| Grouped content on the page | `Card.Root` › `Card.Header` (`Title`, `Description`, `Action`) › `Card.Content` › `Card.Footer` |
| A collapsible row of items inside a card (scenes, characters, themes) | `Card.Section` with `<li>` items |
| Key numbers at the top of a card | `Stat` tiles in a grid; `variant="plain"` for a compact row under a title |
| Positive / neutral / negative split | `SentimentBar`; `SentimentCounts` (three coloured numbers) where a bar won't fit |
| One item in a row or grid inside a card (theme, brand, comment) | `Tile` (a link with `href`, a button with `onclick`) |
| Ordered steps / question list | `Steps` |
| Conversation message, AI avatar | `ChatMessage` (`from="assistant"` shows the AI avatar; `avatar` snippet to replace it) |
| Animated AI avatar (thinking, speaking) | `Orb` |
| Key or number hint | `Kbd` |
| Person or AI avatar | `Avatar.Root` › `Avatar.Image` + `Avatar.Fallback` |
| Where am I (top-left) | `Breadcrumb.*` |
| App navigation in the header | `NavItem` links in a `<nav aria-label>`; `current` marks the page you're on |
| Short status / count | `Badge` |
| Divider, connector | `Separator` |
| Icon | `Icon` with an icon from `@latitudelabs/design-system/icons` (62 curated Lucide icons) |

## Tokens

**Color (roles).** Use roles, never raw colors: they switch automatically in dark mode.

| Utility | For |
| --- | --- |
| `bg-background` | page |
| `bg-card` / `bg-popover` | cards, panels / menus |
| `text-foreground` | primary text |
| `text-muted-foreground` | secondary text: captions, meta, nav links |
| `bg-primary text-primary-foreground` | the accent (black in light, white in dark) |
| `bg-secondary` / `bg-muted` / `bg-accent` | chips / subtle fills / hover |
| `text-destructive`, `bg-destructive/10` | errors, destructive |
| `text-success`, `bg-success/10` | done, healthy (or `Badge variant="success"`) |
| `border-border`, `bg-input`, `ring-ring` | dividers, input fill, focus |
| `bg-control` | unselected control track (switch off) |
| `text-placeholder` | placeholders and disabled only — never readable text |
| `bg-brand` | the brand gradient: AI avatar and brand moments only |
| `var(--orange-400)` | small product labels next to the logo ("alpha"); same in both themes, never body text |

**Type.** Inter, weights 400 and 500 only (`font-medium` for emphasis — never `font-bold`/`font-semibold`).

| Utility | For |
| --- | --- |
| `text-heading` | page / question heading (24px, one per view) |
| `text-title` | card titles, section headers, nav (16px medium) |
| `text-body-lg` | input text, chat, primary reading (16px) |
| `text-body` | default UI text (14px); add `font-medium` for list titles, labels |
| `text-caption` | secondary line under a title, with `text-muted-foreground` |
| `text-body-sm` | long descriptions in dense panels |

**Radius:** `rounded-sm` 8 (inner panels, chips) · `rounded-md` 12 (buttons) · `rounded-lg` 16 (inputs) ·
`rounded-xl` 24 (cards, floating panels) · `rounded-full` (badges, avatars, pills).

**Elevation:** `shadow-hairline` for cards on the page (instead of borders) · `shadow-raised` for floating panels.
Don't add borders around cards.

**Spacing:** Tailwind's 4px scale; stick to 1, 2, 3, 4, 5, 8 (4–32px). Arbitrary values like `p-[15px]` are a smell.

## Dark mode and themes

Already handled: `mode-watcher` toggles `class="dark"` and every role remaps. Don't write `dark:bg-…` color
overrides. If something looks wrong in dark, you probably used a raw color instead of a role.

**Classic** is a second dark theme (violet primary, pure-white text, fainter hairlines, tighter radii). Turn it on
with `setTheme('classic')` and `setMode('dark')` from mode-watcher (it sets `data-theme="classic"` on `<html>`);
turn it off with `setTheme('')`. Roles and the `rounded-*` scale follow the theme, so styling with tokens is all it
takes to support it.

## Accessibility

- Every field has a visible `Label` (placeholders disappear and aren't reliable labels). `PromptInput` gets a
  `label` if it has no placeholder.
- Icon-only buttons need `aria-label`. Decorative icons next to text need nothing; meaningful standalone icons get
  `<Icon label="…">`.
- Errors: `aria-invalid="true"` on the field plus a message in `text-destructive` linked with `aria-describedby`.
- Destructive actions use the `destructive` variant and confirm first, in a `Dialog` that names the thing being
  deleted.

## Quick example

```svelte
<Card.Root>
	<Card.Header>
		<Card.Title>Insights</Card.Title>
		<Card.Description>Ready when at least 10 responses</Card.Description>
		<Card.Action>
			<Button variant="ghost" size="sm"><Share data-icon="inline-start" />Share</Button>
		</Card.Action>
	</Card.Header>
	<Card.Content class="flex flex-col gap-4">
		<p class="text-body text-muted-foreground">No responses yet.</p>
	</Card.Content>
</Card.Root>
```

## Before you finish

Scan what you wrote for raw hex/rgb colors, `text-sm`/`text-lg`-style sizes, `font-bold`, arbitrary `[...]`
values, `dark:` color overrides, direct `@lucide/svelte` imports, and hand-built tables, progress bars or radio
groups. Replace them with the tokens above. If the
`latitude-ui-review` skill is available, run its audit script for a full check.
