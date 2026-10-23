/** What the user can change on the options page. */
export interface Settings {
  /** Whether the toolbar icon carries the click count as a badge. */
  readonly showBadge: boolean;
}

export const DEFAULT_SETTINGS: Settings = { showBadge: true };

/**
 * Read a stored value back into {@link Settings}, keeping each field that is
 * well-formed and falling back to its default otherwise.
 *
 * @remarks
 * `storage.sync` is written by every device the user is signed in on, possibly
 * running an older or newer release, so its contents are input, not a value
 * this release wrote. A field-by-field read means one bad field costs the user
 * that field rather than all of their settings.
 */
export function parseSettings(value: unknown): Settings {
  if (typeof value !== "object" || value === null) {
    return DEFAULT_SETTINGS;
  }
  const showBadge: unknown = Reflect.get(value, "showBadge");
  return {
    showBadge: typeof showBadge === "boolean" ? showBadge : DEFAULT_SETTINGS.showBadge,
  };
}
