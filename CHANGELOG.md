# Iris changelog

What changed in Iris, newest first. Add a line under today's date with every change people would notice (and the
notable behind-the-scenes ones); the app Storybook shows this file as its **Changelog** page. The deployed app
(`iris.<account>.workers.dev`) runs whatever was last released with `pnpm run deploy`.

## 2026-10-29

**Projects**

- The Assets pull tab's label sits in the middle of the tab: centred on its lowercase letters rather than on its
  line box, which left it about a pixel towards the window's edge.

**Studies**

- A question's settings (its type, its time inside a video, and delete) move out of the preview's corner into a
  **question settings** sidebar on the right, opened and closed with the gear at the preview's top right. It grows
  in from the card's edge as the preview narrows (and shrinks back), stays open or closed as you move between
  questions, and remembers that on your device.

## 2026-10-28

**Projects**

- Cards keep an 80px safe zone on each side (on screens wider than a phone). The left one holds a little map of the
  project's cards: each card as a block with its real proportions, scaled down and lined up on the left, the one in
  focus solid. Click a block to bring its card into focus; hover or focus one to see the card's title in a tooltip.
- **Bird's eye** (the grid button at the bottom of the left safe zone, in a project with more than one card): every
  card shrinks by the same amount, keeping their relative sizes, and the cards wrap into rows from the top left, as
  large as still fits the screen. Cards fly between the list and the grid; click one (or press Escape) to go back
  with it in focus. Cards keep their state across the switch.
- Project tiles on the projects page show the project's two latest cards in miniature (as they look in the project,
  with fresh video and chart data) instead of video thumbnails. A project with no cards yet still shows its videos.
- A quiz with fake responses switched on shows a green **Fielding in progress** badge beside Share, so it reads as
  live, and so does its project's tile on the projects page.
- **Assets** pane: an "Assets" pull tab on the window's right edge (arrows either side point the way the pane comes
  from, and turn back once it's open; it slides out a little on hover) opens the project's videos in an "Assets used
  in this project" pane that slides in over the page from the right, the tab staying attached to its edge (click it
  again to close). Each row shows the thumbnail, name, length, analysis status and how many cards show it; click one
  to bring its card into focus. The page behind dims, like behind a dialog; a click outside (or Escape) closes it.
- New Tooltip component (with TooltipGroup, so neighbouring tooltips open straight away once one has), built on
  bits-ui like the design system's Popover. A candidate for the design system.

**Lumi**

- Lumi's dock comes in three sizes. **Compact**: the avatar sits to the left of the input and the latest reply is
  hidden (screen readers still hear it); errors and choices still show. **Default**: the latest reply, as before.
  **Expanded**: the whole conversation in the project, scrollable, newest at the bottom: your messages as
  right-aligned bubbles in the accent colour, Lumi's answers as plain text (not her tool calls). Her avatar sits
  beside her latest answer, exactly where it is in the default dock, so expanding just adds the earlier messages
  above. A pull tab on top of the dock (just above it when compact, so the compact box has even padding) changes
  size: drag it down for smaller, up for larger, or click it (arrow keys work too). The size changes while you're
  still holding, at set distances from where you pressed (one size at 60px, two at 200px), so you can go through all
  three in one drag and back; a quick flick doesn't skip the middle size. Changing size opens or closes the box like
  a drawer, quicker for small changes (compact ↔ default) and slower for big ones (up to 0.56s for a long
  conversation), with Lumi's latest message staying in place instead of re-revealing, and her avatar no longer
  flashes white. While you drag, the whole dock squeezes or stretches under your pointer, then morphs to the new
  size and springs back when you let go.

## 2026-10-26

**Studies**

- Questions inside a video: play or scrub a video step's preview to a moment and **Add question at m:ss**. The
  video pauses there and that question opens (selected in the list too), with a small still of the video above it;
  its play button carries on watching from that moment. The video step's timeline marks each question with a dot in
  its type's colour (click it to open the question). Moving between a video and its questions morphs the big player
  into the question's small video and back. They're listed under the video
  ("2.1 · 0:42 · Multiple choice"), their time can be edited, Lumi can add them at the right moments, and sample
  results include them.
- Step types are colour-coded in the step lists: Video green, Multiple choice orange, Slider magenta (Open question
  stays grey), from the design system's new category colours.
- New step type: **Video**. Pick one of your videos in the preview (with an optional line before it) and play it
  there; Lumi can add video steps too. In sample results a video shows its views, how reactions split, and the
  reactions themselves.
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
