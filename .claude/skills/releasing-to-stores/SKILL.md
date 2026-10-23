---
name: releasing-to-stores
description: >
  Covers shipping a version to the Chrome Web Store and Microsoft Edge Add-ons: the
  version bump in package.json, the v<version> tag, what .github/workflows/release.yml
  does, the store-submission environment and its variables and secrets, wxt submit and
  .env.submit, the first manual upload, the store listing and assets in
  docs/store-listing.md, the privacy disclosures and docs/privacy-policy.md, and review,
  rejection and rollback. Use when preparing a release, a release run fails or skips
  submission, store credentials need setting up or rotating, or a listing or privacy
  answer needs writing.
---

# Releasing to Stores

**Owns:** turning a merged `main` into a store submission — the version, the tag
hand-off, the `store-submission` environment, the listing and privacy text in `docs/`,
and what to do after a review verdict. **Does not own:** when a new project sets the
stores up (`starting-an-app`, which calls this skill for the mechanics); a change to the
consent surface (`changing-permissions`); editing `release.yml` or any workflow
(`changing-gates`); the `extName` and `extDescription` catalog strings the listing reads
(`localizing-ui`); bumping `wxt` or `publish-browser-extension`
(`managing-dependencies`).

## Who does what

AGENTS.md's "Security and human approval" makes the release a human's step. The agent
prepares it and stops; the human publishes it.

| Agent                                                              | Human                                                            |
| ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| bumps the version, updates `CHANGELOG.md` if the project keeps one | pushes the `v<version>` tag                                      |
| runs `pnpm check:source`                                           | approves the `store-submission` deployment in the Actions UI     |
| checks `docs/store-listing.md` and `docs/privacy-policy.md`        | owns the store dashboards, the first upload and every credential |
| drafts the release notes and the hand-off message                  | answers a review verdict, triggers a dashboard rollback          |

The agent never runs `wxt submit` (any form of it authenticates as the owner), never
runs `wxt submit init`, and never pushes a tag.

## Preparing a release

1. **Bump `version` in `package.json`, nowhere else.** WXT copies it into the manifest,
   `tests/manifest.test.ts` asserts the two agree, and `release.yml` refuses a tag that
   names a different version. Use plain `X.Y.Z`, higher than the version the store last
   published. A pre-release such as `1.2.0-beta.1` does not work here: WXT ships it as
   version `1.2.0` with the full string in `version_name` (observed in
   `node_modules/wxt/dist/core/utils/manifest.mjs`, 2026-10-23), so the manifest suite
   fails and two releases would share one store version.
2. Add the release's entry to `CHANGELOG.md` if the project has one; the template ships
   none, and `release.yml` generates the GitHub release notes itself.
3. Re-read `docs/store-listing.md` against the build: the justification table matches
   the manifest's consent surface, and the summary still reads well within 132
   characters. A consent change in this release went through `changing-permissions`
   already; if it did not, stop.
4. Run `pnpm check:source`. It is the same build, manifest and end-to-end gate the
   release job reruns on the tagged commit.
5. Land the bump through a pull request like any change, under its own sign-off.
6. Hand off: name the commit on `main`, the command `git push origin v<version>` (after
   tagging that commit), and what to approve next.

## What release.yml does

Read `.github/workflows/release.yml` for the steps; the shape is:

- **`package`** runs on a pushed `v*.*.*` tag. It checks the tag against `package.json`,
  builds, runs the manifest and end-to-end suites on the tagged commit, zips both
  targets and uploads them as the `extension-zips` artifact.
- **`github-release`** needs only `package`, so a GitHub release with both zips appears
  whether or not anything is submitted.
- **`submit`** needs `package`, runs only when `vars.CHROME_EXTENSION_ID` is set, and
  enters the `store-submission` environment, whose required reviewer is the human
  sign-off. After approval it runs `wxt submit` with the Chrome zip, and with the Edge
  zip only when `EDGE_PRODUCT_ID` is set. Each store then reviews the upload; approval
  in Actions is not publication.

