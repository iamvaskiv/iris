# Patterns

Proven compositions. Adapt sizes and content; keep the structure and tokens. Each one has a live, interactive
version in Storybook → Patterns (Settings page, Forms & validation, Empty/loading/error states, AI chat panel,
Viewer experience).

## Page layouts

Every page shares one frame: `bg-background` with 32px padding, a header with the breadcrumb on the left and quiet
ghost navigation on the right, content 48px below with a `text-heading` title. Pick one of three content widths:

| Width | Class | Use for |
|---|---|---|
| Narrow | `max-w-[640px]` | Forms, settings, reading. One card per group, stacked. |
| Default | `max-w-[970px]` | Workspaces: one primary card (side list + main panel), connected cards below. |
| Wide | `max-w-[1280px]` | Dashboards: a row of stat cards, then a 2:1 grid (`grid-cols-3`, main `col-span-2`). |

```svelte
<div class="min-h-screen px-8 py-8">
	<header class="flex items-center justify-between">
		<Breadcrumb.Root>…</Breadcrumb.Root>
		<nav class="flex items-center gap-1" aria-label="App">
			<Button variant="ghost" href="/assets" class="text-title text-muted-foreground">Assets</Button>
			<Button variant="ghost" href="/settings" class="text-title text-muted-foreground">Settings</Button>
		</nav>
	</header>
	<main class="mx-auto mt-12 flex w-full max-w-[970px] flex-col gap-4">
		<h1 class="text-heading">Page title</h1>
		…cards…
	</main>
</div>
```

Content lives on cards (`shadow-hairline`), never directly on the page. 16px between cards, 32px between sections.
Don't invent new widths. The floating AI panel sits bottom-center with `shadow-raised`, one per page.

## Primary card with side list

Steps on the left, the active step's content in an inner panel on the right.

```svelte
<Card.Root class="w-full">
	<Card.Header>
		<Card.Title>What characters do people like the most?</Card.Title>
		<Card.Description>Viewer experience</Card.Description>
		<Card.Action>
			<Button variant="ghost" size="sm"><Share data-icon="inline-start" />Share</Button>
		</Card.Action>
	</Card.Header>
	<Card.Content class="flex-row gap-0">
		<Steps class="w-[246px] shrink-0" {steps} bind:current onselect={goTo} />
		<div class="flex min-h-[450px] flex-1 items-center justify-center rounded-sm bg-background">
			<div class="flex w-[430px] flex-col gap-4">
				<h2 class="text-heading">{steps[current].title}</h2>
				<PromptInput placeholder="My name is..." onsubmit={answer} />
			</div>
		</div>
	</Card.Content>
</Card.Root>
```

## AI chat panel

The assistant talks in a raised panel; the brand gradient appears only in its avatar. Show a thinking state and
disable the input while it works; the list is a polite live region so new messages are announced.

```svelte
<div class="flex w-[446px] flex-col gap-5 rounded-xl bg-card p-2 shadow-raised">
	<div class="flex flex-col gap-5 px-2 pt-2" role="log" aria-live="polite" aria-label="Conversation with the assistant">
		{#each messages as m, i (i)}
			<ChatMessage from={m.from}>{m.text}</ChatMessage>
		{/each}
		{#if thinking}
			<ChatMessage><span class="text-muted-foreground">Thinking<span class="animate-pulse">…</span></span></ChatMessage>
		{/if}
	</div>
	<PromptInput bind:value={draft} placeholder="Reply to the assistant…" disabled={thinking} onsubmit={send} />
</div>
```

Keep assistant messages short and end with a next step or question.

When the question has a few clear answers, offer them with a `ChoiceList` above the input, and turn the input into
the numbered "something else" option. Use an `Orb` as the avatar when the assistant should feel alive:

```svelte
{#snippet nextKey()}<Kbd>{choices.length + 1}</Kbd>{/snippet}

<ChatMessage>
	{#snippet avatar()}<Orb size={40} state={thinking ? 'thinking' : 'idle'} pulse={reply} label="Lumi" />{/snippet}
	{reply}
</ChatMessage>
<div class="flex flex-col gap-1">
	{#if offering}
		<ChoiceList options={choices} onselect={send} />
	{/if}
	<PromptInput
		bind:value={draft}
		placeholder={offering ? 'Something else…' : 'Reply to the assistant…'}
		leading={offering ? nextKey : undefined}
		submitOnFocus={offering}
		disabled={thinking}
		onsubmit={send}
	/>
</div>
```

