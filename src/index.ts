// Bun loads .env automatically — no dotenv needed
import { resolve } from "node:path";
import { Command } from "commander";
import { AiRunner } from "./ai/runner";
import { daemonCommand } from "./commands/daemon";
import { listJobsCommand } from "./commands/list";
import { logsCommand } from "./commands/logs";
import { runJobCommand } from "./commands/run";
import { validateJobCommand } from "./commands/validate";
import { StateStore } from "./db/store";
import { PipelineEngine } from "./engine/executor";
import { McpManager } from "./mcp/manager";
import { TransformEngine } from "./transform";
import { ConsoleLogger } from "./utils/logger";

const program = new Command();
const rootDir = resolve(import.meta.dir, "..");
const logger = new ConsoleLogger();
const stateStore = new StateStore(process.env.CRONBOT_DB_PATH ?? resolve(rootDir, "cronbot.db"));
const engine = new PipelineEngine({
  aiRunner: new AiRunner(),
  mcpManager: new McpManager(resolve(rootDir, "mcp_servers.json")),
  stateStore,
  transformEngine: new TransformEngine(),
  logger,
});

program.name("cronbot").description("AI-powered automation CLI").version("1.0.0");

program
  .command("run")
  .description("Run a single YAML job")
  .argument("<jobPath>", "Path to a YAML job file")
  .action(async (jobPath) => {
    await runJobCommand(jobPath, engine);
  });

program
  .command("validate")
  .description("Validate a YAML job without running")
  .argument("<jobPath>", "Path to a YAML job file")
  .action((jobPath) => {
    validateJobCommand(jobPath);
  });

program
  .command("list")
  .description("List available jobs")
  .argument("[jobsDir]", "Directory containing jobs", resolve(rootDir, "jobs"))
  .action((jobsDir) => {
    listJobsCommand(jobsDir);
  });

program
  .command("daemon")
  .description("Start the cron daemon")
  .argument("[jobPath]", "YAML job file or directory containing jobs", resolve(rootDir, "jobs"))
  .action((jobPath) => {
    daemonCommand(jobPath, engine, logger);
  });

program
  .command("logs")
  .description("View execution history")
  .option("--job <name>", "Filter by job name")
  .option("--limit <count>", "Maximum number of runs to return", "20")
  .action((options) => {
    logsCommand(stateStore, {
      job: options.job,
      limit: Number.parseInt(options.limit, 10),
    });
  });

await program.parseAsync(process.argv);
