import { defineContentScript } from "wxt/utils/define-content-script";

import { mountMarker } from "../content/marker";
import { i18n } from "../platform/i18n";

export default defineContentScript({
  // Every pattern here is a host permission a user consents to at install time.
  // `changing-permissions` owns this list beside the manifest's `permissions`.
  matches: ["https://example.com/*"],
  main(ctx) {
    ctx.onInvalidated(mountMarker(document, i18n.t("content.marker")));
  },
});
