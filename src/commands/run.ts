import { resolve } from "node:path";
import { loadJob } from "../utils/job-loader";
import type { PipelineEngine } from "../engine/executor";

export async function runJobCommand(jobPath: string, engine: PipelineEngine): Promise<void> {
  const resolvedPath = resolve(jobPath);
  const job = loadJob(resolvedPath);

  console.log(`Running job: ${job.name}`);
  if (job.description) console.log(`  ${job.description}`);
  console.log(`  Steps: ${job.steps.length}\n`);

  const result = await engine.run(job);

  console.log("\n--- Pipeline Results ---");
  for (const [id, outcome] of Object.entries(result.steps)) {
    const icon = outcome.status === "completed" ? "✓" : "⊘";
    console.log(`  ${icon} ${id} — ${outcome.status} (${outcome.attempts} attempt${outcome.attempts !== 1 ? "s" : ""})`);
  }

  if ("error" in result && result.error) {
    console.log(`\n✗ Pipeline failed: ${result.error}`);
    process.exitCode = 1;
  } else {
    console.log("\n✓ Pipeline completed successfully.");
  }
}
