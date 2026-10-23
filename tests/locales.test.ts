import { readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { readText, repoRoot } from "./repo-tree";

// `src/locales/<lang>.json` is compiled by `@wxt-dev/i18n` into
// `_locales/<lang>/messages.json`. `i18n.t` is typed against the default
// locale, so a key missing from `en.json` fails `tsc`; what no type can see is
// a key another catalog lacks, which Chrome answers with the default locale's
// text — or, for a key only that catalog has, with an empty string.

const localesDirectory = path.join(repoRoot, "src", "locales");
const DEFAULT_LOCALE = "en";

type Catalog = Record<string, unknown>;

function load(locale: string): Catalog {
  const text = readText(`src/locales/${locale}.json`);
  if (text === undefined) {
    throw new Error(`ERR_LOCALE_MISSING: src/locales/${locale}.json is not readable`);
  }
  return JSON.parse(text) as Catalog;
}

function flatten(catalog: Catalog, prefix = ""): Map<string, unknown> {
  const entries = new Map<string, unknown>();
  for (const [key, value] of Object.entries(catalog)) {
    const name = prefix === "" ? key : `${prefix}.${key}`;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      for (const [nested, leaf] of flatten(value as Catalog, name)) {
        entries.set(nested, leaf);
      }
    } else {
      entries.set(name, value);
    }
  }
  return entries;
}

const locales = readdirSync(localesDirectory)
  .filter((file) => file.endsWith(".json"))
  .map((file) => file.slice(0, -".json".length))
  .sort();

describe("the locale catalogs", () => {
  it("include the default locale wxt.config.ts names", () => {
    expect(locales).toContain(DEFAULT_LOCALE);
  });

  const reference = flatten(load(DEFAULT_LOCALE));

  it.each(locales)(
    "%s defines exactly the default locale's keys, each a non-empty string",
    (locale) => {
      const catalog = flatten(load(locale));
      expect([...catalog.keys()].sort()).toStrictEqual([...reference.keys()].sort());
      for (const [key, value] of catalog) {
        expect(
          typeof value === "string" && value.trim() !== "",
          `${locale}: ${key}`,
        ).toBe(true);
      }
    },
  );

  // Chrome Web Store limits, which the store enforces at upload rather than at
  // build time: 75 characters for the name, 132 for the summary.
  it.each(locales)(
    "%s keeps the store listing's name and summary within the store's limits",
    (locale) => {
      const catalog = flatten(load(locale));
      expect(String(catalog.get("extName")).length).toBeLessThanOrEqual(75);
      expect(String(catalog.get("extDescription")).length).toBeLessThanOrEqual(132);
    },
  );
});
