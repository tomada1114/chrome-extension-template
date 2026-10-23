---
name: localizing-ui
description: >
  Covers the message catalogs under src/locales/ in @wxt-dev/i18n's nested format and
  how they reach the extension through chrome.i18n: adding or renaming a key in every
  catalog, wxt prepare and the generated #i18n types, $1 and named substitutions, plural
  forms, __MSG_extName__ in the manifest, the locale following the browser's UI
  language, the store listing's per-locale name and summary, and adding a locale. Use
  when editing a catalog, touching src/platform/i18n.ts, calling i18n.t, when a type
  error names #i18n, or when the console warns "[i18n] Message not found".
---

# Localizing UI

**Owns:** what goes into a message catalog and how a string reaches the code that
renders it — `src/locales/*.json`, `src/platform/i18n.ts`, the generated `#i18n` module,
the manifest's `__MSG_*__` strings, and adding a locale. **Does not own:** the
entrypoint that calls `i18n.t` and hands the string on (`building-entrypoints`); which
states a screen renders (`building-screens`); how a test is written (`writing-tests`)
and where it goes (`placing-tests`); the rest of the store listing
(`releasing-to-stores`); dropping a locale when turning the template into a new
extension (`starting-an-app`).

## A tree full of Japanese is not a violation

AGENTS.md's Conventions makes `src/locales/*.json` the one exception to the English-only
rule, and states the exception's own limit: it covers the catalogs' string values and
nothing else. Keys stay English, and so does every comment, test, and document about
them, bar the narrow case AGENTS.md spells out. That rule lives in AGENTS.md; this skill
only points at it.

The place it is easiest to break is a skill's own frontmatter. Enforced by:
`tests/skills-frontmatter.test.ts`, which rejects CJK in a `description`. A Japanese
example belongs in a fenced block in a body, never in a trigger string.

If the spell-checker ever fires on a catalog, fix the text; adding an exclusion to
`typos.toml` is weakening a gate.

## How a string reaches the screen

- **The catalog** is `src/locales/<locale>.json`, nested JSON: a first-level object
  groups the keys one context reads (`popup`, `options`, `content`), and the two
  top-level keys `extName` and `extDescription` are the manifest's.
- **`wxt prepare`** — run by `pnpm install`'s `postinstall`, and again by `pnpm dev` and
  `pnpm build` — reads the default locale's catalog and writes
  `.wxt/i18n/structure.d.ts`, which types `i18n.t` against its keys. A key added to
  `en.json` is unknown to `tsc` until it runs again: `pnpm exec wxt prepare`.
- **The build** compiles each catalog into `_locales/<locale>/messages.json`, flattening
  a dotted path to underscores (`popup.heading` becomes `popup_heading`).
- **At runtime** `i18n.t("popup.heading")` is `browser.i18n.getMessage` underneath:
  synchronous, no loading state, no bundle per screen. `src/platform/i18n.ts` re-exports
  it so every zone reaches the catalogs through one module. A component never calls it —
  it names no browser API — so the entrypoint reads the string and passes it as a prop
  (observed in `node_modules/@wxt-dev/i18n` 0.2.8, 2026-10-23).

## Adding a string

1. Add the key to `src/locales/en.json`. The default locale is the source of the type.
2. Add the same key to every other catalog, translated. Nothing in the type system sees
   a catalog other than the default; Chrome answers a key that catalog lacks with the
   default locale's text, so an omission ships English to a Japanese reader.
3. `pnpm exec wxt prepare`, then call `i18n.t("namespace.key")` from the entrypoint.

Then `pnpm exec wxt prepare && pnpm exec vitest run tests/locales.test.ts`, and
`pnpm typecheck`. `tests/locales.test.ts` holds every catalog to exactly the default
locale's keys, each a non-empty string; `tsc` holds every `i18n.t` call to a key the
default locale defines.

Key names are camelCase letters and digits. Never put an underscore in one: the build's
flattening means `popup.heading` and a top-level `popup_heading` become the same message
name, and one silently replaces the other.

**A string that renders empty, or the console line
`[i18n] Message not found: "<key>"`,** means the key is missing from the compiled
catalog Chrome picked — usually a catalog edited without a rebuild, or a key renamed in
one catalog only. Run the locale test first; it names the key.

## Substitutions and plurals

- A positional argument is `$1` to `$9`, passed as an array: `i18n.t("key", [name])`. A
  named one is `{name}`, passed as an object. `$$` is a literal dollar sign.
