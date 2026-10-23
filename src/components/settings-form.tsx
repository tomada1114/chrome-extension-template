import { type ReactElement, useId } from "react";

import type { Settings } from "../core/settings";

export interface SettingsFormProps {
  readonly heading: string;
  readonly showBadgeLabel: string;
  /** `undefined` while the stored settings are still loading. */
  readonly settings: Settings | undefined;
  readonly onChange: (next: Settings) => void;
}

export function SettingsForm({
  heading,
  showBadgeLabel,
  settings,
  onChange,
}: SettingsFormProps): ReactElement {
  const showBadgeId = useId();
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">{heading}</h1>
      {settings === undefined ? (
        // Rendering the checkbox before the stored value arrives would show
        // "off" for a setting that may be on.
        <p aria-busy="true" className="text-muted-foreground">
          …
        </p>
      ) : (
        <div className="flex items-center gap-2">
          <input
            id={showBadgeId}
            type="checkbox"
            className="size-4 accent-primary"
            checked={settings.showBadge}
            onChange={(event) => {
              onChange({ ...settings, showBadge: event.currentTarget.checked });
            }}
          />
          <label htmlFor={showBadgeId}>{showBadgeLabel}</label>
        </div>
      )}
    </main>
  );
}
