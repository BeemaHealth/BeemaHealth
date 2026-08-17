import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type AccordionValue = string | string[] | undefined;

type AccordionContextValue = {
  /** Shared `name` for native exclusive grouping; unset for type="multiple". */
  name?: string;
  type: "single" | "multiple";
  value?: AccordionValue;
  defaultValue?: AccordionValue;
  onValueChange?: (value: string | string[]) => void;
};

const AccordionContext = React.createContext<AccordionContextValue>({
  type: "single",
});

/**
 * Native <details>/<summary> accordion (drop-in for the old Radix-based
 * one). Radix's Content is Presence-gated: a panel that has never been
 * opened renders zero children on first paint, so answer text never made it
 * into the server-rendered HTML crawlers actually fetch - only into the
 * page's JSON-LD. <details> keeps every panel's content in the initial HTML
 * always; the browser (not React) owns show/hide, so collapsed text is
 * still real, crawlable markup. `name` gives type="single" free
 * one-open-at-a-time behavior without JS (Baseline across all supported
 * browsers as of this app's browserslist). The smooth open/close transition
 * is pure CSS - see the `.accordion-item` rules in styles.css.
 */
type AccordionSingleProps = {
  type?: "single";
  /** Native <details> is always re-closable; kept for API compatibility. */
  collapsible?: boolean;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
};

type AccordionMultipleProps = {
  type: "multiple";
  collapsible?: boolean;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  className?: string;
  children: React.ReactNode;
};

function Accordion(props: AccordionSingleProps | AccordionMultipleProps) {
  const {
    type = "single",
    value,
    onValueChange,
    defaultValue,
    className,
    children,
  } = props;
  const groupName = React.useId();
  return (
    <AccordionContext.Provider
      value={{
        name: type === "single" ? groupName : undefined,
        type,
        value,
        defaultValue,
        onValueChange: onValueChange as
          | ((value: string | string[]) => void)
          | undefined,
      }}
    >
      <div className={className}>{children}</div>
    </AccordionContext.Provider>
  );
}

function AccordionItem({
  value: itemValue,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(AccordionContext);
  const isControlled = ctx.value !== undefined;

  const matches = (v: AccordionValue) =>
    Array.isArray(v) ? v.includes(itemValue) : v === itemValue;

  const open = isControlled ? matches(ctx.value) : matches(ctx.defaultValue);

  const handleToggle = (event: React.SyntheticEvent<HTMLDetailsElement>) => {
    if (!ctx.onValueChange) return;
    const nowOpen = event.currentTarget.open;
    if (ctx.type === "multiple") {
      const current = Array.isArray(ctx.value) ? ctx.value : [];
      ctx.onValueChange(
        nowOpen
          ? [...current, itemValue]
          : current.filter((v) => v !== itemValue),
      );
    } else {
      ctx.onValueChange(nowOpen ? itemValue : "");
    }
  };

  return (
    <details
      name={ctx.name}
      open={open}
      onToggle={ctx.onValueChange ? handleToggle : undefined}
      className={cn("accordion-item group border-b", className)}
    >
      {children}
    </details>
  );
}

const AccordionTrigger = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, children, ...props }, ref) => (
  <summary
    ref={ref as React.Ref<HTMLElement>}
    className={cn(
      "flex flex-1 list-none items-center justify-between py-4 text-sm font-medium cursor-pointer transition-all hover:underline text-left marker:content-none [&::-webkit-details-marker]:hidden",
      className,
    )}
    {...props}
  >
    {children}
    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
  </summary>
));
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("pb-4 pt-0 text-sm", className)} {...props}>
    {children}
  </div>
));
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
