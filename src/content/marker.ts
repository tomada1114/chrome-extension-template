/** The attribute that identifies this extension's marker in a host page. */
export const MARKER_ATTRIBUTE = "data-extension-template-marker";

/**
 * Add a small, labelled marker to the end of `document.body` and return the
 * function that removes it again.
 *
 * @remarks
 * The host page is someone else's document. The marker is built with
 * `textContent` only, never `innerHTML`, so nothing the page or a catalog
 * string contains can become markup, and it is removed when the content
 * script's context is invalidated (an update or a disable), so a reloaded
 * extension never leaves a second copy behind.
 */
export function mountMarker(document: Document, label: string): () => void {
  const existing = document.querySelector(`[${MARKER_ATTRIBUTE}]`);
  existing?.remove();

  const marker = document.createElement("div");
  marker.setAttribute(MARKER_ATTRIBUTE, "");
  marker.setAttribute("role", "status");
  marker.textContent = label;
  Object.assign(marker.style, {
    position: "fixed",
    insetBlockEnd: "8px",
    insetInlineEnd: "8px",
    zIndex: "2147483647",
    padding: "4px 8px",
    borderRadius: "4px",
    font: "12px/1.4 system-ui, sans-serif",
    color: "#fff",
    background: "rgba(0, 0, 0, 0.75)",
  });
  document.body.append(marker);

  return () => {
    marker.remove();
  };
}
