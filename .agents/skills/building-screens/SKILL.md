---
name: building-screens
description: >
  Covers the states the popup or the options page renders and a test covers - loading
  while useStoredValue or useStoredState returns undefined, a failed storage write or a
  rejected sendMessage, an empty state - and the accessibility each owes: accessible
  names from the catalog, keyboard reach, focus, live regions, nothing by color alone,
  getByRole queries. Also the popup's facts: destroyed on close, a small fixed width,
  browser.runtime.openOptionsPage. Use when building or reviewing a screen under
  src/entrypoints/popup/ or options/, or a component under src/components/.
---

# Building Screens

**Owns:** which states the popup and the options page render, what the popup's lifetime
and size mean for a screen, and what a screen owes a reader who does not use a mouse or
does not see the color. **Does not own:** the entrypoint wiring, messages and the
service worker (`building-entrypoints`); a stored key and its shape
(`managing-storage`); the tokens, focus ring, motion, contrast and the human review
(`designing-ui`); the catalog keys a screen reads (`localizing-ui`); the body and file
of the tests below (`writing-tests`, `placing-tests`); the order of work (`tdd`).

A screen that renders only its happy path passes every gate here. No test fails because
a write was never announced or a disabled button never re-enabled, and nothing renders a
default error page for an extension screen: a failure the screen does not handle is a
click that silently did nothing. So list the states before the first line of markup, and
give each one a test.

## How a screen is put together

The entrypoint (`src/entrypoints/<screen>/main.tsx`) is wiring: it reads the catalog
with `i18n.t`, subscribes to storage through the hooks in `src/components/hooks/`, and
hands strings, values and callbacks to a component under `src/components/`. The
component names no browser API and no catalog — AGENTS.md's Architecture forbids it — so
every label is a prop and every action is a callback. That is what lets a component test
render each state with plain values. `src/entrypoints/popup/main.tsx` and
`src/components/count-panel.tsx` are the worked pair.

## The states

| State         | Where it comes from                                                     | What the screen renders                                                   |
| ------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Loading       | `useStoredValue` / `useStoredState` return `undefined` until first read | the region marked busy, its controls disabled                             |
| Ready         | the hook returns a value                                                | the screen                                                                |
| Empty         | a ready value with nothing in it                                        | a sentence saying so, and the action that creates the first item          |
| Failed action | a rejected `sendMessage(...)` or `WritableStoredValue.set(...)`         | the input kept, a `role="alert"` message from the catalog, control usable |

## Loading

- `undefined` is the loading value, not a missing one: `useStoredValue` returns it until
  the first `get()` resolves, and a component's prop type says so
  (`count: number | undefined`). Never render it as `0`, `false` or an empty list — a
  checkbox that reads `false` while loading is a setting the reader thinks is off.
- Mark the region busy (`aria-busy`) and disable the controls that would act on the
  unread value. `CountPanel` does both, and its test asserts both. `SettingsForm` only
  disables its checkbox, which still renders unchecked while loading: a native two-state
  checkbox has no "unknown" look, so a setting that must not read as off while loading
  needs a different control or a busy region around it.
- A storage read on a screen is short, so no spinner: the busy region shows a
  placeholder glyph and nothing moves. `designing-ui`'s craft rules hold the one shared
  inline status a longer wait uses.
- The hooks do not report a failed read: a `get()` that rejects leaves the value
  `undefined`, which renders as loading forever. A screen whose read can fail — one that
  parses data it does not control — needs a distinguishable failed state, which means
  extending the hook, not catching inside a component.

## Failed action

A screen's action reaches the service worker by message or writes storage directly, and
neither failure is visible by default:

- `useStoredState` drops a pending edit whose `set()` rejects, so the control snaps back
  to the stored value with no word said.
- `sendMessage(...)` is a promise. The template's popup discards it with `void`, so a
  handler that throws, or a service worker that is mid-update, fails silently.

A screen that must explain a failure has three duties:

- **Keep the input.** A failure never clears a field or closes the screen; the reader
  fixes or retries what they did.
- **Say why, from the catalog.** Branch on an error code, never on a message: map each
  code to a message key with an `as const satisfies` table, so a new code fails to
  compile until it has copy. **BACKGROUND:** `designing-errors` for why a message is not
  a contract.
- **Announce it.** Render the message in a `role="alert"` region beside the control, and
  re-enable the control. Do not move focus to the message; the alert is read where focus
  already is.

## Empty

Empty is a ready state, not a loading or a failed one: it says there is nothing yet and
offers the following action — the control that creates the first item, or a link to
where items come from. A blank region with no sentence is the failure.

## The popup is not a page

