import type { ActionItem } from "@/lib/api/portal/home";
import type { PortalUser } from "@/lib/api/portal/auth";
import { Logo } from "@/components/brand/Logo";
import { AvatarMenu } from "./AvatarMenu";
import { NotificationBell } from "./NotificationBell";
import type { PortalTheme } from "./ThemeToggle";

type Props = {
  title: string;
  user: PortalUser;
  items: ActionItem[];
  itemsLoading?: boolean;
  theme: PortalTheme;
  onThemeChange: (theme: PortalTheme) => void;
};

export function TopBar({
  title,
  user,
  items,
  itemsLoading,
  theme,
  onThemeChange,
}: Props) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-8">
      <div className="lg:hidden">
        <Logo markOnly className="h-8" />
      </div>
      <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
        {title}
      </h1>
      <div className="ml-auto flex items-center gap-2.5">
        <NotificationBell items={items} loading={itemsLoading} />
        <AvatarMenu user={user} theme={theme} onThemeChange={onThemeChange} />
      </div>
    </header>
  );
}
