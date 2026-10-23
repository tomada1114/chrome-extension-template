import "../../assets/globals.css";

import { type ReactElement, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { browser } from "wxt/browser";

import { useStoredState } from "../../components/hooks/use-stored-state";
import { SettingsForm } from "../../components/settings-form";
import { i18n } from "../../platform/i18n";
import { settings } from "../../platform/storage";
import { mountRoot } from "../../components/mount-root";

function Options(): ReactElement {
  const [current, update] = useStoredState(settings);
  return (
    <SettingsForm
      heading={i18n.t("options.heading")}
      showBadgeLabel={i18n.t("options.showBadge")}
      settings={current}
      onChange={update}
    />
  );
}

// The catalog Chrome picked follows the browser UI language, so the page
// declares that language rather than the `en` its HTML file is written with.
document.documentElement.lang = browser.i18n.getUILanguage();
document.title = i18n.t("extName");

createRoot(mountRoot(document)).render(
  <StrictMode>
    <Options />
  </StrictMode>,
);
