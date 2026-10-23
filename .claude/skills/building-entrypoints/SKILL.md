---
name: building-entrypoints
description: >
  Covers adding or changing a WXT entrypoint under src/entrypoints/ (background.ts,
  content.ts, popup/, options/, sidepanel/), the service worker logic in src/background/
  and startBackground(), the content script logic in src/content/ and ctx.onInvalidated
  cleanup, styled in-page UI through createShadowRootUi, and a message in ProtocolMap in
  src/platform/messaging.ts. Use when a listener misses the event that woke the worker,
  module state vanishes between events, a content script leaves a second copy behind
  after an update, or a handler must validate what a page sent.
---

# Building Entrypoints

**Owns:** what goes in a file under `src/entrypoints/` and what it delegates, the
service worker's lifecycle rules, the content script's rules for a page it does not own,
and the procedure for adding a message to `ProtocolMap`. **Does not own:** what a popup
or options screen renders (`building-screens`); a stored key or its migration
(`managing-storage`); anything that changes the manifest's consent surface, including a
content script's `matches` (`changing-permissions`); a UI string (`localizing-ui`); an
error type or `ERR_*` code (`designing-errors`); the body and the file of a test
(`writing-tests`, `placing-tests`).

## An entrypoint is wiring

- WXT finds an entrypoint by its path, and an unrecognised name is not an error: any
  other `*.html` becomes an unlisted page and any other `*.ts` an unlisted script, so a
  misspelled `sidepanal/index.html` builds cleanly and never reaches the manifest. The
  recognised names are `PATH_GLOB_TO_TYPE_MAP` in
  `node_modules/wxt/dist/core/utils/building/find-entrypoints.mjs` (observed, WXT
  0.21.4, 2026-10-23); read the built `.output/chrome-mv3/manifest.json` after adding
  one.
- Auto-imports are off, so every helper is a written import: `defineBackground` from
  `wxt/utils/define-background`, `defineContentScript` from
  `wxt/utils/define-content-script`, `defineUnlistedScript` from
  `wxt/utils/define-unlisted-script`, `browser` from `wxt/browser`. Storage, messaging
  and i18n are reached through `src/platform/`, never through `wxt/utils/storage` or
  `#i18n` directly from an entrypoint.
- The file only connects a context to its zone: the service worker's logic lives in
  `src/background/`, the content script's in `src/content/`, a screen's components in
  `src/components/`, and anything pure in `src/core/`. Logic left in the entrypoint can
  only be tested in a browser. Enforced by: `eslint.config.mjs`
  "src/entrypoints-stay-thin", and the zone order by its `no-restricted-imports` blocks
  plus `tests/boundaries.test.ts`.
- `src/content/` and `src/background/` name no React. A content script that renders
  React mounts a component from `src/components/` from the entrypoint itself, the one
  zone allowed to name both.

## Entrypoint options that change the consent surface

Several WXT options write into the manifest a user consents to. Each one makes
`tests/manifest.test.ts` fail until `EXPECTED_CONSENT` is updated, and that update needs
a human's sign-off. **REQUIRED:** `changing-permissions` before landing any of these
(observed in `node_modules/wxt/dist/core/utils/manifest.mjs`, WXT 0.21.4, 2026-10-23):

| What you add                                   | What lands in the manifest                                 |
| ---------------------------------------------- | ---------------------------------------------------------- |
| a content script, or a change to its `matches` | `content_scripts[].matches`: host access on those sites    |
| `registration: "runtime"` on a content script  | its `matches` move into `host_permissions`                 |
| `cssInjectionMode: "ui"` with a CSS import     | a `web_accessible_resources` entry for the matched origins |
| a `sidepanel` entrypoint                       | the `sidePanel` permission                                 |

`world: "MAIN"`, `allFrames` and `matchOriginAsFallback` widen what a content script
reaches without touching a field the suite pins; propose them the same way. `pnpm dev`
adds `tabs`, `scripting`, a localhost host permission and a relaxed CSP to the manifest
it serves. They never ship, which is why the manifest suite reads the `pnpm build`
output only; never judge consent from a dev build.

## The service worker

- **Register synchronously.** Every listener is added inside `startBackground()` in
  `src/background/index.ts`, before its first `await`; the TSDoc there says why. A new
  listener pushes its remover onto `stops`, so the function `startBackground()` returns
  removes it again. The worker never calls that function; a test does, so each test
  starts from a worker with no listeners.
