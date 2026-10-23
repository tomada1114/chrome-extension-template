---
name: starting-an-app
description: >
  Covers turning this template into a new browser extension: the rename driven by
  tests/placeholders.test.ts, AGENTS.md's Product section and single purpose, replacing
  or deleting the sample counter, badge, settings and example.com content script, the
  icons in public/icon/ and the store images, keeping or dropping a locale, settling the
  design direction, the first permissions review, and the GitHub and store setup before
  the first release. Use when starting an extension from this repository, renaming the
  package, display name or repository slug, or removing the sample code.
---

# Starting an App

**Owns:** turning this repository into a new extension — the order of the steps, the
rename, what the new extension keeps, replacing the sample behavior, the icons, the
locale decision, and when the design direction and the store setup happen. **Does not
own:** how a skill is authored or mirrored (`authoring-skills`); the README's own prose
(`updating-docs`); what a gate file may contain (`changing-gates`); writing an
entrypoint (`building-entrypoints`); a stored key and its migration
(`managing-storage`); what a permission costs and the sign-off it needs
(`changing-permissions`); what a settled direction contains (`designing-ui`); the store
listing, credentials and release (`releasing-to-stores`).

There is deliberately no bootstrap script. What stands in for one is this procedure plus
`tests/placeholders.test.ts`, which holds the list a script would have hard-coded. Do
not introduce a script, a profile, or a self-deleting block.

## The order

1. **Agent:** rename using the identity inventory, before writing anything against the
   template's identity.
2. **Human:** settle what the extension is, who it is for, its single purpose, core
   actions and non-goals. **Agent:** fill AGENTS.md's Product section and remove its
   marker row.
3. **Agent:** replace the sample behavior with the extension's own, context by context,
   or delete a context the product does not need.
4. **Human:** supply the icon artwork. **Agent:** replace the placeholder icons.
5. **Human:** choose the locales. **Agent:** follow the locale checklist.
6. **Agent:** research the design options. **Human:** choose the direction before the
   first real screen. **Agent:** settle the lock and tokens and run their checks.
7. **Agent:** review the consent surface against the single purpose and propose the
   diff. **Human:** sign off on it.
8. **Human:** enable the repository's settings, create the `store-submission`
   environment, and make the first store upload. **Agent:** prepare the files and the
   package; settings and store writes stay the owner's.
9. **Agent:** run `pnpm check:source` on the result. Each step names the narrower checks
   to run while doing it.

## The rename

Follow the [identity inventory and foundation checklist](references/rename.md). Leave
the product and design rows for their later steps.

## The product

Fill AGENTS.md's Product section immediately after the rename. The single purpose is the
sentence that matters most: the Chrome Web Store judges the extension against it, and
step 7 judges every permission against it, so write it before any code that needs a
permission. Remove the section's marker row from `EXPECTED_INVENTORY` and rerun
`tests/placeholders.test.ts`; keep the marker in `PLACEHOLDERS` so it cannot return
unnoticed. Non-goals change only by human decision.

## The sample behavior

The template's sample — a click counter kept by the service worker, its toolbar badge, a
synced setting that turns the badge off, and a content script that marks one example
host — exists so that every context, storage area and message path has one working,
tested example. Keep that property while replacing it:

- **Replace in place, one context at a time.** Turn the popup's counter into the first
  real screen, the counter's message into the first real message, and so on, keeping a
  passing test at each step. Deleting every example first leaves nothing to copy from
  and nothing proving the wiring still works.
- **Delete a context only when the product has none.** An extension with no content
  script deletes the entrypoint, its zone under `src/content/`, its tests and its `e2e/`
  spec, and the `content` keys in every catalog. The zone is also named by
  `eslint.config.mjs`'s zone blocks, `tests/boundaries.test.ts`'s cases and the coverage
  glob in `vitest.config.ts`; dropping a deleted directory from those is not weakening a
  gate, as long as no rule for a remaining zone loosens and no threshold number moves.
  Deleting a content script also narrows the consent surface, so
  `tests/manifest.test.ts` changes with it — step 7, not a side edit.
- **A sample storage key can go without a migration — until the first release.** Nothing
  installed has stored it yet. From the first published version on, every key is
  contract: **REQUIRED:** `managing-storage` before renaming or dropping one.
