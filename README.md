# The CronBot AI Showdown

Welcome to **CronBot**, a unique experiment in autonomous software engineering.

The premise is simple: Give multiple AI coding agents the exact same architectural plan (`plan.md`) and coding standards (`rules.md`), then see how each builds the same complex application autonomously with minimal human intervention.

## The Application: CronBot

The target application is a **hybrid AI automation CLI daemon**.
It solves the context-limit and cost problems of LLM agents by separating work into two distinct layers:
1. **Deterministic Filters:** Using the [Model Context Protocol (MCP)](https://modelcontextprotocol.io) to fetch data quickly and for free (e.g., searching unread Gmails, fetching Slack history).
2. **AI Reasoning:** Passing only optimized, transformed data chunks to an LLM (like Claude) for complex reasoning (summarizing, categorizing).

## How It Works

Each AI agent is given:
1. **`plan.md`** — Technical stack (Bun, TypeScript, SQLite, MCP, Anthropic SDK) and the architectural call graph.
2. **`rules.md`** — Strict coding standards, idempotency requirements, safety guidelines, branching rules, and the mandatory `BUILD_META.json` requirement.
3. **Minimal Assistance** — The AIs scaffold the project, write the core engine, implement MCP integration, build data transformers, and write YAML test jobs without constant hand-holding.

Each AI creates its own **git branch** (e.g., `Claude`, `Codex`, `Gemini`) with a complete implementation. The `main` branch holds only shared documentation.

### Build Metadata

Each AI must produce a `BUILD_META.json` in the project root of its branch containing:
- Model name and version used
- Provider and agent tool
- Build date and duration
- Token usage (input/output) and estimated cost
- Number of commits

This data is consumed by The Judge for fair, transparent reporting.

## The Judge & The Gauntlet

**The Judge** is an impartial AI evaluator (see `judge.md`) that spawns isolated sub-agents to enter each branch and run it through a brutal three-part gauntlet:

1. **The Local Machine Alarm** — Can the bot trigger an OS-level sound via a YAML job pipeline?
2. **The Notion Audit** — Can the bot connect to Notion via MCP, discover the schema (not hallucinate it), and create a record?
3. **The Executive Summary** — Can the bot chain Filter -> AI -> Action to read its own logs, summarize them with Claude, and draft a Gmail?

Run the gauntlet with the `/judge` slash command in Claude Code. Results are published to `Judge/gauntlet-report.html`.

## Evaluation Criteria

- **Ease of Setup:** Least human intervention to fix dependencies or syntax errors
- **Idempotency:** Best error handling without infinite loops or crashes
- **MCP Integration:** Seamless handling of standard MCP servers without hallucinating tool names or schemas
- **Code Quality:** Strict TypeScript, test coverage, modularity

## Prerequisites & Quick Start

1. **Install Bun:** `curl -fsSL https://bun.sh/install | bash`
2. **Clone the repo:** `git clone https://github.com/V1Zak/CronBot.git && cd CronBot`
3. **Copy environment variables:** `cp .env.example .env` and fill in your API keys (see `.env.example` for required variables: Anthropic, Notion, Google OAuth).
4. **Switch to a branch:** `git checkout <BranchName>` (each AI implementation lives on its own branch)
5. **Install dependencies:** `bun install`
6. **Run the bot:**
    * `bun run src/index.ts run <job.yaml>` — Run a single YAML job
    * `bun run src/index.ts daemon <jobs-dir>` — Start the cron daemon
    * `bun run src/index.ts validate <job.yaml>` — Validate a job without running
    * `bun run src/index.ts logs` — View execution history
    * `bun run src/index.ts list <jobs-dir>` — List available jobs
7. **Run tests:** `bun test`

## Repository Structure

```
CronBot/
├── plan.md              # Architecture and tech stack
├── rules.md             # Coding standards and build rules
├── judge.md             # The Judge's evaluation methodology
├── .env.example         # Required environment variables
├── Judge/
│   └── gauntlet-report.html   # Latest evaluation report
├── .claude/
│   └── commands/
│       └── judge.md     # /judge slash command skill
└── test_v1/             # Archived v1 implementations (local only)
```

---

*Each branch is a self-contained implementation built autonomously by a different AI. Explore and compare.*
