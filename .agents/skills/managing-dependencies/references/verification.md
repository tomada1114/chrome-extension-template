# Verifying a dependency change

## Verifying a dependency change before it lands

A manifest and lockfile change is verified by a real install and a real run, never by a
test that mocks a package manager at its subprocess boundary. Run, in order:

```bash
pnpm install            # regenerates pnpm-lock.yaml and .wxt/; must succeed under the install policy
pnpm check:quick        # format, lint, typecheck, tests
pnpm build              # wxt build — the bundler, the manifest and every entrypoint,
                        # which no unit test exercises
pnpm build:edge         # the Edge target, also checked by the manifest suite
pnpm test:manifest      # the consent surface both builds generated
pnpm test:e2e           # the built extension, loaded into Chromium
pnpm test:coverage      # the coverage floors, which a swapped dependency can move
```

Together these are what `pnpm check:source` runs, so one green run of that covers them
all. Two narrower things are worth naming, because the gate reports their failure only
as a wall of output.

The suite for the module that actually consumes the bumped package, run on its own:

```bash
pnpm exec vitest run tests/<module>.test.ts
```

A `@webext-core/messaging` bump surfaces first in `tests/background.test.ts`, which
sends a real message through it on `fakeBrowser`; a `react` bump in the component tests;
a `wxt` bump anywhere `fakeBrowser` or `WxtVitest` is involved, and then in the build.

What a shipped package costs, read off the build:

```bash
du -sh .output/chrome-mv3   # compare against the same command on the default branch
```

A bump that grows the bundle noticeably, or adds a chunk for a context that did not
import it before, is worth a line in the PR body.

Two consequences of a bump only the build-reading suites catch:

- A `wxt` or `@wxt-dev/*` bump can change the generated manifest. If
  `tests/manifest.test.ts` fails, the new build asks users for something the old one did
  not: hold the bump and treat the diff as a consent change (**REQUIRED:**
  `changing-permissions`). Never edit the pinned consent surface to land a bump.
- A `@playwright/test` bump needs its own browser: run `pnpm e2e:browsers` before
  `pnpm test:e2e`, or the suite fails on a missing executable rather than on anything
  the bump changed.

The `Dependency review` workflow runs on every pull request and fails on a new advisory
or a denied license. Scheduled and manual runs of the production audit described in the
main skill check the resolved production graph, including WXT's optional-peer tooling
closure. That audit skips pull requests and cannot independently identify code vendored
inside a dependency's published files.
