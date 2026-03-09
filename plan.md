# CronBot: AI-Powered Automation CLI

## Project Overview
CronBot is a cutting-edge CLI daemon and task runner designed to execute scheduled workflows. It solves the core problem of AI automation cost, context limits, and reliability by enabling a **hybrid approach**: composing deterministic, cheap API calls (Filters) with non-deterministic, powerful LLM reasoning (AI). 

Instead of building custom API integrations, CronBot leverages the **Model Context Protocol (MCP)**, allowing it to easily plug into Gmail, Slack, local file systems, and any future tools natively.

## Tech Stack
*   **Runtime:** **Bun** (Native TypeScript execution, extremely fast startup, built-in SQLite).
*   **CLI Framework:** `commander` (for intuitive CLI commands like `cronbot run`, `cronbot serve`).
*   **Scheduling:** `croner` (A modern, feature-complete cron parser for JS/TS).
*   **Integration Layer:** `@modelcontextprotocol/sdk` (Used as an MCP Client to connect to stdio/SSE servers).
*   **AI Engine:** `@anthropic-ai/sdk` (For interacting with Claude models).
*   **State Management:** `bun:sqlite` (For tracking job executions, logs, and state across runs like `last_synced_timestamp`).
*   **Configuration:** YAML (For defining hybrid declarative pipelines).
*   **Validation:** `zod` (Strict schema validation for user-defined YAML jobs and API responses).

## Core Architecture & Call Graph

### Components
1.  **CLI Entrypoint (`index.ts`)**: Parses user commands.
2.  **Scheduler (`scheduler.ts`)**: Manages cron jobs running in the background.
3.  **Pipeline Engine (`engine.ts`)**: Executes a YAML job step-by-step, passing context (output from step N to step N+1). Handles variable interpolation (e.g., `{{ steps.filter.output }}`).
4.  **MCP Manager (`mcp.ts`)**: Reads an `mcp_servers.json` (similar to Claude Desktop config) to spawn and manage connections to external MCP servers (e.g., Google Workspace, Slack).
5.  **Data Transformer (`transform.ts`)**: Maps or reduces large datasets (like 1,000 unread emails) into smaller chunks using JMESPath or JS before sending to the AI, preventing Context Window exhaustion.
6.  **AI Runner (`ai.ts`)**: Wraps the Anthropic SDK, handles prompt injection, rate limiting, and manages cost/token limits.
7.  **Database (`db.ts`)**: Local SQLite DB. Provides ACID-like idempotency: State is only updated if the entire pipeline run succeeds.

### Execution Call Graph
```text
[User / OS Cron] --> `cronbot run <job.yaml>` or `cronbot daemon`
                          |
                          v
                 [Pipeline Engine]
                          |
    +---------------------+---------------------+---------------------+
    |                     |                     |                     |
[Step 1: MCP Filter] [Step 2: Transform]   [Step 3: AI]         [Step 4: MCP Action]
    |                     |                     |                     |
    v                     v                     v                     v
[MCP Manager]        [Data Engine]         [AI Runner]           [MCP Manager]
    |               (Filter/Chunk data)         |                     |
    v                                           v                     v
[MCP Server]                             [Anthropic API]       [MCP Server]
(e.g., Gmail)                          (Analyzes Chunks)     (e.g., Slack)
    |                                           |                     |
    +---------------------+---------------------+---------------------+
                          |
                          v
        [Transaction Commit: State DB (SQLite)]
```

## Supported Use Cases (Evaluated & Refined)

### 1. The Inbox Zero Assistant (Gmail + AI)
*   **Problem:** Having AI read every email is too expensive and exceeds the context window if there are 100+ emails.
*   **Refined Solution:**
    1.  **Filter Step (MCP):** Query `is:unread category:primary`. Fast, zero tokens.
    2.  **Transform Step:** Map the JSON to extract *only* `Subject`, `Sender`, and the first 200 characters of `Body`. Drop headers/metadata.
    3.  **AI Step (Claude):** Summarize the key action items. Format as Markdown.
    4.  **Action Step (MCP):** Slack MCP `post_message` tool sends summary.
    5.  **State Commit:** SQLite saves the latest email timestamp processed.

