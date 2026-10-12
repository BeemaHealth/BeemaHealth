import { Bell } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { destinationFor, type ActionItem } from "@/lib/api/portal/home";

type Props = { items: ActionItem[]; loading?: boolean };

/** Bell showing open action items as notifications. */
export function NotificationBell({ items, loading = false }: Props) {
  const navigate = useNavigate();
  const count = items.length;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={
            count
              ? `Notifications, ${count} need your attention`
              : "Notifications"
          }
          className="relative inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-soft transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bell className="size-[18px]" aria-hidden="true" />
          {count > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-[18px] text-primary-foreground"
            >
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 rounded-2xl p-2">
        <DropdownMenuLabel className="font-display">
          Notifications
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">Loading...</p>
        ) : count === 0 ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">
            You are all caught up.
          </p>
        ) : (
          items.map((item) => (
            <DropdownMenuItem
              key={item.id}
              className="flex cursor-pointer flex-col items-start gap-0.5 rounded-xl px-3 py-2.5"
              onSelect={() =>
                navigate({ to: destinationFor(item.kind) as "/" })
              }
            >
              <span className="text-sm font-medium">{item.title}</span>
              {item.body && (
                <span className="line-clamp-2 text-xs text-muted-foreground">
                  {item.body}
                </span>
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
