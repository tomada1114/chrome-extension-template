---
name: changing-gates
description: >
  Covers editing a file that enforces rather than implements: a CI workflow (ci.yml,
  release.yml), lefthook.yml, a required context in .github/rulesets/main.json, or a
  setting in eslint.config.mjs, tsconfig.json, vitest.config.ts, playwright.config.ts,
  wxt.config.ts or .prettierrc.json. Use when a CI job is proposed, a step is added to
  check:source or ci.yml, a lefthook glob changes, an ESLint rule, vitest project or
  Playwright setting is added or loosened, or the question is which gate would have
  caught a change - including what none of them sees.
---

# Changing Gates

**Owns:** a change to a file that enforces rather than implements — a CI workflow,
`lefthook.yml`, `.github/rulesets/main.json`, or a tool config (`eslint.config.mjs`,
`tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `wxt.config.ts`,
`.prettierrc.json`) — and which gate can see a given change at all. **Does not own:**
adding a dependency the config then configures (`managing-dependencies`); a coverage
floor's value or which suite a test joins (`placing-tests`); a `.mjs` under `scripts/`
that a gate invokes (`writing-repo-scripts`); the manifest's `permissions` in
`wxt.config.ts` and the consent surface `tests/manifest.test.ts` pins
(`changing-permissions`); what `release.yml` publishes and the store procedure
(`releasing-to-stores`); `.github/labels.yml` (`triaging-issues`).

## The one rule every gate change shares

A gate file may narrow _what_ a tool looks at; it may never define a rule of its own.
`lefthook.yml`'s header states this for the hook layer, and it is equally true of CI,
which runs the same package scripts as separate steps. Adding a check therefore means
adding a package script and calling it from the gate, never inlining a command into a
workflow step or a hook line.

## `check:source` and `ci.yml` are one list written twice

`package.json`'s `check:source` composes as one script the same ground
`.github/workflows/ci.yml` covers as separate `run:` steps — split there so a reader
sees which step failed rather than only that the composite did. `tests/ci-sync.test.ts`
holds the two together, both ways: it extracts every `pnpm run <name>` token out of
`check:source` and out of every job `ci.yml` declares — the job list is parsed from the
file rather than named in the test, so a third job counts the day it lands — and fails
when a step on either side has no counterpart on the other.

The exceptions are two maps, one per direction, each value a stated reason rather than a
comment: `CHECK_SOURCE_ONLY_EXCEPTIONS` and `CI_ONLY_EXCEPTIONS` in
`tests/ci-sync.test.ts`. Read the entries and their reasons there — a step that checks
the developer's checkout, a browser download a fresh runner needs and a developer does
once, the half of a coverage pair that only a second OS would run. Adding an entry to
either map is a claim to argue in the PR, and a stale one fails the suite — each key has
to still name a real step on its own side.

A gate without a documented source-only exception is therefore three edits: the package
script, the `check:source` composition, and the matching `ci.yml` step. The suite fails
if either of the last two is skipped, whichever way round. What it does not judge is
_which_ job a CI step lands in: steps are collected across all jobs, so a check that
belongs in `static` but sits in `test` satisfies both directions. That one is still read
by a human, and so is the order inside `extension`: `test:manifest` reads both browser
builds, while `test:e2e` reads Chrome. Each comes after its builds in the same job.

`release.yml` is outside that suite. Its `package` job re-runs the build, the manifest
test and the end-to-end suite against the tagged commit before it packages anything, and
nothing compares that list with ci.yml's. A gate added to ci.yml's `extension` job that
should also hold for a release is added to `release.yml` by hand in the same pull
request.

## Gate files

Follow [the per-file guide](references/gate-files.md) when editing a workflow,
`lefthook.yml`, the staged guard, or a tool config. It holds the specific traps and
review obligations. Use [the weakening guide](references/weakening.md) to assess what
protection an edit removes and what its review must explain.

## What no gate here sees

Two suites read build output: `pnpm test:manifest` pins both Chrome and Edge manifests'
consent surface, and `pnpm test:e2e` loads `.output/chrome-mv3/` into Playwright's
Chromium and drives the popup, the options page, the service worker and the content
script on a page the spec serves itself. They run from `check:source`, from ci.yml's
`Build and end-to-end` job and from `release.yml`, never from `pnpm test` or
`pnpm check:quick`, and neither builds for itself. Both refuse missing builds and inputs
under `src/`, `public/` or `wxt.config.ts` newer than the target's manifest. This
timestamp check cannot detect a deletion or an edit that preserves its timestamp, so
each suite still follows fresh builds. A green `check:quick` says nothing about anything
only a loaded extension shows.

Beyond those, a change can be wrong while every gate passes:

- **The Edge build is built, never loaded.** `build:edge` catches a compile error on the
  Edge target; nothing runs `.output/edge-mv3/` in a browser.
- **An update over existing data.** Every spec starts from a fresh profile, so a release
  that misreads what the previous one stored, or a migration that never runs, passes.
  `managing-storage` owns the unit tests that stand in for it.
- **A service-worker restart.** A spec's worker stays alive for the whole test, so state
  kept in a module variable instead of storage passes here and is lost in a real browser
  after an idle stop.
- **A non-default locale in a browser.** `tests/locales.test.ts` holds the catalogs to
  the same keys; no spec renders a screen in another locale.
- **Store review and the permission prompt itself.** The manifest test pins what is
  asked for, not whether a reviewer accepts it or how the warning reads to a user.

A gate proposed to close such a gap is a real gate, not a lint rule, and belongs in the
PR as such.