- Every catalog's version of a key must ask for the same arguments. **Nothing checks
  this** — the generated type counts the default locale's only, and the locale test
  compares keys, not values — so a translation that drops `$1` silently drops the value
  in that one locale. Read each changed key across all catalogs before committing.
- A plural is an object whose keys are `0`, `1` and `n`, and `i18n.t("key", count)`
  picks the branch: `0` and `1` for those counts, `n` for every other. There is no `few`
  or `many`; a language that needs them does not fit this format
  ([README](https://github.com/wxt-dev/wxt/tree/main/packages/i18n#plural-forms),
  checked 2026-10-23).
- **Every catalog carries the same branches.** The locale test flattens a plural into
  `key.0`, `key.1`, `key.n`, so a Japanese catalog that drops the `1` branch it has no
  grammar for fails the key comparison. Write the same text in both branches instead:

  ```json
  "items": { "1": "$1 件", "n": "$1 件" }
  ```

- The count is substituted as `String(count)`, with no digit grouping. Format a number
  that can reach the thousands with `Intl.NumberFormat` and pass it as the substitution:
  `i18n.t("items", count, [formatted])`.

## Which locale renders

The browser's UI language picks the catalog: Chrome tries that locale, then its base
language, then `default_locale` (`en`, set in `wxt.config.ts`)
(<https://developer.chrome.com/docs/extensions/reference/api/i18n>, checked 2026-10-23).
The reader changes it by changing the browser's language; there is no in-app switcher
and `i18n.t` cannot provide one. A language setting inside the extension would mean
loading catalogs at runtime with another library — a dependency and a design decision
for a human, not an edit here.

`@@ui_locale` and the other `@@` predefined messages are typed keys too
(`.wxt/i18n/structure.d.ts` lists them).

## `__MSG_*__` and the manifest

`__MSG_name__` resolves only in `manifest.json` and in the extension's CSS files
(<https://developer.chrome.com/docs/extensions/reference/api/i18n>, checked 2026-10-23).
`wxt.config.ts` uses it for the manifest's `name`, `description` and the action's
`default_title`, through the top-level keys `extName` and `extDescription`; a nested key
would be spelled with underscores there, so keep these two at the top. It does **not**
resolve in HTML: each screen's `<title>` is empty in `index.html` and set from
`main.tsx` with `document.title = i18n.t("extName")`.

Renaming `extName` or `extDescription` is a manifest change: edit `wxt.config.ts` in the
same commit, then `pnpm build && pnpm test:manifest`.

## The store listing

The store dashboard's listing tab asks only for what "isn't included in the metadata of
the manifest", and each listing locale "corresponds to one of the `_locales/LOCALE_CODE`
directories included in the extension"
(<https://developer.chrome.com/docs/webstore/cws-dashboard-listing>, checked
2026-10-23). So each catalog's `extName` and `extDescription` are that locale's store
name and summary — write them for a store reader in that language. The store limits
their length at upload, not at build; `tests/locales.test.ts` pins those limits for
every catalog, so read them there. The long description, screenshots and video are
entered per locale in the dashboard: **BACKGROUND:** `releasing-to-stores`.

## Adding a locale

1. Add `src/locales/<locale>.json` with every key `en.json` holds, translated. The file
   name is a Chrome locale code; `pt-BR.json` and `pt_BR.json` both compile to
   `_locales/pt_BR/`, and the build warns about a code Chrome does not support (observed
   in `node_modules/@wxt-dev/i18n` 0.2.8, 2026-10-23).
2. Give `extName` and `extDescription` real values for that store listing, within the
   test's limits.
3. Run the checks below. Nothing else names a locale: no list in `src/` to extend.

**REQUIRED:** `starting-an-app` for _dropping_ a locale; it owns that list.

## What to run

```bash
pnpm exec wxt prepare                          # regenerate #i18n after any key change
pnpm exec vitest run tests/locales.test.ts     # catalogs against the default locale, store limits
pnpm typecheck                                 # every i18n.t call against the default locale
pnpm build && pnpm test:e2e                    # only if a screen or the manifest changed
```

The end-to-end suite runs Chromium with an English UI, so it checks the default catalog
only. Nothing checks that a string reads correctly in another locale; that needs a human
with the browser set to it — **REQUIRED:** `running-the-extension` for the hand-off.
