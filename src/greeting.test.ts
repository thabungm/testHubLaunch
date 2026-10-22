import { formalGreeting } from "./greeting.ts";

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`PASS: ${msg}`);
}

assert(formalGreeting("Ada") === "Good day, Ada.", "named greeting");
assert(formalGreeting("  Ada  ") === "Good day, Ada.", "trims whitespace");
assert(formalGreeting("Ada Lovelace") === "Good day, Ada Lovelace.", "preserves internal whitespace");
assert(formalGreeting("") === "Good day.", "empty name fallback");
assert(formalGreeting("   ") === "Good day.", "whitespace-only fallback");

console.log("ALL PASS");
process.exit(0);
