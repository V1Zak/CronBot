import type { AiRunner } from "../ai/runner";
import type { StateStore } from "../db/store";
import type { McpManager } from "../mcp/manager";
import { chunkArray } from "../utils/chunk";
import { isStepEnabled } from "../utils/condition";
import type { Logger } from "../utils/logger";
import { validateStepOutput, type OutputSchemaDefinition } from "../utils/output-schema";
import { withRetry } from "../utils/retry";
import type { JsonObject } from "../utils/types";
import { renderTemplate } from "../utils/template";
import type { JobDefinition, JobStep } from "../utils/job-schema";
import type { TransformEngine } from "../transform";

export interface EngineDependencies {
  aiRunner: AiRunner;
  mcpManager: McpManager;
  stateStore: StateStore;
  transformEngine: TransformEngine;
  logger: Logger;
}

export interface EngineResult {
  steps: Record<string, { output: unknown; status: "completed" | "skipped"; attempts: number }>;
  state: Record<string, unknown>;
  error?: string;
}

export class PipelineEngine {
  constructor(private readonly deps: EngineDependencies) {}

  async run(job: JobDefinition): Promise<EngineResult> {
    const startedAt = new Date().toISOString();
    const currentState = this.deps.stateStore.readState(job.name);
    const stepResults: Record<string, { output: unknown; status: "completed" | "skipped"; attempts: number }> = {};
    const stagedState: Record<string, unknown> = {};

    const baseContext = {
      state: currentState,
      steps: stepResults,
      now: startedAt,
      job: { name: job.name },
    };

    try {
      for (const step of job.steps) {
        const context = { ...baseContext, state: { ...currentState, ...stagedState }, steps: stepResults };
        const shouldRun = isStepEnabled(renderTemplate(step.if, context));
        if (!shouldRun) {
          this.deps.logger.info(`Skipping step ${step.id}`, { type: step.type });
          stepResults[step.id] = { output: null, status: "skipped", attempts: 0 };
          continue;
        }

        const retry = step.retry ?? { attempts: 1, backoffMs: 0 };
        this.deps.logger.info(`Running step ${step.id}`, {
          type: step.type,
          attempts: retry.attempts,
        });

        const execution = await withRetry(retry.attempts, retry.backoffMs, async () =>
          this.executeStep(step, { ...baseContext, state: { ...currentState, ...stagedState }, steps: stepResults }, stagedState),
        );

        validateStepOutput(step.id, step.outputSchema as OutputSchemaDefinition | undefined, execution.value);

        stepResults[step.id] = {
          output: execution.value,
          status: "completed",
          attempts: execution.attempts,
        };
      }

      this.deps.stateStore.withTransaction(() => {
        if (Object.keys(stagedState).length > 0) {
          this.deps.stateStore.writeState(job.name, stagedState);
        }
        this.deps.stateStore.logRun({
          jobName: job.name,
          status: "success",
          startedAt,
          finishedAt: new Date().toISOString(),
        });
      });

      return { steps: stepResults, state: { ...currentState, ...stagedState } };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.deps.stateStore.logRun({
        jobName: job.name,
        status: "failed",
        startedAt,
        finishedAt: new Date().toISOString(),
        error: errorMsg,
      });
      return { steps: stepResults, state: currentState, error: errorMsg };
    }
  }

  private async executeStep(
    step: JobStep,
    context: Record<string, unknown>,
    stagedState: Record<string, unknown>,
  ): Promise<unknown> {
    if (step.type === "mcp") {
      const input = renderTemplate(step.input, context) as JsonObject;
      return this.deps.mcpManager.callTool(step.server, step.tool, input);
    }

    if (step.type === "transform") {
      const source = renderTemplate(step.source, context);
      return this.deps.transformEngine.run(source, step.query);
    }

    if (step.type === "ai") {
      return this.executeAiStep(step, context);
    }

    const entries = renderTemplate(step.entries, context) as Record<string, unknown>;
    Object.assign(stagedState, entries);
    return entries;
  }

  private async executeAiStep(step: Extract<JobStep, { type: "ai" }>, context: Record<string, unknown>): Promise<unknown> {
    if (!step.chunk) {
      return this.runAiRequest(
        this.buildAiRequest(
          step.model,
          String(renderTemplate(step.prompt, context)),
          step.system ? String(renderTemplate(step.system, context)) : undefined,
          step.mockResponse,
        ),
      );
    }

    const renderedSource = renderTemplate(step.source, context);
    if (!Array.isArray(renderedSource)) {
      throw new Error(`AI step ${step.id} requires an array source when chunking is enabled`);
    }

    const chunks = chunkArray(renderedSource, step.chunk.size);
    const chunkResults: unknown[] = [];

    for (const [index, items] of chunks.entries()) {
      const chunkContext = {
        ...context,
        chunk: {
          index,
          number: index + 1,
          total: chunks.length,
          items,
          results: chunkResults,
        },
      };

      const output = await this.runAiRequest(
        this.buildAiRequest(
          step.model,
          String(renderTemplate(step.prompt, chunkContext)),
          step.system ? String(renderTemplate(step.system, chunkContext)) : undefined,
          step.mockResponses?.[index] ?? step.mockResponse,
        ),
      );
      chunkResults.push(output);
    }

    if (!step.chunk.aggregatePrompt) {
      return { chunks: chunkResults };
    }

    const aggregateContext = {
      ...context,
      chunks: {
        results: chunkResults,
        total: chunkResults.length,
      },
    };

    const aggregate = await this.runAiRequest(
      this.buildAiRequest(
        step.model,
        String(renderTemplate(step.chunk.aggregatePrompt, aggregateContext)),
        step.system ? String(renderTemplate(step.system, aggregateContext)) : undefined,
        step.aggregateMockResponse,
      ),
    );

    return {
      chunks: chunkResults,
      aggregate,
    };
  }

  private async runAiRequest(request: {
    prompt: string;
    model: string;
    system?: string;
    mockResponse?: unknown;
  }): Promise<unknown> {
    return this.deps.aiRunner.run(request);
  }

  private buildAiRequest(
    model: string,
    prompt: string,
    system: string | undefined,
    mockResponse: unknown,
  ): {
    prompt: string;
    model: string;
    system?: string;
    mockResponse?: unknown;
  } {
    const request: {
      prompt: string;
      model: string;
      system?: string;
      mockResponse?: unknown;
    } = {
      model,
      prompt,
    };

    if (system) {
      request.system = system;
    }

    if (mockResponse !== undefined) {
      request.mockResponse = mockResponse;
    }

    return request;
  }
}
