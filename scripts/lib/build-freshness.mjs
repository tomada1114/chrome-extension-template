// Shared precondition for the manifest and Playwright suites, called before
// either reads a build. It needs no Git work tree and never builds for callers.
import { lstatSync, readdirSync, realpathSync, statSync } from "node:fs";
import path from "node:path";

/**
 * @param {string} file - Input file or directory to inspect.
 * @param {number} manifestTime - Manifest's modification time in milliseconds.
 * @param {Set<string>} visited - Real directories already traversed, including links.
 * @returns {string | undefined} First input newer than the manifest.
 */
function newerInput(file, manifestTime, visited) {
  const entry = lstatSync(file, { throwIfNoEntry: false });
  if (entry === undefined) return undefined;
  // Retargeting a link changes the input even when its target is older.
  if (entry.isSymbolicLink() && entry.mtimeMs > manifestTime) return file;
  const info = entry.isSymbolicLink()
    ? statSync(file, { throwIfNoEntry: false })
    : entry;
  if (info === undefined) return undefined;
  if (info.isFile()) return info.mtimeMs > manifestTime ? file : undefined;
  if (info.isDirectory()) {
    const directory = realpathSync(file);
    if (visited.has(directory)) return undefined;
    visited.add(directory);
    for (const name of readdirSync(file).sort()) {
      const newer = newerInput(path.join(file, name), manifestTime, visited);
      if (newer !== undefined) return newer;
    }
  }
  return undefined;
}

/**
 * Refuse output that cannot represent the source under test.
 * @param {object} options - Build and suite being checked.
 * @param {string} options.root - Absolute root containing the build inputs.
 * @param {string} options.manifestPath - Absolute manifest path for this browser.
 * @param {"MANIFEST" | "E2E"} options.stage - Suite's error-code prefix.
 * @param {string} options.buildCommand - Command that rebuilds this browser target.
 * @returns {void}
 */
export function assertFreshBuild({ root, manifestPath, stage, buildCommand }) {
  const manifest = statSync(manifestPath, { throwIfNoEntry: false });
  const output = path.relative(root, manifestPath);
  if (!manifest?.isFile()) {
    const code = stage === "E2E" ? "ERR_E2E_NO_BUILD" : "ERR_MANIFEST_NO_BUILD";
    throw Object.assign(
      new Error(
        `${code}: ${output} has no build.\n` +
          "Expected: a generated manifest.\nActual: manifest is missing.\n" +
          `Next: run \`${buildCommand}\`.`,
      ),
      { code },
    );
  }

  /** @type {Set<string>} */
  const visited = new Set();
  for (const input of ["src", "public", "wxt.config.ts"]) {
    const newer = newerInput(path.join(root, input), manifest.mtimeMs, visited);
    if (newer !== undefined) {
      const code = stage === "E2E" ? "ERR_E2E_STALE_BUILD" : "ERR_MANIFEST_STALE_BUILD";
      throw Object.assign(
        new Error(
          `${code}: ${output} predates its inputs.\n` +
            "Expected: every input file modified at or before the manifest.\n" +
            `Actual: ${path.relative(root, newer)} is newer than ${output}.\n` +
            `Next: run \`${buildCommand}\`.`,
        ),
        { code },
      );
    }
  }
}
