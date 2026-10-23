---
name: writing-tests
description: >
  Use when writing or reviewing a test under tests/ (.test.ts or .test.tsx) or a
  Playwright spec under e2e/, or the regression test a src/ bug fix needs: naming an
  it() after behavior, resetting fakeBrowser, starting a service-worker module and
  calling the stop function it returns, a @vitest-environment jsdom docblock for
  content-script DOM code, rendering a component with memoryStoredValue, the e2e
  fixtures (context, serviceWorker, extensionId), context.route, expect.poll, asserting
  an error's `code`, it.each, fakes over mocks, fake timers, or a flaky or skipped test.
---

# Writing Tests

**Owns:** how one test case is written — its name, the interface it asserts through,
what it asserts, how it fakes the world, and the anti-patterns to reject in review.
**Does not own:** which file a test lives in, which vitest project or suite it joins,
and the coverage floors (`placing-tests`); compile-time assertions with `expectTypeOf`
(`type-testing`); the shape of the errors a test asserts against (`designing-errors`);
where the code under test belongs (`building-entrypoints`); the order of work on a
`src/` change, failing test first (`tdd`).

## Naming and scope

- `describe`/`it` names state behavior, not implementation:
  `it("parses what another device wrote rather than trusting it", ...)`, not
  `it("calls parseSettings")`.
- One behavior per `it`. Branching inside a test body belongs in a separate `it` or an
  `it.each` table, never an `if` in the test.
- Cover the happy path and the failure path of everything a zone publishes.

## Test through an interface, not around one

Each zone has its own surface, and that surface is the seam. The test follows the zone
the code lives in:

- **`src/core/`** — call the function. Nothing to fake: core reads no browser API.
- **`src/platform/`, `src/background/`, `src/content/` logic that calls a browser API**
  runs against `fakeBrowser`, the in-memory extension API that `WxtVitest` substitutes
  for `wxt/browser`. Its state is module-wide, so a file that touches it resets it in a
  `beforeEach` with `fakeBrowser.reset()` imported from `wxt/testing/fake-browser`.
  `tests/browser-setup.ts` points the `chrome` global at the same fake, which is what
  lets a `sendMessage` in the test reach the listener the code under test registered.
  `tests/storage.test.ts` is the model, down to writing a malformed value straight into
  `fakeBrowser.storage.sync` to prove a read parses rather than trusts it.
- **A service-worker module** is tested by calling its `start*()` and the stop function
  it returns. Keep the stop function in a variable and call it in `afterEach`, so each
  test starts from a worker with no listeners; assert that the stop function really
  removes them by calling it and showing the next event goes unanswered. Assert what the
  listeners do through the fake — the stored value, the badge text — and wait for a
  watcher-driven effect with `expect.poll`, never a sleep. `tests/background.test.ts` is
  the model, including `startBackground()()` for the removal case.
- **DOM code without React** — a content script writing into a host page — lives in a
  `.test.ts` that opens with a `/** @vitest-environment jsdom */` docblock. That file
  gets jsdom but not `tests/dom-setup.ts`: no jest-dom matchers and no Testing Library
  `cleanup`, so it resets `document.body` itself in a `beforeEach`. Pass the `document`
  in rather than reaching for the global, and include a label shaped like markup to
  prove it lands as text. `tests/marker.test.ts` is the model.
- **A component or hook under `src/components/`** renders what it is handed, so its test
  hands it props and nothing else — no `fakeBrowser`. A value that changes under the
  screen is a `StoredValue`; `memoryStoredValue` in `tests/memory-stored-value.ts` is
  the in-memory one, with `emit` playing another context's write and `failNextSet` a
  rejected storage write. Query by role and accessible name, never by class or test id.
  `tests/count-panel.test.tsx` and `tests/stored-value-hooks.test.tsx` are the models.
- **An entrypoint**, or anything only a loaded extension shows — the manifest wiring, a
  real message between contexts, a content script on a real page — is a Playwright spec
  under `e2e/`. Follow [references/end-to-end.md](references/end-to-end.md) for its
  fixtures and waits.

A module is reached through the zone that owns it, never around it. Enforced by:
`eslint.config.mjs`'s `boundaries/private-trees-are-not-importable` block. Wanting to
reach past a surface to assert something means the module is the wrong shape, not that
the test needs an exception.

## Asserting errors

Assert the error's stable `code`, never its message text: `toMatchObject({ code })`, or
`instanceof` when the error never crossed a message. An error that carries its code as a
message prefix instead of a field is matched on that prefix alone
(`toThrow(/^ERR_MISSING_ROOT:/)`), never on the sentence after it. **BACKGROUND:**
`designing-errors` explains why `message` is not a contract, and why the class does not
survive a message.

An expected failure is a `Result`'s error branch rather than a throw, so assert on the
returned value — `rejects.toThrow` on a call that is supposed to resolve to a failure
passes only when the contract is already broken. Check that cleanup runs on the failure
path too, not only on success: a rejected storage write (`failNextSet`) has to leave the
screen showing what storage really holds.

