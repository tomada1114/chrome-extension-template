import "../../assets/globals.css";

import { type ReactElement, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { browser } from "@wxt-dev/browser";

import { CountPanel } from "../../components/count-panel";
import { useStoredValue } from "../../components/hooks/use-stored-value";
import { i18n } from "../../platform/i18n";
import { sendMessage } from "../../platform/messaging";
import { clickCount } from "../../platform/storage";
import { mountRoot } from "../../components/mount-root";

function Popup(): ReactElement {
  const count = useStoredValue(clickCount);
  return (
    <CountPanel
      heading={i18n.t("popup.heading")}
      incrementLabel={i18n.t("popup.increment")}
      settingsLabel={i18n.t("popup.openOptions")}
      count={count}
      onIncrement={() => void sendMessage("incrementCount")}
      onOpenSettings={() => void browser.runtime.openOptionsPage()}
    />
  );
}

// The catalog Chrome picked follows the browser UI language, so the page
// declares that language rather than the `en` its HTML file is written with.
document.documentElement.lang = browser.i18n.getUILanguage();
document.title = i18n.t("extName");

createRoot(mountRoot(document)).render(
  <StrictMode>
    <Popup />
  </StrictMode>,
);
