# Iris changelog

What changed in Iris, newest first. Add a line under today's date with every change people would notice (and the
notable behind-the-scenes ones); the app Storybook shows this file as its **Changelog** page. The deployed app
(`iris.<account>.workers.dev`) runs whatever was last released with `pnpm run deploy`.

## 2026-10-26

**Studies**

- New question type: **Slider** (0 to 10). Try it in the preview; Lumi can draft slider questions, and sample results show
  the average (with a bar) and each response's number. The question type is picked from a dropdown.
- New study card: questions to share with people, set up inside a project. Ask Lumi for a study and it drafts the
  first questions; on the card, add questions (**New**), pick one to edit it in place in the preview, switch between an
  open question and multiple choice, add or remove options, and delete questions. Edits save as you type. Sharing and
  collecting answers come later.
- **Share** on a study can't share yet, but offers **Fake responses**: Lumi makes up believable results for the
  questions (views, sentiment, average rating, completion, a summary, two key insights, a quote, answers per question)
  and the card switches to them, marked **Sample data**. Lumi knows they're made up when you ask about them. Turn it off
  to edit the questions again.
- In sample results, click a question to slide the overview aside and read its individual responses: each with a
  respondent number, age band and when they answered, open answers with a sentiment dot. Click an option to see who
  picked it. Back with the overview's edge, Escape or the question again.
- The study card fills the page: full width, from below the header down behind Lumi to its input. The question list
  scrolls inside it, with **New** always in view.

## 2026-10-23

**Lumi**

- The projects page offers three ways to start as cards above the prompt: analyse a video's content, get viewers'
  opinion, compare videos. Picking one asks Lumi; they go away once the conversation starts.

## 2026-10-15

**Deployment**

- Iris runs on Cloudflare Workers, with projects, videos, insights and settings stored in Cloudflare D1 (JSON files in
  `data/` when running locally). Saves no longer overwrite each other when two people work at once.
- The deployed app asks for a shared team password; local development doesn't.
- Source on GitHub (private).

**Lumi**

- Replies have a shape: the answer first, then either a short paragraph or a few bullets, with key figures in bold.
  The reply bubble renders paragraphs, bullets and bold.
- The video library covers every Lumiere team you belong to (The Gradient and Latitude Playground), not just one.
- When Lumi can't reach Claude, the reason is logged and the fallback message no longer points to a missing button.

**Projects**

- Drop a video anywhere on the projects page to start a new project with it.
- Uploads go straight from the browser to storage, so large files work on the deployed app.
- Clicking inside the focused card (opening a section, using the player) no longer scrolls the page.

**Cards**

- Comparison card: click a video to make it the baseline; the other columns show their difference from it (green
  higher, red lower).
- Cards are built from the design system's new Card.Section, Stat, SentimentBar and Tile.

**Look**

- Classic theme is violet-tinted: a mauve page with mauve cards, fills and muted text (from the design system).
- Favicon: the Lumiere ring.

**For developers**

- Docs pages in both Storybooks render Markdown with live Mermaid diagrams (one shared renderer); code blocks,
  links and tables are styled.
- An app Storybook (`pnpm storybook`) with every card type, Lumi's dock, the header, the sign-in page, this changelog
  and the architecture document.
- `AGENTS.md` asks for Mermaid diagrams in plans, design docs and PRs; `docs/architecture.md` describes the current
  setup.

## 2026-10-14

**Cards**

- Video card: the poster with Play over it, then the summary and collapsible, sideways-scrolling Scenes and
  Characters (open) and Themes and Brands (collapsed). Clicking a scene or brand plays the video from there.
- Insights card: views, responses, rating and positive comments, comment sentiment, answers to on-video questions,
  and the most liked and criticised comments. Cached for six hours.
- Comparison card: two to four videos side by side, from their analysis and audience data, plus Lumi's own rows.
  Three or more videos make the card wider.
- New cards scroll fully into focus.

**Lumi**

- Lumi can offer answers as buttons (multiple-choice replies).
- A large Lumi on the projects page, with wider replies.
- The prompt box is a quarter wider and grows to several lines.
- The animated orb is Lumi's avatar; Jinn is renamed Iris.

**Look**

- The Lumiere logo and a header nav with a soft glow on the current page.
- A Classic theme option in Settings.
- New projects are only saved once they have content.

## 2026-10-13

- First version: a project page where Lumi answers questions about a video with cards (video, list, quotes, table,
  text), backed by Claude and Lumiere's video analysis.
- Projects, each with its own conversation, and a projects-page Lumi that can create, open and delete projects.
- Upload a video by dropping it on a project; it's analysed automatically.
- The Assets page lists every video Iris knows, and the assistants can use any of them.
- Lumiere stays out of sight; its video library sits behind a Settings switch.
- The card stack scrolls with native snapping and focuses one card at a time; a sticky header with a progressive blur;
  an animated dock for Lumi.
