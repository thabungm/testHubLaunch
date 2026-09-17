import { spawnSync } from "node:child_process";

// Deploy tooling may invoke `pnpm check -- --concurrency=2`; pnpm forwards
// those extra args onto the script command line, which `tsc` rejects
// (TS5023). This wrapper intentionally ignores process.argv and always runs
// a fixed, safe command.
const result = spawnSync("tsc", ["--noEmit"], { stdio: "inherit", shell: true });
process.exit(result.status ?? 1);