- **No module state.** Chrome may stop the worker after 30 seconds without events, and
  "any global variables you set will be lost"
  (https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle,
  checked 2026-10-23). A value that must outlive one event is a stored item
  (**REQUIRED:** `managing-storage`); a cache in a module variable is a value that is
  sometimes there.
- **Assume the handler is cut off mid-way.** Write the new state in one storage write
  rather than across several awaited steps a stop could separate, and make a handler
  safe to run twice.
- A timer does not survive the worker either. Reaching for `chrome.alarms` instead adds
  the `alarms` permission, which is a consent-surface change.

## The content script

- **The page is input.** Its DOM, its globals and its events are someone else's. Read
  them as untrusted data and write into the page with `createElement` and `textContent`
  only. Enforced by: `eslint.config.mjs`, which bans `innerHTML`, `insertAdjacentHTML`,
  `dangerouslySetInnerHTML`, `eval` and `new Function` across `src/`. Stay in the
  default isolated world; `world: "MAIN"` runs beside the page's own scripts with no
  extension APIs and is a consent change.
- **Every effect has an undo, handed to the context.** A function that changes the page
  returns the function that reverses it, and the entrypoint passes it to
  `ctx.onInvalidated`, as `mountMarker` does. Use `ctx.setTimeout`, `ctx.setInterval`
  and `ctx.addEventListener` over the window's own; they clear themselves. An update
  orphans the previous release's script in every open tab: its page changes stay, and
  WXT invalidates its context once `browser.runtime.id` is gone or a newer copy starts
  in the same page (observed in
  `node_modules/wxt/dist/utils/content-script-context.mjs`, 2026-10-23). That is also
  why `mountMarker` first removes a marker an older copy left.
- **`matches` is consent.** Keep the narrowest pattern that serves the feature; widening
  it is `changing-permissions`' procedure, not an edit here.
- **Styled UI goes in a shadow root.** When a content script needs more than a
  `textContent` node, use `createShadowRootUi` from
  `wxt/utils/content-script-ui/shadow-root` with `cssInjectionMode: "ui"`, so the page's
  CSS cannot restyle it and its CSS cannot leak into the page. The shadow root isolates
  styles, not trust: the page can still read and dispatch events into it, so nothing
  private is rendered there. The `"ui"` mode is also the row in the table above that
  adds `web_accessible_resources`.

## Adding a message

1. Declare it in `ProtocolMap` in `src/platform/messaging.ts` with a one-line TSDoc: the
   parameter is what the sender passes, the return type what the handler answers.
2. Write the handler in `src/background/` and register it in `startBackground()` with
   `onMessage`, pushing its remover onto `stops`. `@webext-core/messaging` allows one
   listener per message type per context, and a send with no listener rejects.
3. If a content script can send it, the handler treats `data` as `unknown` and parses it
   (shape, type, bounds) before acting, and checks `sender`. `sender.tab` alone does not
   identify a page: the options page opens in a tab too, so compare `sender.url` against
   `browser.runtime.getURL("/")` when only extension pages may send it.
4. The protocol is contract (AGENTS.md's "What is contract and what is private"). Change
   it additively: add a new message rather than changing what an existing one carries,
   and keep the parse of step 3 tolerant of the shape the previous release sent.
5. A screen sends the message; it never imports `src/background/`. Enforced by:
   `tests/boundaries.test.ts`.

## What each change owes a test

| Change                              | Test                                                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| a handler or listener in the worker | a unit test on `fakeBrowser` like `tests/background.test.ts`: `fakeBrowser.reset()` first, `stop = startBackground()`, `stop()` after |
| a message                           | the same file: `sendMessage` from the test reaches the handler; add a malformed-input case for a content-script sender                |
| content-script DOM logic            | a jsdom unit test like `tests/marker.test.ts`, including a hostile string rendered as text                                            |
| invalidation cleanup                | `new ContentScriptContext("content")` from `wxt/utils/content-script-context`, then `ctx.notifyInvalidated()`                         |
| a new or rewired entrypoint         | a spec under `e2e/` on the fixtures in `e2e/fixtures.ts`; route the host page with `context.route` so it runs offline                 |

`tests/browser-setup.ts` is what lets a test's `sendMessage` reach a listener: it points
the `chrome` global `@webext-core/messaging` uses at the same `fakeBrowser`. AGENTS.md's
"Validating a change" names the narrowest command per change. **REQUIRED:**
`writing-tests` for the bodies and `placing-tests` for a new file.
