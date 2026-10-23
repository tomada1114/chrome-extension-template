/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from "vitest";

import { MARKER_ATTRIBUTE, mountMarker } from "../src/content/marker";

beforeEach(() => {
  document.body.replaceChildren();
});

const markers = (): NodeListOf<Element> =>
  document.querySelectorAll(`[${MARKER_ATTRIBUTE}]`);

describe("mountMarker", () => {
  it("adds one labelled status element to the page", () => {
    mountMarker(document, "Running");
    expect(markers()).toHaveLength(1);
    expect(markers()[0]?.textContent).toBe("Running");
    expect(markers()[0]?.getAttribute("role")).toBe("status");
  });

  it("renders a label as text, never as markup", () => {
    mountMarker(document, "<img src=x onerror=alert(1)>");
    expect(document.querySelector("img")).toBeNull();
    expect(markers()[0]?.textContent).toBe("<img src=x onerror=alert(1)>");
  });

  it("replaces a marker a previous version of the script left behind", () => {
    mountMarker(document, "old");
    mountMarker(document, "new");
    expect(markers()).toHaveLength(1);
    expect(markers()[0]?.textContent).toBe("new");
  });

  it("removes the marker through the function it returns", () => {
    const unmount = mountMarker(document, "Running");
    unmount();
    expect(markers()).toHaveLength(0);
  });
});
