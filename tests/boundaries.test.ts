import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// `eslint.config.mjs` states the zone edges as `no-restricted-imports`
// patterns; this file asserts the same edges from the module graph itself, so
// a rule deleted from that config still fails the suite. The two are checked
// independently on purpose — a boundary that only one layer holds is a
// boundary one edit removes.
//
// The scanner below is deliberately not a TypeScript parser, for the same
// reason `tests/workflows.test.ts` does not parse YAML: a parser would be a new
// dependency for a repository whose point is a small, reviewable dependency
// surface, and what is asserted here is the specifier *as written*, which is
// exactly what survives comment-stripping and nothing more.

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

// --- scanning ----------------------------------------------------------------

/**
 * Remove every comment, so a path named in TSDoc prose is not read as an
 * import.
 *
 * @remarks
 * Block comments go first: a `//` inside one would otherwise be treated as the
 * start of a line comment and swallow the rest of that line only, leaving the
 * comment's closing delimiter behind. Nothing under `src/` contains a `//`
 * inside a string literal today, and {@link SCANNER_CONTROL} pins the scanner's
 * output against a hand-written expectation so a source that did would show up
 * as a failure here rather than as a boundary silently going unchecked.
 */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

/**
 * Every module specifier `source` imports, re-exports, or `import()`s.
 *
 * @remarks
 * The four spellings this repository can produce are covered in one pattern:
 * `from "x"` (a static import or a re-export), a side-effect `import "x"`, a
 * dynamic `import("x")`, and `require("x")`.
 */
function importSpecifiers(source: string): string[] {
  const pattern =
    /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)["']([^"'\n]+)["']/g;
  return [...withoutComments(source).matchAll(pattern)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );
}

/** Every `.ts`/`.tsx` file under `directory`, as repo-relative POSIX paths. */
function modulesUnder(directory: string): string[] {
  const absolute = path.join(repoRoot, directory);
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const relative = `${directory}/${entry.name}`;
    if (entry.isDirectory()) {
      return modulesUnder(relative);
    }
    return /\.tsx?$/.test(entry.name) ? [relative] : [];
  });
}

/**
 * The repo-relative module a specifier names, or `undefined` for a package.
 *
 * @remarks
 * Two spellings reach a module of this repository's own. A relative one is
 * resolved against the importer's directory. An `@/…` one goes through the
 * alias `tsconfig.json` maps to `./src/*`, so it is resolved against `src/`
 * whatever the importer's depth — without this branch every zone assertion
 * below would silently stop seeing an aliased import, which is the shape
 * shadcn/ui writes and the reason the alias exists at all.
 */
function resolveWithin(module: string, specifier: string): string | undefined {
  if (specifier.startsWith("@/")) {
    return path.posix.normalize(path.posix.join("src", specifier.slice("@/".length)));
  }
  if (!specifier.startsWith(".")) {
    return undefined;
  }
  return path.posix.normalize(path.posix.join(path.posix.dirname(module), specifier));
}

/** Whether `specifier` reaches `pkg` — the package itself or any subpath. */
function importsPackage(specifier: string, pkg: string): boolean {
  return specifier === pkg || specifier.startsWith(`${pkg}/`);
}

interface Module {
  /** Repo-relative POSIX path, e.g. `src/background/index.ts`. */
  readonly file: string;
  readonly specifiers: readonly string[];
}

const sourceModules: readonly Module[] = modulesUnder("src")
  .sort()
  .map((file) => ({
    file,
    specifiers: importSpecifiers(readFileSync(path.join(repoRoot, file), "utf8")),
  }));

function modulesIn(...zones: readonly string[]): Module[] {
  return sourceModules.filter((module) =>
    zones.some((zone) => module.file.startsWith(`${zone}/`)),
  );
}

// --- the scanner itself ------------------------------------------------------

