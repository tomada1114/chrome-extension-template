## Summary

<!-- One or two lines: what does this change do, and why? Link the issue it closes with "Closes #…". -->

## Test Plan

<!-- Which commands did you run, and what did they print? -->

## Checklist

- [ ] `pnpm check:source` passes
- [ ] New UI strings are added to every locale catalog under `src/locales/*.json`
- [ ] A change to a permission, host pattern or content-script match is called out here,
      with `tests/manifest.test.ts` updated in the same change
- [ ] A change to a stored key's shape bumps its `version` with a migration
- [ ] No new dependency, or its reason is stated here for sign-off
- [ ] No gate weakened (an eslint-disable, @ts-ignore, a lowered coverage threshold, a
      coverage.exclude entry, a skipped test)
