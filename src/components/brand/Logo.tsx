import aretideLogo from "@/assets/aretide-logo.png";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <img
      src={aretideLogo}
      alt="Aretide"
      width={1024}
      height={1024}
      className={cn("h-10 w-auto object-contain", className)}
    />
  );
}
