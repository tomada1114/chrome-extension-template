# Project Guide

This file is the source of truth for every agent working in this repository.
Tool-specific files (`CLAUDE.md` and anything like it) add only what is specific to that
tool; they never restate what is here.

Machine-enforceable rules are not written down here either. `eslint.config.mjs`,
`tsconfig.json`, `.prettierrc.json`, `vitest.config.ts` and `pnpm-workspace.yaml` are
the source of truth for those, and running the gate is how you learn them.

Neither are the conventions of a particular kind of work. Those live in the skills under
`.agents/skills/`, one per kind of change, and load when the work you are doing calls
for them — see [Skills](#skills) for the index. What is left in this file is what has to
be true _before_ you know which task you are on: what this package is, how to check a
change, and which decisions need a human.

**Never hand-edit `.claude/skills/`** — it is a generated mirror, and a change there is
lost at the next sync. `authoring-skills` owns how a skill is authored, mirrored, and
checked.

## Overview

A template for a Manifest V3 browser extension for Chrome and Edge, written in ESM-only
TypeScript and built with [WXT](https://wxt.dev): a service worker, a content script, a
popup and an options page, the two screens rendered with React and styled with Tailwind
v4 and shadcn/ui. The sample behavior is deliberately small — the popup counts clicks
through the service worker, the service worker mirrors the count onto the toolbar badge,
the options page turns that badge off, and the content script marks
`https://example.com/*` — so that every extension context, storage area and message path
has one working, tested example to copy from and nothing else to delete.

It is private on npm: nothing here is packed or consumed as a tarball. What ships is the
zip `wxt zip` builds, uploaded to the Chrome Web Store and Microsoft Edge Add-ons by
`release.yml`. `.node-version` and `devEngines.runtime` carry the Node 24 development
runtime; pnpm 11 is the package manager, used through Corepack.

## Product

PRODUCT: UNDESCRIBED

This template leaves its product open. In a new extension, fill these TODOs after the
rename, then remove the marker and its row in `tests/placeholders.test.ts`. The marker
stays in the template itself, like the design-direction marker below.

- **What it is, and who it is for** — TODO: one paragraph describing the extension and
  its intended users.
- **The single purpose** — TODO: the one sentence the Chrome Web Store's single-purpose
  policy will be judged against. Every permission must serve it.
- **The core actions** — TODO: the one or two things a user does most.
- **Non-goals** — TODO: what the extension deliberately does not do. Moving a non-goal
  into scope is a human's decision.

## Before the first screen

The template ships no design direction. `src/assets/globals.css` carries shadcn/ui's
stock `neutral` tokens only so a copied component renders, and the lock in
`designing-ui` is blank; both carry a marker that `tests/placeholders.test.ts` lists
beside the rest of the template's identity. In this template itself that is intended. In
a project started from it, settling the direction comes before the first screen of its
own: when asked to build or restyle UI while that marker still stands, say so and
propose settling it first — `starting-an-app` owns the step. Never choose a palette, a
typeface or a layout by taste to get a screen done.

## Quick reference

The scripts are grouped by how they may be run: finite ones an agent runs to check its
own work, the ones that open a browser window, and the ones that write somewhere other
than this checkout.

### Checks an agent runs

```sh
pnpm build          # production build for Chrome into .output/chrome-mv3/
pnpm build:edge     # the same for Edge into .output/edge-mv3/
pnpm check:quick    # format check, lint, typecheck, tests — the everyday gate
pnpm check:source   # the full gate: builds, manifest test, end-to-end, coverage, skill scripts
pnpm fix            # ESLint autofix, then Prettier
pnpm test           # unit, component and automation tests
pnpm test:coverage  # the same with the coverage floors enforced
pnpm test:manifest  # pins the permissions in the last `pnpm build`'s manifest
pnpm test:e2e       # loads the last `pnpm build` into headless Chromium (Playwright)
pnpm e2e:browsers   # install Playwright's Chromium once per machine
pnpm test:skills    # the shipping-issues skill's Python script tests (needs python3; ~2 min)
pnpm zip            # the store upload for Chrome, in .output/
pnpm zip:edge       # the store upload for Edge, in .output/
pnpm agents:sync    # regenerate .claude/skills/ from .agents/skills/
pnpm agents:check   # fail when the two skill trees have drifted apart
pnpm hooks:verify   # verify the installed Git hooks; first in check:source
pnpm hooks:install  # repair the Git hooks; `pnpm install` installs them already
pnpm clean          # remove build output, reports and tool caches
pnpm clean:deep     # the same, plus .wxt/ and node_modules/ — a reinstall follows
```

Reach for `pnpm clean`/`pnpm clean:deep` rather than an `rm -rf`: `scripts/clean.mjs`
refuses any path that resolves outside this repository, symlinks followed, so neither a
typo nor a directory link leading out of the checkout can reach the machine, and the
target list is reviewable in `package.json` instead of retyped at a prompt each time.
`clean:deep` leaves the checkout without dependencies — run `pnpm install` after it.

Run a single test file with `pnpm exec vitest run tests/<name>.test.ts`, and a single
browser test with `pnpm exec playwright test e2e/<name>.spec.ts` after `pnpm build`.

`pnpm check:quick` is the everyday local gate; `pnpm check:source` adds both builds, the
manifest and end-to-end suites, the coverage floors and the skill script tests on top of
it. CI runs those same checks as separate steps, so a green `pnpm check:source` here
means those are green too. `lefthook`'s pre-commit hook runs a staged-file-scoped
version of the same tools — format applied rather than merely checked, tests limited to
the ones reachable from the staged files — before every commit. Nothing — not a hook,
not a workflow — defines a check of its own; they all call these scripts.

`pnpm install` also runs `wxt prepare` (the `postinstall` script), which generates
`.wxt/`: the typed `#i18n` module and the ambient types `tsconfig.json` includes. A type
error naming `#i18n` or `import.meta.env` after a fresh clone or a catalog change means
it has not run; `pnpm exec wxt prepare` regenerates it.

Development and source checks stay on Node 24, stated once in `.node-version` and once
in `devEngines.runtime`. Never relax `devEngines.runtime`'s `onFail: error`, and never
reach for `--config.runtime-on-fail=ignore`: nothing here runs on any other Node.

### Opens a browser window — run with the rules below

```sh
pnpm dev            # build in watch mode and launch Chromium with the extension loaded
pnpm dev:edge       # the same, for Edge
```

### Writes to GitHub or to a store

```sh
pnpm repo:labels    # create/update GitHub labels from .github/labels.yml
pnpm repo:ruleset   # create/update the main ruleset from .github/rulesets/ (admin token)
git push origin v<version>   # starts release.yml: GitHub release, then store submission
```

These are listed apart because they write outside this checkout, not because an agent
may never run them: an agent may run `pnpm repo:labels` when its task needs the label
set. `pnpm repo:ruleset` needs a token with admin rights on the repository and stays a
human's step. A release tag is a human's step too: it publishes to every user of the
extension once the `store-submission` environment's reviewer approves it, and an agent
prepares the release (`releasing-to-stores`) and stops before the push.

### Running a browser without taking over the developer's

- To verify something only a loaded extension shows, run `pnpm build && pnpm test:e2e`
  first: the suite launches its own headless Chromium with a throwaway profile and
  closes it itself. Write a spec under `e2e/` for what it does not yet cover rather than
  driving a browser by hand.
- `pnpm dev` opens a visible browser window and keeps running. Do not start it during a
  routine check; when only a human looking can settle a question, say what to look at
  and let them run it — `running-the-extension` owns that hand-off.
- Never load the build into the developer's own Chrome profile, and never touch their
  running browser.
- Run no `open`, `gh … --web` or any other command that opens a window or takes focus
  during a routine check; give the human the URL or the path instead.

## Validating a change

Run the narrowest check that can fail, then the gate. Reaching for `pnpm check:source`
on every edit is slow enough that it stops being run at all.

| What you changed                                          | The narrowest check that can fail                                        |
| --------------------------------------------------------- | ------------------------------------------------------------------------ |
| A module under `src/core/`                                | `pnpm exec vitest run tests/<module>.test.ts`                            |
| A module under `src/platform/`, `background/`, `content/` | `pnpm exec vitest run tests/<module>.test.ts` (runs on `fakeBrowser`)    |
| A component or hook under `src/components/`               | `pnpm exec vitest run tests/<name>.test.tsx`                             |
| An entrypoint under `src/entrypoints/`                    | `pnpm build`, then `pnpm test:e2e`                                       |
| `wxt.config.ts`, a permission, or a content-script match  | `pnpm build`, then `pnpm test:manifest` and `pnpm test:e2e`              |
| A catalog under `src/locales/`                            | `pnpm exec wxt prepare && pnpm exec vitest run tests/locales.test.ts`    |
| `src/assets/globals.css` or a screen's styling            | `pnpm build`, then `pnpm test:e2e`                                       |
| An import that crosses a zone boundary                    | `pnpm exec vitest run tests/boundaries.test.ts`                          |
| A test                                                    | `pnpm exec vitest run tests/<name>.test.ts`                              |
| A spec under `e2e/`                                       | `pnpm build`, then `pnpm exec playwright test e2e/<name>.spec.ts`        |
| A script under `scripts/`                                 | `pnpm exec vitest run tests/<script>.test.ts`                            |
| A skill under `.agents/skills/`                           | `pnpm agents:sync && pnpm agents:check && pnpm test && pnpm test:skills` |
| `package.json`, `pnpm-workspace.yaml`                     | `pnpm install`, then `pnpm check:source`                                 |
| Markdown                                                  | `pnpm fix`                                                               |

## Architecture

```
src/
├── core/         # framework-free vocabulary: domain types and pure functions
├── platform/     # the typed browser APIs: the storage schema, the message protocol, i18n
├── background/   # the service worker's logic, registered by entrypoints/background.ts
├── content/      # the content script's logic, registered by entrypoints/content.ts
├── components/   # React UI: shadcn/ui copies under ui/, this extension's screens and hooks
├── entrypoints/  # what WXT turns into the manifest: one file or folder per context
├── locales/      # one catalog per locale, compiled into _locales/ by @wxt-dev/i18n
└── assets/       # the Tailwind stylesheet the screens import
public/icon/      # the toolbar and store icons, copied into the build as-is
e2e/              # Playwright specs that load the built extension into Chromium
scripts/          # repository automation, authored as .mjs, never shipped
```

Imports run one way. `entrypoints` is the top and may name every zone below it.
`background` and `content` each reach `platform`, which reaches `core`; `components`
reaches `core` beside them. `core` is the bottom: it names no browser API and no React,
so it runs in a plain unit test. `components` names no browser API either — it renders
what it is handed, as props and as `StoredValue`s from `src/core/stored-value.ts` — so a
component test needs jsdom and nothing else. `background` and `content` name no React
and no component. Auto-imports are off (`imports: false` in `wxt.config.ts`), so every
one of these edges is a written import a reader and both checks below can see.

A module under `src/` is reached either relatively or through the `@/*` → `./src/*`
alias, which exists because shadcn/ui writes `@/components/...` into every component it
copies in. `tsconfig.json`'s `paths` and WXT's own config both resolve it, and
`eslint.config.mjs` matches specifier text and so carries an `@/` twin of every zone
pattern; `tests/boundaries.test.ts` resolves both spellings, so neither is a way around
the order above.

### Four contexts, four sets of rules

An extension is four programs that share a package, not one:

- **The service worker** (`background`) has no DOM and is stopped whenever it idles,
  then restarted for the next event. Module state does not survive that, and a listener
  registered after an `await` misses the event that woke the worker. Listeners are
  registered synchronously in `startBackground()`, and state lives in storage.
- **The content script** (`content`) runs inside a page the extension does not own. Its
  DOM, its globals and every message it sends are untrusted input to the rest of the
  extension; it writes into the page with `textContent` and `createElement` only, and it
  cleans up when its context is invalidated by an update.
- **The screens** (the popup and options page under `src/entrypoints/<name>/`) are
  ordinary extension pages. The popup is destroyed every time it closes. A screen talks
  to the service worker by message, never by importing its zone.
- **The build** — the manifest — is what a user consents to and what store review reads.

`eslint.config.mjs` bans `eval`, `new Function`, `innerHTML`, `insertAdjacentHTML` and
`dangerouslySetInnerHTML` across `src/`: Manifest V3 forbids code that is not in the
package, and markup built from strings is how a content script turns a page's text into
script.

### The three seams

Everything a project built from this template is expected to extend sits behind one of
three seams:

- **The storage schema.** `src/platform/storage.ts` declares every persisted key, its
  storage area and its `version`, and it is the only module that defines one. A stored
  value outlives the release that wrote it — an update reads what the previous version
  left, and `storage.sync` is written by every device the user is signed in on — so what
  comes back is parsed (`parseSettings`) rather than trusted, and a shape change is a
  version bump with a migration. `managing-storage` owns both.
- **The message protocol.** `src/platform/messaging.ts`'s `ProtocolMap` is every message
  one context sends another, typed on both ends. A handler lives in `src/background/`
  and treats a message from a content script as input from a page.
- **The consent surface.** `wxt.config.ts`'s `permissions`, each content script's
  `matches`, and anything else that widens what the extension can reach become the
  generated manifest, which `tests/manifest.test.ts` pins literally. Adding a permission
  or a host pattern disables the extension for every existing user until they accept the
  new prompt, so that diff is a human's decision; `changing-permissions` owns it.

### What is contract and what is private

Nothing here is imported by another package, so the contract is what outlives a release
or crosses a process boundary:

- **Contract.** Every key in `src/platform/storage.ts`, with its area and shape —
  installed users carry it across updates. The manifest's consent surface. The locale
  keys `src/locales/en.json` defines.
- **Interface.** The `ProtocolMap` in `src/platform/messaging.ts` joins contexts of the
  same release — a content script left over from the previous one is invalidated on
  update and cannot reach the new worker — so it changes freely, but on both ends in one
  commit, and what a handler receives from a content script is still parsed.
- **Private.** Everything else under `src/`, including how a zone implements what it
  publishes. A test reaches a module through the zone that owns it, never around it.

WXT finds an entrypoint by its path under `src/entrypoints/` and reads its default
export; that tree is the one place a default export is the interface. Everywhere else
under `src/` the surface is named exports, which is what a reviewer can read a diff of.
An entrypoint is wiring: ESLint holds each file to a small size budget, because logic
written there can only be tested in a browser and is bundled into that context alone.

These edges are enforced twice and their values are written down in neither this file
nor a skill: `eslint.config.mjs` carries them as `no-restricted-imports` zone blocks and
size budgets, and `tests/boundaries.test.ts` asserts the same edges from the module
graph, so a rule deleted from that config still fails the suite. Read the numbers and
the patterns there — a summary that restated them is the copy that goes stale. How to
work inside a zone is a skill's subject, not this section's.

## Skills

Each skill owns one kind of change. Load the one whose subject you are working on; each
names its own boundary with its neighbours.

| Skill                    | Load it when you are working on                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `building-entrypoints`   | an entrypoint under `src/entrypoints/`, the service worker or content script logic under `src/background/` or `src/content/`, or a message |
| `managing-storage`       | a key in `src/platform/storage.ts`, a storage area, a stored value's shape, or a migration                                                 |
| `changing-permissions`   | a permission, a host permission, a content-script `matches` pattern, or anything else in the manifest a user consents to                   |
| `releasing-to-stores`    | a version bump, a release tag, `release.yml`, the store listing, the privacy disclosures, or store credentials                             |
| `localizing-ui`          | a catalog under `src/locales/`, `src/platform/i18n.ts`, or adding a UI string                                                              |
| `writing-typescript`     | a `.ts` module or a `.tsx` component under `src/`                                                                                          |
| `designing-errors`       | an error type or an `ERR_*` code, in `src/` or `scripts/`                                                                                  |
| `tdd`                    | the order of work on a behavior change under `src/` — the failing test first, then the code, then the refactor                             |
| `writing-tests`          | the body of a test under `tests/` or a spec under `e2e/`                                                                                   |
| `placing-tests`          | a new test file, a vitest project, the Playwright suite, or a coverage floor                                                               |
| `type-testing`           | an `expectTypeOf` assertion or a `@ts-expect-error` inside a test                                                                          |
| `writing-repo-scripts`   | a `.mjs` under `scripts/`                                                                                                                  |
| `authoring-skills`       | a skill under `.agents/skills/`                                                                                                            |
| `changing-gates`         | a CI workflow, `lefthook.yml`, or a tool config                                                                                            |
| `managing-dependencies`  | adding, bumping, or removing a package by hand (an open bot PR is `merging-dependency-prs`)                                                |
| `merging-dependency-prs` | landing open Dependabot or Renovate pull requests                                                                                          |
| `updating-docs`          | `README.md`, `CONTRIBUTING.md`, `AGENTS.md`, `docs/`, or whether a change owes a doc at all                                                |
| `triaging-issues`        | filing, labelling, or ranking a GitHub issue                                                                                               |
| `building-screens`       | the states a popup or options screen renders (loading, failed, empty, a failed action) and its accessible names, keyboard reach and focus  |
| `designing-ui`           | the design direction, the theme tokens in `src/assets/globals.css`, a shadcn/ui component, or styling any screen                           |
| `running-the-extension`  | evidence from a loaded extension that no test asserts yet: an end-to-end spec, a service-worker log, asking a human to look                |
| `shipping-issues`        | ranking open issues and shipping the top one (or all) through PR, CI, and merge                                                            |
| `create-pr`              | opening a pull request for the current branch, or updating the one already open for it, outside `shipping-issues`                          |
| `smart-commit`           | grouping changes into commits and recovering when the pre-commit hook refuses one; follow it over a user-level skill of that name          |
| `starting-an-app`        | turning this template into a new extension: the rename, the sample behavior, the locales, the design direction, the store setup            |

## Sub-agents

A skill runs every step inline by default. On a host that can hand a step to a named
sub-agent, a step marked for a tier may go to one of four:

| Tier        | Takes                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| `executor`  | a settled spec with a clear pass/fail: implementing it, adding tests, getting a check green, bulk edits |
| `architect` | design judgment, review and bug finding, multi-file work, synthesis, a spec that still has holes        |
| `scout`     | read-only, judgment-free research, collection and enumeration that changes no files                     |
| `worker`    | single-shot, tool-free writing or checking from a complete brief                                        |

Each tier is defined once per host, and both hosts must describe the same four:
`.claude/agents/<tier>.md` for Claude Code and `.codex/agents/<tier>.toml` for Codex
CLI, whose definition omits `model` so the session's model is inherited. The
instructions themselves are the same text in both files. Both directories are generated
by the `syncing-agent-tiers` skill — model and effort choices live there, not in this
repository — and must not be edited by hand. `tests/agent-tiers.test.ts` holds the two
directories to the same tier names and instructions.

- Neither file grants a permission — no `sandbox_mode`, no tool allow list; the only
  tool list is `scout`'s Claude Code deny list, which narrows it to reading. A
  sub-agent's limits are the host's and the spawning session's, not something a tier
  widens.
- Codex CLI loads a project's `.codex/` layers only for a trusted project; in an
  untrusted checkout the four definitions are absent, and a step marked for a tier runs
  inline.
- Codex CLI ships a built-in `worker`; `.codex/agents/worker.toml` replaces it inside
  this repository. That is intended.

## Security and human approval

- **Commit, push, and pull request need a human's sign-off** — given per request, or by
  one of the [standing exceptions](#standing-exceptions) below. No file this repository
  ships blocks the dangerous spellings — `--no-verify`, a plain force-push, workflow
  dispatch — mechanically; this instruction is the rule itself, not a pattern enforcing
  it. No `.claude/settings.json` or `.mcp.json` is committed; an agent may still carry
  its own personal permission allow/deny list (a Claude Code session's own
  `~/.claude/settings.json` or the gitignored `.claude/settings.local.json`), but that
  list is a choice made outside this repository, not something it ships or requires.
- **A new permission, host permission or content-script match needs a human's
  sign-off**, given for that change. It changes what every user is asked to accept, and
  for an existing user it disables the extension until they do. `changing-permissions`
  owns the procedure; the sign-off is the human's.
- **A store release is a human's step.** Pushing a release tag and approving the
  `store-submission` environment's deployment publish to every user; an agent prepares
  the release and stops.
- Never read or write `.env*` (the `.example`, `.sample` and `.template` variants are
  fine) or anything under `secrets/`. `wxt submit init` writes the store credentials
  into `.env.submit`, so reading one is already a disclosure whether or not anything is
  written back: no `cat`, no `grep`, no copy to a temp path, and never a value out of it
  onto a command line. `releasing-to-stores` lists the names `release.yml` reads; open
  that, not the file, when you need to know what exists.
- Nothing secret is ever bundled into the extension. Everything under `src/` and
  `public/` ships to every user in a zip anyone can unpack, so an API key, a token or a
  private endpoint written there is published. `import.meta.env` values are inlined into
  that same zip.
- Read or edit a permission file — the personal `.claude/settings.local.json`, the
  committed `.claude/settings.json`, or Codex rules under `.codex/` — only when the
  owner asks for it in that session: it decides what an agent may run, so changing it
  changes the agent's own limits.
- Never write a credential into a tracked file — no registry auth token, no private key.
- `pnpm-lock.yaml` is generated by `pnpm install`, never hand-edited;
  `managing-dependencies` holds the reasoning.
- Never weaken a gate to make a run pass: no lowered coverage threshold in
  `vitest.config.ts`, no file added to `coverage.exclude` to move a number, no deleted
  security workflow, no removed `--frozen-lockfile`, no removed or relaxed ESLint rule
  or `pnpm-workspace.yaml` supply-chain setting, no `@ts-ignore`, no blanket
  `eslint-disable`, no skipped or deleted test. If a gate is wrong, say so and let a
  human decide.

That last rule stays here rather than moving into a skill, because the agent it has to
reach is looking at a red run and has classified its task as "make CI green" — not as
writing a test or adding a dependency, so neither skill fires. `placing-tests` explains
why each zone carries its own coverage floor and `managing-dependencies` explains what
each supply-chain setting closes off; the prohibition itself is here.

When an instruction in this file would block something that looks necessary, the answer
is to fix what made the bypass look necessary, or to ask. It is not to find another
spelling. That includes working around a denied command: when a command is denied — by a
permission setting, a hook, or a human — re-spelling it (`git -C . …`, `bash -c '…'`,
bundled short flags such as `-anm`, wrapping it in an alias or a script) is forbidden.
Stop and ask.

### Standing exceptions

Invoking a skill that lists the commits or remote writes it makes is the sign-off for
exactly those, for that invocation only. Three skills in this repository are such cases.
`shipping-issues`: the writes its `SKILL.md` lists — priority and status labels, syncing
label definitions from `.github/labels.yml` with `pnpm repo:labels`, pushing its own
branches, creating the pull request, merging it once CI passes, filing and labelling
follow-up issues and the comments it posts, and deleting the branches it created.
`create-pr`: pushing the current branch, `gh pr create` for it, and `gh pr edit` on its
own open pull request — never a force-push and never a merge. `smart-commit`: the
commits it makes on the current branch, and pushing that branch to `origin` only when
the request asked for a push — never a force-push, never another branch, and never the
default branch.

One request is a standing exception too: the owner explicitly asking for an issue ("file
an issue for this") is the sign-off for the `gh issue create` of each issue that request
asks for, with the labels `triaging-issues` gives it. An issue the agent would file from
a friction it noticed on its own is drafted in the reply and waits for a yes.

None of them covers a force-push or other history rewrite, `--no-verify` or any other
hook bypass, weakening a gate, or adding a dependency — a new dependency is proposed and
the agent stops for sign-off. A skill that reaches one of those stops and asks.

## Enforcement layers

The rules above are enforced by two layers, from mechanical to procedural. Each layer
holds only what belongs there — the rule itself lives in exactly one place, never copied
between layers:

| Layer                 | Fires on              | Applies to             | Holds                                                                                                 |
| --------------------- | --------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------- |
| `lefthook` pre-commit | `git commit`          | every author, any tool | Formatting, `eslint`, `typecheck`, `agents:check`, a related-test run, and the one content rule below |
| This file             | read at session start | every agent            | Everything else — the reasons behind the rules above                                                  |

The first row's "every author" is not a second step anybody has to remember, and not
something `prepare` arranges either. `lefthook` ships its own `postinstall`, which
`pnpm-workspace.yaml`'s `allowBuilds` allowlists, so every non-CI `pnpm install` writes
the hook by itself. What that postinstall cannot do is fail: it never reads the exit
status of the `lefthook install -f` it spawns, so an install that could not write the
hook — a `core.hooksPath` pointing somewhere it cannot create — leaves `pnpm install`
green, the gate absent, and nothing on screen. `package.json`'s `prepare` script runs
`scripts/verify-hooks.mjs` after that, and it **verifies rather than installs**: it
fails the install with an `ERR_HOOKS_*` report unless `lefthook.yml` declares a
`pre-commit` block and a lefthook pre-commit hook really sits at the path
`git rev-parse --git-path hooks` names. Both halves are checked because either alone is
satisfiable while the gate is absent — `lefthook install` writes a blank config and
calls that success — and the path is resolved rather than assumed, because
`core.hooksPath` and a linked worktree both move it legitimately.

Verification skips, and the install succeeds, only where it is meaningless: `CI` set, a
directory that is not a Git work tree root, and an install that left no `lefthook` in
`node_modules`. Most of the remaining ways to end up without the gate are deliberate or
visible: `pnpm install --ignore-scripts`, which runs neither lifecycle script;
`ALLOW_MISSING_GIT_HOOKS=1`, the documented opt-out for a developer who genuinely cannot
have the hook, which every failure message names; and hooks removed by hand afterwards.
`LEFTHOOK=0` is not among them: it leaves the hook installed and `verify-hooks` green
while disabling the gate at every commit it is set for — "Two consequences" below is
where that invisibility, and why nothing here closes it, is explained once.
`pnpm hooks:install` is the repair, not a setup step. The same verifier starts
`check:source` through `pnpm hooks:verify`, so a hook removed after installation fails
the full local gate before its source tools run.

No third layer sits under those two: this repository ships no declarative,
tool-call-aware permission list (a Claude Code `permissions.allow`/`permissions.deny` or
equivalent) — "Security and human approval" above is the one place that records what the
committed configuration does declare, and what an agent has to arrange for itself
outside this repository. The one rule that must hold regardless of which tool or human
is committing — a secret about to land in history — is instead the single mechanical
layer this repository does ship: `lefthook`'s pre-commit hook, which every author goes
through the same gate for.

Two consequences of that shape are worth naming rather than discovering: a shell command
that reads a secret path outside a commit (`cat .env`, `cp .env /tmp/x`) is invisible to
the hook, since it only inspects what is staged; and turning the Git hooks off through
the environment (`LEFTHOOK=0 git commit …`) is invisible to the hook it disables, with
nothing else in the repository watching for it. Neither is enforced anywhere. "Never
read or write `.env*` or anything under `secrets/`" and "never bypass the hooks" hold as
instructions in this file, not as blocks — reaching for either spelling is the thing
being ruled out, not the spelling that happens to be caught.

Some changes reach a pull request, or `main` itself, without passing any local gate at
all: an edit made through GitHub's web UI or API, which runs no hook; a commit made by
another tool or from another clone where the hook was never installed or was skipped;
and a conflict resolution concluded with `git rebase --continue`, which commits through
git's sequencer without running pre-commit at all — unlike a plain `git commit` at the
rebase stop or `git merge --continue`, where `check:staged` and `agents:check` still
run. Only CI and the `main` ruleset stand in the way of these changes, and CI does not
cover the whole hook: no workflow re-runs the staged secret guard
(`scripts/check-staged.mjs`) on a pull request. `security-audit.yml` instead runs a
redacted full-history gitleaks scan on every pull request, catching leaks even when a
later commit removed them; the committed `main` ruleset requires that job. Scheduled and
manual runs scan history too. The detectors have different rules, so this is another net
rather than an equivalent of the staged guard. GitHub's secret scanning and push
protection can also catch a secret at push time where enabled.

`scripts/lib/guard/` is the rule engine `scripts/check-staged.mjs` (the pre-commit
layer) uses to decide whether a staged path or its content is secret-shaped. That is the
whole of its scope, on purpose.

The hook deliberately does **not** try to stop a commit from deleting a workflow,
relaxing a config, or lowering a threshold. Those are judgement calls, and a judgement
call belongs in the pull request, where a reader can weigh it and disagree — a hook
cannot. A hook that blocks legitimate work teaches its author to reach for
`--no-verify`, and that flag disables the secret check along with everything else, so a
narrow hook that never fires on intended work protects more than a broad one that has to
be routed around. "Never weaken a gate to make a run pass" therefore holds as an
instruction in this file and as something a reviewer checks, not as a block.

Hand-editing `pnpm-lock.yaml` is the clearest example of a rule this repository accepts
as unenforced rather than mechanically blocked: a regenerated lockfile (`pnpm install`)
is an ordinary, expected commit, and a git diff cannot tell that apart from a hand edit
— only a layer that sees the actual tool call that produced the change could, and none
is enforced here. "The lockfile is generated, never hand-edited" holds as an
instruction, the same way the rules above it do.

A skill holds the reasoning behind a rule and the judgment a config cannot express; it
never holds a value a config owns, and never holds a prohibition an agent would meet
while its declared task is something else.

### GitHub settings a new repository must enable

Beside the two layers above, GitHub enforces what a repository's own settings declare.
"Use this template" copies files, not settings, so every repository made from this one
starts with none of it, and its admin turns each on once:

- **Secret scanning** and **push protection** (Settings › Advanced Security) — the
  server-side net for a secret the staged guard does not recognise or a skipped hook
  never saw; push protection refuses a detected secret at `git push`.
- **Private vulnerability reporting** — `.github/ISSUE_TEMPLATE/config.yml` sends a
  reporter to the repository's private advisory form, a dead link until this is on.
- **Dependabot alerts** and **Dependabot security updates** — `.github/dependabot.yml`
  configures version updates only; alerts on a known-vulnerable dependency, and the pull
  requests that fix one, are separate switches.
- **The `store-submission` environment**, with the owner as its required reviewer and
  the store identifiers and credentials `releasing-to-stores` lists. Without it
  `release.yml` still builds, tests and attaches the packages to a GitHub release, and
  skips the submission.
- **The `main` ruleset**, applied by `pnpm repo:ruleset` from
  `.github/rulesets/main.json` with a token that has admin rights on the repository. It
  blocks deletion of and force-pushes to the default branch, and requires a pull request
  whose required checks are green — with no approving review, since the owner works
  alone beside agents. `tests/ruleset-contexts.test.ts` holds each required context to a
  job that reports on every pull request, so a renamed job fails locally instead of
  leaving every pull request waiting on a check that never arrives. `bypass_actors` is
  empty on purpose: an agent's `gh` runs with the owner's token, so a bypass the owner
  holds is one every agent holds too, and the ruleset is the only server-side net
  between an agent's `gh pr merge` and a red merge. An emergency change goes through a
  pull request like any other. The script creates or updates a ruleset and never deletes
  one.
- **The label set**, created by `pnpm repo:labels` from `.github/labels.yml` — the
  labelling workflow only applies a label that already exists.

Each item is a write to the repository's settings, so it needs the owner's sign-off like
any other remote write; an agent proposes it and does not run it. The label set is the
one exception: as the Quick reference's "Writes to GitHub" says, an agent may run
`pnpm repo:labels` when its task needs the labels.

## Conventions

- All committed code, comments, configuration, and public documentation are in English.
  `authoring-skills` applies this to a skill's `description`. The one exception is
  `src/locales/*.json`: those are the UI message catalogs the extension renders to a
  reader, so `src/locales/ja.json` is Japanese by definition. The exception covers the
  catalogs' string values and nothing else — their keys, and every comment, test, and
  document about them, stay English. The one thing that may itself be non-English is a
  literal whose exact bytes are what a check or a worked example exercises, where
  writing it in English would destroy what it demonstrates —
  `tests/placeholders.test.ts`'s `PLACEHOLDERS` is the case to compare against, for the
  reason recorded there. Nothing wider: the prose around such a literal stays English —
  a test's `describe` and `it` names, its assertion messages, its comments, and a
  document's own sentences.

- **A comment carries only what the code cannot** — a non-obvious why, a trap the next
  edit would spring, an external constraint. Default to none and keep the rest to a line
  or two. Restating the code, or narrating decision history, is what the code and git
  already do. TSDoc on the published surface is a contract and stays.

- Do what was asked; nothing more. Prefer editing an existing file to creating a new
  one, and do not add documentation files that were not requested.
- Note improvements you spot outside the current scope instead of making them.
