import type { RunLogEntry, StateStore } from "../db/store";

export interface LogsCommandOptions {
  job?: string;
  limit?: number;
}

export function formatRunLogs(runs: RunLogEntry[]): string {
  return JSON.stringify(runs, null, 2);
}

export function logsCommand(stateStore: StateStore, options: LogsCommandOptions): void {
  const limit = Number.isFinite(options.limit) ? Math.max(1, options.limit ?? 20) : 20;
  const records = stateStore.listRuns(options.job, limit);
  console.log(formatRunLogs(records));
}
