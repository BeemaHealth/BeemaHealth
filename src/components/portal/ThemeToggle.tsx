import { Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type PortalTheme = "light" | "dark";
const THEME_KEY = "beema-portal-theme";

function readTheme(): PortalTheme {
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* storage unavailable: fall through */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Applies the portal theme to <html> while mounted; the marketing site is never left dark. */
export function usePortalTheme() {
  const [theme, setThemeState] = useState<PortalTheme>("light");

  useEffect(() => {
    setThemeState(readTheme());
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    return () => root.classList.remove("dark");
  }, [theme]);

  const setTheme = useCallback((next: PortalTheme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      /* theme is a convenience only */
    }
  }, []);

  return { theme, setTheme };
}

type Props = {
  theme: PortalTheme;
  onChange: (theme: PortalTheme) => void;
  className?: string;
};

/** Light and dark segmented switch used in the avatar menu. */
export function ThemeToggle({ theme, onChange, className }: Props) {
  const options: { value: PortalTheme; label: string; Icon: typeof Sun }[] = [
    { value: "light", label: "Light", Icon: Sun },
    { value: "dark", label: "Dark", Icon: Moon },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn(
        "inline-flex rounded-full border border-border bg-muted p-0.5",
        className,
      )}
    >
      {options.map(({ value, label, Icon }) => {
        const selected = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${label} theme`}
            onClick={() => onChange(value)}
            className={cn(
              "inline-flex h-7 w-8 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
