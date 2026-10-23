import { formatBadge, nextCount } from "../core/counter";
import { setBadgeText } from "../platform/badge";
import { onMessage } from "../platform/messaging";
import { clickCount, settings } from "../platform/storage";

/** Count one click in storage and answer the new total. */
export async function incrementCount(): Promise<number> {
  const next = nextCount(await clickCount.get());
  await clickCount.set(next);
  return next;
}

/** Bring the badge in line with the stored count and the user's setting. */
export async function refreshBadge(): Promise<void> {
  const [count, current] = await Promise.all([clickCount.get(), settings.get()]);
  await setBadgeText(current.showBadge ? formatBadge(count) : "");
}

/**
 * Register every service-worker listener.
 *
 * @remarks
 * Chrome only delivers an event to a listener registered synchronously during
 * the worker's first turn, and it restarts the worker for each event after an
 * idle stop. Everything here is therefore registered before the first `await`,
 * and nothing is kept in module state between events.
 *
 * The returned function removes every listener again. The worker itself never
 * calls it — Chrome tears the whole context down — but a test does, so each
 * one starts from a worker with no listeners.
 */
export function startBackground(): () => void {
  const stops = [
    onMessage("incrementCount", () => incrementCount()),
    clickCount.watch(() => void refreshBadge()),
    settings.watch(() => void refreshBadge()),
  ];
  void refreshBadge();
  return () => {
    for (const stop of stops) {
      stop();
    }
  };
}
