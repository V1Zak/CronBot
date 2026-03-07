# CronBot: AI-Powered Automation CLI

## System Mandates
You are operating within the **CronBot** workspace. Your primary goal is to help build a cutting-edge CLI daemon and task runner that executes scheduled workflows.

## Technology Stack Principles
*   **Runtime:** The project uses **Bun**. Do not use `npm`, `npx`, or `node` directly for execution unless strictly necessary. Prefer `bun add`, `bun run`, and `bun test`.
*   **Language:** Strict TypeScript. Use strong typing for job schemas, context passing, and database models.
*   **Integrations:** Do not write custom API wrappers for external services (like Slack, Google Drive, Jira). You **must** leverage the **Model Context Protocol (MCP)**. CronBot is an MCP Client that connects to existing MCP Servers via an `mcp_servers.json` configuration file.
*   **AI Engine:** Use `@anthropic-ai/sdk` to power the AI reasoning nodes. 
*   **State & Idempotency:** Use `bun:sqlite` for fast, local state persistence (tracking job runs, offsets like `last_synced_timestamp`). **Critical:** State must only be committed if the entire pipeline (Filter -> AI -> Action) succeeds, ensuring idempotency.
*   **Validation:** Use `zod` extensively. Validate user-provided YAML job schemas and ensure MCP tool outputs match expected structures before feeding them to the AI.

## Architectural Guidelines
*   **Hybrid Approach is Key:** Always separate deterministic filtering from non-deterministic AI generation.
    *   *Bad:* Asking the AI to fetch all emails and decide which ones are unread.
    *   *Good:* Using the Google Workspace MCP tool to query `is:unread`, passing it through a Transformer to remove junk data, and sending the clean JSON to the AI for summarization.
*   **Context Window Protection (Data Transformers):** Never feed raw API/MCP payloads directly to the AI step if the payload is a large array. Implement a **Transform Step** (using tools like JMESPath or native JS mapping) to filter, pluck, and truncate data before it hits the Claude API.
*   **Stateless Jobs, Stateful Engine:** Job YAML definitions should be entirely stateless pipelines. The Engine handles state injection (e.g., querying SQLite for `last_checked_timestamp` and injecting it into the YAML variable `{{ state.last_ts }}`).

## Development Workflow
1.  **Testing First:** Whenever implementing a new pipeline engine feature or MCP client integration, write a `bun test` alongside it.
2.  **Modularity:** Keep the Pipeline Engine (`engine.ts`), Data Transformer (`transform.ts`), MCP Client Manager (`mcp.ts`), and AI Runner (`ai.ts`) decoupled. The Pipeline Engine coordinates them.
3.  **Security:** Ensure that MCP server environment variables (e.g., `SLACK_APP_TOKEN`) are loaded securely from `.env` and never logged or committed.

## Core Use Cases
Always design with these specific use cases in mind:
*   **Gmail Filter + AI:** MCP Filter emails -> Transform (Drop headers/HTML) -> AI Summarize -> MCP Action (Slack notification).
*   **Slack Sorter:** SQLite Read (Last TS) -> MCP Fetch Slack History -> AI Categorize -> MCP Action (Create Jira Ticket) -> SQLite Commit.
*   **Notes Organizer:** MCP Read Local File -> AI Format Markdown -> MCP Write New File -> MCP Archive Old File.