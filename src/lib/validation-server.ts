// Sanitizer usable from server components (no zod dependency so it can be
// imported into public pages without pulling validation schemas into the
// public bundle path).

export function sanitizeText(input: string): string {
  return input
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[<>]/g, "")
    .trim();
}
