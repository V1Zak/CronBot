import jmespath from "jmespath";

export class TransformEngine {
  run(source: unknown, query: string): unknown {
    // Support bespoke JS transforms and standard JMESPath projections.
    if (query.startsWith("$")) {
      return evaluateScript(source, query);
    }
    return jmespath.search(source, query);
  }
}

function evaluateScript(data: unknown, script: string): unknown {
  // Script format: ${ expression using `data` }
  const expr = script.startsWith("${") && script.endsWith("}")
    ? script.slice(2, -1).trim()
    : script.slice(1).trim();
  const fn = new Function("data", `"use strict"; return (${expr});`);
  return fn(data);
}
