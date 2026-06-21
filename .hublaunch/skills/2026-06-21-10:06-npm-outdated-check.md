# npm Outdated Package Check

## Goal
Keep the repository's npm dependencies current. On each run, check every
`package.json` for packages that are behind their latest published version and
open a pull request that brings them up to date.

## Steps
1. Locate all `package.json` files in the repository (the root and any
   sub-packages or workspaces).
2. Run `npm outdated` to list dependencies whose installed/wanted version is
   behind the latest published version. Capture the current, wanted, and latest
   versions for each.
3. Update the outdated packages, preferring safe minor and patch upgrades.
   Flag any major-version bumps separately rather than applying them blindly.
4. Reinstall dependencies and verify the project still builds and that existing
   tests pass after the updates.
5. Summarize the result: which packages were updated (current → latest) and
   which major upgrades were left for manual review.

## Outcome
Open a pull request that updates outdated npm dependencies, with a clear summary
of each bumped package (old version → new version) and any major-version
upgrades flagged for manual review.
