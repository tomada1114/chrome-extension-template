import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SettingsForm } from "../src/components/settings-form";
import type { Settings } from "../src/core/settings";

function renderForm(settings: Settings | undefined): ReturnType<typeof vi.fn> {
  const onChange = vi.fn();
  render(
    <SettingsForm
      heading="Settings"
      showBadgeLabel="Show the count"
      settings={settings}
      onChange={onChange}
    />,
  );
  return onChange;
}

describe("SettingsForm", () => {
  it("labels the checkbox and reflects the stored value", () => {
    renderForm({ showBadge: true });
    expect(screen.getByRole("checkbox", { name: "Show the count" })).toBeChecked();
  });

  it("hands back the whole settings object with the field changed", async () => {
    const user = userEvent.setup();
    const onChange = renderForm({ showBadge: true });
    await user.click(screen.getByRole("checkbox", { name: "Show the count" }));
    expect(onChange).toHaveBeenCalledWith({ showBadge: false });
  });

  it("shows no checkbox until the settings have loaded, so none reads as off", () => {
    renderForm(undefined);
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.getByText("…")).toHaveAttribute("aria-busy", "true");
  });
});
