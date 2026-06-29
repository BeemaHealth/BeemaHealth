import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getSectionToneStyles,
  sectionBadgeOnClass,
  sectionDividerClass,
  sectionNavActiveClass,
  sectionNavIconClass,
  sectionRowIconClass,
  type SectionTone,
} from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

/** @deprecated Use `SectionTone` from `@/lib/design-tokens` */
export type AccountSectionTone = SectionTone;

export function DisplayField({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1", className)}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
        {label}
      </dt>
      <dd className="text-sm font-medium text-foreground">
        {value || (
          <span className="font-normal text-muted-foreground">Not set</span>
        )}
      </dd>
    </div>
  );
}

export function EditableField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

export function AccountSectionCard({
  title,
  description,
  icon: Icon,
  tone = "primary",
  editable = false,
  editing = false,
  saving = false,
  onEdit,
  onSave,
  onCancel,
  headerAction,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  tone?: SectionTone;
  editable?: boolean;
  editing?: boolean;
  saving?: boolean;
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const styles = getSectionToneStyles(tone);

  return (
    <section
      className={cn(
        "overflow-hidden rounded-3xl border bg-card p-1.5 shadow-soft transition-shadow",
        styles.section,
        editing && `ring-2 ${styles.editingRing}`,
        className,
      )}
    >
      <div
        className={cn(
          "flex items-start justify-between gap-4 rounded-2xl px-4 py-3.5 md:px-5 md:py-4",
          styles.header,
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-2xl",
                styles.icon,
              )}
            >
              <Icon className="size-5" aria-hidden />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground md:text-lg">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
        {(headerAction || (editable && !editing && onEdit)) && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {headerAction}
            {editable && !editing && onEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl border-border/80 bg-card/90"
                onClick={onEdit}
              >
                Edit
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-4 md:px-5 md:py-5">{children}</div>

      {editable && editing && (
        <div
          className={cn(
            "mx-1.5 mb-1.5 flex flex-wrap justify-end gap-2 rounded-2xl px-4 py-3 md:px-5",
            styles.footer,
          )}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-xl"
            disabled={saving}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-xl"
            disabled={saving}
            onClick={onSave}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      )}
    </section>
  );
}

export const accountSectionDividerClass = sectionDividerClass;
export const accountSectionBadgeOnClass = sectionBadgeOnClass;
export const accountSectionRowIconClass = sectionRowIconClass;
export const accountSectionNavIconClass = sectionNavIconClass;
export const accountSectionNavActiveClass = sectionNavActiveClass;
