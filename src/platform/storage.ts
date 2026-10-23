import { storage } from "wxt/utils/storage";

import { parseSettings, type Settings } from "../core/settings";
import type { WritableStoredValue } from "../core/stored-value";

// Every key this extension persists is declared in this file and nowhere else,
// so the full storage schema — and what a migration has to carry forward — is
// one file to read. `version` starts at 1; `managing-storage` owns how to bump
// it and write the migration that runs when an installed user updates.
//
// The service worker is stopped whenever it idles, so module-level variables do
// not survive between events. State that has to outlive one event lives here.

const clickCountItem = storage.defineItem<number>("local:clickCount", {
  fallback: 0,
  version: 1,
});

// `unknown` rather than `Settings`: sync storage is written by every device the
// user is signed in on, so what comes back is parsed, never trusted.
const settingsItem = storage.defineItem<unknown>("sync:settings", {
  fallback: null,
  version: 1,
});

export const clickCount: WritableStoredValue<number> = {
  get: () => clickCountItem.getValue(),
  set: (value) => clickCountItem.setValue(value),
  watch: (listener) =>
    clickCountItem.watch((value) => {
      listener(value);
    }),
};

export const settings: WritableStoredValue<Settings> = {
  get: async () => parseSettings(await settingsItem.getValue()),
  set: (value) => settingsItem.setValue(value),
  watch: (listener) =>
    settingsItem.watch((value) => {
      listener(parseSettings(value));
    }),
};
