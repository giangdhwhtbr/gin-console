import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme";

/** An icon button of the top bar or the sidebar's control row: 44px on phones, 32px from 768px. */
export const ICON_BUTTON =
  "flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:size-8";

export function ThemeToggle() {
  const [theme, toggle] = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Sun : Moon;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={ICON_BUTTON}
    >
      <Icon aria-hidden className="size-5" />
    </button>
  );
}