The variables and secrets the job reads, and where each value comes from, are in
[the store credentials reference](references/store-credentials.md). Open that, never
`.env.submit`, to learn what exists.

## The first release of a new extension is manual

`wxt submit` only updates an item that exists: "You are responsible for uploading and
submitting an extension for the first time by hand" (publish-browser-extension 6.2.0's
README, observed 2026-10-23), and Edge's API has no endpoint for "creating a new
product"
(https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/api/using-addons-api,
checked 2026-10-23). So the human, once per store:

1. Registers the developer account; the Chrome Web Store charges a one-time registration
   fee (https://developer.chrome.com/docs/webstore/register, checked 2026-10-23).
2. Uploads the zip from `pnpm zip` or `pnpm zip:edge` by hand, fills the listing and
   privacy pages from `docs/store-listing.md`, and submits.
3. Copies the item ID the store assigned into the environment, which turns `submit` on
   for every later tag.

## Checking credentials locally

`wxt submit` is `publish-browser-extension`'s CLI. `wxt submit init` walks through every
value interactively and writes them to `.env.submit`, which `.gitignore`'s `.env.*`
keeps out of Git and which the CLI loads on its own. Never read, print, copy or commit
it.

A human who wants to test credentials runs
`pnpm exec wxt submit --dry-run --chrome-zip <zip> --edge-zip <zip>`. What it proves
differs per store (observed in the library's `dist`, 2026-10-23): for Chrome it
exchanges the service-account key and fetches the item's status, so it checks the
credentials against the item; for Edge it returns before any request and checks nothing.

## Listing, privacy and assets

- `docs/store-listing.md` is the listing's source text and asset checklist, and
  `docs/privacy-policy.md` the template policy. Both are templates to rewrite for the
  real product; the policy must be hosted at a public URL before the first submission.
- Write the summary in `extDescription` in `src/locales/*.json`, the manifest
  `description`. Edge documents that its short description is that field, read-only in
  Partner Center
  (https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/publish-extension,
  checked 2026-10-23). Chrome's summary has the same plain-text, 132-character limit as
  the field
  (https://developer.chrome.com/docs/extensions/reference/manifest/description, checked
  2026-10-23), and its dashboard cannot edit manifest metadata after upload, so a fix
  ships as a new version (https://developer.chrome.com/docs/webstore/best-listing,
  checked 2026-10-23).
- Data kept only on the device still counts: "Extensions are required to disclose how
  they handle user data, even when data is processed or stored locally"
  (https://developer.chrome.com/docs/webstore/program-policies/user-data-faq, checked
  2026-10-23), and a product that handles any user data must post a privacy policy
  (https://developer.chrome.com/docs/webstore/program-policies/privacy, checked
  2026-10-23). The disclosures are the human's certification; the agent drafts them.
- Asset sizes differ by store; the checklist in `docs/store-listing.md` carries both
  sets with their sources.

## Review, rejection and rollback

- **Review time.** Chrome: "within a few days, but it can take up to a few weeks";
  contact support after three weeks pending; broad host permissions and rejections
  lengthen it (https://developer.chrome.com/docs/webstore/review-process, checked
  2026-10-23). Edge: "up to seven business days"
  (https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/publish-extension,
  checked 2026-10-23).
- **Rejection.** The email names the policy. Treat it as a requirement: fix it under the
  owning skill, bump the version, and hand off a new tag. An appeal is the human's call.
- **Rollback.** The default is to fix forward: a higher version through `release.yml`,
  the same gate as any release. The Chrome dashboard can also roll back to the
  previously published version only, under a new version number, without review, and it
  discards pending submissions (https://developer.chrome.com/docs/webstore/rollback,
  checked 2026-10-23). After one, `package.json` must move above the number the rollback
  used. No Edge equivalent was found when this was written; there, ship a higher
  version.
- **Stored data across a rollback.** Rolled-back code reads what the newer release
  wrote, and a storage `version` it does not know logs `Version downgrade detected`.
  **BACKGROUND:** `managing-storage`, which is why a shape change keeps the previous
  release able to read the new shape.
