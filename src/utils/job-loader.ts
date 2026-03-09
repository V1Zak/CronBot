import { readFileSync } from "node:fs";
import YAML from "yaml";
import { jobSchema, type JobDefinition } from "./job-schema";

export function loadJob(jobPath: string): JobDefinition {
  const raw = readFileSync(jobPath, "utf8");
  const parsed = YAML.parse(raw);
  return jobSchema.parse(parsed);
}
