import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function main(): void {
  let version = "unknown";
  let commit = "unknown";

  try {
    const packageJsonPath = join(process.cwd(), "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    version = packageJson.version || "unknown";
  } catch {
    version = "unknown";
  }

  try {
    commit = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
  } catch {
    commit = "unknown";
  }

  console.log(`version: ${version}`);
  console.log(`commit: ${commit}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
