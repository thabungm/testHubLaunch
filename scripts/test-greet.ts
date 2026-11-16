import { greet } from "./greet.ts";

function run(): void {
  const cases: Array<[label: string, input: string | undefined, expected: string]> = [
    ["single name", "Sam", "Hello, Sam!"],
    ["multi-word name", "Ada Lovelace", "Hello, Ada Lovelace!"],
    ["trims surrounding whitespace", "  Ada  ", "Hello, Ada!"],
    ["empty name falls back", "", "Hello, there!"],
    ["blank name falls back", "   ", "Hello, there!"],
    ["missing name falls back", undefined, "Hello, there!"],
  ];

  for (const [label, input, expected] of cases) {
    const actual = greet(input);
    if (actual !== expected) {
      console.error(`FAIL (${label}): expected "${expected}", got "${actual}"`);
      process.exit(1);
    }
    console.log(`PASS (${label}): ${actual}`);
  }

  console.log("ALL PASS");
  process.exit(0);
}

run();
