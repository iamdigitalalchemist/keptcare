/**
 * Render a message template body by substituting {{variable}} placeholders.
 * Unknown placeholders are left intact so missing data is visible, not silent.
 * Pure function — safe to use in both client components and server code.
 */
export function renderTemplate(body: string, variables: Record<string, string>): string {
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(variables, name) ? variables[name] : match,
  );
}
