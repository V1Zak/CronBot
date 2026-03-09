import { readdirSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { Cron } from "croner";
import type { PipelineEngine } from "../engine/executor";
import { loadJob } from "../utils/job-loader";
import type { JobDefinition } from "../utils/job-schema";
import type { Logger } from "../utils/logger";

function isYamlFile(path: string): boolean {
  return [".yaml", ".yml"].includes(extname(path).toLowerCase());
}

export function loadScheduledJobs(jobPath: string): JobDefinition[] {
  const resolvedPath = resolve(jobPath);
  const stats = statSync(resolvedPath);
  const jobFiles = stats.isDirectory()
    ? readdirSync(resolvedPath, { withFileTypes: true })
        .filter((entry) => entry.isFile() && isYamlFile(entry.name))
        .map((entry) => join(resolvedPath, entry.name))
        .sort()
    : [resolvedPath];
  const jobs = jobFiles.map((file) => loadJob(file)).filter((job) => Boolean(job.schedule));

  if (jobs.length === 0) {
    throw new Error(`No scheduled jobs found in ${resolvedPath}`);
  }

  return jobs;
}

export function daemonCommand(jobPath: string, engine: PipelineEngine, logger: Logger): void {
  const jobs = loadScheduledJobs(jobPath);

  for (const job of jobs) {
    new Cron(job.schedule!, async () => {
      try {
        await engine.run(job);
        logger.info(`Job ${job.name} completed`);
      } catch (error) {
        logger.error(`Job ${job.name} failed`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    logger.info(`Scheduled job ${job.name}`, { schedule: job.schedule });
  }
}
