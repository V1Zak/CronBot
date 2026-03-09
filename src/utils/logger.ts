export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export class ConsoleLogger implements Logger {
  info(message: string, meta?: Record<string, unknown>): void {
    console.log(formatLog("INFO", message, meta));
  }

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(formatLog("ERROR", message, meta));
  }
}

function formatLog(level: string, message: string, meta?: Record<string, unknown>): string {
  return meta ? `[${level}] ${message} ${JSON.stringify(meta)}` : `[${level}] ${message}`;
}
