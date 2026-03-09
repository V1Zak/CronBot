import { z, type ZodType } from "zod";

export interface OutputSchemaDefinition {
  type: "string" | "number" | "boolean" | "null" | "unknown" | "object" | "array";
  optional?: boolean;
  properties?: Record<string, OutputSchemaDefinition>;
  items?: OutputSchemaDefinition;
}

export function validateStepOutput(stepId: string, schemaDefinition: OutputSchemaDefinition | undefined, value: unknown): void {
  if (!schemaDefinition) {
    return;
  }

  const schema = buildZodSchema(schemaDefinition);
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(`Output schema validation failed for step ${stepId}: ${result.error.message}`);
  }
}

function buildZodSchema(definition: OutputSchemaDefinition): ZodType {
  let schema: ZodType;

  switch (definition.type) {
    case "string":
      schema = z.string();
      break;
    case "number":
      schema = z.number();
      break;
    case "boolean":
      schema = z.boolean();
      break;
    case "null":
      schema = z.null();
      break;
    case "unknown":
      schema = z.unknown();
      break;
    case "array":
      schema = z.array(definition.items ? buildZodSchema(definition.items) : z.unknown());
      break;
    case "object":
      schema = z.object(
        Object.fromEntries(
          Object.entries(definition.properties ?? {}).map(([key, child]) => [key, buildZodSchema(child)]),
        ),
      );
      break;
  }

  return definition.optional ? schema.optional() : schema;
}
