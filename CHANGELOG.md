# Iris changelog

What changed in Iris, newest first. Add a line under today's date with every change people would notice (and the
notable behind-the-scenes ones); the app Storybook shows this file as its **Changelog** page. The deployed app
(`iris.<account>.workers.dev`) runs whatever was last released with `pnpm run deploy`.

## 2026-10-30

**Cards**

- Video card: a timeline under the video shows its scenes side by side and where the video is; click or drag it to
  go to a moment (arrow keys work too). Pick a character, theme or brand to see where it's on screen, marked on the
  timeline ("Marisol · on screen 1:25, 3 times"), and watch from its first appearance; pick it again, or use the
  arrows beside it, for the next one (× stops showing it). While the video plays, its current scene is outlined.
  Timings come from Lumiere's moments, about ten seconds each.
- Video cards open with every section showing (Themes and Brands no longer start closed), in Timeline view too.
- Video cards are wide (like comparisons of three or more videos): the video across the card, then its title,
  summary and sections. In Timeline view a video card goes full size, like a study (as tall as the page allows), with
  the title, length and summary at the top left beside a smaller video and the lanes scrolling below them.
- Video cards include viewer data when the video was shown to an audience: views, responses, rating and comment
  sentiment under the summary; a **Comments** section with each comment at its moment (click to play from there), with
  its emotions and a sentiment dot; a dot per comment on the timeline under the video, in its sentiment's colour; and
  in Timeline view a **Sentiment** group with positive, neutral and negative lanes of comments (click one to go to it).
- Sample results (Share → Fake responses) treat a video like Lumiere's viewers do: each viewer's comment is left at a
  moment in the video (about what happens there) and comes with the star rating they gave it, 1 to 5. Their responses
  show both ("at 0:27 · 5 / 5 stars"), and on the video card, with the study as its source, they fill the timeline,
  Comments, the Sentiment curve and the Rating curve. Studies with fake responses on write them again the next time
  they're switched on.
- Video cards switch their viewer data between sources with **Source** (beside the numbers, when there's more than
  one): **Lumiere**, the real viewers, and each of the project's studies that shows the video (as a video step, or in
  a channel) and has sample results, under its card's name. A study shows its views, how many watched, how they
  reacted, the open answers to questions popping up in the video (as comments at their moments, on the timeline and in
  Timeline view) and slider answers there (as a rating out of 10, charted where they were given). Its reactions to the
  whole video appear among the comments, "About the whole video".
- Timeline view charts viewers along the video: a **Sentiment** curve from the comments (above its midline where they
  were positive, below where negative, flat where nobody commented), and a **Rating** group with a curve of the
  average star rating where ratings were given (a rating question at the end shows as one rise there).
- Video card **Timeline view** (a switch under the summary, for every video card and remembered on your device): the
  card's sections become lanes along the video, like an editor's timeline. The scenes run across the top; each
  character, theme and brand gets its own lane with bars where it's on screen and its share of screen time ("53% on
  screen"), longest first, coloured by kind (characters blue, themes magenta, brands orange). Scene boundaries and the
  playhead run through every lane. Click a lane to go to that moment, a scene to go to its start, or a name to pick it
  as before (the other lanes dim). Its groups open and close like the card's sections.

## 2026-10-29

**Projects**

- The Assets pull tab's label sits in the middle of the tab: centred on its lowercase letters rather than on its
  line box, which left it about a pixel towards the window's edge.

**Studies**

- The question list can be resized: drag the edge between it and the preview (200 to 480px), or focus it and use
  the arrow keys; double-click it to go back to the default width. It remembers the width on your device.
- A question's settings (its type, its time inside a video, and delete) move out of the preview's corner into a
  **question settings** sidebar on the right, opened and closed with the gear at the preview's top right. It grows
  in from the card's edge as the preview narrows (and shrinks back), stays open or closed as you move between
  questions, and remembers that on your device.
- New step type: **Channel**, a collection of videos. In the preview the channel's name sits above a grid of its
  videos (add more with **Add video**). Click a video to open it, as from the list; on hover its tile also offers ▶
  to watch it full screen, as people will, and × to remove it. With **Vertical sliding** on in its settings, full
  screen works like a short-video feed: slide up and down to the next or previous video (buttons, arrow keys or the
  scroll wheel); off, people go back to the grid to pick another. Its videos are listed under it ("5.1", "5.2") and
  work like video steps: add questions at moments in them ("5.1.1"), and playing full screen stops at each one. Lumi
  can draft channels. Channels are marked in blue in step lists (#003CBD, lighter in dark themes), the app's own
  fourth category colour until the design system has one.
- Sample results for a channel show how many people reached it, and each of its videos the share of them who opened
  it ("69 views · 58% opened it"; people can open several). Each video's views and reactions, and the answers to
  questions inside it, follow from how many opened it, and Lumi sees those picks when you ask about the results.
- Deleting a step, removing a video from a channel, or changing a channel or video into another type asks first when
  it would lose something, naming what goes ("Its 2 videos and 1 question in them will be deleted too."). Empty steps,
  and channel videos without questions, still go at once.
- After deleting a step inside another (a channel's video, a question in a video), the step it was in is selected.
- Lumi keeps each step's id when she edits a study, so its steps (and their sample results) stay the same ones.
- Channels are a lighter blue in dark themes, so they read on dark cards; #003CBD stays for light.
- Arrow keys typed into a field (Lumi's prompt, say) no longer move a full-screen channel along. The question list
  stays within a third of the card on narrow windows.
- A video step is just its video in the preview: no line of text above it. Picking the video and **Add question at
  m:ss** (at the preview's playhead) move into the settings sidebar; with no video picked yet, the preview points
  there. In a channel with **Vertical sliding** on, its videos show up and down arrows on the video that go to the
  channel's previous and next videos, sliding them like a short-video feed (the next comes up from the preview's
  bottom edge, the current one leaving through the top).
- Step lists indent a level for each step inside a step, so a question in a channel's video ("5.1.1") sits further
  in than the video ("5.1"), in the setup and in sample results.
- Picking a step in the question list, or a video reaching one of its questions, switches at once. The animation
  that morphed a video into its questions' small video (and back) is gone: it was slow, waiting up to half a second
  for the video's first frame.

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
