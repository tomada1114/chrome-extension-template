import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { repoRoot } from "./repo-tree";

// What a user consents to, and what store review reads, is the generated
// manifest — not wxt.config.ts or an entrypoint's options on their own. This
// suite reads both Chrome and Edge manifests after their builds and pins
// those parts as literals, so a change to a permission or a match pattern
// cannot land without a diff to this file in the same pull request, where a
// reviewer sees the consent prompt change. `changing-permissions` owns when
// such a diff is the right one.

/** The consent surface, exactly. Every field a user is asked to accept. */
const EXPECTED_CONSENT = {
  permissions: ["storage"],
  optional_permissions: undefined,
  host_permissions: undefined,
  optional_host_permissions: undefined,
  contentScriptMatches: [["https://example.com/*"]],
  externally_connectable: undefined,
  web_accessible_resources: undefined,
};

interface Manifest {
  manifest_version: number;
  name: string;
  description?: string;
  version: string;
  default_locale?: string;
  icons?: Record<string, string>;
  permissions?: string[];
  optional_permissions?: string[];
  host_permissions?: string[];
  optional_host_permissions?: string[];
  content_scripts?: { matches: string[] }[];
  externally_connectable?: unknown;
  web_accessible_resources?: unknown;
  content_security_policy?: { extension_pages?: string };
  background?: { service_worker?: string; type?: string };
}

describe.each([
  { browser: "Chrome", directory: "chrome-mv3", buildCommand: "pnpm build" },
  { browser: "Edge", directory: "edge-mv3", buildCommand: "pnpm build:edge" },
])("the built $browser manifest", ({ directory, buildCommand }) => {
  const outputDirectory = path.join(repoRoot, ".output", directory);
  let manifest: Manifest;

  beforeAll(() => {
    const file = path.join(outputDirectory, "manifest.json");
    if (!existsSync(file)) {
      throw new Error(
        `ERR_MANIFEST_NO_BUILD: ${file} does not exist; run \`${buildCommand}\` first`,
      );
    }
    manifest = JSON.parse(readFileSync(file, "utf8")) as Manifest;
  });

  it("is Manifest V3 with a service worker background", () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.background?.service_worker).toBeTypeOf("string");
  });

  it("asks for exactly the pinned permissions and host access", () => {
    expect({
      permissions: manifest.permissions,
      optional_permissions: manifest.optional_permissions,
      host_permissions: manifest.host_permissions,
      optional_host_permissions: manifest.optional_host_permissions,
      contentScriptMatches: manifest.content_scripts?.map((script) => script.matches),
      externally_connectable: manifest.externally_connectable,
      web_accessible_resources: manifest.web_accessible_resources,
    }).toStrictEqual(EXPECTED_CONSENT);
  });

  it("keeps the default extension-page CSP, which forbids eval and remote script", () => {
    expect(manifest.content_security_policy).toBeUndefined();
  });

  it("carries the version package.json declares", () => {
    const pkg = JSON.parse(
      readFileSync(path.join(repoRoot, "package.json"), "utf8"),
    ) as {
      version: string;
    };
    expect(manifest.version).toBe(pkg.version);
  });

  it("takes its name and description from the default locale's catalog", () => {
    expect(manifest.name).toBe("__MSG_extName__");
    expect(manifest.description).toBe("__MSG_extDescription__");
    const catalog = path.join(
      outputDirectory,
      "_locales",
      manifest.default_locale ?? "",
      "messages.json",
    );
    const messages = JSON.parse(readFileSync(catalog, "utf8")) as Record<
      string,
      unknown
    >;
    expect(Object.keys(messages)).toEqual(
      expect.arrayContaining(["extName", "extDescription"]),
    );
  });

  it("ships every icon it names, including the 128px one the store requires", () => {
    expect(manifest.icons?.["128"]).toBeDefined();
    const missing = Object.values(manifest.icons ?? {}).filter(
      (icon) => !existsSync(path.join(outputDirectory, icon)),
    );
    expect(missing).toStrictEqual([]);
  });
});
