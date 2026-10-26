import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  type BrowserContext,
  chromium,
  test as base,
  type Worker,
} from "@playwright/test";

import { assertFreshBuild } from "../scripts/lib/build-freshness.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionPath = path.join(repoRoot, ".output", "chrome-mv3");

interface ExtensionFixtures {
  context: BrowserContext;
  serviceWorker: Worker;
  extensionId: string;
}

export const test = base.extend<ExtensionFixtures>({
  // eslint-disable-next-line no-empty-pattern -- Playwright reads a fixture's dependencies from this destructuring pattern; an empty one is how a fixture declares it needs none.
  context: async ({}, use) => {
    assertFreshBuild({
      root: repoRoot,
      manifestPath: path.join(extensionPath, "manifest.json"),
      stage: "E2E",
      buildCommand: "pnpm build",
    });
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });
    await use(context);
    await context.close();
  },
  serviceWorker: async ({ context }, use) => {
    const [existing] = context.serviceWorkers();
    await use(existing ?? (await context.waitForEvent("serviceworker")));
  },
  extensionId: async ({ serviceWorker }, use) => {
    const id = new URL(serviceWorker.url()).host;
    await use(id);
  },
});

export const expect = test.expect;
