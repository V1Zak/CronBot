import { z } from "zod";

const JsonSchema: z.ZodTypeAny = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(JsonSchema), z.record(z.string(), JsonSchema)]),
);

const outputSchemaDefinition: z.ZodTypeAny = z.lazy(() =>
  z.object({
    type: z.enum(["string", "number", "boolean", "null", "unknown", "object", "array"]),
    optional: z.boolean().optional(),
    properties: z.record(z.string(), outputSchemaDefinition).optional(),
    items: outputSchemaDefinition.optional(),
  }),
);

const retrySchema = z.object({
  attempts: z.number().int().min(1).default(1),
  backoffMs: z.number().int().min(0).default(0),
});

const stepBaseSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["mcp", "transform", "ai", "state_write"]),
  if: JsonSchema.optional(),
  retry: retrySchema.optional(),
  outputSchema: outputSchemaDefinition.optional(),
});

const mcpStepSchema = stepBaseSchema.extend({
  type: z.literal("mcp"),
  server: z.string().min(1),
  tool: z.string().min(1),
  input: z.record(z.string(), JsonSchema).default({}),
});

const transformStepSchema = stepBaseSchema.extend({
  type: z.literal("transform"),
  source: JsonSchema,
  query: z.string().min(1),
});

const aiStepSchema = stepBaseSchema.extend({
  type: z.literal("ai"),
  prompt: z.string().min(1),
  model: z.string().default("claude-sonnet-4-20250514"),
  system: z.string().optional(),
  source: JsonSchema.optional(),
  chunk: z
    .object({
      size: z.number().int().min(1),
      aggregatePrompt: z.string().optional(),
    })
    .optional(),
  mockResponse: JsonSchema.optional(),
  mockResponses: z.array(JsonSchema).optional(),
  aggregateMockResponse: JsonSchema.optional(),
});

const stateWriteStepSchema = stepBaseSchema.extend({
  type: z.literal("state_write"),
  entries: z.record(z.string(), JsonSchema),
});

const execStepSchema = stepBaseSchema.extend({
  type: z.literal("exec"),
  command: z.string().min(1),
  args: z.array(z.string()).optional(),
});

export const jobSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  schedule: z.string().optional(),
  steps: z.array(z.discriminatedUnion("type", [mcpStepSchema, transformStepSchema, aiStepSchema, stateWriteStepSchema, execStepSchema])).min(1),
});

export type JobDefinition = z.infer<typeof jobSchema>;
export type JobStep = JobDefinition["steps"][number];
