<script lang="ts">
	import { page } from '$app/state';
	import {
		Badge,
		Button,
		buttonVariants,
		Card,
		Kbd,
		Label,
		Popover,
		PromptInput,
		Select,
		Steps,
		Switch
	} from '@latitudelabs/design-system';
	import { Icon, Plus, Share, Trash, X } from '@latitudelabs/design-system/icons';
	import { tick, untrack } from 'svelte';
	import StudyResults from './study/StudyResults.svelte';
	import type { Card as CardData, Question, StudyData } from './types';

	let { card }: { card: CardData } = $props();

	const TYPES = [
		{ value: 'open', label: 'Open question' },
		{ value: 'choice', label: 'Multiple choice' }
	];
	const typeLabel = (type: Question['type']) => TYPES.find((t) => t.value === type)!.label;

	/** Edited here and saved in the background; replaced when the card itself changes (Lumi edited it). */
	let questions = $state<Question[]>([]);
	let selected = $state(0);
	let sample = $state<StudyData['sample']>();
	$effect.pre(() => {
		const data = card.data as StudyData | undefined;
		const latest = $state.snapshot(data?.questions ?? []);
		const latestSample = $state.snapshot(data?.sample);
		untrack(() => {
			questions = latest;
			sample = latestSample;
			selected = Math.min(selected, Math.max(0, latest.length - 1));
		});
	});
	/** With fake responses on, the card shows (made-up) results instead of the setup. */
	const results = $derived(sample?.enabled ? sample.results : undefined);
	const question = $derived(questions[selected]);

	/** Saves a moment after the last edit. Storybook has no project, so nothing is saved there. */
	let timer: ReturnType<typeof setTimeout>;
	function save() {
		const projectId = page.params.id;
		if (!projectId) return;
		clearTimeout(timer);
		timer = setTimeout(() => {
			fetch(`/api/projects/${projectId}/cards/${card.id}`, {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ questions: $state.snapshot(questions) })
			}).catch((e) => console.error('Saving the study failed', e));
		}, 400);
	}

	let questionField = $state<HTMLTextAreaElement | null>(null);
	let list = $state<HTMLElement | null>(null);
	async function addQuestion() {
		questions.push({ id: crypto.randomUUID().slice(0, 8), type: 'open', text: '' });
		selected = questions.length - 1;
		save();
		await tick();
		list?.querySelector('[aria-current=step]')?.scrollIntoView({ block: 'nearest' });
		questionField?.focus({ preventScroll: true });
	}

	function removeQuestion() {
		questions.splice(selected, 1);
		selected = Math.max(0, Math.min(selected, questions.length - 1));
		save();
	}

	function setType(type: string) {
		question.type = type as Question['type'];
		if (question.type === 'choice' && !question.options?.length) question.options = ['', ''];
		save();
	}

	let optionsList = $state<HTMLElement | null>(null);
	async function addOption(at = question.options?.length ?? 0) {
		(question.options ??= []).splice(at, 0, '');
		save();
		await tick();
		optionsList?.querySelectorAll('input')[at]?.focus();
	}

	function removeOption(i: number) {
		question.options?.splice(i, 1);
		save();
	}

	/** Tried out in the preview only; answers aren't collected yet. */
	let answer = $state('');

	// Share: sharing isn't built yet, so it offers fake responses instead (Lumi writes them on the server).
	let writing = $state(false);
	let sampleError = $state('');

	// Sample results from before individual responses existed: have Lumi write them again (once per page view).
	let refreshed = false;
	$effect(() => {
		const stale = results && questions.some((q) => !results.questions[q.id]?.people);
		if (stale && !refreshed && !writing) {
			refreshed = true;
			setSample(true);
		}
	});

	async function setSample(enabled: boolean) {
		const projectId = page.params.id;
		sampleError = '';
		if (!projectId) {
			// Storybook: no server; show whatever results the card already has.
			sample = { ...sample, enabled };
			return;
		}
		writing = enabled;
		try {
			const res = await fetch(`/api/projects/${projectId}/cards/${card.id}/sample`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ enabled })
			});
			if (!res.ok) throw new Error(`${res.status}`);
			sample = (await res.json()).sample;
		} catch (e) {
			sampleError = `Couldn't make up the answers (${e instanceof Error ? e.message : e}).`;
		} finally {
			writing = false;
		}
	}
</script>

