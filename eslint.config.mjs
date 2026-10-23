import js from "@eslint/js";
import vitest from "@vitest/eslint-plugin";
import { defineConfig, globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

/**
 * The `enum` ban, applied to every file this config sees.
 *
 * @remarks
 * Stated here rather than as `tsconfig.json`'s `erasableSyntaxOnly`, so the
 * rule can name the reason rather than ban a whole syntax class.
 */
const NO_ENUM = {
  selector: "TSEnumDeclaration",
  message:
    "`enum` emits a runtime object no other TypeScript construct needs. Use a union of string literals, or an `as const` object.",
};

/**
 * The `export *` ban, shared by the whole `src/` tree and by the extra
 * entry-point rules below.
 *
 * @remarks
 * `no-restricted-syntax` options replace rather than merge across config
 * objects, so every narrower block that sets this rule has to restate the
 * entries it still wants — otherwise it silently switches them back on.
 */
const NO_EXPORT_STAR = {
  selector: "ExportAllDeclaration",
  message:
    "`export *` publishes symbols implicitly. Re-export each public symbol by name.",
};

/** What `src/internal/**` is, in the words of the rule that made it private. */
const INTERNAL_IS_PRIVATE =
  "src/internal/ is private. Tests reach it through the public surface of the module that owns it (see the `writing-tests` skill), and repository automation must not depend on module internals at all.";

/**
 * Markup built from strings, banned across `src/`.
 *
 * @remarks
 * A content script writes into a page the extension does not control, and a
 * popup renders text that came from storage, a message or a catalog. Every
 * one of these turns that text into markup — script included — and Chrome
 * Web Store review rejects an extension that does it with remote input. Build
 * nodes with `textContent` and `createElement`, or let React render them.
 */
const NO_HTML_STRINGS = [
  {
    selector:
      "AssignmentExpression > MemberExpression.left[property.name=/^(innerHTML|outerHTML)$/]",
    message:
      "Assigning innerHTML/outerHTML parses a string as markup. Build the nodes with createElement and textContent, or render them with React.",
  },
  {
    selector:
      "CallExpression[callee.property.name=/^(insertAdjacentHTML|write|writeln)$/]",
    message:
      "insertAdjacentHTML and document.write parse a string as markup. Build the nodes with createElement and textContent, or render them with React.",
  },
  {
    selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
    message:
      "dangerouslySetInnerHTML parses a string as markup. Render the content as React children instead.",
  },
];

/**
 * Each zone under `src/`, as every specifier that can reach into it.
 *
 * @remarks
 * A zone is reachable two ways. Relatively, leaving your own zone costs at
 * least one `../`, and the same module is `../platform/storage` from one file
 * and `../../platform/storage` from another. The globstar after the `../`
 * absorbs the rest whatever the importer's depth, so one pattern covers every
 * caller; the bare form is listed alongside the recursive one because a
 * directory import (`../background`) has no trailing segment for a trailing
 * globstar to match.
 *
 * The leading `../` is load-bearing, not decoration: an unanchored
 * `**\/content` would also match a package subpath of that name, and the
 * anchored form cannot, because a bare specifier never starts with `..` or `.`.
 *
 * Each entry also carries a `./../**` twin of every `../**` pattern, because
 * `no-restricted-imports` matches the specifier text through the `ignore`
 * package rather than resolving it, and `ignore` treats a leading `./` as a
 * different string from a leading `../`. A bare specifier still cannot start
 * with `./..`, so the twin is exactly as safe as the pattern it doubles.
 *
 * The other way is the `@/*` → `./src/*` alias, which shadcn/ui writes into
 * every component it copies in. It is already absolute from `src/`, so
 * `@/platform/**` names the zone from any depth, and it is safe to match
 * unanchored because no bare package name can start with `@/`. A zone left
 * without its `@/` twin would be a boundary the alias walks straight through,
 * which is why {@link zonePatterns} generates every entry with both.
 *
 * @param {string} name
 * @returns {string[]}
 */
function zonePatterns(name) {
  return [
    `../**/${name}`,
    `../**/${name}/**`,
    `./../**/${name}`,
    `./../**/${name}/**`,
    `@/${name}`,
    `@/${name}/**`,
  ];
}

const ZONE =
  /** @type {Record<"entrypoints" | "background" | "content" | "components" | "platform", string[]>} */ (
    Object.fromEntries(
      ["entrypoints", "background", "content", "components", "platform"].map((name) => [
        name,
        zonePatterns(name),
      ]),
    )
  );

/** Everything that reaches a browser or extension API, by package name. */
const BROWSER_APIS = [
  "wxt",
  "wxt/**",
  "@wxt-dev/**",
  "@webext-core/**",
  "#i18n",
  "webextension-polyfill",
];

/** React and the UI libraries `src/components/` is built from. */
const UI_LIBRARIES = ["react", "react/**", "react-dom", "react-dom/**", "@radix-ui/**"];

/** Why the service worker and the content script never reach a screen. */
const NO_SCREEN_IN_A_WORKER =
  "src/background/ and src/content/ run in a service worker and in someone else's page. Neither renders an extension screen, so neither names src/components/ or React — a content script that needs its own UI mounts it from src/content/ through WXT's content-script UI helpers.";

export default defineConfig([
  // Only generated trees are ignored; everything hand-written is linted,
  // including repository automation and config files. `.claude/skills/` is a
  // generated mirror of `.agents/skills/` (`pnpm agents:sync`), where the real
  // files are linted at their real path — linting the copy too would report
  // the same violation twice, at a path nobody may edit.
  // `.claude/worktrees/` holds full working copies created by agent sessions,
  // linted in their own checkout.
  // A `tests/fixtures/` file is malformed on purpose, so linting it reports
  // the very defect a test asserts on.
  // `.wxt/` and `.output/` are written by `wxt prepare` and `wxt build`, and
  // `test-results/` and `playwright-report/` by the end-to-end suite.
  globalIgnores([
    "dist/",
    ".wxt/",
    ".output/",
    "coverage/",
    "test-results/",
    "playwright-report/",
    ".claude/skills/",
    ".claude/worktrees/",
    "tests/fixtures/",
  ]),
  {
    linterOptions: {
      // A disable directive that no longer suppresses anything is dead weight
      // that hides the next real violation.
      reportUnusedDisableDirectives: "error",
    },
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          // `@ts-ignore` hides an error forever; `@ts-expect-error` fails once
          // the underlying problem is gone, so it is the only allowed escape
          // hatch and it must say why.
          "ts-ignore": true,
          "ts-nocheck": true,
          "ts-check": false,
          "ts-expect-error": "allow-with-description",
          minimumDescriptionLength: 10,
        },
      ],
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports" },
      ],
      "no-console": "error",
      "no-restricted-syntax": ["error", NO_ENUM],
    },
  },
  {
    // Manifest V3 forbids executing code that is not in the package, and the
    // default extension CSP blocks `eval` at runtime anyway. These make the
    // attempt a lint error rather than a console error in a user's browser.
    name: "src/no-dynamic-code",
    files: ["src/**/*.ts", "src/**/*.tsx"],
    rules: {
      "no-eval": "error",
      "no-implied-eval": "off",
      "@typescript-eslint/no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",
    },
  },
  {
    ...reactHooks.configs.flat["recommended-latest"],
    name: "src/react-hooks",
    files: ["src/**/*.ts", "src/**/*.tsx"],
  },
  {
    name: "src/shared-syntax",
    files: ["src/**/*.ts", "src/**/*.tsx"],
    rules: {
      "no-restricted-syntax": ["error", NO_ENUM, NO_EXPORT_STAR, ...NO_HTML_STRINGS],

      // A `switch` over a union is the one place where adding a member to that
      // union silently changes behavior instead of failing to compile. With
      // `considerDefaultExhaustiveForUnions`, a `default` branch is accepted as
      // the deliberate answer, so this asks for a decision rather than for a
      // case per member.
      "@typescript-eslint/switch-exhaustiveness-check": [
        "error",
        { considerDefaultExhaustiveForUnions: true },
      ],
    },
  },
  {
    name: "public-api/explicit-surface",
    files: ["src/**/*.ts", "src/**/*.tsx"],
    // WXT finds an entrypoint by its file name under `src/entrypoints/` and
    // reads its default export (`defineBackground`, `defineContentScript`), so
    // that tree is the one place where a default export is the interface
    // rather than an unnamed hole in one. Everywhere else under `src/` the
    // surface stays named exports, which is what a reviewer can read a diff of.
    ignores: ["src/entrypoints/**"],
    rules: {
      "no-restricted-exports": [
        "error",
        {
          restrictDefaultExports: {
            direct: true,
            named: true,
            defaultFrom: true,
            namedFrom: true,
            namespaceFrom: true,
          },
        },
      ],
    },
  },
  {
    name: "src/size-budget",
    files: ["src/**/*.ts", "src/**/*.tsx"],
    rules: {
      // Blank lines and comments count, deliberately: the budget is on how
      // much a reader has to hold at once, and a file is not easier to follow
      // because two thirds of it is prose. 200 is a ceiling, not a target —
      // every module under `src/` is well under it today, so the rule fires
      // only on a file that grew past the point where it does one thing.
      // Splitting is the answer; raising the number or writing a disable
      // directive is what AGENTS.md's "never weaken a gate" rules out.
      //
      // `tests/**` and `scripts/**` are deliberately outside this: a table-
      // driven suite and a repository automation entry point are both long by
      // nature, and capping them would buy nothing but split files.
      "max-lines": ["error", { max: 200, skipBlankLines: false, skipComments: false }],
    },
  },
  {
    // An entrypoint is wiring, and WXT bundles each one separately: logic
    // written here cannot be unit-tested without a browser, and a helper
    // shared between two entrypoints is bundled into both. Keep each file to
    // the calls that join the zones below.
    name: "src/entrypoints-stay-thin",
    files: ["src/entrypoints/**/*.ts", "src/entrypoints/**/*.tsx"],
    rules: {
      "max-lines": ["error", { max: 60, skipBlankLines: false, skipComments: false }],
    },
  },
  // --- zone boundaries -------------------------------------------------------
  //
  // AGENTS.md states one import order — `entrypoints` on top; `background` and
  // `content` → `platform` → `core`; `components` → `core` beside them — and the
  // blocks below are that order, written per zone as what each one may not
  // name. `tests/boundaries.test.ts` asserts the same shape from the module
  // graph, so deleting a block here still fails the suite.
  //
  // `no-restricted-imports` options replace rather than merge across config
  // objects, exactly like `no-restricted-syntax` (see NO_EXPORT_STAR above).
  // The blocks match disjoint file sets on purpose, so none of them can
  // silently drop another's patterns. Keep a new block disjoint from them too.
  {
    name: "boundaries/core-is-framework-free-and-imports-no-zone",
    files: ["src/core/**/*.ts", "src/core/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [...BROWSER_APIS, ...UI_LIBRARIES],
              message:
                "src/core/ holds the vocabulary the other zones are written in — a domain type, a pure function — and it stays free of the browser APIs and of React, so it runs in a plain unit test and survives a change of either. Put the browser-aware code in src/platform/ and the UI in src/components/.",
            },
            {
              group: [
                ...ZONE.entrypoints,
                ...ZONE.background,
                ...ZONE.content,
                ...ZONE.components,
                ...ZONE.platform,
              ],
              message:
                "src/core/ is the bottom of the import order, so it names no zone above it. A type only one zone needs belongs in that zone; one they share belongs here, with nothing imported to define it.",
            },
          ],
        },
      ],
    },
  },
  {
    name: "boundaries/platform-imports-only-core",
    files: ["src/platform/**/*.ts", "src/platform/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: UI_LIBRARIES,
              message:
                "src/platform/ wraps the browser APIs for every context, the service worker included, which has no DOM to render into. Hand a screen what it needs as a StoredValue from src/core/ and let src/components/ do the rendering.",
            },
            {
              group: [
                ...ZONE.entrypoints,
                ...ZONE.background,
                ...ZONE.content,
                ...ZONE.components,
              ],
              message:
                "src/platform/ sits below src/background/, src/content/ and the entrypoints, which call it. Naming one of them from here inverts the order and pulls a context's code into every other context's bundle.",
            },
          ],
        },
      ],
    },
  },
  {
    name: "boundaries/background-runs-without-a-screen",
    files: ["src/background/**/*.ts", "src/background/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [...UI_LIBRARIES, ...ZONE.components],
              message: NO_SCREEN_IN_A_WORKER,
            },
            {
              group: [...ZONE.entrypoints, ...ZONE.content],
              message:
                "src/background/ is the service worker's logic. It reaches a content script or a screen by message through src/platform/messaging.ts, never by import — they run in other processes, and an import would only bundle a copy of their code into the worker.",
            },
          ],
        },
      ],
    },
  },
  {
    name: "boundaries/content-runs-without-a-screen",
    files: ["src/content/**/*.ts", "src/content/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [...UI_LIBRARIES, ...ZONE.components],
              message: NO_SCREEN_IN_A_WORKER,
            },
            {
              group: [...ZONE.entrypoints, ...ZONE.background],
              message:
                "src/content/ runs inside a web page. It reaches the service worker by message through src/platform/messaging.ts, never by import — an import would bundle the worker's code, and its storage writes, into every page the script matches.",
            },
          ],
        },
      ],
    },
  },
  {
    name: "boundaries/components-render-what-they-are-handed",
    files: ["src/components/**/*.ts", "src/components/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: BROWSER_APIS,
              message:
                "src/components/ renders what it is handed, so it runs under jsdom with no extension around it. Take the value as a prop — a StoredValue from src/core/ for something that changes — and let the entrypoint pass in what src/platform/ provides.",
            },
            {
              group: [
                ...ZONE.entrypoints,
                ...ZONE.background,
                ...ZONE.content,
                ...ZONE.platform,
              ],
              message:
                "src/components/ sits beside src/platform/, not above it: the import order is entrypoints → components → core. A component naming storage, messaging or a context's logic is one no test can render without a browser.",
            },
          ],
        },
      ],
    },
  },
  {
    // A screen is a separate page from the service worker and the content
    // script. It sends them a message; importing their zone would bundle a
    // second, disconnected copy of their code into the screen.
    name: "boundaries/screens-message-the-worker",
    files: ["src/entrypoints/*/**/*.ts", "src/entrypoints/*/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [...ZONE.background, ...ZONE.content],
              message:
                "A popup or options page reaches the service worker by message through src/platform/messaging.ts. Importing src/background/ or src/content/ bundles a copy of that code into the page, where it runs disconnected from the real worker.",
            },
          ],
        },
      ],
    },
  },
  {
    name: "automation/node-scripts",
    files: ["scripts/**/*.mjs", ".agents/skills/**/*.mjs"],
    rules: {
      // These files are the CLI surface of repository automation.
      "no-console": "off",

      // Automation must run on plain Node before `pnpm install`, so it is
      // authored as `.mjs` and declares its boundary types in JSDoc, which
      // `checkJs` enforces just as strictly. This rule only recognises
      // TypeScript annotations, so leaving it on would demand syntax that is
      // not valid JavaScript.
      "@typescript-eslint/explicit-module-boundary-types": "off",
    },
  },
  {
    // The `writing-tests` skill states these rules in prose; this is what enforces the
    // ones a linter can see. The recommended set is taken as published and the
    // escalations below are the entries this repository will not run on
    // "warn", starting with the two that quietly shrink the suite.
    ...vitest.configs.recommended,
    name: "tests/vitest-rules",
    files: ["tests/**/*.ts", "tests/**/*.tsx"],
    rules: {
      ...vitest.configs.recommended.rules,

      // "No it.skip/it.todo left on main" and "a focused test never lands".
      "vitest/no-focused-tests": "error",
      "vitest/no-disabled-tests": "error",

      // An assertion outside a test reports nothing when it fails, and a test
      // with no assertion passes whatever the code does. `expectTypeOf` is
      // listed because a case whose whole assertion is type-level — see the
      // `type-testing` skill — has no runtime `expect` and is not meant to;
      // without it here, `expect-expect` would report such a case as
      // assertion-less.
      "vitest/no-standalone-expect": "error",
      "vitest/expect-expect": [
        "error",
        { assertFunctionNames: ["expect", "expectTypeOf"] },
      ],
      "vitest/valid-expect": "error",

      // One spelling, so a search for a test finds every one of them.
      "vitest/consistent-test-it": ["error", { fn: "it" }],

      // `vitest/require-top-level-describe` is deliberately left off. Several
      // suites here own a fixture for the whole file — a temp git repository,
      // a packed tarball — and set it up in a file-level `beforeAll`, which
      // this rule forbids. Satisfying it would mean wrapping five whole files
      // in an extra describe for no gain in what the tests assert.
      //
      // `vitest/no-conditional-expect` comes from the recommended set and is
      // turned off for the same kind of reason: AGENTS.md prescribes
      // asserting on a caught error inside `catch`, and the workflow suite
      // branches on what the repository actually contains before asserting
      // against it.
      "vitest/no-conditional-expect": "off",
    },
  },
  {
    name: "tests/relaxations",
    files: ["tests/**/*.ts", "tests/**/*.tsx"],
    rules: {
      // Tests deliberately construct invalid input to prove it is rejected.
      "@typescript-eslint/no-confusing-void-expression": "off",
    },
  },
  {
    name: "boundaries/private-trees-are-not-importable",
    files: ["tests/**/*.ts", "tests/**/*.tsx", "e2e/**/*.ts", "scripts/**/*.mjs"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              // `dist/internal` used to be listed beside this: the same module
              // after a build, back when this repository published a tarball.
              // Nothing builds to `dist/` any more (issue #4 removed the
              // packaging gates), so the built spelling is gone and the source
              // one is the whole rule.
              // The `@/` spellings are the same module through the alias
              // `tsconfig.json` declares, which no `**/src/...` pattern sees.
              group: [
                "**/src/internal",
                "**/src/internal/**",
                "@/internal",
                "@/internal/**",
              ],
              message: INTERNAL_IS_PRIVATE,
            },
          ],
        },
      ],
    },
  },
  // Must stay last: turns off stylistic rules that would fight Prettier.
  eslintConfigPrettier,
]);
