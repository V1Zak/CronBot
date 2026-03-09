export class TransformEngine {
  run(source: unknown, query: string): unknown {
    // Support dot-path expressions and simple JS transforms
    if (query.startsWith("$")) {
      return evaluateScript(source, query);
    }
    return evaluatePath(source, query);
  }
}

function evaluatePath(data: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = data;

  for (const part of parts) {
    if (current == null) return null;

    // Array wildcard: [*] maps over arrays
    if (part === "[*]" || part === "*") {
      if (!Array.isArray(current)) return current;
      continue;
    }

    // Array index: [0], [1], etc.
    const indexMatch = part.match(/^\[(\d+)\]$/);
    if (indexMatch) {
      if (Array.isArray(current)) {
        current = current[parseInt(indexMatch[1]!, 10)];
      }
      continue;
    }

    if (Array.isArray(current)) {
      current = current.map((item) => {
        if (item && typeof item === "object") {
          return (item as Record<string, unknown>)[part];
        }
        return undefined;
      });
    } else if (typeof current === "object") {
      current = (current as Record<string, unknown>)[part];
    }
  }

  return current;
}

function evaluateScript(data: unknown, script: string): unknown {
  // Script format: ${ expression using `data` }
  const expr = script.startsWith("${") && script.endsWith("}")
    ? script.slice(2, -1).trim()
    : script.slice(1).trim();
  const fn = new Function("data", `"use strict"; return (${expr});`);
  return fn(data);
}
