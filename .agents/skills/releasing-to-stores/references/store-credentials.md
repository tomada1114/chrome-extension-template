# Store credentials

What the `submit` job in `.github/workflows/release.yml` reads, exactly as it reads it,
and where the human obtains each value. Every value is set by the repository owner in
**Settings > Environments > `store-submission`** (or at repository level where noted);
an agent proposes the setup and never handles a value. AGENTS.md's "GitHub settings a
new repository must enable" lists the environment among the owner's switches.

## The environment

- **Required reviewer:** the owner. The reviewer's approval is the sign-off that a store
  release needs; without a reviewer the job would submit on every tag.
- **Deployment branches and tags:** restricting the environment to `v*.*.*` tags keeps a
  job on any other ref from reaching the secrets.

## Variables and secrets

A _variable_ is a repository variable (Settings › Secrets and variables › Actions ›
Variables); a _secret_ is a secret of the `store-submission` environment.

| Name                                  | Kind     | Where it comes from                                                                                                                                                                                  |
| ------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CHROME_EXTENSION_ID`                 | variable | The item ID the Chrome Web Store assigns at the first manual upload, shown under the item's name in the Developer Dashboard and in its listing URL. Repository level; see "The submit switch" below. |
| `CHROME_PUBLISHER_ID`                 | variable | Developer Dashboard, Publisher > Settings (https://developer.chrome.com/docs/webstore/using-api, checked 2026-10-23).                                                                                |
| `CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL` | secret   | The `client_email` field of the service account's JSON key.                                                                                                                                          |
| `CHROME_SERVICE_ACCOUNT_PRIVATE_KEY`  | secret   | The `private_key` field of the same JSON key, pasted as the multi-line PEM block with real line breaks, not the JSON string with `\n` escapes.                                                       |
| `EDGE_PRODUCT_ID`                     | variable | Partner Center > Microsoft Edge > Overview > the extension > Extension identity; also the GUID in that page's URL. Leave it unset to submit to Chrome only.                                          |
| `EDGE_CLIENT_ID`                      | secret   | Partner Center > Microsoft Edge > Publish API, after "enable the new experience" and **Create API credentials**.                                                                                     |
| `EDGE_API_KEY`                        | secret   | The API key shown beside the client ID on the same page.                                                                                                                                             |

`CHROME_API_VERSION` is not configurable: the workflow sets it to `v2` inline.

### The Chrome service account

Following https://developer.chrome.com/docs/webstore/service-accounts (checked
2026-10-23):

1. In the Google Cloud Console, create or pick a project and enable the Chrome Web Store
   API.
2. Create a service account; it needs no IAM role for this.
3. In the Chrome Web Store Developer Dashboard's Account section, add the service
   account's email. A publisher can register only one.
4. Create a JSON key for the service account and copy its `client_email` and
   `private_key` into the two secrets, then delete the downloaded file. Google warns
   that "managing key files introduces security risks if not handled properly".

The key must keep its line breaks because only `wxt submit init` turns `\n` escapes into
newlines; the submit path signs with the value as given (observed in
publish-browser-extension 6.2.0's `dist`, 2026-10-23).

### Edge API credentials

Following
https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/api/using-addons-api
(checked 2026-10-23): sign in to Partner Center with the account that published the
extension, open **Publish API** under the Microsoft Edge program, click **Enable** next
to "enable the new experience", then **Create API credentials**. The page shows the
client ID, the API key and the key's **Expiry** date. Note that date: an expired key
fails the `submit` job, and renewing it is the same page.

## The submit switch

The job-level condition `if: vars.CHROME_EXTENSION_ID != ''` is evaluated before the job
enters `store-submission`, and GitHub documents that "environment-level variables are
only available on the runner after the job starts executing"
(https://docs.github.com/en/actions/reference/workflows-and-actions/variables, checked
2026-10-23). A `CHROME_EXTENSION_ID` set only on the environment may therefore leave the
job skipped on every tag. That is why `release.yml` reads the three identifiers as
repository variables: none of them is secret, and only the credentials belong to the
environment.

## Names that are dead

The Chrome Web Store API v1.1 and its OAuth values (`CHROME_CLIENT_ID`,
`CHROME_CLIENT_SECRET`, `CHROME_REFRESH_TOKEN`, `CHROME_PUBLISH_TARGET`) are marked in
publish-browser-extension 6.2.0 as removed on 2026-10-15, when that API was shut down.
Do not add them. Edge's v1 client-secret flow is likewise gone: "Support for v1 will end
on Dec. 31, 2024" (the Edge API page above, checked 2026-10-23), and the API key above
replaces it.

## Never

- Read, print, `grep` or copy `.env.submit` or any other `.env*` file; AGENTS.md holds
  the rule. This table is how to learn what exists.
- Pass a value on a command line, in a workflow file, or in a pull request.
- Store a credential anywhere under `src/` or `public/`: both ship in the zip.
