import { describe, expect, it } from "vitest";

import { readText, repoRoot, walk } from "./repo-tree";

// The template ships with its identity written out as placeholder strings —
// a package name, a repository slug, an author, a one-line description, the
// name a visitor reads — which whoever starts an app from it replaces.
// `scripts/bootstrap.mjs` used to hold both halves of that: the rewrite and
// the check that no placeholder survived it. Issue #26 removed the rewrite
// (it was profile-driven machinery that self-deleted), and the check went
// with it, leaving nothing that notices a placeholder leaking into a file
// that has no business carrying one.
//
// This is that check, rebuilt as a test over the real tree. It pins the
// complete inventory rather than merely forbidding placeholders: a new file
// that picks one up fails, and so does an inventory entry that has gone stale,
// which is what makes this list usable as the rename checklist a new app
// works through. A new app replaces each site the inventory names below and
// deletes that row from EXPECTED_INVENTORY; it is finished when the list is
// empty and this suite is green — an empty list then means no identity string
// or open product/design decision of this template survived. `starting-an-app`
// owns the order and the values to write in; this file owns the list.

/**
 * Every template identity string or marker for a decision a new app must settle.
 *
 * @remarks
 * `you@example.com` and `your-name` are listed although nothing carries them
 * today: they are identity strings the template has used, and a field
 * reintroducing either should fail here rather than ship. A token that
 * matches nothing simply contributes no rows to the inventory below.
 *
 * `tomada1114/chrome-extension-template` is not a blank like the others — it
 * is this template's real repository slug, and it names this template just as
 * literally as `my-extension` does. A fork that keeps it points its CI badge
 * and its vulnerability-report links at someone else's repository. Only the
 * full slug is listed: a bare `tomada1114` would match
 * `tests/sync-labels.test.ts`'s `tomada1114/typescript-template` fixture
 * data.
 *
 * The next four are what a user sees, which the package name and the slug do
 * not cover: an extension that renamed everything machine-facing still
 * installs as this template. Two are the extension's display name, one per
 * catalog language — `extName`, which the manifest, the toolbar tooltip, both
 * screens' titles and the store listing all read — and two are `extDescription`,
 * the manifest description the extensions page and the store show. Coverage is
 * per known value, not per key: a catalog added later contributes no row until
 * its own value is added here. The Japanese values are needles AGENTS.md's
 * Conventions allows a test to quote verbatim: deriving them from
 * `src/locales/ja.json` at runtime would make their rows self-fulfilling.
 * The display name also occurs inside each catalog's `content.marker` string,
 * which a rename rewrites in the same file anyway.
 *
 * The last two entries are decisions the template leaves open on purpose:
 * the design direction and the product. `src/assets/globals.css` ships stock
 * shadcn/ui tokens and `designing-ui` an empty lock, both carrying this
 * marker, so a project that renamed everything still reports that its screens
 * are being built against a direction nobody chose. AGENTS.md's Product
 * section carries the product marker until the new extension describes its
 * purpose, single purpose, core actions and non-goals, immediately after
 * renaming.
 */
const PLACEHOLDERS = [
  "my-extension",
  "your-name",
  "Your Name",
  "you@example.com",
  "A short description.",
  "tomada1114/chrome-extension-template",
  "Chrome Extension Template",
  "Chrome 拡張機能テンプレート",
  "A Manifest V3 extension skeleton.",
  "Manifest V3 拡張機能のひな形です。",
  "DESIGN DIRECTION: UNSETTLED",
  "PRODUCT: UNDESCRIBED",
] as const;

/**
 * The complete inventory of where a placeholder still stands, as
 * `<file>: <placeholder>` rows.
 *
 * @remarks
 * These files *are* the template's identity, so a placeholder in them is
 * intended, not a leak: they are what a new extension rewrites first. Five
 * carry the repository's identity — the package name and description, the
 * slug, the copyright holder — and the two catalogs carry what a user reads.
 * Everything else in the tree — the rest of `src/`, `tests/`, `e2e/`,
 * `scripts/`, the skills, the workflows, `CONTRIBUTING.md`, `AGENTS.md` — must
 * name no identity string, so the rename is a bounded edit to these files
 * rather than a repository-wide search that can miss one. `e2e/` in
 * particular reads the strings it asserts from the catalogs. Three of the
 * rows are the template's real repository slug rather than a blank,
 * deliberately: the CI badge and the two security-advisory links have to
 * resolve *while this repository is the template*, and a fork replaces them
 * like any other row.
 *
 * The product and design-direction rows sit outside that count: AGENTS.md
 * carries the product marker; the stylesheet and both copies of
 * `designing-ui` carry the design marker until a new extension settles its
 * direction, which `starting-an-app` sequences after the rename.
 */
