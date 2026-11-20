import { cn } from "@/lib/utils";

export const IMAGE_DISCLAIMER_TEXT =
  "Images are illustrative. The product you receive may differ.";

/**
 * Very small caption for product imagery. `overlay` pins it to the bottom of
 * the nearest positioned parent (use inside image frames); otherwise it
 * renders as a normal centered line under the image.
 */
export function ImageDisclaimer({
  overlay = false,
  className,
}: {
  overlay?: boolean;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-center text-[9px] leading-tight text-foreground/50",
        overlay &&
          "pointer-events-none absolute inset-x-0 bottom-1.5 z-20 px-3",
        className,
      )}
    >
      {IMAGE_DISCLAIMER_TEXT}
    </p>
  );
}
