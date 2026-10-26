import {
  lutimesSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { assertFreshBuild } from "../scripts/lib/build-freshness.mjs";

const BEFORE_BUILD = new Date("2020-01-01T00:00:00Z");
const BUILD_TIME = new Date("2020-01-02T00:00:00Z");
const AFTER_BUILD = new Date("2020-01-03T00:00:00Z");
const workspaces: string[] = [];

function makeRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), "build-freshness-"));
  workspaces.push(root);
  return root;
}

function writeFile(root: string, file: string, modified: Date): string {
  const target = path.join(root, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, "fixture\n");
  utimesSync(target, modified, modified);
  return target;
}

afterEach(() => {
  for (const root of workspaces.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

const suites = [
  {
    name: "Chrome manifest",
    manifest: ".output/chrome-mv3/manifest.json",
    stage: "MANIFEST",
    buildCommand: "pnpm build",
    missingCode: "ERR_MANIFEST_NO_BUILD",
    staleCode: "ERR_MANIFEST_STALE_BUILD",
  },
  {
    name: "Edge manifest",
    manifest: ".output/edge-mv3/manifest.json",
    stage: "MANIFEST",
    buildCommand: "pnpm build:edge",
    missingCode: "ERR_MANIFEST_NO_BUILD",
    staleCode: "ERR_MANIFEST_STALE_BUILD",
  },
  {
    name: "Chrome end-to-end",
    manifest: ".output/chrome-mv3/manifest.json",
    stage: "E2E",
    buildCommand: "pnpm build",
    missingCode: "ERR_E2E_NO_BUILD",
    staleCode: "ERR_E2E_STALE_BUILD",
  },
] as const;

describe.each(suites)("$name build precondition", (suite) => {
  function check(root: string): void {
    assertFreshBuild({
      root,
      manifestPath: path.join(root, suite.manifest),
      stage: suite.stage,
      buildCommand: suite.buildCommand,
    });
  }

  it("refuses a missing build with the suite's existing code", () => {
    expect(() => check(makeRoot())).toThrow(
      expect.objectContaining({ code: suite.missingCode }),
    );
  });

  it("refuses a directory where the manifest file should be", () => {
    const root = makeRoot();
    mkdirSync(path.join(root, suite.manifest), { recursive: true });

    expect(() => check(root)).toThrow(
      expect.objectContaining({ code: suite.missingCode }),
    );
  });

  it.each([
    "src/nested/entry.ts",
    "src/assets/.hidden-style",
    "public/icon/nested/icon.png",
    "wxt.config.ts",
  ])("refuses output older than %s", (input) => {
    const root = makeRoot();
    writeFile(root, suite.manifest, BUILD_TIME);
    writeFile(root, input, AFTER_BUILD);

    expect(() => check(root)).toThrow(
      expect.objectContaining({ code: suite.staleCode }),
    );
  });

  it.each([BEFORE_BUILD, BUILD_TIME])(
    "accepts inputs last modified at %s",
    (modified) => {
      const root = makeRoot();
      writeFile(root, suite.manifest, BUILD_TIME);
      writeFile(root, "src/nested/entry.ts", modified);
      writeFile(root, "public/icon.png", modified);
      writeFile(root, "wxt.config.ts", modified);
      // Only input files determine freshness, even if a directory is newer.
      utimesSync(path.join(root, "src"), AFTER_BUILD, AFTER_BUILD);

      expect(() => check(root)).not.toThrow();
    },
  );

  it("accepts a build when no input files are present", () => {
    const root = makeRoot();
    writeFile(root, suite.manifest, BUILD_TIME);

    expect(() => check(root)).not.toThrow();
  });

  it("ignores newer files outside the build inputs", () => {
    const root = makeRoot();
    writeFile(root, suite.manifest, BUILD_TIME);
    writeFile(root, "README.md", AFTER_BUILD);
    writeFile(root, "tests/example.test.ts", AFTER_BUILD);

    expect(() => check(root)).not.toThrow();
  });
});

describe("browser build independence", () => {
  it.each([
    ["chrome-mv3", "edge-mv3"],
    ["edge-mv3", "chrome-mv3"],
  ])("rejects stale %s even when %s is fresh", (stale, fresh) => {
    const root = makeRoot();
    const staleManifest = writeFile(
      root,
      `.output/${stale}/manifest.json`,
      BEFORE_BUILD,
    );
    const freshManifest = writeFile(
      root,
      `.output/${fresh}/manifest.json`,
      AFTER_BUILD,
    );
    writeFile(root, "src/entry.ts", BUILD_TIME);

    expect(() =>
      assertFreshBuild({
        root,
        manifestPath: staleManifest,
        stage: "MANIFEST",
        buildCommand: "pnpm build",
      }),
    ).toThrow(expect.objectContaining({ code: "ERR_MANIFEST_STALE_BUILD" }));
    expect(() =>
      assertFreshBuild({
        root,
        manifestPath: freshManifest,
        stage: "MANIFEST",
        buildCommand: "pnpm build",
      }),
    ).not.toThrow();
  });
});

describe("linked build inputs", () => {
  it.each(["file", "directory"] as const)(
    "checks a source %s link's target",
    (kind) => {
      const root = makeRoot();
      const manifestPath = writeFile(
        root,
        ".output/chrome-mv3/manifest.json",
        BUILD_TIME,
      );
      const target = writeFile(root, "linked/entry.ts", AFTER_BUILD);
      mkdirSync(path.join(root, "src"));
      symlinkSync(
        kind === "file" ? target : path.dirname(target),
        path.join(root, "src", "linked"),
        kind === "file" ? "file" : "dir",
      );
      lutimesSync(path.join(root, "src", "linked"), BEFORE_BUILD, BEFORE_BUILD);

      expect(() =>
        assertFreshBuild({
          root,
          manifestPath,
          stage: "E2E",
          buildCommand: "pnpm build",
        }),
      ).toThrow(expect.objectContaining({ code: "ERR_E2E_STALE_BUILD" }));
    },
  );

  it("finishes a directory-link cycle when all files predate the build", () => {
    const root = makeRoot();
    const manifestPath = writeFile(
      root,
      ".output/chrome-mv3/manifest.json",
      BUILD_TIME,
    );
    writeFile(root, "src/entry.ts", BEFORE_BUILD);
    symlinkSync(path.join(root, "src"), path.join(root, "src", "loop"), "dir");
    lutimesSync(path.join(root, "src", "loop"), BEFORE_BUILD, BEFORE_BUILD);

    expect(() =>
      assertFreshBuild({
        root,
        manifestPath,
        stage: "E2E",
        buildCommand: "pnpm build",
      }),
    ).not.toThrow();
  });

  it.each(["file", "directory", "config"] as const)(
    "refuses a newer %s link even when its target predates the build",
    (kind) => {
      const root = makeRoot();
      const manifestPath = writeFile(
        root,
        ".output/chrome-mv3/manifest.json",
        BUILD_TIME,
      );
      const target = writeFile(root, "linked/entry.ts", BEFORE_BUILD);
      mkdirSync(path.join(root, "src"));
      const link = path.join(root, kind === "config" ? "wxt.config.ts" : "src/linked");
      symlinkSync(
        kind === "directory" ? path.dirname(target) : target,
        link,
        kind === "directory" ? "dir" : "file",
      );
      lutimesSync(link, AFTER_BUILD, AFTER_BUILD);

      expect(() =>
        assertFreshBuild({
          root,
          manifestPath,
          stage: "E2E",
          buildCommand: "pnpm build",
        }),
      ).toThrow(expect.objectContaining({ code: "ERR_E2E_STALE_BUILD" }));
    },
  );

  it("checks a link's own timestamp even after visiting its target directory", () => {
    const root = makeRoot();
    const manifestPath = writeFile(
      root,
      ".output/chrome-mv3/manifest.json",
      BUILD_TIME,
    );
    writeFile(root, "src/a-directory/entry.ts", BEFORE_BUILD);
    const link = path.join(root, "src", "z-link");
    symlinkSync(path.join(root, "src", "a-directory"), link, "dir");
    lutimesSync(link, AFTER_BUILD, AFTER_BUILD);

    expect(() =>
      assertFreshBuild({
        root,
        manifestPath,
        stage: "E2E",
        buildCommand: "pnpm build",
      }),
    ).toThrow(expect.objectContaining({ code: "ERR_E2E_STALE_BUILD" }));
  });
});