## Expected values come from outside the code

An expected value must come from an independent source — a known literal, a worked
example, the spec — never recomputed the way the implementation computes it.
`expect(nextCount(n)).toBe(n + 1)` passes by construction: it restates the
implementation and can never disagree with it. Write the value you expect by hand. A
catalog read from disk is the same idea: `tests/locales.test.ts` asserts against
`src/locales/*.json` rather than against what a bundler resolved.

## Edge cases to sweep every time

`0`, `1`, negative, fractional where an integer is required, `Number.MAX_SAFE_INTEGER`;
an absent optional property versus an explicit `undefined`; long, unicode, and emoji
strings; single-element and duplicate-element collections; cancellation and cleanup for
anything async. For anything read back from storage or received from a content script:
nothing stored yet, a value of the wrong type, an object with an extra or a missing
field, `null`, and a value an older or newer release could have written.

Use `it.each([...])` for input/output variations, labelled through the `%s`/`%p`
placeholders in the title rather than a bare index. When the table is a mapping the
source states too, close it with `as const satisfies` so a new union member fails to
compile until the table covers it.

## Fixtures and isolation

- Prefer factory functions (`function renderPanel(overrides = {})`) to shared mutable
  fixtures.
- `tests/fixtures/` is reserved for data under test, including deliberately malformed
  inputs that must remain byte-for-byte invalid. Fixture files are never imported as
  modules.
- Filesystem tests use a fresh `mkdtempSync(path.join(tmpdir(), "prefix-"))` removed in
  `afterEach` with `rmSync(dir, { recursive: true, force: true })` — never write into a
  real project directory.
- Environment and global replacements go through `vi.stubEnv`/`vi.stubGlobal`, not
  direct mutation. The one deliberate exception is `tests/browser-setup.ts`'s `chrome`
  global, assigned once per file because `unstubGlobals` would undo a stub after the
  first test.
- `vitest.config.ts` already resets mocks and env/global stubs between tests, so an
  `afterEach` whose only body is `vi.restoreAllMocks()` is noise. Anything the runner
  does not know about — `fakeBrowser`'s state, a started service worker, a timer, a temp
  directory, a node appended to `document.body` — is cleaned up explicitly, including
  after a failure. `tests/dom-setup.ts` wires Testing Library's `cleanup` once for the
  component project.

## Independence

Tests are independent: no shared mutable module state, no ordering dependency, no
dependence on timezone, locale, CPU count, or wall-clock time.

Nothing is left as `it.skip`/`it.todo` on `main`, and a flaky test is fixed rather than
retried. Enforced by: the `vitest/*` rules in `eslint.config.mjs`'s `tests/vitest-rules`
block for `tests/**`, and `playwright.config.ts`'s `forbidOnly` for `e2e/`.

## Fakes over mocks

Mock only at boundaries: network, filesystem, clock, child process, randomness. Never
mock the module under test or an internal collaborator — a test that mocks an internal
collaborator breaks on refactor while behavior is unchanged. Prefer a real in-memory
fake to a mock for anything beyond a one-shot call: `fakeBrowser` and
`memoryStoredValue` are real implementations, so the code under test runs the same path
it runs in a browser. A `vi.fn()` is right for a callback prop whose call is the
contract. Assert on behavior and captured arguments rather than call counts, unless the
count itself is the contract.

Do not introduce an abstraction, or a fake for it, until something actually varies
across it.

## Fake timers

No real `setTimeout` or sleep: `vi.useFakeTimers()` plus
`await vi.advanceTimersByTimeAsync(ms)`, restored with `vi.useRealTimers()` in a
`finally`. An abortable or scheduled operation is tested for the caller-visible effect
_and_ for the timer and listener it removes, on both outcomes — `vi.getTimerCount()`
back to zero is the check. A state change that settles asynchronously without a timer is
waited for with `expect.poll` or Testing Library's `waitFor`.

## Anti-patterns

- Testing trivial property access while skipping business-logic edge cases.
- `toBeDefined()`/`not.toBeNull()` where a specific value is checkable.
- Testing that WXT or `fakeBrowser` works, rather than how this extension uses them.
- Mocking `wxt/browser` with `vi.mock` instead of letting `fakeBrowser` stand in.
- Mocking so much that the real code under test never runs.
- Pinning, in a test of one seam, a value another seam owns — a component test that
  asserted a catalog's wording would have to be edited to change the copy; hand the
  component its label as a prop instead.

## Property-based testing

`fast-check` is worth reaching for when a function has a well-defined invariant over a
large input space — a round trip, an idempotent normalization, an ordering guarantee —
not as a default for ordinary tests. It is not a dependency of this repository today,
and adding it goes through the same review as any other dependency. **REQUIRED:**
`managing-dependencies`.
