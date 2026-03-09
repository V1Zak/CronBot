export async function withRetry<T>(
  attempts: number,
  backoffMs: number,
  work: (attempt: number) => Promise<T>,
): Promise<{ attempts: number; value: T }> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const value = await work(attempt);
      return { attempts: attempt, value };
    } catch (error) {
      lastError = error;
      if (attempt < attempts && backoffMs > 0) {
        await Bun.sleep(backoffMs * attempt);
      }
    }
  }

  throw lastError;
}
