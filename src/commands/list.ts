import { readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { loadJob } from "../utils/job-loader";

export function listJobsCommand(jobsDir: string): void {
  const dir = resolve(jobsDir);
  let files: string[];

  try {
    files = readdirSync(dir)
      .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
      .sort();
  } catch {
    console.error(`Cannot read directory: ${dir}`);
    process.exitCode = 1;
    return;
  }

  if (files.length === 0) {
    console.log(`No YAML job files found in ${dir}`);
    return;
  }

  console.log(`\nJobs in ${dir}:\n`);
  for (const file of files) {
    try {
      const job = loadJob(join(dir, file));
      const schedule = job.schedule ? ` [${job.schedule}]` : "";
      console.log(`  ✓ ${job.name}${schedule} — ${job.steps.length} step(s)`);
      if (job.description) console.log(`    ${job.description}`);
    } catch (err) {
      console.log(`  ✗ ${file} — Invalid: ${err instanceof Error ? err.message : err}`);
    }
  }
  console.log("");
}
