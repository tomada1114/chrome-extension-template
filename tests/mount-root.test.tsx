import { afterEach, describe, expect, it } from "vitest";

import { mountRoot } from "../src/components/mount-root";

afterEach(() => {
  document.body.replaceChildren();
});

describe("mountRoot", () => {
  it("returns the page's #root element", () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.append(root);
    expect(mountRoot(document)).toBe(root);
  });

  it("throws a coded error when the page has no #root", () => {
    expect(() => mountRoot(document)).toThrow(/^ERR_MISSING_ROOT:/);
  });
});
