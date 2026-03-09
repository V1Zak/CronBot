export function isStepEnabled(condition: unknown): boolean {
  if (condition === undefined) {
    return true;
  }

  if (typeof condition === "boolean") {
    return condition;
  }

  if (typeof condition === "number") {
    return condition !== 0;
  }

  if (typeof condition === "string") {
    const normalized = condition.trim().toLowerCase();
    if (normalized === "" || normalized === "false" || normalized === "0" || normalized === "null") {
      return false;
    }
    return true;
  }

  if (Array.isArray(condition)) {
    return condition.length > 0;
  }

  if (condition && typeof condition === "object") {
    return Object.keys(condition).length > 0;
  }

  return Boolean(condition);
}
