# Component reference

All components accept `class` (for layout: width, margin, flex) and pass other HTML attributes through.
Import from `@latitudelabs/design-system` unless noted.

## Button

```svelte
<Button>Create</Button>
<Button variant="secondary" size="sm">Cancel</Button>
<Button variant="ghost"><Share data-icon="inline-start" />Share</Button>
<Button variant="destructive" onclick={confirmDelete}><Trash data-icon="inline-start" />Delete</Button>
<Button variant="secondary" size="icon" aria-label="Search"><Search /></Button>
<Button href="/projects" variant="link">All projects</Button>
```

| Prop | Values |
| --- | --- |
| `variant` | `default` · `secondary` · `outline` · `ghost` · `destructive` · `link` |
| `size` | `default` (36px) · `xs` · `sm` (32px) · `lg` · `icon` · `icon-xs` · `icon-sm` · `icon-lg` |
| `href` | renders an `<a>` |
| `disabled`, `type`, `onclick`, … | native button attributes |

Icons inside buttons: pass the icon component directly with `data-icon="inline-start"` (or `inline-end`); the
button sizes it. One `default` button per view.

## Badge

```svelte
<Badge>1.</Badge>
<Badge variant="success">Analysed</Badge>
<Badge variant="destructive">Failed</Badge>
```

`variant`: `default` · `secondary` · `outline` · `success` · `destructive` · `ghost` · `link`. `href` makes it a link. Keep the
content to a word or number; it is not a button.

## Input, Textarea, Label

```svelte
<div class="flex flex-col gap-2">
	<Label for="email">Email</Label>
	<Input id="email" type="email" bind:value={email} placeholder="name@company.com" />
</div>

<!-- Error state -->
<Input id="email" aria-invalid="true" aria-describedby="email-error" />
<p id="email-error" class="text-caption text-destructive">Enter a complete email address.</p>

<Textarea placeholder="Describe what you want to learn..." bind:value={notes} />
```

Filled style, 48px tall, 16px radius. `bind:value`, `disabled`, and all native input attributes work.

## PromptInput

```svelte
<PromptInput placeholder="My name is..." onsubmit={(value) => answer(value)} />
<PromptInput bind:value={draft} bind:ref={field} label="Message" disabled={thinking} onsubmit={send} />

<!-- "Something else" under a ChoiceList -->
<PromptInput placeholder="Something else…" submitOnFocus onsubmit={send}>
	{#snippet leading()}<Kbd>{options.length + 1}</Kbd>{/snippet}
</PromptInput>
```

| Prop | Notes |
| --- | --- |
| `value` | bindable |
| `ref` | bindable `<textarea>` (focus it after sending to keep the conversation going) |
| `onsubmit(value)` | Enter or the send button; not called when empty. Shift+Enter adds a line |
| `placeholder`, `focusedPlaceholder` | the second one replaces the first while the field has focus |
| `disabled` | read-only, not disabled: the field keeps focus while the answer is on its way |
| `maxLines` | grows with the text up to this many lines, then scrolls (default 4; 1 = single line) |
| `leading` | snippet before the text, e.g. a `Kbd`; pass `undefined` (not an empty snippet) to drop it |
| `submitOnFocus` | the send button shows only while the field has focus |
| `label` | accessible name if there's no placeholder (defaults to placeholder, then "Message") |
| `submitLabel` | accessible name of the send button (default "Send") |

For conversational, one-answer flows. Use `Input` + `Label` for regular forms.

## ChoiceList

```svelte
<div class="flex flex-col gap-1">
	<ChoiceList options={['Women Talking trailer', 'Inside Out 2 clip', 'Compare both']} onselect={(o) => send(o)} />
	<PromptInput placeholder="Something else…" submitOnFocus onsubmit={send}>
		{#snippet leading()}<Kbd>4</Kbd>{/snippet}
	</PromptInput>
</div>
```

| Prop | Notes |
| --- | --- |
| `options` | 2–4 short answers (1–5 words), phrased as the user would say them |
| `onselect(option, index)` | called on click |
| `numbered` | `Kbd` numbers before each option (default true). Number-key shortcuts are the app's to wire up |
| `label` | accessible name of the group (default "Suggested answers") |
| `disabled` |  |

Sized like `PromptInput`. Placed flush with a `ChatMessage`, the numbers centre under its avatar and the labels line
up with the message text. Each option is `data-slot="choice"` with a `--index` CSS variable for staggered entrances.
Keep the question in the message; don't repeat the options there.

## Kbd

```svelte
<Kbd>1</Kbd>
<Kbd>Esc</Kbd>
```

A small outlined key hint. Add `aria-hidden="true"` when it only repeats something visible.

## Switch

```svelte
<div class="flex items-center gap-3">
	<Switch id="notify" bind:checked={notify} />
	<Label for="notify">Email notifications</Label>
</div>
```

| Prop | Values |
|---|---|
| `checked` | bindable boolean |
| `onCheckedChange(checked)` | called on toggle |
| `size` | `default` (40×24) · `sm` (32×20) |
| `disabled`, `id`, `name` | |

