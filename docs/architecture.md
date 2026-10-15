# Iris architecture

Iris is a SvelteKit app deployed on Cloudflare Workers (`iris.<account>.workers.dev`), behind a shared team password.

```mermaid
flowchart TB
    user(["Teammate"])

    subgraph browser["Browser · SvelteKit pages (Svelte 5 + Latitude design system)"]
        login["/login · team password"]
        home["/ · Projects page<br/>tiles, projects-page Lumi, drop a video → new project"]
        project["/projects/[id] · Project page<br/>card stack, focus & scrolling, drop a video → upload"]
        assetsPage["/assets · Your videos"]
        settingsPage["/settings · Theme, video library access"]
        dock["AiDock<br/>Lumi reply bubble, PromptInput, ChoiceList"]
        cards["Card registry<br/>Video · Insights · Comparison · List · Quotes · Table · Text · Upload<br/>(design-system Card.Section, Stat, SentimentBar, Tile; isWide)"]
    end

    subgraph worker["Cloudflare Worker · SvelteKit server"]
        gate["hooks.server.ts<br/>production only: session cookie from SITE_PASSWORD, else /login"]

        subgraph routes["Routes"]
            loads["Page loads (+page.server.ts)<br/>refresh signed URLs & insights on every visit"]
            chatApi["POST /api/chat"]
            workspaceApi["POST /api/workspace"]
            projectsApi["POST /api/projects"]
            uploadApi["/api/projects/[id]/upload<br/>start · PUT file (fallback only) · poll status"]
            settingsApi["/api/settings"]
        end

        subgraph agents["Assistants (Lumi)"]
            agent["agent.ts · project Lumi<br/>tool loop: get_* · get_insights · list_folder<br/>show/update/focus_card · offer_choices · add_video · update_project"]
            workspaceAgent["workspace-agent.ts · projects-page Lumi<br/>picks videos, creates/opens/deletes projects"]
        end

        subgraph services["Card data & services"]
            videoCard["video-card.ts<br/>poster, stream, scenes, characters, themes, brands"]
            insightsSvc["insights.ts<br/>views, rating, sentiment, questions, comments"]
            comparison["comparison.ts<br/>one column per video: analysis + audience"]
            lumiereClient["lumiere.ts · REST client<br/>teams from /me; each video's own team for activity"]
        end

        store["store.ts · JSON documents per item<br/>projects · assets · insights · settings<br/>versioned updates, retried on conflict"]
    end

    subgraph storage["Storage"]
        files[("data/*.json<br/>local dev")]
        d1[("Cloudflare D1 · docs table<br/>deployed")]
    end

    subgraph external["External services"]
        claude["Anthropic API · Claude"]
        subgraph lumiere["Lumiere API (invisible to users)"]
            videoApi["Video intelligence<br/>summary, entities, chapters, moments, transcript"]
            feedbackApi["Feedback API<br/>responses + aggregations"]
            activityApi["Activity feed<br/>viewing sessions (per team)"]
            ingestApi["Ingestion, folders, /me (teams)"]
            media["Signed URLs<br/>stream & thumbnails (Mux), upload (Google Cloud Storage)"]
        end
    end

    user --> login & home & project & assetsPage & settingsPage
    home --- dock
    project --- dock
    project --> cards

    login & home & project & assetsPage & settingsPage --> gate
    gate --> routes
    home -- "message" --> workspaceApi
    home -- "dropped video: draft named after the file" --> project
    project -- "message" --> chatApi
    project -- "first content saves the draft" --> projectsApi
    project -- "start upload" --> uploadApi
    project -- "PUT the file directly" --> media
    settingsPage --> settingsApi

    chatApi --> agent
    workspaceApi --> workspaceAgent
    agent & workspaceAgent <--> claude
    agent -- "card ops: add · update · focus" --> chatApi
    agent --> videoCard & insightsSvc & comparison & lumiereClient
    workspaceAgent --> lumiereClient

    loads --> videoCard & insightsSvc & comparison
    comparison --> insightsSvc
    videoCard & comparison & insightsSvc & uploadApi --> lumiereClient

    chatApi & workspaceApi & projectsApi & uploadApi & loads & settingsApi & insightsSvc & agent & workspaceAgent --> store
    store -- "pnpm dev" --> files
    store -- "deployed" --> d1

    lumiereClient --> videoApi & feedbackApi & activityApi & ingestApi & media
    project -. "plays stream, shows thumbnails" .-> media
```

**How a question flows:** the project page posts the message to `/api/chat`; `agent.ts` runs a Claude tool loop
that reads Lumiere data (analysis, insights, the video library across the user's teams) and returns a short reply
plus card operations; the server merges them into the latest saved project through `store.ts` (retrying if an upload
poll saved in between), and the page applies the operations and focuses the new card. Signed media URLs expire, so
page loads rebuild video and comparison card data; insights come from a six-hour cache.

**How an upload flows:**

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
