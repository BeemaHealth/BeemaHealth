import { useNavigate } from "@tanstack/react-router";
import {
  ExternalLink,
  Home,
  LifeBuoy,
  LogOut,
  Mail,
  UserCog,
} from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials, logout, type PortalUser } from "@/lib/api/portal/auth";
import { SUPPORT_EMAIL_HREF } from "@/lib/contact-info";
import { PORTAL_PATHS } from "@/lib/api/portal/home";
import { ThemeToggle, type PortalTheme } from "./ThemeToggle";

const HELP_CENTER_URL = "/faq";

type Props = {
  user: PortalUser;
  theme: PortalTheme;
  onThemeChange: (theme: PortalTheme) => void;
};

export function AvatarMenu({ user, theme, onThemeChange }: Props) {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      /* the session may already be gone; leave either way */
    } finally {
      setLoggingOut(false);
      navigate({ to: "/portal/login" as "/", replace: true });
    }
  }

  const itemClass = "cursor-pointer gap-3 rounded-xl px-3 py-2.5 text-sm";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="inline-flex size-10 items-center justify-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground shadow-soft transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none motion-reduce:hover:scale-100"
        >
          {initials(user)}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2">
        <DropdownMenuLabel className="px-3 py-2">
          <span className="block truncate font-display text-sm">
            {`${user.first_name} ${user.last_name}`.trim() || "Your account"}
          </span>
          <span className="block truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={itemClass}
          onSelect={() => navigate({ to: PORTAL_PATHS.account as "/" })}
        >
          <UserCog className="size-4" aria-hidden="true" /> Manage account
        </DropdownMenuItem>
        <DropdownMenuItem
          className={itemClass}
          onSelect={() => navigate({ to: "/" })}
        >
          <Home className="size-4" aria-hidden="true" /> Homepage
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={itemClass}>
          <a href={HELP_CENTER_URL} target="_blank" rel="noopener noreferrer">
            <LifeBuoy className="size-4" aria-hidden="true" /> Help Center
            <ExternalLink
              className="ml-auto size-3.5 text-muted-foreground"
              aria-hidden="true"
            />
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={itemClass}>
          <a href={SUPPORT_EMAIL_HREF}>
            <Mail className="size-4" aria-hidden="true" /> Email Support
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-3 py-2 text-sm">
          <span>Theme</span>
          <ThemeToggle theme={theme} onChange={onThemeChange} />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={`${itemClass} text-destructive focus:text-destructive`}
          disabled={loggingOut}
          onSelect={(e) => {
            e.preventDefault();
            void handleLogout();
          }}
        >
          <LogOut className="size-4" aria-hidden="true" />{" "}
          {loggingOut ? "Logging out..." : "Logout"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
