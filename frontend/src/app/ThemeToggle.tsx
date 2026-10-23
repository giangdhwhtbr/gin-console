import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "./theme";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, toggle] = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Sun : Moon;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={cn(
        "flex size-11 items-center justify-center gap-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:size-10 lg:h-10 lg:w-full lg:justify-start lg:px-3 lg:text-sm lg:font-medium",
        className,
      )}
    >
      <Icon aria-hidden className="size-5" />
      <span className="hidden lg:inline">{`Switch to ${next}`}</span>
    </button>
  );
}
