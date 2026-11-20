import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Info } from "lucide-react";
import {
  Section,
  SectionHeading,
  SurfaceCard,
} from "@/components/site/primitives";
import { EASE_OUT } from "@/components/home/home-motion";
import { CLINICAL_PROVIDER_GROUP } from "@/lib/provider-info";
import {
  MEDICAL_TEAM,
  MEDICAL_TEAM_BIOS_HASH,
  MEDICAL_TEAM_MEDIA_ENABLED,
  TEAM_MEDIA_DISCLAIMER,
  type MedicalTeamMember,
} from "@/lib/medical-team";
import { cn } from "@/lib/utils";

/**
 * Arora Health team media. Read the license rules in `lib/medical-team.ts`
 * before changing anything here. Hard constraints baked into this component:
 *
 * - Headshots render whole, at native aspect ratio (no object-cover, no
 *   filters, no text or gradient overlays). Corner rounding only.
 * - The licensor's disclaimer renders in the same section, at readable size.
 * - No CTA buttons live in this section, so the photos never read as
 *   endorsing a purchase.
 *
 * `variant="summary"` shows photo, name, and title with a link to the full
 * bios; `variant="full"` shows the verbatim bios (used on /about).
 */

function Headshot({
  member,
  className,
}: {
  member: MedicalTeamMember;
  className?: string;
}) {
  const { src, alt, width, height } = member.headshot;
  return (
    // Corner rounding is the only styling applied to the photo: no crop (the
    // full frame shows at native ratio), filter, or overlay.
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className={cn(
        "block h-auto shrink-0 rounded-2xl shadow-soft ring-1 ring-border",
        className,
      )}
    />
  );
}

function TeamMemberCard({
  member,
  variant,
}: {
  member: MedicalTeamMember;
  variant: "summary" | "full";
}) {
  return (
    <SurfaceCard className="flex h-full flex-col p-5 sm:p-7">
      <div className="grid grid-cols-[1fr_auto] items-center gap-4 sm:gap-6">
        <div className="min-w-0">
          <h3 className="text-balance text-xl font-bold leading-tight text-foreground sm:text-2xl">
            {member.displayName}
          </h3>
          <p className="mt-3 inline-flex rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-accent-foreground">
            {member.title}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {CLINICAL_PROVIDER_GROUP}
          </p>
        </div>
        <Headshot member={member} className="w-28 sm:w-36 lg:w-40" />
      </div>
      {variant === "full" ? (
        <div className="mt-6 space-y-3 border-t border-border pt-5 text-pretty text-sm leading-relaxed text-muted-foreground">
          {member.bio.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
        </div>
      ) : null}
    </SurfaceCard>
  );
}

export function MedicalTeamSection({
  variant = "summary",
  className,
}: {
  variant?: "summary" | "full";
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  if (!MEDICAL_TEAM_MEDIA_ENABLED) return null;

  return (
    <Section
      id={MEDICAL_TEAM_BIOS_HASH}
      className={cn("scroll-mt-20", className)}
    >
      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE_OUT }}
      >
        <SectionHeading title="Meet the physicians working with Beema Health" />
        <p className="mx-auto mt-3 max-w-xl text-pretty text-center text-xs leading-relaxed text-muted-foreground">
          {`Beema Health's clinical provider group is ${CLINICAL_PROVIDER_GROUP}, a physician-led network. Licensed clinicians make every treatment decision independently, and the clinician assigned to your care may vary by state licensure and availability.`}
        </p>
      </motion.div>

      <div
        className={cn("mt-10 grid gap-6", "mx-auto max-w-5xl md:grid-cols-2")}
      >
        {MEDICAL_TEAM.map((member, index) => (
          <motion.div
            key={member.id}
            className="h-full"
            initial={reduceMotion ? undefined : { opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{
              duration: reduceMotion ? 0 : 0.6,
              delay: reduceMotion ? 0 : index * 0.1,
              ease: EASE_OUT,
            }}
          >
            <TeamMemberCard member={member} variant={variant} />
          </motion.div>
        ))}
      </div>

      <div
        role="note"
        className={cn(
          "mx-auto mt-6 flex max-w-5xl items-start gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-[11px] leading-snug text-muted-foreground",
        )}
      >
        <Info className="mt-0.5 size-3 shrink-0 text-trust" aria-hidden />
        <p>
          <span className="font-semibold text-foreground">Disclaimer: </span>
          <em>{TEAM_MEDIA_DISCLAIMER}</em>
        </p>
      </div>

      {variant === "summary" ? (
        <p className="mt-5 text-center text-sm">
          <Link
            to="/about/"
            hash={MEDICAL_TEAM_BIOS_HASH}
            className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
          >
            Read the full bios <ArrowRight className="size-4" aria-hidden />
          </Link>
        </p>
      ) : null}
    </Section>
  );
}
