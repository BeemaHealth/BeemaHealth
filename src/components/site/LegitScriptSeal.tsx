import {
  LEGITSCRIPT_SEAL_ALT,
  LEGITSCRIPT_SEAL_HEIGHT,
  LEGITSCRIPT_SEAL_SRC,
  LEGITSCRIPT_SEAL_TITLE,
  LEGITSCRIPT_SEAL_WIDTH,
  LEGITSCRIPT_VERIFY_URL,
} from "@/lib/legitscript";
import { cn } from "@/lib/utils";

type LegitScriptSealProps = {
  className?: string;
};

/**
 * Official LegitScript certification seal. Markup, href, and dimensions all
 * come from `@/lib/legitscript` - update that module to change the verify
 * link, asset, or display size sitewide.
 */
export function LegitScriptSeal({ className }: LegitScriptSealProps) {
  return (
    <a
      href={LEGITSCRIPT_VERIFY_URL}
      target="_blank"
      rel="noopener noreferrer"
      title={LEGITSCRIPT_SEAL_TITLE}
      className={cn(
        "inline-block shrink-0 drop-shadow-md transition-opacity hover:opacity-90",
        className,
      )}
    >
      <img
        src={LEGITSCRIPT_SEAL_SRC}
        alt={LEGITSCRIPT_SEAL_ALT}
        width={LEGITSCRIPT_SEAL_WIDTH}
        height={LEGITSCRIPT_SEAL_HEIGHT}
      />
    </a>
  );
}
