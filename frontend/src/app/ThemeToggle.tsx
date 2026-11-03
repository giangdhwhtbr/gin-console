import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "./theme";

/** A sidebar button: icon only up to 1023px, icon and label from 1024px unless the sidebar is collapsed. */
export const RAIL_BUTTON =
  "flex size-11 items-center justify-center gap-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:size-10";
export const RAIL_BUTTON_WIDE = "lg:h-10 lg:w-full lg:justify-start lg:px-3 lg:text-sm lg:font-medium";

export function ThemeToggle({ className, wide = true }: { className?: string; wide?: boolean }) {
  const [theme, toggle] = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Sun : Moon;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={cn(RAIL_BUTTON, wide && RAIL_BUTTON_WIDE, className)}
    >
      <Icon aria-hidden className="size-5" />
      <span className={cn("hidden", wide && "lg:inline")}>{`Switch to ${next}`}</span>
    </button>
  );
}
