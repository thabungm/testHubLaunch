const FALLBACK_NAME = "there";

export function greet(name?: string): string {
  const trimmed = name?.trim() ?? "";
  return `Hello, ${trimmed || FALLBACK_NAME}!`;
}

function main(): void {
  console.log(greet(process.argv.slice(2).join(" ")));
}

// Run main only when executed directly, not when imported by the test.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