const EXPECTED_INVENTORY = [
  ".agents/skills/designing-ui/SKILL.md: DESIGN DIRECTION: UNSETTLED",
  ".claude/skills/designing-ui/SKILL.md: DESIGN DIRECTION: UNSETTLED",
  ".github/ISSUE_TEMPLATE/config.yml: tomada1114/chrome-extension-template",
  "AGENTS.md: PRODUCT: UNDESCRIBED",
  "LICENSE: Your Name",
  "README.md: A short description.",
  "README.md: Your Name",
  "README.md: my-extension",
  "README.md: tomada1114/chrome-extension-template",
  "SECURITY.md: tomada1114/chrome-extension-template",
  "package.json: A short description.",
  "package.json: my-extension",
  "src/assets/globals.css: DESIGN DIRECTION: UNSETTLED",
  "src/locales/en.json: A Manifest V3 extension skeleton.",
  "src/locales/en.json: Chrome Extension Template",
  "src/locales/ja.json: Chrome 拡張機能テンプレート",
  "src/locales/ja.json: Manifest V3 拡張機能のひな形です。",
];

/**
 * This file, which necessarily spells out every placeholder it looks for.
 *
 * @remarks
 * Excluded by path rather than by some marker in the text, so the exclusion
 * cannot be copied into another file by accident.
 */
const THIS_FILE = "tests/placeholders.test.ts";

const scanned = walk(repoRoot).filter((relative) => relative !== THIS_FILE);

const inventory = scanned
  .flatMap((relative) => {
    const text = readText(relative);
    return text === undefined
      ? []
      : PLACEHOLDERS.filter((placeholder) => text.includes(placeholder)).map(
          (placeholder) => `${relative}: ${placeholder}`,
        );
  })
  .sort();

describe("the template's own identity strings", () => {
  // An inventory test is only as good as the tree it walked, so the walk is
  // pinned first: a skip list that grew too broad would otherwise turn this
  // file into a test that scans almost nothing and passes.
  it.each([
    "README.md",
    "package.json",
    "CONTRIBUTING.md",
    "AGENTS.md",
    "src/entrypoints/popup/main.tsx",
    "src/core/result.ts",
    "src/locales/en.json",
    "e2e/content.spec.ts",
    "scripts/check-staged.mjs",
    ".github/workflows/ci.yml",
    ".agents/skills/changing-gates/SKILL.md",
    ".claude/skills/changing-gates/SKILL.md",
  ])("are looked for in %s", (relative) => {
    expect(scanned).toContain(relative);
  });

  it("are not looked for in this file, which has to name every one of them", () => {
    expect(scanned).not.toContain(THIS_FILE);
  });

  it("survive only in the files that carry the template's identity", () => {
    expect(inventory).toStrictEqual(EXPECTED_INVENTORY);
  });
});

describe("the badge and advisory URLs", () => {
  // The inventory above only proves the slug appears *somewhere* in each file;
  // it would pass on a badge URL missing its workflow filename. This pins each
  // URL by its shape instead — path segments and filename — with owner and
  // repository left open on purpose: a renamed project writes its own slug in,
  // and pinning this template's would make the rename `starting-an-app`
  // documents impossible to finish with a green suite. The slug itself is the
  // inventory's job, one row per file.
  it.each([
    [
      "README.md",
      /https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/actions\/workflows\/ci\.yml/,
    ],
    [
      ".github/ISSUE_TEMPLATE/config.yml",
      /https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/security\/advisories\/new/,
    ],
    [
      "SECURITY.md",
      /https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/security\/advisories\/new/,
    ],
  ])("%s carries a well-formed repository URL", (relative, pattern) => {
    expect(readText(relative)).toMatch(pattern);
  });
});
