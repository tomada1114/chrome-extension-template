# Store listing

> **Template.** Every answer below describes the template's sample behavior — a click
> counter, a badge setting and a marker on `https://example.com/*`. Rewrite each one for
> the real extension before the first submission. `releasing-to-stores` owns how this
> file is used; `changing-permissions` owns the justification table.

The Chrome Web Store dashboard and Microsoft Edge Partner Center ask for most of the
same answers. Fill this file first, then copy from it, so the two listings and the
manifest never disagree.

## Identity

| Field                       | Value                                             | Where it lives                                                  |
| --------------------------- | ------------------------------------------------- | --------------------------------------------------------------- |
| Name                        | _the extension's display name_                    | `extName` in `src/locales/*.json`; ships in the manifest        |
| Summary (at most 132 chars) | _one plain-text sentence: what it does, for whom_ | `extDescription` in `src/locales/*.json`; ships in the manifest |
| Category                    | _one store category_                              | Chrome: Store listing tab. Edge: Properties page                |
| Language(s)                 | _one per catalog under `src/locales/`_            | Store listing, per language                                     |
| Homepage / support URL      | _optional_                                        | Store listing (Chrome), Properties (Edge)                       |

Name and summary are manifest metadata: the dashboards show them read-only, and changing
them means a new version. Edge documents its short description as the manifest
`description`; Chrome's summary shares that field's 132-character limit, so write it
there.

## Description

_At least 250 characters (Edge requires 250 to 10,000), starting with one concise
statement of what the extension does. Then the core actions from AGENTS.md's Product
section, in the user's words. No superlatives, no keyword lists, no comparison with
another extension. One copy per listed language._

## Single purpose

_One sentence, the same one as AGENTS.md's Product section "The single purpose". Every
permission below must serve it._

Sample: _Counts the clicks a user makes in the toolbar popup and shows the total on the
toolbar icon._

## Permission justifications

One row per entry in the built manifest's consent surface, matching `EXPECTED_CONSENT`
in `tests/manifest.test.ts`. A row is added or removed in the same change as the
permission.

| Manifest entry                                 | Field it comes from         | Justification (as submitted)                                                                                                                          |
| ---------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`                                      | `permissions`               | _Keeps the click count on this device and the user's badge preference in the browser's synced storage, so both survive the popup closing._            |
| `https://example.com/*` (content-script match) | `content_scripts[].matches` | _Shows a small status label on example.com pages to confirm the extension is active there. The script reads nothing from the page and sends nothing._ |

The example.com access is a content-script match, not a `host_permissions` entry.
Whether the Chrome dashboard shows it in its own justification box or under the host
permission box depends on the dashboard; answer wherever it asks.

## Remote code

_No, I am not using remote code._ Manifest V3 forbids it and the extension-page CSP in
the manifest is the default one.

## Data usage disclosures

The stores count data that never leaves the device as handled data, so answer even when
nothing is sent anywhere.

| Question                                                        | Sample answer                                                                                                                            |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Which user data types does the extension handle?                | _Decide with the owner._ The sample stores a count of clicks on its own button and one on/off setting, and reads nothing from web pages. |
| Is any data sold or transferred to a third party?               | _No._                                                                                                                                    |
| Is any data used for a purpose unrelated to the single purpose? | _No._                                                                                                                                    |
| Is any data used to determine creditworthiness or for lending?  | _No._                                                                                                                                    |

The last three rows paraphrase the certifications both dashboards ask the developer to
tick; read their exact wording there before certifying.

Whether a count of the extension's own button clicks falls under a dashboard category
such as user activity is a judgment the owner certifies; an inaccurate disclosure is a
rejection reason. Keep the answers consistent with `docs/privacy-policy.md`.

## Privacy policy

- URL: _the public address where `docs/privacy-policy.md`, rewritten, is hosted_
- The Chrome Web Store requires one whenever the extension handles user data, and counts
  data stored only on the device as handled
  (https://developer.chrome.com/docs/webstore/program-policies/user-data-faq, checked
  2026-10-23). Edge requires one when the extension accesses, transmits or collects
  personal information.

## Assets

Chrome Web Store (https://developer.chrome.com/docs/webstore/images, checked
2026-10-23):

- [ ] Store icon, 128x128 PNG: 96x96 artwork with 16 px transparent padding per side
      (`public/icon/128.png` is the manifest icon; the store icon is uploaded
      separately)
- [ ] At least one screenshot, 1280x800 or 640x400, full bleed, square corners (up to 5)
- [ ] Small promo tile, 440x280 (optional; listings without one are shown after those
      with one)
- [ ] Marquee promo tile, 1400x560 (optional)

Microsoft Edge Add-ons
(https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/publish-extension,
checked 2026-10-23):

- [ ] Extension logo, 1:1, 300x300 recommended, at least 128x128, per language
- [ ] Screenshots, 640x480 or 1280x800, up to 6 (optional)
- [ ] Small promotional tile, 440x280 (optional)
- [ ] Large promotional tile, 1400x560 PNG (optional)
- [ ] Description of at least 250 characters, per language
- [ ] Notes for certification: how to see the extension work (for the sample, open the
      popup and click the button; visit example.com)