For settings that **apply immediately**. If the change only applies after pressing Save, use a checkbox-style
choice in the form instead. Always pair with a `Label`; the label describes the "on" state.

## Slider

```svelte
<script lang="ts">
	import { Label, Slider } from '@latitudelabs/design-system';
	let temperature = $state(0.7);
</script>

<div class="flex flex-col gap-3">
	<div class="flex items-center justify-between">
		<Label id="temp-label">Temperature</Label>
		<span class="text-body text-muted-foreground tabular-nums">{temperature.toFixed(1)}</span>
	</div>
	<Slider type="single" aria-labelledby="temp-label" bind:value={temperature} min={0} max={2} step={0.1} />
</div>
```

| Prop | Values |
|---|---|
| `type` | `single` (value is a number) · `multiple` (value is `number[]`, one thumb per entry: a range) |
| `value` | bindable `number` / `number[]` |
| `onValueChange(value)`, `onValueCommit(value)` | while dragging / on release |
| `min`, `max`, `step` | numbers (defaults 0, 100, 1) |
| `size` | `default` (16px track, 28×64 thumb, 64px tall overall) · `sm` (12px track, 20×48 thumb) |
| `orientation` | `horizontal` · `vertical` (give the parent a height) |
| `aria-label` / `aria-labelledby` | required; forwarded to every thumb |
| `disabled`, `name` | |

For an **approximate value on a bounded scale** (volume, temperature, opacity, price range). Show the number next to
the label when it matters. Use `Input type="number"` for precise or unbounded values; a Slider is always interactive,
so don't use it to show read-only progress.

## SegmentedControl

```svelte
<div class="flex items-center justify-between gap-4">
	<Label id="theme-label">Theme</Label>
	<SegmentedControl
		aria-labelledby="theme-label"
		bind:value={theme}
		options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System' }]}
	/>
</div>
```

| Prop | Notes |
| --- | --- |
| `value` | bindable, the selected option's `value` |
| `options` | `{ value, label, disabled? }[]`, 2–4 short labels |
| `onValueChange(value)` | called on change |
| `size` | `sm` (default, 32px) · `default` (36px) |

A radio group (arrow keys move between options) for choices that apply immediately. The selected option is a
`secondary` fill, the others `ghost`. Use a `Switch` for plain on/off.

## Progress

```svelte
<Progress value={percent} aria-label="Upload progress" />
```

`value` (0–`max`), `max` (default 100). Name it with `aria-label`/`aria-labelledby`; show the percentage as text
beside it when the number matters.

## Table

```svelte
<Table.Root>
	<Table.Header>
		<Table.Row>
			<Table.Head>Video</Table.Head>
			<Table.Head numeric>Length (s)</Table.Head>
		</Table.Row>
	</Table.Header>
	<Table.Body>
		{#each videos as v (v.id)}
			<Table.Row>
				<Table.Cell rowHeader>{v.name}</Table.Cell>
				<Table.Cell numeric>{v.length}</Table.Cell>
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>
```

`numeric` right-aligns with tabular figures (set it on the heading too); `rowHeader` makes the cell that names the
row a `<th scope="row">`. Rows are divided by hairline borders; the table scrolls sideways when it doesn't fit.

## Dialog

```svelte
<script lang="ts">
	import { Button, Dialog, buttonVariants } from '@latitudelabs/design-system';
	import { Trash } from '@latitudelabs/design-system/icons';
	let open = $state(false);
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger class={buttonVariants({ variant: 'destructive' })}>
		<Trash data-icon="inline-start" />Delete project
	</Dialog.Trigger>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Delete “{project.name}”?</Dialog.Title>
			<Dialog.Description>This permanently deletes the project and its responses.</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: 'secondary' })}>Cancel</Dialog.Close>
			<Button variant="destructive" onclick={() => { deleteProject(); open = false; }}>Delete project</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
```

`Dialog.Trigger` and `Dialog.Close` render buttons; style them with `buttonVariants({ variant, size })`. `open` is
bindable for closing after an async action. Focus moves to the first focusable element (put the safe action first),
Escape closes it, and focus returns to the trigger. Always include a `Dialog.Title`. Use dialogs for short decisions
only, not long content or multi-step flows.

## Card

```svelte
<Card.Root size="sm">
	<Card.Header>
		<Card.Title>Scenes</Card.Title>
		<Card.Description>3 scenes</Card.Description>
		<Card.Action><Button variant="ghost" size="sm">Edit</Button></Card.Action>
	</Card.Header>
	<Card.Content>…</Card.Content>
	<Card.Footer>…</Card.Footer>
</Card.Root>
```

`size`: `default` (16px padding) · `sm` (12px). White surface with `shadow-hairline`, 24px radius. Card.Content is a
column by default; add `flex-row` for side-by-side layouts. Don't nest cards; use an inner panel
(`rounded-sm bg-background p-4`) instead.

## Steps

```svelte
<script lang="ts">
	import { Steps, type Step } from '@latitudelabs/design-system';
	const steps: Step[] = [
		{ title: 'What’s your name?', description: 'Open Question' },
		{ title: 'How old are you?', description: 'Multiple choice' }
	];
	let current = $state(0);
</script>

<Steps {steps} bind:current onselect={(i) => goTo(i)} />
```

