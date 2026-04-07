# Backend Test Layout

`backend/tests` contains both automated test suites and manual verification assets.

## Automated

- `integration/` - route-chain integration tests for Express routers
- `security/` - Jest security and regression tests
- `setupEnv.ts` - Jest test environment bootstrap

These are run by `cd backend && npm test`.

## Manual

- `manual/` - scripts and notes that are not part of the Jest suite

Manual assets are useful for targeted verification, but they are not enforced by the normal automated test run.

## Current Rule

If a file should run under `npm test`, it must be a Jest test under `integration/` or `security/`.

If a file is documentation, an ad hoc script, or a one-off verification aid, it belongs under `manual/`.