- **It is destroyed on close.** Every close throws away its React tree, its state and
  any promise still pending. It closes as soon as focus leaves it, and "there is no way
  to keep the popup open after the user has clicked away"
  (<https://developer.chrome.com/docs/extensions/develop/ui/add-popup>, checked
  2026-10-23). State the reader expects to find again lives in storage
  (`managing-storage`), and work that must finish runs in the service worker, started by
  a message (`building-entrypoints`). `e2e/popup.spec.ts` asserts the reopened popup
  reads the stored count, not a fresh one.
- **It is small and sized to its content,** within the bounds Chrome sets ("between
  25x25 and 800x600 pixels",
  <https://developer.chrome.com/docs/extensions/reference/api/action>, checked
  2026-10-23). Give its root a fixed width — `CountPanel`'s `main` does — so the popup
  does not resize as a value loads or a message appears; a resizing popup jumps under
  the pointer. Width and density are `designing-ui`'s.
- **Open the options page with `browser.runtime.openOptionsPage()`,** from the
  entrypoint, passed to the component as a callback. It opens the page the manifest
  declares, in a tab because `src/entrypoints/options/index.html` carries
  `manifest.open_in_tab`. Never hard-code a `chrome-extension://` URL.
- The options page is an ordinary tab with the room of one; its states are the same
  table above.

## Accessibility

What follows is what a rendered test can check. Contrast is measured, not judged —
**REQUIRED:** `designing-ui` › Measuring contrast. Focus ring, reduced motion and the
popup's width are its craft rules, and only its review sees them.

- **Every control has an accessible name.** Prefer visible text: a `<label>` tied to its
  field with `useId` (as `SettingsForm` does), a button's own words. A control with no
  visible text — an icon button — takes an `aria-label`, passed in as a prop from the
  catalog. A placeholder is not a label.
- **Native elements first.** `<button>` for an action, `<a>` for navigation, `<input>`
  with a `<label>` for a field. They are keyboard-reachable and announce their role for
  free; a `<div onClick>` is neither. Never set a positive `tabIndex`.
- **A value that changes is announced.** `<output>` carries the implicit `status` role
  and `aria-live="polite"` makes the update read without moving focus — `CountPanel`'s
  count is the example, and `e2e/popup.spec.ts` finds it by that role.
- **Structure a reader can navigate.** One `<h1>` per screen, headings in order, and a
  `<main>` landmark, as both screens use them.
- **Nothing by color alone.** A status, an invalid field or the current item carries a
  word, an icon with a name, or `aria-current`/`aria-invalid` beside its color.
- **The document language.** Both `index.html` files hard-code `<html lang="en">`, which
  is wrong for a reader on another catalog; a screen with real prose sets
  `document.documentElement.lang` from `main.tsx` beside `document.title`. A fragment in
  another language sets its own `lang`.
- **The page title** is set from the catalog in `main.tsx`, because `__MSG_*__` does not
  resolve in HTML. **BACKGROUND:** `localizing-ui`.

## Strings

Every string a state renders comes from a catalog — the loading label, the error copy,
the empty sentence and its action, every `aria-label`. A hard-coded English fallback is
the bug this skill exists for, not a placeholder. **REQUIRED:** `localizing-ui` for
adding the key to every catalog.

## Verifying a screen

- One component test per state, under jsdom, rendering the component with plain props:
  `count: undefined` for loading, a value for ready, an empty value, and a callback that
  rejects for a failed action. Query by role and accessible name —
  `getByRole("button", { name: "…" })`, `getByRole("status")`, `getByRole("alert")`. A
  query that finds the element by class or test id proves nothing about its name.
  `tests/count-panel.test.tsx` is the example. **REQUIRED:** `writing-tests`.
- The wired screen — the entrypoint, the real storage and the service worker behind it —
  is checked by `pnpm build && pnpm test:e2e`. A spec opens the screen as a tab at
  `chrome-extension://<id>/popup.html` and reads each name from `src/locales/en.json`,
  never a literal. A tab is not a popup: neither its size bounds nor its closing on blur
  are exercised there.
- jsdom computes no layout, focus ring or contrast. Those are `designing-ui`'s
  "Reviewing a screen", the agent part and the human part.

## Checklist

- [ ] Loading, empty and every failed action render, and each has a test.
- [ ] `undefined` renders as loading, never as a default value.
- [ ] A failed action keeps the input and announces catalog copy in `role="alert"`.
- [ ] Popup state that must survive a close is in storage; long work is in the service
      worker.
- [ ] Every control has an accessible name from the catalog and is a native element.
- [ ] No state is shown by color alone.
- [ ] Every new string is in every catalog.
- [ ] `designing-ui`'s review ran, and the pull request says what was not reviewed.
