/**
 * The element a screen's React tree renders into: the page's `#root`.
 *
 * @remarks
 * Throws rather than rendering nowhere, so an HTML file that lost its root
 * fails loudly in the end-to-end suite instead of opening as a blank popup.
 */
export function mountRoot(document: Document): HTMLElement {
  const root = document.getElementById("root");
  if (root === null) {
    throw Object.assign(new Error("The page has no #root element to render into"), {
      code: "ERR_MISSING_ROOT" as const,
    });
  }
  return root;
}
