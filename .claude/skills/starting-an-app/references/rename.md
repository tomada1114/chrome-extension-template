# Rename and foundation

## The rename

`tests/placeholders.test.ts` owns the inventory: `PLACEHOLDERS` is every string that
names _this template_ rather than an extension built from it, and `EXPECTED_INVENTORY`
is the complete list of `<file>: <placeholder>` sites where one still stands. That list
is the checklist, and it is machine-checked, so this skill does not restate its rows —
holding them in two places is how one of them goes stale.

Work through the identity sites first; leave the product and design-direction rows for
the steps that follow the rename:

```bash
pnpm exec vitest run tests/placeholders.test.ts
```

The inventory is pinned with an exact comparison, so a failure prints the sites that
remain against the sites the list expects. Replace one site, delete its row from
`EXPECTED_INVENTORY`, run again. The rename is finished when only the product and
design-direction rows remain and the suite is green. The whole starting procedure is
finished when the inventory is empty: no template identity or undecided product/design
marker survives anywhere in the tree.

The suite's second block, over the CI badge and the security-advisory links, checks
those URLs by their _shape_ — the path segments and the workflow filename — and leaves
the owner and the repository unconstrained. It passes on your slug exactly as it did on
the template's, so it needs no edit during the rename; what pins the slug itself is the
inventory row for each of those files.

What goes into each kind of site:

- **The package identity** — `package.json`'s `name` and `description`. `private: true`
  stays: nothing here is published to a registry, so the name only has to be one you
  recognise. `wxt zip` names the store package after it.
- **The repository slug**, wherever a URL names a GitHub repository — the README's CI
  badge, the security-advisory contact link in `.github/ISSUE_TEMPLATE/`, and the
  reporting link in `SECURITY.md`. A slug left behind renders a broken badge and sends a
  vulnerability reporter to a stranger's advisory form.
- **The security policy's commitments** — `SECURITY.md`'s response section speaks for
  the template's maintainer. Replace it with what the new extension's owner will
  actually promise, and keep its supply-chain section true as the gates change: it
  states only what the repository does.
- **The copyright holder** in `LICENSE`, and the same name wherever the README repeats
  it. Every fork inherits `LICENSE` verbatim, which is why the template ships a blank.
- **The extension's display name** — `extName` in every catalog under `src/locales/`.
  The manifest's `name`, the toolbar tooltip and both screens' titles read it, and so
  does the store listing (`localizing-ui` › The store listing). Write it in each
  catalog's language.
- **The one-line description** — `extDescription` in every catalog, the manifest's
  `description`, which the extensions page and the store listing show. Both strings are
  held to the store's length limits by `tests/locales.test.ts`.
- **The content script's own marker** — the label it writes into a host page and the
  attribute that identifies it there both name the template. Rename them with the sample
  behavior they belong to, or delete them with it. `e2e/content.spec.ts` spells the
  attribute out as a selector, so it changes in the same edit.

The screens' other copy — the popup's and options page's headings and labels — is
deliberately left out of the inventory: it is sample copy for sample behavior you are
expected to replace, so pinning it would pin strings that may not survive your first
day. Review it by hand once the screens are yours.

Emptying `EXPECTED_INVENTORY` is the intended edit and is not weakening a gate. Widening
the test's skip lists, or dropping an entry from `PLACEHOLDERS`, to make a row disappear
is — the row would stop being reported without the string being gone. AGENTS.md's "never
weaken a gate to make a run pass" covers that.

## What the new extension keeps

Everything below is about the repository rather than the extension, so it survives the
rename unchanged and is most of what starting from this template buys:

- **The gate set** — `package.json`'s `check:quick` / `check:source` and the scripts
  they call, `lefthook.yml`, and `.github/workflows/`. A red run early in a new project
  is an argument for fixing the code, never for deleting the check that found it.
- **The test layers** — the `fakeBrowser` unit tests, the jsdom component tests, the
  Playwright suite under `e2e/` and `tests/manifest.test.ts`. The sample's tests are
  rewritten along with the sample; the layers and their fixtures stay.
- **The release path** — `release.yml` and the `store-submission` environment it waits
  on. It submits nothing until the owner configures it.
- **The guard engine** — `scripts/lib/guard/` and `scripts/check-staged.mjs`, the one
  mechanical layer this repository ships and the only thing standing between a secret
  and the commit history. Keep it whatever the extension becomes.
- **The skills** under `.agents/skills/` and their generated mirror. Drop one only when
  the subject it owns actually leaves the repository. **REQUIRED:** `authoring-skills`
  for the loop that keeps the two trees identical, and for the AGENTS.md Skills table
  row that `tests/skills-frontmatter.test.ts` requires in both directions.
- **The label workflow** — `.github/labels.yml`, `scripts/sync-labels.mjs` behind
  `pnpm repo:labels`, and `.github/workflows/pr-label.yml`. Run `pnpm repo:labels`
  against the new repository early: the workflow only ever _applies_ a label, and when
  one does not exist yet it emits a notice instead of failing, so a missing taxonomy is
  silent. **BACKGROUND:** `triaging-issues` for what the labels mean.
