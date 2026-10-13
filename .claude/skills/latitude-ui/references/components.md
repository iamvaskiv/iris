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
<Badge variant="destructive">Failed</Badge>
```

`variant`: `default` · `secondary` · `outline` · `destructive` · `ghost` · `link`. `href` makes it a link. Keep the
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
<PromptInput bind:value={draft} label="Message" onsubmit={send} />
```

| Prop | Notes |
| --- | --- |
| `value` | bindable |
| `onsubmit(value)` | Enter or the send button; not called when empty |
| `placeholder`, `disabled` |  |
| `label` | accessible name if there's no placeholder (defaults to placeholder, then "Message") |
| `submitLabel` | accessible name of the send button (default "Send") |

For conversational, one-answer flows. Use `Input` + `Label` for regular forms.

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
```

`from`: `assistant` (default, shows the AI avatar with the brand gradient) · `user`.

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
