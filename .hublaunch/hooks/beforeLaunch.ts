#!/usr/bin/env tsx
/**
 * beforeLaunch hook — E2E fixture for hula-server PR #759 (sandbox-side hook
 * execution for remote launches).
 *
 * Contract (same for the CLI `hula launch` path and the sandbox path):
 *   argv[2]  context JSON: { issueName, planPath, branchName? }
 *   stdout   exactly one JSON object:
 *              {"envVars": {...}, "unsetEnvVars": [...]}
 *   stderr   diagnostics (relayed to the run log). Never print secret values.
 *   exit≠0   aborts the launch.
 *
 * What this fixture proves:
 *   - envVars reach the agent session: LAUNCH_TIMESTAMP is exported.
 *   - unsetEnvVars removes a forwarded variable before the agent starts:
 *     HOOK_SECRET_TEST (forwarded from .env via config.envVars) is unset.
 *   - the hook can see where it ran: HOOK_RAN_IN is "sandbox" when the
 *     sandbox-only RALPH_CONTAINER_MODE variable is present, else "cli".
 */

interface BeforeLaunchContext {
  issueName?: string;
  planPath?: string;
  branchName?: string;
}

async function main() {
  const context: BeforeLaunchContext = JSON.parse(process.argv[2] ?? '{}');
  const ranIn = process.env.RALPH_CONTAINER_MODE === 'true' ? 'sandbox' : 'cli';

  console.error(`[beforeLaunch] Launching "${context.issueName ?? '?'}" (${ranIn})...`);
  console.error(
    `[beforeLaunch] HOOK_SECRET_TEST is ${process.env.HOOK_SECRET_TEST ? 'present' : 'absent'} in the hook's environment`,
  );

  const envVars: Record<string, string> = {
    LAUNCH_TIMESTAMP: new Date().toISOString(),
    HOOK_RAN_IN: ranIn,
  };
  const unsetEnvVars = ['HOOK_SECRET_TEST'];

  console.error(`[beforeLaunch] Injecting ${Object.keys(envVars).join(', ')}; unsetting ${unsetEnvVars.join(', ')}`);

  // Only this line goes to stdout.
  console.log(JSON.stringify({ envVars, unsetEnvVars }));
}

main().catch((error) => {
  console.error('[beforeLaunch] Hook failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
