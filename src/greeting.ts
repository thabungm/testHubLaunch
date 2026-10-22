export function formalGreeting(name: string): string {
  const trimmed = name?.trim() ?? "";
  return trimmed ? `Good day, ${trimmed}.` : "Good day.";
}
