import { resolve } from "node:path";
import { loadJob } from "../utils/job-loader";

export function validateJobCommand(jobPath: string): void {
  const resolvedPath = resolve(jobPath);
  try {
    const job = loadJob(resolvedPath);
    console.log(`✓ Valid job: ${job.name}`);
    console.log(`  Steps: ${job.steps.length}`);
    if (job.schedule) console.log(`  Schedule: ${job.schedule}`);
    if (job.description) console.log(`  Description: ${job.description}`);
    for (const step of job.steps) {
      console.log(`    - ${step.id} (${step.type})`);
    }
  } catch (err) {
    console.error(`✗ Invalid job: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  }
}
