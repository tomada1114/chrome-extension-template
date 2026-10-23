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
    throw new Error("ERR_MISSING_ROOT: the page has no #root element to render into");
  }
  return root;
}
