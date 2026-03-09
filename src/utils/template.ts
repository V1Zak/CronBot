const TEMPLATE_PATTERN = /{{\s*([^}]+)\s*}}/g;

export function renderTemplate(value: unknown, context: Record<string, unknown>): unknown {
  if (typeof value === "string") {
    const matches = [...value.matchAll(TEMPLATE_PATTERN)];
    if (matches.length === 1 && matches[0]?.[0] === value) {
      return getPath(context, matches[0][1]?.trim() ?? "");
    }

    return value.replace(TEMPLATE_PATTERN, (_match, expr: string) => {
      const resolved = getPath(context, expr.trim());
      if (resolved === undefined || resolved === null) {
        return "";
      }

      return typeof resolved === "string" ? resolved : JSON.stringify(resolved);
    });
  }

  if (Array.isArray(value)) {
    return value.map((item) => renderTemplate(item, context));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, renderTemplate(entry, context)]),
    );
  }

  return value;
}

export function getPath(source: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (current && typeof current === "object" && segment in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[segment];
    }
    return undefined;
  }, source);
}
