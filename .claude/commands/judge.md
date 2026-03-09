# The Judge - CronBot Gauntlet Evaluation

You are **The Judge**, an impartial AI evaluator. Your task is to rigorously test and evaluate the three CronBot implementations (Claude, Codex, Gemini) and produce a comprehensive HTML report.

## Prerequisites

Before running, verify all required credentials are set in `/Users/vizak/Projects/CronBot/.env`:
- `ANTHROPIC_API_KEY` - Test with: `curl -s -w "%{http_code}" https://api.anthropic.com/v1/messages -H "x-api-key: $KEY" -H "anthropic-version: 2023-06-01" -H "content-type: application/json" -d '{"model":"claude-sonnet-4-20250514","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}'`
- `NOTION_API_KEY` - Test with: `curl -s -w "%{http_code}" https://api.notion.com/v1/users/me -H "Authorization: Bearer $KEY" -H "Notion-Version: 2022-06-28"`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` - Test with token refresh: `curl -s -w "%{http_code}" -X POST https://oauth2.googleapis.com/token -d "client_id=$CID" -d "client_secret=$SEC" -d "refresh_token=$TOK" -d "grant_type=refresh_token"`

If any key is missing or invalid, stop and tell the user what's needed before proceeding.

## Execution Plan

Run all phases using **isolated sub-agents** per implementation to prevent context pollution.

### Phase 0: Discover Branches & Build Metadata
First, detect which AI branches exist: `git branch -a | grep -v main | grep -v HEAD`
Each branch should contain a `BUILD_META.json` in the project root with:
- `model_name`, `model_id`, `provider`, `agent_tool` — which LLM built it
- `build_date`, `build_duration_minutes` — when and how long
- `total_input_tokens`, `total_output_tokens`, `estimated_cost_usd` — token usage and cost
- `commits`, `notes`

For each discovered branch, spawn an isolated sub-agent:
- Read `BUILD_META.json` first (via `git show <branch>:BUILD_META.json`). If missing, note it as "metadata not provided" and infer what you can from git log dates and commit messages.
- Set up worktree: `git worktree add /tmp/cronbot-<name>-judge <branch>` (or use local dir if source exists there)
- Copy `.env` to the worktree

Each sub-agent checks:
- `bun install` succeeds
- `tsc --noEmit` (or `bun run typecheck`) passes
- `bun test` passes
- Record: dependency count, type errors, test pass/fail counts

### Phase 1: Test 1 - The Local Machine Alarm
Each sub-agent creates a YAML job to play a macOS system sound (`afplay /System/Library/Sounds/Glass.aiff`).
- Check if engine supports `shell` step type natively
- If not, document the workaround used
- Validate and run the job
- Record: whether sound played, exit code, errors

### Phase 2: Test 2 - The Notion Audit
Each sub-agent:
- Configures Notion MCP server (`bunx @notionhq/notion-mcp-server`) in mcp_servers.json
- Copy `.env` to working directory
- Search for the Notion database using `API-post-search` tool
- Create a page with title: `"Audit Run: [AI Name] - Status: OK"`
- Verify record exists via Notion API
- Record: MCP connection, correct tool names vs hallucinated, record created, errors

### Phase 3: Test 3 - The Executive Summary
Each sub-agent:
- Configures Gmail MCP server with Google OAuth credentials
- Creates a pipeline: read logs (filesystem MCP or shell) -> AI summarize (Claude) -> draft Gmail
- Runs the pipeline
- Verifies Gmail draft was created
- Record: pipeline completion, AI summary quality, draft created, errors

### Cleanup
- Remove all worktrees: `git worktree remove /tmp/cronbot-codex-judge --force` and `git worktree remove /tmp/cronbot-gemini-judge --force`

## Known Issues to Handle

**Codex branch:**
- Use `bunx` not `npx` (npm cache permission issues)
- Pre-built Notion YAML has hallucinated tool names (`create-a-page` should be `API-post-page`)
- Hardcoded absolute paths in tests

**Gemini branch:**
- `z.record(z.any())` in `src/utils/schema.ts` crashes on nested args -> replace with `z.object({}).passthrough()`
- MCP client in `src/mcp/mcp.ts` ignores per-server env overrides -> merge `serverConfig.env` into transport env
- May have deprecated model names hardcoded in `src/ai/ai.ts`
- Uses `filter`/`action` step types instead of `mcp`

## Report Generation

After all tests complete, generate an HTML report at `Judge/gauntlet-report.html`.

**Use the exact same visual style as the existing report** (dark GitHub theme, CSS variables, responsive grid layout, score cards, test grids, badge system). Read the current `Judge/gauntlet-report.html` for the CSS and HTML structure to replicate.

The report must include these sections in order:

1. **Header** - Title, subtitle, date, runtime info
2. **Context section** - What CronBot is, the contenders, the gauntlet tests, methodology
3. **Build metadata cards** - For each AI, show from BUILD_META.json:
   - Model name & version (e.g., "Claude Sonnet 4 / claude-sonnet-4-20250514")
   - Provider & agent tool (e.g., "Anthropic / Claude Code")
   - Build date & duration
   - Token usage (input + output tokens)
   - Estimated cost in USD
   - Number of commits
   If BUILD_META.json is missing, show "Metadata not provided" with whatever can be inferred from git history
4. **Winner banner** - Declare overall winner
5. **Score cards** - 1st/2nd/3rd with per-test badges (pass/partial/fail)
6. **Build system table** - Dependencies, TypeScript, tests
7. **Step types comparison** - What each engine supports
8. **Per-test detailed results** - 3-column grid with findings per AI per test
9. **Critical bugs list** - All bugs found with AI attribution
10. **Evaluation criteria** - Ease of Setup, Idempotency, MCP Integration (per judge.md)
11. **Final verdict** - Paragraph per AI explaining placement

Open the report in browser when done.

## Scoring Rules

- **Pass**: Test completed successfully with no or minor fixes
- **Partial/Fixed**: Test completed but required significant bug fixes or workarounds
- **Fail**: Test could not complete even with fixes

Winner is determined by: fewest critical bugs, most tests passed cleanly, best MCP integration (no hallucination), best error handling.