// A boundary test whose scanner quietly finds nothing passes forever while
// enforcing nothing, so the scanner is pinned before the zones are asserted
// with it. Every case that could silence it is here: a specifier inside a
// block comment, one inside a line comment, and one inside an ordinary string.
const SCANNER_CONTROL = `
import defaultExport from "react";
import { named } from "../core/counter";
import "../../assets/globals.css";
import type { OnlyAType } from "@radix-ui/react-slot";
import { aliased } from "@/core/counter";
export { re } from "./errors";
const lazy = await import("../platform/storage");
const legacy = require("node:fs");
const message = "imported from ../background/index by hand";
// import { commented } from "./line-comment-only";
/* import { blocked } from "./block-comment-only"; */
`;

/**
 * Modules the walk has to come back with, chosen for the shapes they cover.
 *
 * @remarks
 * A named subset rather than the whole tree: enumerating every module made the
 * suite fail on each legal new file, which teaches its reader to edit the
 * expectation. Each entry earns its place — three directories deep (the
 * recursion), a `.tsx` beside an `index.html` (the extension filter), an
 * entrypoint at the top of its tree, and one module in each zone the rules
 * below are about.
 */
const SCAN_ANCHORS = [
  "src/background/index.ts",
  "src/components/hooks/use-stored-value.ts",
  "src/content/marker.ts",
  "src/core/counter.ts",
  "src/entrypoints/background.ts",
  "src/entrypoints/popup/main.tsx",
  "src/platform/storage.ts",
];

describe("the import scanner the zone assertions run on", () => {
  it("finds every spelling of an import and nothing that only looks like one", () => {
    expect(importSpecifiers(SCANNER_CONTROL)).toStrictEqual([
      "react",
      "../core/counter",
      "../../assets/globals.css",
      "@radix-ui/react-slot",
      "@/core/counter",
      "./errors",
      "../platform/storage",
      "node:fs",
    ]);
  });

  it.each([
    [
      "src/background/index.ts",
      [
        "../core/counter",
        "../platform/badge",
        "../platform/messaging",
        "../platform/storage",
      ],
    ],
    ["src/entrypoints/background.ts", ["wxt/utils/define-background", "../background"]],
    [
      "src/components/ui/button.tsx",
      [
        "@radix-ui/react-slot",
        "class-variance-authority",
        "react",
        "@/components/lib/utils",
      ],
    ],
  ])("reads %s as %p", (file, expected) => {
    const module = sourceModules.find((candidate) => candidate.file === file);
    expect(module?.specifiers).toStrictEqual(expected);
  });

  it("reaches every anchor, so the walk is not stuck in a subdirectory of src/", () => {
    expect(sourceModules.map((module) => module.file)).toEqual(
      expect.arrayContaining(SCAN_ANCHORS),
    );
  });

  // `arrayContaining` above only proves presence: it would still pass if
  // `modulesUnder`'s `/\.tsx?$/` filter were dropped and every `.css`, `.html`
  // or `.json` file under `src/` joined `sourceModules` too.
  it("returns nothing but .ts and .tsx files", () => {
    expect(sourceModules.every((module) => /\.tsx?$/.test(module.file))).toBe(true);
  });

  it("resolves a relative specifier to the module it names", () => {
    expect(resolveWithin("src/background/index.ts", "../platform/storage")).toBe(
      "src/platform/storage",
    );
    expect(
      resolveWithin("src/entrypoints/popup/main.tsx", "../../components/count-panel"),
    ).toBe("src/components/count-panel");
    expect(resolveWithin("src/core/counter.ts", "react")).toBeUndefined();
  });

  it("resolves an @/ specifier against src/, from any depth, and no package name", () => {
    expect(
      resolveWithin("src/components/ui/button.tsx", "@/components/lib/utils"),
    ).toBe("src/components/lib/utils");
    // The whole point of the `@/` branch: the same specifier resolves to the
    // same module whatever file names it, which a `../` one cannot do.
    expect(resolveWithin("src/core/counter.ts", "@/platform/storage")).toBe(
      "src/platform/storage",
    );
    // A scoped package is `@scope/name` and an empty scope is not legal, so
    // nothing a registry publishes can be mistaken for an aliased path.
    expect(
      resolveWithin("src/core/counter.ts", "@radix-ui/react-slot"),
    ).toBeUndefined();
  });
});

