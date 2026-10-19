#!/usr/bin/env tsx
/**
 * beforeLaunch hook — E2E FAILURE fixture for hula-server PR #759.
 * Always exits 1 so a remote launch of this branch must fail before the agent
 * session with failureStage "hook" and a "[stage:hook]" marker.
 */
console.error('[beforeLaunch] E2E failure fixture: simulating a provisioning error (e.g. DB branch API unreachable)');
process.exit(1);
