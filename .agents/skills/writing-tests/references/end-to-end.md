# Writing an end-to-end spec

A spec under `e2e/` loads the production build into Playwright's bundled Chromium and
drives it the way a user would. It is the only test that sees the manifest WXT
generated, the real message channel between two contexts, and a content script injected
into a page. Everything an in-process test can assert stays in-process; a spec covers
the wiring between contexts, not the behavior each one already has a unit test for.
Which suite a test belongs in is `placing-tests`'.

## The fixtures

Import `test` and `expect` from `./fixtures`, never from `@playwright/test` directly —
`e2e/fixtures.ts` is what loads the extension. It gives each test three fixtures:

- **`context`** — a persistent browser context with its own throwaway profile and the
  built extension loaded. Every test gets a fresh one, so storage, a service-worker
  state or a granted permission never leaks between tests. Open pages with
  `context.newPage()`.
- **`serviceWorker`** — the extension's running service worker. `serviceWorker.evaluate`
  runs a function inside it, which is how a spec reads state no page renders: the badge
  text, a stored value. The function runs in the worker, so its `chrome` global is the
  real one; a spec that names it carries `/// <reference types="chrome" />` for the type
  only, as `e2e/popup.spec.ts` does.
- **`extensionId`** — the ID Chromium assigned this load. A screen is reached at
  `chrome-extension://${extensionId}/<name>.html`, the file name WXT gives the
  entrypoint.

The fixture refuses to start without a build (`ERR_E2E_NO_BUILD`). It checks that one
exists, not that it is current: a `.output/chrome-mv3/` left from before the change
passes every assertion while proving nothing about it. Run `pnpm build` immediately
before the suite.

## A host page, served offline

A content script is tested against a page the spec serves itself:
`context.route("https://example.com/**", (route) => route.fulfill({ contentType: "text/html", body }))`
answers the navigation without the network, so the suite runs offline and the host page
is the same on every run. Route the URL patterns the script's `matches` names, and route
a second origin it does not match to prove the script leaves that page alone.
`e2e/content.spec.ts` is the model. Keep the served markup to what the assertion needs —
a real site's page is someone else's moving target.

## Waiting for browser state

Nothing in a spec sleeps. Assert on a locator with a web-first assertion
(`await expect(locator).toHaveText(...)`), which retries until it holds or times out.
For state no locator can see — what the service worker wrote, the badge — wrap the read
in a function and hand it to `expect.poll`:

```ts
const badgeText = (): Promise<string> =>
  serviceWorker.evaluate(() => chrome.action.getBadgeText({}));
await expect.poll(badgeText).toBe("1");
```

A popup is an ordinary page here, not the toolbar popup a user clicks open: the spec
navigates to its URL, and `page.reload()` stands in for a user closing and reopening it,
which is what proves a value came back from storage rather than from memory.

## What to assert

- Query by role and accessible name, the same as a component test. A name a spec matches
  is the `en` catalog's text, which is what `e2e/popup.spec.ts` matches today; a spec
  that depends on the browser's locale says so.
- One user-visible flow per `test`, named after what the user observes.
- Prefer one assertion on the outcome the user sees to a chain of intermediate ones —
  the in-process suites already pinned each step.

## Running it

```bash
pnpm e2e:browsers                                    # once per machine
pnpm build && pnpm exec playwright test e2e/<name>.spec.ts
```

`playwright.config.ts` keeps a trace on failure (`trace: "retain-on-failure"`), and CI
uploads `playwright-report/` and `test-results/` when the job fails; open the trace
rather than re-running with sleeps added. The suite runs headless and closes its own
browser — never point it at the developer's Chrome profile. A question only a person
looking at a window can settle is `running-the-extension`'s hand-off, not a spec.
