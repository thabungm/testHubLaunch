#!/usr/bin/env tsx
/**
 * [DISPOSABLE E2E TEST] beforeLaunch hook for hula-server PR #831 (run e2e-c0df014-1634).
 * Mirrors the incident: the hook needs a variable that must be forwarded from the
 * launching user's credential set. Exits 1 when E2E_HOOK_OK is absent.
 */
const ok = process.env.E2E_HOOK_OK;
console.error(`[beforeLaunch] E2E_HOOK_OK is ${ok ? 'present' : 'absent'} in the hook's environment`);
if (!ok) {
  console.error('[beforeLaunch] E2E_HOOK_OK must be set in .env (forward it via envVars)');
  process.exit(1);
}
console.log(JSON.stringify({ envVars: { HOOK_RAN_IN: 'sandbox', E2E_HOOK_SEEN: 'yes' } }));