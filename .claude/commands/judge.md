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

### Phase 0: Build System Validation
For each implementation (Claude, Codex, Gemini), spawn a sub-agent to:
1. **Claude**: Test in `/Users/vizak/Projects/CronBot/Claude/` (local directory)
2. **Codex**: Create worktree `git worktree add /tmp/cronbot-codex-judge Codex`, test there
3. **Gemini**: Create worktree `git worktree add /tmp/cronbot-gemini-judge Gemini`, test there

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

After all tests complete, generate an HTML report at `Judge/gauntlet-report.html` with:

1. **Context section** - What CronBot is, the 3 contenders, the 3 gauntlet tests, methodology
2. **Winner banner** - Declare overall winner
3. **Score cards** - 1st/2nd/3rd with per-test badges (pass/partial/fail)
4. **Build system table** - Dependencies, TypeScript, tests
5. **Step types comparison** - What each engine supports
6. **Per-test detailed results** - 3-column grid with findings per AI per test
7. **Critical bugs list** - All bugs found with AI attribution
8. **Evaluation criteria** - Ease of Setup, Idempotency, MCP Integration (per judge.md)
9. **Final verdict** - Paragraph per AI explaining placement

Use dark theme (GitHub dark style), responsive grid layout. Open the report in browser when done.

## Scoring Rules

- **Pass**: Test completed successfully with no or minor fixes
- **Partial/Fixed**: Test completed but required significant bug fixes or workarounds
- **Fail**: Test could not complete even with fixes

Winner is determined by: fewest critical bugs, most tests passed cleanly, best MCP integration (no hallucination), best error handling.
