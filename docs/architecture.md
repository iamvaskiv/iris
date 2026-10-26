# Iris architecture

Iris is a SvelteKit app deployed on Cloudflare Workers (`iris.<account>.workers.dev`), behind a shared team password.

## Overview

```mermaid
flowchart TB
    user(["Teammate"])

    subgraph browser["Browser"]
        pages["Pages<br/>projects · project · assets · settings · sign-in"]
        cards["Cards + Lumi's dock<br/>(Latitude design system)"]
    end

    subgraph worker["Cloudflare Worker (SvelteKit)"]
        gate["Password gate<br/>hooks.server.ts"]
        routes["Page loads + /api routes"]
        lumi["Lumi<br/>agent.ts · workspace-agent.ts"]
        services["Card data<br/>video-card · insights · comparison"]
        store["store.ts<br/>one JSON document per item"]
    end

    subgraph data["Storage"]
        d1[("D1 (deployed)")]
        files[("data/*.json (pnpm dev)")]
    end

    claude["Anthropic API<br/>Claude"]
    lumiere["Lumiere API<br/>analysis · feedback · activity · ingestion · teams"]
    media["Signed media<br/>Mux stream & thumbnails · GCS upload"]

    user --> pages --> cards
    pages -- "requests" --> gate --> routes
    routes --> lumi & services & store
    lumi <--> claude
    lumi --> services & store
    services --> lumiere
    lumi -- "library, insights" --> lumiere
    store --> d1 & files
    cards -. "play, show images" .-> media
    pages -. "upload the file" .-> media
    lumiere -. "signs URLs" .-> media
```

| Part          | Where                                                          | What it does                                                                                                                   |
| ------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Pages         | `src/routes`                                                   | Projects page (tiles, Lumi, drop a video → new project), project page (card stack, focus, uploads), assets, settings, `/login` |
| Cards         | `src/lib/cards`                                                | Video, Insights, Comparison, List, Quotes, Table, Text, Upload, Study; built from design-system components                     |
| Password gate | `src/hooks.server.ts`                                          | Production only: a session cookie from `SITE_PASSWORD`, otherwise `/login`                                                     |
| Lumi          | `src/lib/server/agent.ts`, `workspace-agent.ts`                | Claude tool loops: read analysis and insights, browse the library across the user's teams, add/update/focus cards              |
| Card data     | `src/lib/server/video-card.ts`, `insights.ts`, `comparison.ts` | Fill cards from Lumiere; insights cached for six hours                                                                         |
| Store         | `src/lib/server/store.ts`                                      | Projects, assets, insights, settings as JSON documents; versioned updates retried on conflict                                  |

## How a question flows

```mermaid
sequenceDiagram
    participant P as Project page
    participant C as /api/chat
    participant A as Lumi (agent.ts)
    participant Cl as Claude
    participant L as Lumiere
    participant S as store.ts
    P->>C: message
    C->>S: load project
    C->>A: message + project (cards, history)
    loop until Claude stops calling tools
        A->>Cl: system prompt, history, tools
        Cl-->>A: tool calls
        A->>L: get_video, get_entities, get_insights…
        A->>A: show / update / focus card (card data filled from Lumiere)
    end
    Cl-->>A: short reply
    A-->>C: reply + card operations + history
    C->>S: merge into the latest saved project (retry if an upload poll saved meanwhile)
    C-->>P: reply, card operations
    P->>P: apply operations, focus the new card
```

Signed media URLs expire, so page loads rebuild video and comparison card data; insights come from the cache.

## Editing a study

A study's steps are questions (open, multiple choice, slider) and videos; a video step holds its own questions, each
with a time, that pop up while it plays (`flatSteps` lists them right after it as "2.1", "2.2").

Lumi drafts a study's questions (`show_card` / `update_card` with `questions`); edits made on the card save straight to
the project, without a chat turn. Lumi sees the saved questions on its next turn.

```mermaid
sequenceDiagram
    participant U as User
    participant SC as Study card
    participant API as PUT /api/projects/[id]/cards/[cardId]
    participant S as store.ts
    U->>SC: add, select, edit, retype or delete a question
    SC->>SC: update the preview right away
    SC->>API: questions (400 ms after the last edit)
    API->>API: clean them (ids, types, options only on multiple choice)
    API->>S: save on the study card (retry if a chat turn saved meanwhile)
```

Sharing isn't built yet. **Share → Fake responses** stands in for it: Lumi writes made-up results for the questions
(structured output), including 15–20 answers per open question; the server works out the counts and a matching sample
of respondents per question, and the card shows them as **Sample data**. They're
kept on the card and written again only when the questions change.

```mermaid
sequenceDiagram
    participant SC as Study card
    participant API as POST …/cards/[cardId]/sample
    participant Cl as Claude (Lumi)
    participant S as store.ts
    SC->>API: enabled: true
    alt no results yet, questions changed, or last time was generic filler
        API->>Cl: questions + JSON schema (summary, insights, quote, shares, answers)
        Cl-->>API: written results (or an error: generic filler)
        API->>API: views, completion, counts per option that add up, respondents per question
    end
    API->>S: save as the card's sample (enabled)
    API-->>SC: sample results
    SC->>SC: switch to results, badge "Sample data"
```

## How an upload flows

```mermaid
sequenceDiagram
    participant P as Project page
    participant A as /api/projects/[id]/upload
    participant L as Lumiere
    participant G as Google Cloud Storage
    P->>A: POST fileName, fileSize
    A->>L: create ingestion
    L-->>A: ingestionId, signed uploadUrl, videoId
    A-->>P: upload card (saved on the project)
    P->>G: PUT file to uploadUrl (progress shown on the card)
    alt browser upload refused
        P->>A: PUT file
        A->>G: stream it on
    end
    loop every 5–10 s
        P->>A: GET status
        A->>L: ingestion + video status
    end
    A-->>P: completed
    P->>P: remove upload card, ask Lumi for the full analysis
```
