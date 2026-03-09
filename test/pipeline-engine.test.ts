import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "bun:test";
import { AiRunner } from "../src/ai/runner";
import { StateStore } from "../src/db/store";
import { PipelineEngine } from "../src/engine/executor";
import { McpManager } from "../src/mcp/manager";
import { TransformEngine } from "../src/transform";
import type { JobDefinition } from "../src/utils/job-schema";
import { ConsoleLogger } from "../src/utils/logger";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

function createHarness() {
  const dir = mkdtempSync(join(tmpdir(), "cronbot-"));
  tempDirs.push(dir);

  writeFileSync(
    join(dir, "mcp_servers.json"),
    JSON.stringify({
      mcpServers: {
        source: {
          transport: "mock",
          tools: {
            fetch: {
              response: {
                items: [
                  { id: 1, text: "alpha" },
                  { id: 2, text: "beta" }
                ]
              }
            }
          }
        },
        sink: {
          transport: "mock",
          tools: {
            publish: {
              response: {
                ok: true
              }
            }
          }
        }
      }
    }),
  );

  const engine = new PipelineEngine({
    aiRunner: new AiRunner(""),
    mcpManager: new McpManager(join(dir, "mcp_servers.json")),
    stateStore: new StateStore(join(dir, "state.db")),
    transformEngine: new TransformEngine(),
    logger: new ConsoleLogger(),
  });

  return { dir, engine };
}

describe("PipelineEngine", () => {
  test("commits staged state only after all steps succeed", async () => {
    const { engine } = createHarness();
    const job: JobDefinition = {
      name: "digest",
      steps: [
        { id: "fetch", type: "mcp", server: "source", tool: "fetch", input: {} },
        { id: "trim", type: "transform", source: "{{ steps.fetch.output }}", query: "items.text" },
        { id: "ai", type: "ai", prompt: "Summarize {{ steps.trim.output }}", model: "test-model", mockResponse: { summary: "ok" } },
        { id: "publish", type: "mcp", server: "sink", tool: "publish", input: { text: "{{ steps.ai.output.summary }}" } },
        { id: "state", type: "state_write", entries: { last_result: "{{ steps.ai.output.summary }}" } },
      ],
    };

    const result = await engine.run(job);

    expect(result.steps.ai?.output).toEqual({ summary: "ok" });
    expect(result.steps.ai?.status).toBe("completed");
    expect(result.steps.ai?.attempts).toBe(1);
    expect(result.state.last_result).toBe("ok");
  });

  test("does not commit state when a later step fails", async () => {
    const { dir, engine } = createHarness();
    const store = new StateStore(join(dir, "state.db"));
    const job: JobDefinition = {
      name: "broken",
      steps: [
        { id: "state", type: "state_write", entries: { next_cursor: "123" } },
        { id: "ai", type: "ai", prompt: "live call", model: "test-model" },
      ],
    };

    const result = await engine.run(job);
    expect(result.error).toContain("ANTHROPIC_API_KEY is required");
    expect(store.readState("broken")).toEqual({});
  });

  test("renders object templates before invoking MCP actions", async () => {
    const { engine } = createHarness();
    const job: JobDefinition = {
      name: "templated-action",
      steps: [
        { id: "fetch", type: "mcp", server: "source", tool: "fetch", input: {} },
        {
          id: "publish",
          type: "mcp",
          server: "sink",
          tool: "publish",
          input: { payload: "{{ steps.fetch.output }}" },
        },
      ],
    };

    const result = await engine.run(job);
    expect(result.steps.publish?.output).toEqual({ ok: true });
  });

  test("skips a step when its condition renders false", async () => {
    const { engine } = createHarness();
    const job: JobDefinition = {
      name: "conditional",
      steps: [
        { id: "state", type: "state_write", entries: { enabled: false } },
        {
          id: "publish",
          type: "mcp",
          if: "{{ state.enabled }}",
          server: "sink",
          tool: "publish",
          input: { text: "should not run" },
        },
      ],
    };

    const result = await engine.run(job);
    expect(result.steps.publish?.status).toBe("skipped");
    expect(result.steps.publish?.attempts).toBe(0);
  });

  test("chunks AI inputs and aggregates the results", async () => {
    const { engine } = createHarness();
    const job: JobDefinition = {
      name: "chunked",
      steps: [
        { id: "fetch", type: "mcp", server: "source", tool: "fetch", input: {} },
        {
          id: "ai",
          type: "ai",
          source: "{{ steps.fetch.output.items }}",
          prompt: "Chunk {{ chunk.number }}/{{ chunk.total }}: {{ chunk.items }}",
          model: "test-model",
          chunk: {
            size: 1,
            aggregatePrompt: "Aggregate {{ chunks.results }}",
          },
          mockResponses: [{ part: "alpha" }, { part: "beta" }],
          aggregateMockResponse: { summary: "combined" },
        },
      ],
    };

    const result = await engine.run(job);
    expect(result.steps.ai?.output).toEqual({
      chunks: [{ part: "alpha" }, { part: "beta" }],
      aggregate: { summary: "combined" },
    });
  });

  test("mock AI response is returned correctly", async () => {
    const { engine } = createHarness();
    const job: JobDefinition = {
      name: "mock-ai",
      steps: [
        {
          id: "ai",
          type: "ai",
          prompt: "test prompt",
          model: "test-model",
          mockResponse: { summary: "ok" },
        },
      ],
    };

    const result = await engine.run(job);
    expect(result.steps.ai?.output).toEqual({ summary: "ok" });
    expect(result.steps.ai?.status).toBe("completed");
  });
});
