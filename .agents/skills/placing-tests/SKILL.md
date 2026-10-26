---
name: placing-tests
description: >
  Decides where a new test goes - a Vitest file under tests/, never beside the module it
  covers, or a Playwright spec under e2e/ - which of vitest.config.ts's four projects it
  joins (unit, component under jsdom for a .test.tsx, the explicit automation list, or
  manifest, which reads a build), and which coverage.thresholds floor governs it. Use
  when adding a .test.ts, .test.tsx or .spec.ts file, when a test needs a DOM, a browser
  API, a subprocess or the built extension, when choosing between pnpm exec vitest run,
  pnpm test:coverage and pnpm test:e2e, or when a coverage run drops below a floor.
---

# Placing Tests

**Owns:** where a new test file goes, which vitest project or suite it joins, and the
coverage floors that govern it. **Does not own:** how the test itself is written, its
assertion style, and its fixtures (`writing-tests`); compile-time assertions with
`expectTypeOf` (`type-testing`); what a gate file may contain at all (`changing-gates`).

## Location: `tests/` or `e2e/`, never beside the source

Every Vitest file lives at `tests/<subject>.test.ts` or `tests/<subject>.test.tsx`,
named after the seam it covers rather than after a file path. Every Playwright spec
lives at `e2e/<flow>.spec.ts`, named after what a user does. For example,
`tests/storage.test.ts` covers the storage schema and `e2e/popup.spec.ts` the popup's
flow. Never co-locate a test next to the module it covers.

This is settled. Four mechanical reasons, each of which would have to be undone to move
a test into `src/`:

- `coverage.include` in `vitest.config.ts` lists `src/**` and `scripts/**/*.mjs`. A test
  file under `src/` would count itself as covered source and quietly lift every floor it
  sits under — the one direction a coverage number must never move by accident.
- The vitest projects select on `tests/**` globs plus the file extension, the automation
  and manifest projects are explicit lists of `tests/…` paths, and
  `playwright.config.ts`'s `testDir` is `e2e`. A co-located test joins no suite until
  one of those is widened.
- `eslint.config.mjs` scopes rules by tree: the `tests/vitest-rules` and
  `tests/relaxations` blocks match `tests/**`, while `src/size-budget`, the zone
  boundaries and the markup bans match `src/**`. A test under `src/` would get the
  source rules and none of the test ones.
- WXT treats `src/` as the extension's source and `src/entrypoints/` as the manifest's
  input; a test file there is one stray glob from being bundled.

`tests/fixtures/` is reserved for data under test, not test modules. Nothing under it is
linted, formatted, type-checked, spell-checked, or collected as a test —
`eslint.config.mjs`, `.prettierignore`, `tsconfig.json`, `typos.toml` and
`vitest.config.ts` all skip it, and `tests/tooling-ignores.test.ts` holds the five
together. That is what makes the tree usable for a fixture that is _meant_ to be
malformed or to fail, driven from an `automation` test as a child process.

## Choosing a suite

`vitest.config.ts` splits `test.projects` four ways, and `e2e/` is a fifth suite that
Vitest never collects. Placement follows from what the file touches and which
environment it needs — never from its name or its subject:

- **`unit`** — `tests/**/*.test.ts`, the default. The test imports `src/**` (plus, as a
  deliberate exception, the pure-function modules under `scripts/lib/`) and touches no
  filesystem, subprocess, or git. Node environment, short budget, `fakeBrowser` in place
  of `browser` (as in every project, through `WxtVitest`), and `tests/browser-setup.ts`,
  which points the `chrome` global at the same fake so a message reaches its listener.
  DOM code without React stays here too, with a `@vitest-environment jsdom` docblock
  rather than a move to `component`.
- **`component`** — `tests/**/*.test.tsx`, selected by the extension alone. The only
  project running under jsdom by default and the only one loading `tests/dom-setup.ts`,
  which registers the DOM matchers and Testing Library's `cleanup`. A test that renders
  a component goes here by being written as `.tsx`; there is no list to join. No I/O, so
  the same short budget as `unit`.
- **`automation`** — the explicit `automationTests` list at the top of
  `vitest.config.ts`, with a long budget and no `tests/browser-setup.ts`, so no `chrome`
  global for `@webext-core/messaging` to send through. Everything that shells out, reads
  or writes a temp directory, spawns `git`/`node`, or walks whole trees on disk
  asserting against files rather than imported code — `tests/locales.test.ts` and
  `tests/boundaries.test.ts` included.