// --- the zone edges ----------------------------------------------------------

/**
 * Every zone under `src/`, and the zones a module in it may not import.
 *
 * @remarks
 * AGENTS.md's import order written as a table: `entrypoints` on top,
 * `background` and `content` → `platform` → `core`, and `components` → `core`
 * beside them. A zone added to `src/` has to be given a row here before this
 * suite passes, which is the review the table exists to force.
 * `eslint.config.mjs` states the same edges as `no-restricted-imports` groups;
 * the two layers are checked independently, so a rule deleted there still
 * fails here.
 *
 * `src/assets` and `src/locales` hold a stylesheet and the catalogs, no
 * modules, so their rows are empty and exist only so the zone list below is
 * complete.
 */
const FORBIDDEN_ZONE_IMPORTS: Readonly<Record<string, readonly string[]>> = {
  "src/assets": [],
  "src/background": ["src/components", "src/content", "src/entrypoints"],
  "src/components": [
    "src/background",
    "src/content",
    "src/entrypoints",
    "src/platform",
  ],
  "src/content": ["src/background", "src/components", "src/entrypoints"],
  "src/core": [
    "src/background",
    "src/components",
    "src/content",
    "src/entrypoints",
    "src/platform",
  ],
  "src/entrypoints": [],
  "src/locales": [],
  "src/platform": [
    "src/background",
    "src/components",
    "src/content",
    "src/entrypoints",
  ],
};

/** Zones that hold modules, which the coverage case below insists it saw. */
const MODULE_ZONES = Object.keys(FORBIDDEN_ZONE_IMPORTS).filter(
  (zone) => zone !== "src/assets" && zone !== "src/locales",
);

/** Whether `resolved` is `zone` itself or a module inside it. */
function inZone(resolved: string, zone: string): boolean {
  return resolved === zone || resolved.startsWith(`${zone}/`);
}

/**
 * `"<file>: <specifier>"` for every import crossing an edge the table forbids.
 *
 * @remarks
 * The module list is a parameter rather than {@link sourceModules} closed over,
 * so the checker can be driven with a synthetic module and proved to report as
 * well as to stay silent.
 */
function crossZoneOffenders(modules: readonly Module[]): string[] {
  return modules.flatMap((module) => {
    const zone = Object.keys(FORBIDDEN_ZONE_IMPORTS).find((candidate) =>
      inZone(module.file, candidate),
    );
    const forbidden = zone === undefined ? [] : (FORBIDDEN_ZONE_IMPORTS[zone] ?? []);
    return module.specifiers
      .filter((specifier) => {
        const resolved = resolveWithin(module.file, specifier);
        return (
          resolved !== undefined && forbidden.some((other) => inZone(resolved, other))
        );
      })
      .map((specifier) => `${module.file}: ${specifier}`);
  });
}

/** `"<file>: <specifier>"` for every import of `modules` reaching one of `packages`. */
function packageOffenders(
  modules: readonly Module[],
  packages: readonly string[],
): string[] {
  return modules.flatMap((module) =>
    module.specifiers
      .filter((specifier) => packages.some((pkg) => importsPackage(specifier, pkg)))
      .map((specifier) => `${module.file}: ${specifier}`),
  );
}

