---
name: running-the-extension
description: >
  Covers getting evidence from the loaded extension when no test asserts the behavior:
  pnpm build then pnpm test:e2e first, writing a Playwright spec under e2e/ with the
  context, serviceWorker and extensionId fixtures, reading a service worker's or a
  screen's console, a stale .output/ build, ERR_E2E_NO_BUILD, handing pnpm dev to a
  human with what to look at, never the developer's own browser profile, and the
  evidence a pull request carries. Use when asked to run or load the extension, check a
  screen, the content script or the service worker in a real browser, or show a change
  works.
---

# Running the Extension

**Owns:** how an agent observes the loaded extension — which kind of evidence, in what
order, from which browser — and what that evidence looks like in a pull request. **Does
not own:** the rules for running a browser beside the developer's, which AGENTS.md's
"Running a browser without taking over the developer's" states and this skill follows;
writing an entrypoint (`building-entrypoints`); a spec's body and file (`writing-tests`,
`placing-tests`); the visual review of a screen (`designing-ui`); the pull request's
mechanics (`create-pr`).

## Evidence, cheapest first

Stop at the first tier that shows what the change does.

1. **A unit or component test.** Logic under `src/background/`, `src/content/` and
   `src/platform/` runs on `fakeBrowser`, and a screen's states render under jsdom. If
   the behavior is there, no browser is needed.
2. **`pnpm build && pnpm test:e2e`.** The suite loads `.output/chrome-mv3/` into
   Playwright's headless Chromium with a throwaway profile and closes it itself. When it
   covers the behavior, it is the whole answer.
3. **A new spec under `e2e/`.** For what the suite does not ask yet. A lasting assertion
   is committed with the change. A one-off observation — a log line, a value read once —
   may be a scratch spec that is never committed: run it, quote its output and code in
   the pull request, and remove it before staging anything.
4. **A human with `pnpm dev`.** For what only eyes can judge: layout, the real popup's
   size and closing, a non-English UI. See "Asking a human to look" below.

There is no tier between 3 and 4. Driving a browser by hand, or with any tool that
attaches to a running browser, is ruled out by AGENTS.md: it reaches the developer's
windows and profile.

## The build under test

- The fixture in `e2e/fixtures.ts` throws `ERR_E2E_NO_BUILD` when `.output/chrome-mv3/`
  has no manifest, and nothing else: a build older than your last edit passes. Run
  `pnpm build` after the last edit, every time, in the same command as the suite.
- A missing browser is `pnpm e2e:browsers`, once per machine.
- The suite runs the Chrome build only. `pnpm build:edge` proves the Edge build
  compiles; nothing here loads it.

## Writing an observation spec

`e2e/fixtures.ts` gives every test three fixtures: `context` (a persistent Chromium
context with only this extension loaded), `serviceWorker`, and `extensionId`. The
existing specs show each surface:

- **A screen.** Open it as a page: `context.newPage()`, then
  ``goto(`chrome-extension://${extensionId}/popup.html`)`` or `options.html`. This is a
  tab, not the toolbar popup — its size bound and its closing on blur are not exercised.
  `e2e/popup.spec.ts` is the example.
- **The content script.** Serve the host page from `context.route(...)` rather than the
  network, so the run is offline and the page is the same each time;
  `e2e/content.spec.ts` is the example. A URL the manifest does not match is the
  negative case.
- **The service worker's state.** `serviceWorker.evaluate(() => chrome.…)` runs inside
  the worker — `e2e/popup.spec.ts` reads the badge text that way. Poll with
  `expect.poll`, because the worker updates after the message round trip.
- **Console output.** `page.on("console", …)` and `page.on("pageerror", …)` for a screen
  or a host page; `serviceWorker.on("console", …)` for the worker (Playwright's `Worker`
  emits `console`, observed in `playwright-core` 1.64.1's types, 2026-10-23). The
  `serviceWorker` fixture resolves after the worker has started, so a listener attached
  there misses what the worker logged at start-up. Assert what start-up leaves behind —
  a stored value, the badge — rather than its log.
- Read every string the spec matches from `src/locales/en.json`: the suite's Chromium
  runs an English UI.

Run one spec with `pnpm build && pnpm exec playwright test e2e/<name>.spec.ts`. A
failure keeps a trace under `test-results/`; open nothing — quote the error and the
step.

## Asking a human to look

`pnpm dev` builds in watch mode and opens a visible Chromium window with the extension
loaded into a throwaway profile (`webExt.keepProfileChanges: false` in `wxt.config.ts`),
and keeps running. Never start it in a routine check; it is the owner's to start. Ask
once, in one message:

- the command: `pnpm dev` (or `pnpm dev:edge`), and that it opens its own window;
- the exact steps: pin the extension from the toolbar's extensions menu, open the popup,
  the page to visit for the content script, what to click, in what order;
- where each kind of output is: the service worker's console from `chrome://extensions`
  → Developer mode → this extension → the "service worker" link (Inspect); a screen's
  from right-clicking the popup → Inspect; the content script's from the host page's own
  DevTools console;
- what to look at, item by item — for a screen, `designing-ui` › Reviewing a screen
  holds the list; for another language, the browser's language setting to change first;
- what to send back: a yes or no per item, the console lines that matter, and a
  screenshot of anything wrong.

Never load the build into the developer's own Chrome profile, and never suggest "Load
unpacked" there as a shortcut: their profile carries their accounts, their other
extensions, and their data, and a test extension's storage writes land in it.

## The evidence a pull request carries

Under the template's Test Plan, for each thing observed rather than asserted:

- the exact command, as run
  (`pnpm build && pnpm exec playwright test e2e/popup.spec.ts`);
- the tail of the output that shows the behavior — the passing test names, the console
  lines, the assertion that failed — not the whole log;
- which build it came from (the Chrome build, rebuilt after the last edit);
- a scratch spec's code, when the evidence came from one that was never committed;
- what a human saw, item by item, and "not checked" for anything nobody looked at.

Redact before pasting: a home directory path becomes `~/…`, a worktree path the
repository-relative one, and no extension ID from the owner's own browser appears.

## Cleanup

- No browser of yours is running: Playwright closes its context at the end of each test.
- A scratch spec is gone, and `git status --porcelain` shows only the change.
  `test-results/` and `playwright-report/` are ignored output; `pnpm clean` removes
  them.

## Checklist

- [ ] The narrowest test ran first; a browser ran only for what it cannot show.
- [ ] `pnpm build` ran after the last edit, in the same command as the suite.
- [ ] A lasting behavior is asserted by a committed spec, not only observed.
- [ ] A human was asked once, with a command, steps, where to look, and what to send
      back.
- [ ] Nothing touched the developer's own browser or profile.
- [ ] The pull request carries the commands and output tails, redacted.
