import type { ComponentPropsWithoutRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { HideChatWidget } from "@/components/site/HideChatWidget";

/**
 * Full-screen-on-mobile dialog content (2026-09-03, per Matt, originally
 * built for the ED Mints formulation picker and reused 2026-09-04 by the
 * homepage GetStartedModal). The shared `DialogContent` in
 * components/ui/dialog.tsx is a fixed-size centered card at every breakpoint
 * (used by the portal's authenticated dialogs, which stay centered on
 * mobile too) - flows like these need a different mobile treatment, so this
 * builds its own `DialogPrimitive.Content` rather than changing that shared
 * component's default for every other dialog in the app. Base (mobile): true
 * full-screen sheet, edge to edge, own scroll. `sm:` and up: reverts to the
 * same centered-card look `DialogContent` uses.
 *
 * Every use hides the sitewide chat launcher while open (HideChatWidget), so it
 * never covers the dialog's Get Started / Continue buttons.
 */
export function FullScreenMobileDialogContent({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-0 z-50 flex h-full w-full flex-col gap-4 overflow-y-auto bg-background p-6 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "sm:inset-auto sm:left-[50%] sm:top-[50%] sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-2xl sm:-translate-x-[50%] sm:-translate-y-[50%] sm:rounded-lg sm:border sm:shadow-lg sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      >
        <HideChatWidget />
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 cursor-pointer rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}