<!-- As tall as the project page allows a full-size card (--card-height: below the header, behind Lumi's dock); the
     question list and the preview scroll inside. -->
<Card.Root class="relative h-(--card-height) min-h-100">
	<!-- Above the results, which scroll up underneath it on the right. -->
	<Card.Header class={[results && 'relative z-20']}>
		<Card.Title class="flex items-center gap-2">
			{card.title}
			{#if results}<Badge variant="secondary">Sample data</Badge>{/if}
			{#if writing && results}<span class="text-caption font-normal text-muted-foreground"
					>Lumi is updating the answers…</span
				>{/if}
		</Card.Title>
		<Card.Description>{card.subtitle ?? 'Questions to share with people'}</Card.Description>
		<Card.Action>
			<Popover.Root>
				<Popover.Trigger class={buttonVariants({ variant: 'ghost', size: 'sm' })}>
					<Share data-icon="inline-start" />Share
				</Popover.Trigger>
				<Popover.Content align="end" aria-label="Share">
					<p>
						Sorry, sharing doesn't work yet. But we can pretend some answers have already come in.
					</p>
					<div class="flex items-center justify-between gap-4">
						<Label for="sample-{card.id}">Fake responses</Label>
						<Switch
							id="sample-{card.id}"
							checked={writing || !!sample?.enabled}
							disabled={writing}
							onCheckedChange={setSample}
						/>
					</div>
					{#if writing}
						<p class="text-caption text-muted-foreground">Lumi is making up answers…</p>
					{:else if sampleError}
						<p class="text-caption text-destructive">{sampleError}</p>
					{/if}
				</Popover.Content>
			</Popover.Root>
		</Card.Action>
	</Card.Header>
	{#if results}
		<Card.Content class="flex min-h-0 flex-1">
			<StudyResults {questions} {results} />
		</Card.Content>
	{:else}
		<Card.Content class="flex min-h-0 flex-1 flex-row gap-4">
			<div class="flex w-62 shrink-0 flex-col gap-1">
				<div bind:this={list} class="min-h-0 overflow-y-auto">
					<Steps
						aria-label="Questions"
						steps={questions.map((q) => ({
							title: q.text || 'Untitled question',
							description: typeLabel(q.type)
						}))}
						current={selected}
						onselect={(i: number) => (selected = i)}
					/>
				</div>
				<Button
					variant="outline"
					class="h-14 w-full justify-start gap-3 rounded-sm px-2 text-muted-foreground"
					onclick={addQuestion}
				>
					<Icon icon={Plus} />New
				</Button>
			</div>

			<section
				aria-label="Preview"
				class="relative flex flex-1 flex-col overflow-y-auto rounded-sm bg-background px-8 pt-16 pb-8"
			>
				<p class="absolute top-4 left-4 text-caption text-muted-foreground">Preview</p>
				{#if question}
					<div class="absolute top-2 right-2 flex items-center gap-1">
						<Select.Root type="single" value={question.type} onValueChange={setType}>
							<Select.Trigger size="sm" aria-label="Question type">
								{typeLabel(question.type)}
							</Select.Trigger>
							<Select.Content align="end">
								{#each TYPES as t (t.value)}
									<Select.Item value={t.value} label={t.label} />
								{/each}
							</Select.Content>
						</Select.Root>
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label="Delete question"
							onclick={removeQuestion}
						>
							<Trash />
						</Button>
					</div>

					<!-- The preview is also where the question is written: edit it as people will see it. -->
					<div class="m-auto flex w-full max-w-xl flex-col gap-4">
						<textarea
							bind:this={questionField}
							bind:value={question.text}
							oninput={save}
							rows="1"
							aria-label="Question"
							placeholder="Type your question"
							class="field-sizing-content resize-none bg-transparent text-heading outline-none placeholder:text-placeholder"
						></textarea>
						{#if question.type === 'open'}
							<PromptInput
								bind:value={answer}
								placeholder={question.placeholder || 'Type your answer…'}
								label="Answer (preview)"
								onsubmit={() => (answer = '')}
							/>
						{:else}
							<ol bind:this={optionsList} class="flex flex-col gap-1" aria-label="Options">
								{#each question.options ?? [] as _, i (i)}
									<li
										class="flex h-12 items-center gap-6 rounded-lg bg-secondary pr-1 pl-2 text-body-lg"
									>
										<Kbd aria-hidden="true">{i + 1}</Kbd>
										<input
											bind:value={question.options![i]}
											oninput={save}
											onkeydown={(e) => {
												if (e.key === 'Enter' && !e.isComposing) {
													e.preventDefault();
													addOption(i + 1);
												}
											}}
											aria-label="Option {i + 1}"
											placeholder="Option {i + 1}"
											class="min-w-0 flex-1 bg-transparent outline-none placeholder:text-placeholder"
										/>
										<Button
											variant="ghost"
											size="icon-sm"
											aria-label="Remove option {i + 1}"
											onclick={() => removeOption(i)}
										>
											<X />
										</Button>
									</li>
								{/each}
							</ol>
							<Button
								variant="ghost"
								class="self-start text-muted-foreground"
								onclick={() => addOption()}
							>
								<Plus data-icon="inline-start" />Add option
							</Button>
						{/if}
					</div>
				{:else}
					<p class="m-auto text-body text-muted-foreground">Add a question to see it here.</p>
				{/if}
			</section>
		</Card.Content>
	{/if}
</Card.Root>
