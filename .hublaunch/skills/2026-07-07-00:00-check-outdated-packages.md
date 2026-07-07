# Check Outdated Packages

## Goal
Review the package.json to identify outdated dependencies and propose updates. This action runs weekly to ensure the project stays current with the latest package versions and security patches.

## Steps
1. Read package.json and identify current dependencies
2. Check npm registry for available updates for each package
3. Identify which packages have new versions available
4. Prepare a comprehensive report of outdated packages with available versions
5. Create or update a PR with the findings and recommended updates

## Outcome
Open a pull request that documents outdated packages and proposes version upgrades to keep dependencies current and secure.