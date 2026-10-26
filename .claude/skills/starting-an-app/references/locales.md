# Locale checklist

## The locale decision

The template ships `en` and `ja`. Keeping both costs little and is the default; the
other choices are dropping one or adding another. The locale a reader sees is the
browser's UI language, not a choice inside the extension, so a locale kept is one every
reader with that browser language gets. **BACKGROUND:** `localizing-ui` › Which locale
renders.

Each catalog is also a store listing locale (`localizing-ui` › The store listing).
Keeping a locale means keeping that listing true, the dashboard's per-locale description
and screenshots included.

## Dropping `ja`

- Delete `src/locales/ja.json`. Nothing under `src/` lists the locales, so no module
  changes; `tests/locales.test.ts` reads the directory and drops the locale with it.
- Delete the inventory rows `tests/placeholders.test.ts` holds for that catalog. Its
  needles stay in `PLACEHOLDERS`, where a needle that matches nothing contributes no
  row.
- AGENTS.md's Conventions names `src/locales/ja.json` as the case of a non-English
  committed file; rewrite that sentence around the catalogs that remain.
- Remove the language from the store dashboard's listing, per `releasing-to-stores`.

## Dropping `en`

`en` is `default_locale` in `wxt.config.ts`, the catalog `#i18n` is typed against, and
the one `e2e/` reads its expected strings from, because the suite's Chromium runs an
English UI. Dropping it means choosing a new default, changing `default_locale`, the
locale test's `DEFAULT_LOCALE`, and every `e2e/` import of `en.json` — and the suite
then needs its Chromium launched in that language. That is a design decision for a
human, not a rename step; ask before starting it.

## Adding a locale

**REQUIRED:** `localizing-ui` › Adding a locale. Give the new catalog's `extName` and
`extDescription` the extension's real name and description in that language — a copied
English value passes every check and ships an untranslated listing.

## Checks

```bash
pnpm exec wxt prepare
pnpm exec vitest run tests/locales.test.ts tests/placeholders.test.ts
pnpm typecheck
pnpm build && pnpm build:edge && pnpm test:manifest && pnpm test:e2e
```