`onselect` makes steps buttons; the active one gets `aria-current="step"`.

## ChatMessage

```svelte
<ChatMessage>Viewer experience is ready. Want me to recruit viewers?</ChatMessage>
<ChatMessage from="user">Yeah, let’s try that</ChatMessage>
<ChatMessage>
	{#snippet avatar()}<Orb size={40} state={thinking ? 'thinking' : 'idle'} pulse={reply} label="Lumi" />{/snippet}
	{reply}
</ChatMessage>
```

`from`: `assistant` (default, shows the AI avatar with the brand gradient) · `user`. `avatar` replaces the default
avatar (keep it 40px wide so the text stays aligned) and also shows one on `user` messages.

## Orb

```svelte
<Orb size={40} state={thinking ? 'thinking' : 'idle'} pulse={latestReply} label="Lumi" />
<Orb size={80} variant="eye-spiral" />
```

| Prop | Notes |
| --- | --- |
| `size` | diameter in px (default 40) |
| `state` | `idle` · `thinking` (faster, stronger) · `speaking` (a little livelier) |
| `pulse` | change it (e.g. to the latest reply) to play a one-off pop |
| `variant` | `breathe-swirl` (CSS, default) · `eye-spiral` (WebGL, looks towards the pointer after an interaction; falls back to CSS) |
| `label` | accessible name (default "AI assistant") |
| `transitionName` | view-transition name, to morph between layouts |
| `eyeTune` | `EyeTune` overrides for the spiral eye (defaults in `EYE_DEFAULTS`) |

The animated AI avatar; motion stops with reduced motion. `ORB_VARIANTS` lists the variants for a picker.

## Avatar

```svelte
<Avatar.Root>
	<Avatar.Image src={user.avatarUrl} alt={user.name} />
	<Avatar.Fallback>PP</Avatar.Fallback>
</Avatar.Root>
```

`Avatar.Root` `size`: `default` · `sm` · `lg`. Also `Avatar.Badge`, `Avatar.Group`, `Avatar.GroupCount`. For the AI
assistant, prefer `ChatMessage`, which renders the AI avatar for you.

## Breadcrumb

```svelte
<Breadcrumb.Root>
	<Breadcrumb.List>
		<Breadcrumb.Item><Breadcrumb.Link href="/projects">Projects</Breadcrumb.Link></Breadcrumb.Item>
		<Breadcrumb.Separator>/</Breadcrumb.Separator>
		<Breadcrumb.Item><Breadcrumb.Page>New</Breadcrumb.Page></Breadcrumb.Item>
	</Breadcrumb.List>
</Breadcrumb.Root>
```

Earlier levels are links; the current page is `Breadcrumb.Page` (not a link). Also `Breadcrumb.Ellipsis`.

## NavItem

```svelte
<nav class="flex items-center gap-1" aria-label="App">
	{#each nav as item (item.href)}
		<NavItem href={item.href} current={page.url.pathname === item.href}>{item.label}</NavItem>
	{/each}
</nav>
```

A top-level app navigation link (`text-title`, ghost-button sized, square, no hover fill). `current` sets
`aria-current="page"`, a full-colour label and a soft brand glow rising from the bottom edge; the others are
`text-muted-foreground` and turn `foreground` on hover. Other anchor attributes pass through.

## Separator

```svelte
<Separator />
<Separator orientation="vertical" class="h-4" />
```

## Icon

Import from `@latitudelabs/design-system/icons`.

```svelte
<Icon icon={Search} />
<!-- 20px, decorative -->
<Icon icon={Search} size="sm" />
<!-- 16px -->
<Icon icon={CircleAlert} label="Error" class="text-destructive" />
```

`size`: `sm` 16 · `md` 20 (default) · `lg` 24. Color with text roles. `label` makes it meaningful to screen readers.

Available icons (`iconCatalog` lists them with keywords):

- **Navigation:** ArrowLeft, ArrowRight, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Menu,
  House, ExternalLink, Ellipsis, EllipsisVertical
- **Actions:** Plus, Minus, X, Check, Search, Pencil, Trash, Copy, Share, Download, Upload, Send, RefreshCw, Funnel,
  Settings, LogOut, Link
- **Status:** Info, CircleAlert, TriangleAlert, CircleCheck, CircleX, LoaderCircle, Bell, Lock, Eye, EyeOff,
  CircleQuestionMark
- **Media:** Play, Pause, Video, Image, FileText, Folder, MessageSquare, Mic, Calendar, Clock, Star, Heart
- **People & AI:** User, Users, Sparkles, Bot, ChartColumn, Sun, Moon, Globe, Mail

If you need an icon that isn't listed, don't import from `@lucide/svelte` directly. Pick the closest listed one and
tell the user the missing icon should be requested from the design system.

## cn

`import { cn } from '@latitudelabs/design-system'` merges class names and resolves Tailwind conflicts (it knows the
design system's custom utilities like `text-caption` and `shadow-hairline`).