### 2. The Slack Channel Sorter (Slack + AI)
*   **Problem:** High noise, overlapping executions if the cron runs every 5 minutes.
*   **Refined Solution:**
    1.  **State Read:** Read `last_slack_ts` from SQLite.
    2.  **Filter Step (MCP):** Slack MCP `conversations_history` using `oldest: {{ state.last_slack_ts }}`.
    3.  **AI Step:** "Extract bug reports. Output JSON array."
    4.  **Action Step (MCP):** Create Jira tickets via Jira MCP or push to a summary channel.
    5.  **State Commit:** Save the newest timestamp from the fetched batch.

### 3. Note Organizer (File System + AI)
*   **Problem:** Handling large or unformatted text dumps safely without data loss.
*   **Refined Solution:**
    1.  **Filter Step (MCP):** File System MCP reads `.txt` files in `~/Desktop/Dump`.
    2.  **AI Step:** Formats text into structured Markdown with tags.
    3.  **Action Step (MCP):** File System MCP writes to `~/Vault/Organized/{{ ai.title }}.md`.
    4.  **Action Step 2 (MCP):** Move original file to `~/Desktop/Dump/Archive/` (safer than immediate deletion).

## File Structure Draft
```
CronBot/
├── package.json
├── tsconfig.json
├── mcp_servers.json     # Configuration for local MCP servers (stdio commands)
├── rules.md             # AI Assistant guidelines
├── plan.md              # Project Architecture
├── src/
│   ├── index.ts         # CLI entry
│   ├── commands/        # CLI subcommands (run, daemon, list)
│   ├── engine/          # Pipeline parsing and execution (w/ idempotency logic)
│   ├── mcp/             # MCP client wrappers & server lifecycle
│   ├── ai/              # Anthropic SDK wrappers
│   ├── db/              # SQLite schemas and queries
│   └── utils/           # Zod schemas, JMESPath transformers
├── jobs/                # User-defined YAML job configurations
└── test/                # Bun tests
```

## Development Phases
*   **Phase 1:** Init Bun project, setup CLI commands (Commander), strict Zod schemas, SQLite state management.
*   **Phase 2:** Build Pipeline Engine (YAML parser + Context passing/templating).
*   **Phase 3:** Integrate MCP Client SDK & connection manager via `mcp_servers.json`.
*   **Phase 4:** Implement Data Transformer (chunking/mapping) and AI integration (Anthropic SDK).
*   **Phase 5:** Build scheduling daemon (`croner`), robust error handling, and transactional state commits.
*   **Phase 6 (Final):** Generate `BUILD_META.json` with build metadata (see rules.md for schema).

## Git & Branching Rules
*   **Do NOT commit to `main`.** Main holds shared docs only.
*   Create a branch named after your AI model: `git checkout -b <YourModelName> main`
*   All implementation code lives on your branch.

## Build Metadata Requirement
Upon completion, create a `BUILD_META.json` in the project root containing:
*   `model_name` — Human-readable model name (e.g., "Claude Sonnet 4", "Gemini 2.5 Pro")
*   `model_id` — Exact model identifier used (e.g., "claude-sonnet-4-20250514", "gemini-2.5-pro")
*   `provider` — Company name (Anthropic, OpenAI, Google)
*   `agent_tool` — CLI tool used (Claude Code, Codex CLI, Gemini CLI)
*   `build_date` — ISO date when the build was completed
*   `build_duration_minutes` — Approximate total session time
*   `total_input_tokens` — Total input tokens consumed during the build
*   `total_output_tokens` — Total output tokens consumed during the build
*   `estimated_cost_usd` — Estimated API cost for the full build
*   `commits` — Number of commits made
*   `notes` — Any relevant observations

This file is read by The Judge to populate evaluation reports. It is mandatory.