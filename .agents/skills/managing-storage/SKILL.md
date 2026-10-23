---
name: managing-storage
description: >
  Covers the storage schema in src/platform/storage.ts: adding a key with
  storage.defineItem, choosing the local, sync, session or managed area, its version and
  migrations, parsing what comes back instead of trusting it, and renaming or removing a
  key. Use when persisting a new value, changing a stored value's shape, bumping a
  version, writing or testing a migration with fakeBrowser and the key$ version meta
  key, hitting a storage.sync quota, a "Migration failed" or "Version downgrade
  detected" log, or deciding whether something may be stored at all.
---

# Managing Storage

**Owns:** every persisted key — its area, its shape, its `version` and `migrations` —
and how a stored value is read back. **Does not own:** how a screen renders a
`StoredValue` (`building-screens`); keeping a value in the service worker across events,
which only says "put it here" (`building-entrypoints`); a parse failure's error type
(`designing-errors`); the body and file of a storage test (`writing-tests`,
`placing-tests`); what the store's privacy disclosures say about stored data
(`releasing-to-stores`).

## One file is the schema

- Every key is a `storage.defineItem("<area>:<name>", …)` in `src/platform/storage.ts`
  and nowhere else. No other module calls `browser.storage.*` or defines a second item
  for the same key: two definitions with different `version`s each run their own
  migration against one value.
- The module exports a `StoredValue` or `WritableStoredValue` from
  `src/core/stored-value.ts`, not the WXT item, so `src/components/` renders it without
  naming a browser API and a component test hands it an in-memory one.
- A key is contract (AGENTS.md's "What is contract and what is private"): an update
  reads what the previous release wrote. A stored name is never edited in place; see
  "Renaming or removing a key" below.

## Choosing an area

| Area      | Use it for                                               | Limits and traps                                                                                                                                                                          |
| --------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `local`   | state this device owns; the default                      | 10 MB unless `unlimitedStorage`; cleared when the extension is removed; readable by content scripts                                                                                       |
| `sync`    | a small user preference that should follow the user      | 102,400 bytes total, 8,192 per item counting the key's length, 512 items, 120 writes a minute and 1,800 an hour; written by every signed-in device; behaves like `local` when sync is off |
| `session` | a value that must not outlive the browser session        | in memory, 10 MB; cleared when the extension is disabled, reloaded or updated and when the browser restarts; hidden from content scripts unless `setAccessLevel()` opens it               |
| `managed` | configuration an enterprise administrator sets by policy | read-only to the extension; needs a developer-defined schema                                                                                                                              |

Every figure in the table is from
https://developer.chrome.com/docs/extensions/reference/api/storage (checked 2026-10-23).
A value written on every user action belongs in `local`, because `sync`'s write quota is
counted per minute and per hour; `sync` is for what changes rarely and should follow the
user. In the sample, `clickCount` is the first kind and `settings` the second.

## Parse, don't trust

What comes back was written by a previous release, by another device running another
release (`sync`), by a user in DevTools, or by a migration that failed. So:

- Declare an item whose writer is not only this release as `defineItem<unknown>` and
  read it through a parser in `src/core/`, field by field with a default per field, as
  `parseSettings` does. One bad field then costs the user that field, not all of them,
  and the parser is a plain unit test.
- A `local` item only this extension writes may be typed, but the code that consumes it
  still tolerates nonsense, as `nextCount` does for a count that is not a safe integer.
- `watch` hands its listener the parsed value too. A raw value that reaches a component
  is a parse that was skipped.

## Never store a secret

Storage is not a vault: `local` and `sync` are readable by every content script, `sync`
copies a value to every device the user signs in on, and none of it is encrypted by the
extension. No credential, token or key goes in any area. If a feature looks like it
needs one, stop and ask — it is a product and a privacy-disclosure decision, not a
storage choice. AGENTS.md's "Security and human approval" holds the related rule that
nothing secret is bundled either.

## Changing a shape: version and migrations

1. Prefer a change that needs no migration: a new field the parser defaults when it is
   missing is readable by every release, old and new.
2. Otherwise bump `version` by one and add
   `migrations: { [newVersion]: (old) => next }`. Keep every earlier migration: a user
   who skipped releases runs each step in order.
3. Write the migration as a pure function of the old value that accepts anything — reuse
   the parser of the old shape — and touches no browser API. It may run in more than one
   context at once, each starting from the same old value.
4. Update the type, the parser and the writers, then the test below.

How `@wxt-dev/storage` 1.3.0 behaves (observed in its `dist/index.mjs` and with a
fakeBrowser probe, 2026-10-23):

- The version lives beside the value under the key `<name>$` as `{ v: <version> }`
  (`settings$` for `sync:settings`). A value with no meta key counts as version 1.
- The migration runs when `defineItem` executes — when `storage.ts` is first imported in
  each context — and every get and set awaits it.
- A `version` bump with no `migrations` option is silently a no-op: nothing migrates and
  no meta is written.
- A migration that throws is logged as `Migration failed` and the old value stays, so
  the reader must still survive the old shape.
- A stored version above the item's logs `Version downgrade detected` and migrates
  nothing. A rollback build meets this; `releasing-to-stores` owns rollback, and this is
  why a shape change should leave the previous release able to read what the new one
  writes.
- A `sync` item stays mixed: a device still on the old release writes the old shape
  under a meta key a newer device already set to the new version, so no migration runs
  on it. The parser of a `sync` item accepts every shape it ever had.

Never lower a `version` and never reuse a number.

## Renaming or removing a key

A migration belongs to one key and cannot read another, so a rename is a new item plus a
one-time move: a `runtime.onInstalled` listener with `reason === "update"`, registered
synchronously in `startBackground()`, reads the old key, writes the new one through the
parser, and removes the old one. Removing a key is the same listener without the write.
In both cases leave a comment in `storage.ts` naming the retired key so nobody reuses it
for a different shape. A `sync` key is the exception to removing at once: deleting it on
an updated device deletes it for every device, including those still on the release that
reads it, which then fall back to defaults. For a `sync` key, write the new key, keep
the old one and read both until the old release is gone; a stale `sync` key keeps
counting against the quota until then. **REQUIRED:** `building-entrypoints` for the
listener.

## Testing

- `tests/storage.test.ts` is the pattern for a key: `fakeBrowser.reset()` in
  `beforeEach`, then assert both the item's value and the raw area through
  `fakeBrowser.storage.<area>.get`, and a case that seeds a malformed value and expects
  the parsed default.
- A migration test seeds the old shape and its meta key, then imports `storage.ts` after
  seeding — a static import has already migrated empty storage and proves nothing. The
  worked test and its cases are in
  [the migration test reference](references/migration-test.md).

AGENTS.md's "Validating a change" names the command. **REQUIRED:** `writing-tests` for
the bodies, `placing-tests` if the test is a new file.