- **`manifest`** — the `manifestTests` list beside it, one file today. A test joins it
  only when it cannot run without the Chrome and Edge builds on disk:
  `tests/manifest.test.ts` reads both `.output/{chrome,edge}-mv3/manifest.json` files.
  The default run (`pnpm test`, `pnpm test:coverage`, and ci.yml's `test` job) leaves it
  out, because there is no build there to read and a suite that built one for itself
  would pay for a second build in every workflow. `pnpm test:manifest` runs it, from
  `check:source` and from ci.yml's `Build and end-to-end` job, straight after both
  builds.
- **`e2e/`** — Playwright, loading the same build into Chromium. A spec belongs here
  only when what it checks exists only in a loaded extension: an entrypoint's wiring, a
  message crossing two real contexts, a content script on a page. It runs from
  `pnpm test:e2e`, in `check:source` and the same CI job. Adding one is a claim that no
  in-process test could have asserted the same thing; prefer `unit` or `component`
  whenever one could.

Both build-reading suites check that a build exists (`ERR_MANIFEST_NO_BUILD`,
`ERR_E2E_NO_BUILD`), not that it is current. A build left from before the change passes
while proving nothing about it, so fresh Chrome and Edge builds come immediately before
the manifest suite; `pnpm build` comes immediately before the end-to-end suite.

The two directions fail differently, which is why `automation` is a list rather than a
glob. Forgetting to register a test that does I/O leaves it in `unit`, where the short
budget makes it time out loudly rather than pass on a budget nobody chose. Listing a
pure test in `automationTests` is the quiet mistake: it still passes, just on a budget
far longer than it needs and without the `chrome` global a message needs. So a new test
starts in `unit` (or in `component`, by its extension) and joins `automationTests` only
when its I/O is deliberately reviewed.

**Why the timeouts differ:** a `unit` or `component` test has no I/O, so if it hangs the
only possible cause is an infinite loop or an unresolved promise, and a short timeout
surfaces that in seconds. An `automation` test legitimately needs the long budget for a
real subprocess or temp-directory operation — giving it the short one would make correct
tests flaky.

## Coverage floors

`coverage.include` lists source and automation files on purpose: a file with no test
still counts toward the denominator at 0% instead of vanishing from it. A new file is
covered from the moment it exists — write its test in the same PR, not as follow-up.

**There is no top-level floor, and that is a decision rather than an omission.** The v8
provider checks a top-level threshold against the coverage of _all_ included files
combined, so one number over `src/` and `scripts/` together would let a well-tested zone
subsidize an untested file in the other. Independent per-glob threshold sets are what
stop that: each is judged only against its own coverage, and each answers a different
question.

- **The `src/` zones** named in `coverage.thresholds` carry the baseline floor for this
  extension's own logic. That glob is deliberately narrower than `coverage.include`:
  `src/entrypoints/**` and the `.tsx` files under `src/components/**` carry **no floor
  at all**. They are WXT entry points and rendered markup, exercised by a component
  render and by the Playwright suite, and a floor they cannot meet would only teach the
  next author to move the number. They stay inside `coverage.include`, so an untested
  file there still reports as a percentage — it simply has no floor to trip. That
  distinction is the whole point: a narrower _threshold_ glob keeps the number visible,
  while a `coverage.exclude` entry would hide it, which is what AGENTS.md's "never
  weaken a gate" forbids by name. Widening or narrowing the threshold glob is a decision
  to argue for in a PR.
- **`src/components/**/*.ts`** splits the zone by extension. Its `.ts` files are plain
  logic — a hook, `cn`, `mountRoot` — with no rendering step to hide behind, so they
  carry the same baseline floor as the zones above. A module earns the markup exemption
  only by being a `.tsx` component; moving logic out of `src/platform/` into a component
  module is not a way out of a floor.
- **`scripts/**`** was never measured before it was added to `coverage.include`, so its
  floor is the last measured coverage rounded down to a clean value, not a guessed
  target — see the dated comment in `vitest.config.ts`. Raise it again as real coverage
  grows; never invent a number ahead of the measurement.
- **`scripts/lib/guard/**`** — the credential and path detection rule engine, the most
  security-critical code in the repository — carries its own higher floor, so it cannot
  regress just because it is dragged along by whatever number the broader `scripts/**`
  tree happens to sit at. It counts toward that aggregate too, on top of its own floor.

See `vitest.config.ts`'s `coverage.thresholds` for the current globs and numbers; this
skill deliberately does not repeat them, since a copied number goes stale the moment the
config changes.

**Coverage stops at the process boundary.** The v8 provider instruments the Vitest
workers and nothing else, so code that only ever executes inside the browser Playwright
launches, or inside a process a test spawns, reports 0% however thoroughly the spec
exercises it — and 0% against a floor fails the run. Design for it rather than
discovering it: keep an entrypoint to wiring, and put the logic behind it in a zone
module a unit test can call in-process on `fakeBrowser`.

- **Branch coverage is the one that matters.** Cover both sides of a conditional rather
  than adding a trivial test whose only effect is moving a line/statement percentage.
- **A floor is never lowered, and no file is added to `coverage.exclude` to move a
  number** — AGENTS.md's "Security and human approval" holds that prohibition for every
  agent, including one whose task is only "make CI green." What this skill owns is which
  floor applies and why.

## Commands

```bash
pnpm exec vitest run tests/<name>.test.ts   # one file, fast iteration
pnpm test:coverage                          # unit, component, automation with floors
pnpm build && pnpm build:edge && pnpm test:manifest            # reads both browser manifests
pnpm build && pnpm test:e2e                 # the Playwright suite (pnpm e2e:browsers once)
```

If `pnpm test:coverage` fails on a floor, add real coverage for the uncovered branch —
do not adjust the threshold or the include list.