Here `offering` is `choices.length > 0 && !thinking`. Clear the choices when the user sends anything.

## Connected cards

A short vertical `Separator` joins cards that form a flow (e.g. experience → insights).

```svelte
<Separator orientation="vertical" class="h-4! w-[3px]! self-center! rounded-full" />
```

## Form

Labels above fields, 8px between label and field, 16px between fields, one primary button named for what it does
("Create project", not "Submit"). Mark optional fields with a muted "(optional)", not required ones.

```svelte
<form class="flex w-[430px] flex-col gap-4" onsubmit={save}>
	<div class="flex flex-col gap-2">
		<Label for="name">Project name</Label>
		<Input id="name" bind:value={name} required />
	</div>
	<div class="flex flex-col gap-2">
		<Label for="goal">Goal</Label>
		<Textarea id="goal" bind:value={goal} />
	</div>
	<div class="flex justify-end gap-2">
		<Button variant="secondary" type="button" onclick={cancel}>Cancel</Button>
		<Button type="submit">Create project</Button>
	</div>
</form>
```

### Validation

Validate on submit and clear each error as the user fixes it. Each error: `aria-invalid="true"`, a message that says
how to fix it in `text-caption text-destructive` linked with `aria-describedby` (it replaces the helper text). With
several errors, add a `role="alert"` summary at the top and move focus to the first invalid field.

```svelte
<div class="flex flex-col gap-2">
	<Label for="audience">Number of viewers</Label>
	<Input id="audience" type="number" bind:value={audience}
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={error ? 'audience-error' : 'audience-hint'} />
	{#if error}
		<p id="audience-error" class="text-caption text-destructive">Recruit at least 10 viewers so insights are meaningful.</p>
	{:else}
		<p id="audience-hint" class="text-caption text-muted-foreground">At least 10. We’ll recruit them for you.</p>
	{/if}
</div>
```

## Settings page

Breadcrumb ending in "Settings", a `text-heading` title, then one `Card` per group. Form fields save with an explicit
"Save changes" (confirm with `role="status"`); switches apply immediately and get their own card. The **danger zone**
card comes last, with destructive actions confirmed in a `Dialog`.

## Settings row

Settings that apply immediately use a `Switch`, with the label and an explanation on the left.

```svelte
<div class="flex items-center justify-between gap-4">
	<div class="flex flex-col gap-1">
		<Label for="notify">Email notifications</Label>
		<span class="text-caption text-muted-foreground">Get an email when 10 people have responded.</span>
	</div>
	<Switch id="notify" bind:checked={notify} />
</div>
```

## Empty state

Explain what will appear and offer the next action. No illustrations needed; an icon is enough.

```svelte
<div class="flex flex-col items-center gap-3 rounded-sm bg-background px-8 py-12 text-center">
	<Icon icon={ChartColumn} size="lg" class="text-muted-foreground" />
	<p class="text-title">No insights yet</p>
	<p class="text-caption text-muted-foreground">Insights are ready when at least 10 people respond.</p>
	<Button variant="secondary" size="sm"><Share data-icon="inline-start" />Share with viewers</Button>
</div>
```

## Error and status messages

```svelte
<div role="alert" class="flex items-start gap-2 rounded-sm bg-destructive/10 p-3">
	<Icon icon={CircleAlert} size="sm" class="mt-0.5 text-destructive" />
	<p class="text-body text-destructive">We couldn’t save your changes. Try again.</p>
</div>
```

Say what failed, reassure if data is safe, and offer a way out (a `secondary` **Try again** button). Never show
raw error codes.

## Loading state

```svelte
<div class="flex flex-col items-center gap-3 rounded-sm bg-background px-6 py-10 text-center" aria-busy="true">
	<Icon icon={LoaderCircle} size="lg" class="animate-spin text-muted-foreground" label="Loading" />
	<p class="text-title">Analysing 24 responses…</p>
	<p class="text-caption text-muted-foreground">This usually takes under a minute.</p>
</div>
```

Every view that loads or lists data needs all three states (empty, loading, error) designed up front.

## Destructive action

Confirm in a `Dialog` before deleting, name the thing being deleted, and say what's lost. The full example is under
Dialog in `components.md`. A "Danger zone" card at the bottom of settings pages holds these actions.
