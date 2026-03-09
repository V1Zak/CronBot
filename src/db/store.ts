import { Database } from "bun:sqlite";

export interface RunRecord {
  jobName: string;
  status: "success" | "failed";
  startedAt: string;
  finishedAt: string;
  error?: string;
}

export interface RunLogEntry {
  id: number;
  job_name: string;
  status: "success" | "failed";
  started_at: string;
  finished_at: string;
  error: string | null;
}

export class StateStore {
  private readonly db: Database;

  constructor(path: string) {
    this.db = new Database(path, { create: true });
    this.db.run("PRAGMA journal_mode = WAL");
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS state_entries (
        job_name TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (job_name, key)
      );

      CREATE TABLE IF NOT EXISTS run_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_name TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        finished_at TEXT NOT NULL,
        error TEXT
      );
    `);
  }

  readState(jobName: string): Record<string, unknown> {
    const rows = this.db
      .query("SELECT key, value FROM state_entries WHERE job_name = ?")
      .all(jobName) as Array<{ key: string; value: string }>;

    return Object.fromEntries(rows.map((row) => [row.key, JSON.parse(row.value)]));
  }

  withTransaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  writeState(jobName: string, entries: Record<string, unknown>): void {
    const statement = this.db.query(`
      INSERT INTO state_entries (job_name, key, value, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(job_name, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);
    const updatedAt = new Date().toISOString();

    for (const [key, value] of Object.entries(entries)) {
      statement.run(jobName, key, JSON.stringify(value), updatedAt);
    }
  }

  logRun(record: RunRecord): void {
    this.db
      .query(
        "INSERT INTO run_logs (job_name, status, started_at, finished_at, error) VALUES (?, ?, ?, ?, ?)",
      )
      .run(record.jobName, record.status, record.startedAt, record.finishedAt, record.error ?? null);
  }

  listRuns(jobName?: string, limit = 20): RunLogEntry[] {
    const safeLimit = Math.max(1, limit);

    if (jobName) {
      return this.db
        .query(
          "SELECT id, job_name, status, started_at, finished_at, error FROM run_logs WHERE job_name = ? ORDER BY id DESC LIMIT ?",
        )
        .all(jobName, safeLimit) as RunLogEntry[];
    }

    return this.db
      .query("SELECT id, job_name, status, started_at, finished_at, error FROM run_logs ORDER BY id DESC LIMIT ?")
      .all(safeLimit) as RunLogEntry[];
  }

  close(): void {
    this.db.close();
  }
}
