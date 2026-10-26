# my-extension

[![CI](https://github.com/tomada1114/chrome-extension-template/actions/workflows/ci.yml/badge.svg)](https://github.com/tomada1114/chrome-extension-template/actions/workflows/ci.yml)

A short description.

## What this is

A starting point for a Manifest V3 browser extension for Chrome and Edge, built with
[WXT](https://wxt.dev) in ESM-only TypeScript. The popup and options page are React
screens styled with Tailwind v4 and shadcn/ui; a service worker and a content script sit
beside them.

What it ships is less a feature than a shape that holds up once the extension is in
users' hands:

- **Every extension context, with one tested example.** The popup counts clicks by
  messaging the service worker, the service worker keeps the count in storage and on the
  toolbar badge, the options page turns the badge off through synced storage, and the
  content script marks `https://example.com/*`. Each is small enough to replace on day
  one and complete enough to copy from.
- **Tests at three levels.** Unit tests run the storage, messaging and service-worker
  logic against an in-memory browser (`fakeBrowser`); component tests render the screens
  under jsdom; and a Playwright suite loads the built extension into headless Chromium
  and clicks through it. A fourth suite pins the permissions in the generated manifest,
  so a new consent prompt cannot slip into a release unreviewed.
- **Boundaries a linter enforces.** Code is split by the context it runs in, and ESLint
  plus a module-graph test keep a component from reaching a browser API, the service
  worker from importing a screen, and any file from building markup out of strings.
- **A tag-driven release.** Pushing `v<version>` builds, re-runs the browser tests,
  packages Chrome and Edge zips, attaches them to a GitHub release, and — after a human
  approves the deployment — submits both to their stores.

`AGENTS.md` describes the architecture and the rules; this file is the tour.

## Quick start

Use Node.js 24 (the version in `.node-version`) and Corepack:

```sh
corepack enable
corepack pnpm@11.18.0 install --frozen-lockfile
pnpm dev
```

`pnpm dev` builds the extension in watch mode and opens a separate Chromium window with
it loaded and a throwaway profile, so your own browser and profile are untouched. Click
the toolbar icon for the popup; its options page is one button away, and visiting
<https://example.com> shows the content script's marker. Edits reload the extension on
their own. `pnpm dev:edge` does the same for Microsoft Edge.

To load a production build by hand instead, run `pnpm build` and, in a Chrome profile
you keep for development, choose **Load unpacked** on `chrome://extensions` (with
Developer mode on), pointing it at `.output/chrome-mv3/`.

## Testing

```sh
pnpm test             # unit, component and automation suites
pnpm e2e:browsers     # once per machine: Playwright's Chromium
pnpm build && pnpm build:edge && pnpm test:manifest && pnpm test:e2e
pnpm check:source     # everything CI runs, in one command
```

The end-to-end suite needs Playwright's own Chromium because branded Google Chrome no
longer loads an unpacked extension from the command line. It runs headless and offline:
the page the content script is tested against is served by the test itself.

## Extending the extension

Each kind of change has a skill under `.agents/skills/` that holds its rules —
`building-entrypoints` for a new context or message, `managing-storage` for a stored
key, `changing-permissions` for anything a user consents to, and `releasing-to-stores`
for shipping. The short version:

- **A new screen or script** is a file or folder under `src/entrypoints/`; WXT turns it
  into a manifest entry. Keep it to wiring, and put its logic in the zone for its
  context (`src/background/`, `src/content/`, `src/components/`).
- **A new stored value** is declared in `src/platform/storage.ts` with a `version`, and
  changing its shape later means a migration — users keep what the previous release
  wrote.
- **A new message** is a line in `ProtocolMap` in `src/platform/messaging.ts`, typed on
  both ends.
- **A new permission or site** changes the install prompt and disables the extension for
  existing users until they accept it, so `tests/manifest.test.ts` makes it a visible
  diff.

## Starting a new extension from this template

Create a repository from this template, then work through
[`starting-an-app`](.agents/skills/starting-an-app/SKILL.md), which owns the procedure
and its order: rename, describe the product and its single purpose, replace the sample
behavior and icons, choose the locales, settle the design direction before the first
screen of your own, review the permissions, and set up the store submission.

The title, the description and the author above are this template's own identity
strings, deliberately left as placeholders. `tests/placeholders.test.ts` holds the
complete list of where one still stands, and a new extension is finished renaming when
that list is empty and the test is green.

The template ships shadcn/ui's stock neutral tokens so a copied component renders, not a
design anyone chose — `src/assets/globals.css` and the
[`designing-ui`](.agents/skills/designing-ui/SKILL.md) skill both say so, and the same
inventory reports it until the direction is settled.

## Publishing

The store listing and privacy disclosures start from the templates in
[`docs/store-listing.md`](docs/store-listing.md) and
[`docs/privacy-policy.md`](docs/privacy-policy.md). The first Chrome Web Store upload is
manual — it is how the store assigns the extension its ID — and every release after it
goes through `release.yml`.
[`releasing-to-stores`](.agents/skills/releasing-to-stores/SKILL.md) lists the
credentials it needs and the steps in order.

## Development

This package is private on npm; what ships is the zip `pnpm zip` builds.

```sh
corepack pnpm@11.18.0 install --frozen-lockfile
pnpm check:quick
```

The install puts the Git hooks in place on its own and generates WXT's types into
`.wxt/`. See [CONTRIBUTING.md](CONTRIBUTING.md) for the complete workflow, and
[AGENTS.md](AGENTS.md) for the architecture, the command index, and the rules every
change is held to.

## License

[MIT](LICENSE) © Your Name