describe("src/ imports run one way: entrypoints on top, then background and content → platform → core, components → core", () => {
  it("reaches every zone that holds modules", () => {
    const unscanned = MODULE_ZONES.filter(
      (zone) => !sourceModules.some((module) => inZone(module.file, zone)),
    );
    expect(unscanned).toStrictEqual([]);
  });

  it("gives every zone under src/ a row, so a new one needs a decision", () => {
    const zones = readdirSync(path.join(repoRoot, "src"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `src/${entry.name}`)
      .sort();
    expect(zones).toStrictEqual(Object.keys(FORBIDDEN_ZONE_IMPORTS).sort());
  });

  it("keeps no module at the root of src/, where no zone rule reaches it", () => {
    const atRoot = sourceModules
      .map((module) => module.file)
      .filter((file) => file.split("/").length === 2);
    expect(atRoot).toStrictEqual([]);
  });

  it.each(Object.entries(FORBIDDEN_ZONE_IMPORTS))(
    "leaves %s importing none of %p",
    (zone) => {
      expect(crossZoneOffenders(modulesIn(zone))).toStrictEqual([]);
    },
  );

  it("reports a crossing when there is one, so the rows above are not vacuous", () => {
    const offenders = crossZoneOffenders([
      {
        file: "src/core/probe.ts",
        specifiers: ["../platform/storage", "./counter", "react"],
      },
    ]);
    expect(offenders).toStrictEqual(["src/core/probe.ts: ../platform/storage"]);
  });

  // The same control for the spelling the alias made possible. Without the
  // `@/` branch in `resolveWithin` this crossing resolves to nothing, and every
  // row above passes while enforcing nothing against an aliased import.
  it("reports an aliased crossing too, so the @/ spelling is not a way around the table", () => {
    const offenders = crossZoneOffenders([
      {
        file: "src/components/probe.tsx",
        specifiers: [
          "@/platform/storage",
          "@/core/counter",
          "@/components/lib/utils",
          "react",
        ],
      },
    ]);
    expect(offenders).toStrictEqual(["src/components/probe.tsx: @/platform/storage"]);
  });
});

/** Every package that reaches a browser or extension API. */
const BROWSER_APIS = [
  "wxt",
  "@wxt-dev",
  "@webext-core",
  "#i18n",
  "webextension-polyfill",
];

/** React and the libraries the components are built from. */
const UI_LIBRARIES = ["react", "react-dom", "@radix-ui"];

/**
 * `importsPackage` treats a scope as a package, so `@wxt-dev` matches every
 * `@wxt-dev/…` subpath and the lists above stay one entry per vendor.
 */
describe("each zone names only the libraries its context has", () => {
  it.each([
    ["src/core", [...BROWSER_APIS, ...UI_LIBRARIES]],
    ["src/platform", UI_LIBRARIES],
    ["src/background", UI_LIBRARIES],
    ["src/content", UI_LIBRARIES],
    ["src/components", BROWSER_APIS],
  ])("%s imports none of %p", (zone, packages) => {
    expect(packageOffenders(modulesIn(zone), packages)).toStrictEqual([]);
  });

  it("reports a browser API in a component, so the rows above are not vacuous", () => {
    expect(
      packageOffenders(
        [
          {
            file: "src/components/probe.tsx",
            specifiers: ["wxt/browser", "@wxt-dev/storage", "react"],
          },
        ],
        BROWSER_APIS,
      ),
    ).toStrictEqual([
      "src/components/probe.tsx: wxt/browser",
      "src/components/probe.tsx: @wxt-dev/storage",
    ]);
  });
});

describe("a screen reaches the service worker by message, never by import", () => {
  // The popup and options pages live one directory down, under
  // src/entrypoints/<name>/; the two top-level files are the worker's and the
  // content script's own entrypoints, which do import their zones.
  const screens = sourceModules.filter(
    (module) =>
      module.file.startsWith("src/entrypoints/") && module.file.split("/").length > 3,
  );

  it("finds the screens it is about", () => {
    expect(screens.map((module) => module.file)).toEqual(
      expect.arrayContaining([
        "src/entrypoints/popup/main.tsx",
        "src/entrypoints/options/main.tsx",
      ]),
    );
  });

  it("leaves every screen importing nothing from src/background or src/content", () => {
    const offenders = screens.flatMap((module) =>
      module.specifiers
        .filter((specifier) => {
          const resolved = resolveWithin(module.file, specifier);
          return (
            resolved !== undefined &&
            (inZone(resolved, "src/background") || inZone(resolved, "src/content"))
          );
        })
        .map((specifier) => `${module.file}: ${specifier}`),
    );
    expect(offenders).toStrictEqual([]);
  });
});