- The coverage floors stay where they are while code is deleted; a floor that a smaller
  tree no longer meets means a missing test, per AGENTS.md.

**REQUIRED:** `building-entrypoints` for the contexts, and `tdd` for the order of work.

## The icons and store images

`public/icon/` holds placeholder PNGs at 16, 32, 48, 96 and 128 pixels, which WXT finds
by name and writes into the manifest's `icons` (observed in the built manifest,
2026-10-23). Replace each file with the extension's artwork at the same name and size;
the toolbar uses the small ones, so draw those for their size rather than shrinking the
large one.

The store asks for more than the zip carries: a 128x128 icon whose artwork is 96x96 with
transparent padding, a 440x280 small promotional tile, and one to five screenshots at
1280x800 or 640x400 (<https://developer.chrome.com/docs/webstore/images>, checked
2026-10-23). Those are uploaded in the store dashboard, not shipped: keep them out of
`public/`, whose every file lands in the package. **BACKGROUND:** `releasing-to-stores`.

## The locale decision

Follow the [locale checklist](references/locales.md) to keep both locales, drop one, or
add another, and run the checks it names.

## Settling the design direction

The template ships shadcn/ui's stock `neutral` tokens and an unsettled lock in
`designing-ui`, both carrying the design-direction marker that `PLACEHOLDERS` lists, so
the same inventory run as the rename reports it: one row for `src/assets/globals.css`
and one per copy of `designing-ui`'s `SKILL.md`.

Settle it before the first real screen, and research it rather than choosing by taste:
the user-level `refero-design` skill is the method when it is installed; without it,
`designing-ui` points at its `references/design-lock.md`, whose research procedure needs
no other skill. The choice is the human's either way — present the options and let them
pick. Then:

- Fill `designing-ui`'s lock and ledger in the shape that section gives, and replace the
  marker sentence and the paragraph under it with the settled direction. Edit the
  `.agents/` copy and run `pnpm agents:sync`.
- Replace the stock values in `src/assets/globals.css`, keeping the `:root` +
  `@theme inline` shape, and replace its marker comment with one naming the direction. A
  typeface is bundled, never loaded from a font service — `designing-ui` › Extension
  constraints holds why.
- Restyle `src/components/ui/button.tsx` to the settled recipe, dropping any variant the
  lock has no use for, and update `tests/ui-primitives.test.tsx` in the same edit.
- Delete the marker's rows from `EXPECTED_INVENTORY`. The marker stays in `PLACEHOLDERS`
  so it cannot come back unnoticed.

```bash
pnpm exec vitest run tests/placeholders.test.ts tests/ui-primitives.test.tsx
pnpm build && pnpm test:e2e
```

## The permissions review

The template asks for `storage` and one example host. Before the first release, read the
consent surface `changing-permissions` describes against the Product section's single
purpose: every permission and every host pattern either serves it or goes, and the
narrowest pattern that serves it is the one to propose. Propose the diff; the sign-off
is the human's. **REQUIRED:** `changing-permissions`.

## The GitHub settings and the store

"Use this template" copies the tree and none of the repository's settings. As soon as
the repository exists — before its first pull request merges — work through AGENTS.md's
"GitHub settings a new repository must enable", which holds the list and the reasons,
the `store-submission` environment among them. Each item is a remote write the owner
signs off on. When the new extension renames or drops a CI job, edit
`.github/rulesets/main.json` in the same change and run `pnpm repo:ruleset` again;
`tests/ruleset-contexts.test.ts` fails while the two disagree.

`release.yml` skips the store submission until the store item's identifier is set, and
that identifier exists only once the store has an item: a first submission goes through
the store's own dashboard by hand ("If you're publishing an extension to a store for the
first time, you must manually navigate the process",
<https://wxt.dev/guide/essentials/publishing>, checked 2026-10-23), from a `pnpm zip`
package. That upload, the identifiers it yields and where each one is stored are
`releasing-to-stores`' subject. **REQUIRED:** `releasing-to-stores`.

For a private repository, follow
[the private-repository procedure](references/private-repository.md) to check
security-feature availability, obtain the owner's gate decision, and reconcile only
affected required contexts before the first merge.

## What the new extension keeps

The [foundation checklist](references/rename.md#what-the-new-extension-keeps) names the
repository machinery that survives the rename.
