# Store assets

Keep artwork uploaded through the Chrome Web Store and Microsoft Edge Add-ons dashboards
here. This directory is outside WXT's `public/` and `src/` inputs, so its contents are
not included in either extension build or zip.

Use these names when preparing the real extension's uploads:

| File or directory       | Dashboard upload                            |
| ----------------------- | ------------------------------------------- |
| `chrome-icon.png`       | Chrome store icon, with transparent padding |
| `edge-logo.png`         | Edge extension logo                         |
| `screenshots/<locale>/` | Screenshots, named in display order         |
| `small-promo.png`       | Small promotional tile                      |
| `large-promo.png`       | Chrome marquee or Edge large promo tile     |

The dimensions and store-specific requirements live in
[`docs/store-listing.md`](../docs/store-listing.md). These uploads are separate from the
extension icons in `public/icon/`; replacing an upload does not replace an installed
icon.

`placeholder-icon.svg` is the template's source artwork for the five packaged PNG icons.
Its crossed, dashed-frame mark means "replace me"; it is not ready for a store
submission. Replace every PNG in `public/icon/` with the real extension's artwork before
release, following `starting-an-app`.
