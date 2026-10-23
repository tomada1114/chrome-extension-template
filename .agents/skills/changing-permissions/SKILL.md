---
name: changing-permissions
description: >
  Covers the manifest's consent surface: permissions, optional_permissions,
  host_permissions, optional_host_permissions, content-script matches,
  web_accessible_resources, externally_connectable and content_security_policy in
  wxt.config.ts or an entrypoint, and the EXPECTED_CONSENT literal in
  tests/manifest.test.ts. Use when a feature seems to need a new permission or site
  access, when choosing between activeTab, permissions.request and a required grant,
  when pnpm test:manifest fails, or when writing the Chrome Web Store single-purpose and
  permission-justification text.
---

# Changing Permissions

**Owns:** every field of the built manifest a user is asked to accept, the
`EXPECTED_CONSENT` literal that pins it, the choice of the narrowest grant, and the
permission-justification rows of `docs/store-listing.md`. **Does not own:** writing the
content script or handler that uses a grant (`building-entrypoints`); the privacy
disclosures, the policy text and submitting the result (`releasing-to-stores`); the
manifest suite as a gate (`changing-gates`); the body of a test (`writing-tests`).

## The agent proposes; a human approves

AGENTS.md's "Security and human approval" makes a new permission, host permission or
content-script match a human's sign-off, given for that change. A sign-off for one grant
covers no other. Before editing anything, put the proposal in the reply:

- the exact manifest diff, as `EXPECTED_CONSENT` would read after it;
- the warning it shows, or "no warning", and whether it therefore disables the extension
  for existing users until they accept it (see "What a user sees" below);
- the narrower options from the ladder below and why each falls short;
- the justification sentence for the store, and how the grant serves the single purpose
  in AGENTS.md's Product section. A grant that serves no part of it is the wrong change.

Then stop until the human says yes. Removing a permission or narrowing a pattern asks
nothing new of anyone and needs no sign-off, but it still updates the literal and the
justification table, and the pull request says so.

## Where each field comes from

| Manifest field                                      | Written by                                                                                        |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `permissions`                                       | `manifest.permissions` in `wxt.config.ts`; WXT adds `sidePanel` for a `sidepanel` entrypoint      |
| `optional_permissions`, `optional_host_permissions` | `wxt.config.ts`                                                                                   |
| `host_permissions`                                  | `wxt.config.ts`; WXT moves a content script's `matches` here under `registration: "runtime"`      |
| `content_scripts[].matches`                         | each `defineContentScript` under `src/entrypoints/`                                               |
| `web_accessible_resources`                          | `wxt.config.ts`; WXT adds one per content script with `cssInjectionMode: "ui"` and a stylesheet   |
| `externally_connectable`                            | `wxt.config.ts`; lets named web pages or extensions message this one, which is input from outside |
| `content_security_policy`                           | absent, so Manifest V3's default applies; the suite pins its absence                              |

The WXT additions are observed in `node_modules/wxt/dist/core/utils/manifest.mjs` (WXT
0.21.4, 2026-10-23). `pnpm dev` adds `tabs`, `scripting`, a localhost host permission
and a looser CSP to the manifest it serves; none of it ships, and the suite reads only
the `pnpm build` output. That output is Chrome's: the Edge build comes from the same
config, but read `.output/edge-mv3/manifest.json` after `pnpm build:edge` whenever an
option is set per browser.

## The narrowest grant that works

Take the first rung that serves the feature:

1. **No permission.** Messaging, `i18n`, `runtime` and the toolbar `action` need none.
2. **`activeTab`.** Temporary access to the tab the user is on, granted when they invoke
   the extension; it shows no warning. Paired with `scripting`, it injects on a click
   instead of declaring a content script on every visit.
3. **Optional, requested at the point of use.** Declare it under `optional_permissions`
   or `optional_host_permissions` and call `browser.permissions.request` from inside the
   click handler of the control that needs it — "Permissions must be requested from
   inside a user gesture" — never at startup and never from the service worker. Handle a
   refusal, check `permissions.contains` before use, and expect the user to revoke it
   later. `debugger`, `declarativeNetRequest`, `devtools`, `geolocation`, `mdns`,
   `proxy`, `tts`, `ttsEngine` and `wallpaper` cannot be optional
   (https://developer.chrome.com/docs/extensions/reference/api/permissions, checked
   2026-10-23).
4. **Required, as narrow as it can be written.** One host, `https` only, a path when the
   feature lives under one; a content script's `matches` the same. `<all_urls>`,
   `*://*/*` or a wildcard host is a product decision for the human, never a convenience
   — reviews "may take longer for extensions that request broad host permissions"
   (https://developer.chrome.com/docs/webstore/review-process, checked 2026-10-23).

## What a user sees

- `storage`, `activeTab`, `scripting`, `alarms`, `contextMenus`, `sidePanel` and
  `unlimitedStorage` show no warning; `tabs` warns "Read your browsing history" and
  `notifications` "Display notifications" (the full list is
  https://developer.chrome.com/docs/extensions/reference/permissions-list, checked
  2026-10-23).
- When an update adds a permission that warns, "the extension will be disabled until the
  user accepts the new permission"; adding or changing a pattern in `host_permissions`
  or `content_scripts.matches` is named as such a change
  (https://developer.chrome.com/docs/extensions/develop/concepts/permission-warnings and
  https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions,
  checked 2026-10-23).
- A grant with no warning still changes `EXPECTED_CONSENT` and the store's justification
  list; it just does not disable anyone.
- The authoritative warning text comes from packing the build and installing the `.crx`,
  or from Chrome's extension update testing tool, both described on the
  permission-warnings page. Each opens a browser, so it is the human's step;
  `running-the-extension` owns that hand-off.

## The procedure, once approved

1. Edit `wxt.config.ts` or the content script's `matches`.
2. `pnpm build`, then read `.output/chrome-mv3/manifest.json`. If the build added
   anything the human did not approve — a WXT addition from the table above — stop and
   ask again.
3. Update `EXPECTED_CONSENT` in `tests/manifest.test.ts` to the approved value,
   literally. The literal is the point: it puts the consent change in the diff a
   reviewer reads. Never loosen the assertion instead.
4. `pnpm test:manifest`, then `pnpm test:e2e`, with a spec under `e2e/` for a new site
   or optional grant.
5. Update `docs/store-listing.md`: one justification row per permission and per host
   pattern, matching the new manifest, and the single-purpose line if it moved. The
   Chrome Web Store asks for a justification per permission and warns that "requesting
   broader permissions than necessary may cause your extension to be rejected"
   (https://developer.chrome.com/docs/webstore/cws-dashboard-privacy, checked
   2026-10-23); Edge's Partner Center asks the same per permission
   (https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/publish-extension,
   checked 2026-10-23).
6. If the grant lets the extension read page content or browsing activity, the data-use
   disclosures and `docs/privacy-policy.md` change too. **REQUIRED:**
   `releasing-to-stores`.
7. The pull request body names the consent change in one line and says whether it
   disables the extension for existing users.

The store judges every grant against one sentence: "An extension must have a single
purpose that is narrow and easy to understand"
(https://developer.chrome.com/docs/webstore/program-policies/quality-guidelines, checked
2026-10-23).
