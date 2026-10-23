/** The largest count the badge spells out before it switches to {@link BADGE_OVERFLOW}. */
export const BADGE_MAX = 999;

/** What the badge shows once the count passes {@link BADGE_MAX}. */
export const BADGE_OVERFLOW = "999+";

/**
 * The count after one more click.
 *
 * @remarks
 * Stored counts come back from `browser.storage`, which a user, another
 * extension version or a sync conflict can leave holding anything. A value that
 * is not a non-negative safe integer restarts at one rather than propagating.
 */
export function nextCount(current: number): number {
  if (!Number.isSafeInteger(current) || current < 0) {
    return 1;
  }
  return current >= Number.MAX_SAFE_INTEGER ? current : current + 1;
}

/**
 * The text for the toolbar badge: empty for zero (Chrome hides an empty
 * badge), the number up to {@link BADGE_MAX}, and {@link BADGE_OVERFLOW} past it,
 * since the badge has room for about four characters.
 */
export function formatBadge(count: number): string {
  if (!Number.isSafeInteger(count) || count <= 0) {
    return "";
  }
  return count > BADGE_MAX ? BADGE_OVERFLOW : String(count);
}
