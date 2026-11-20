import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck } from "lucide-react";
import { Section, SectionHeading } from "@/components/site/primitives";
import { MINT_OPTIONS } from "@/components/site/EdMintsPicker";
import { resolveCta, type CtaId } from "@/lib/cta-ids";
import { formatUsd } from "@/lib/medication-pricing";
import type { BlackFridayOffer } from "../template/BlackFriday";
import { MINT_PLAN_COMPARISONS } from "./plan-comparison";

const money = (n: number) =>
  Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;

/**
 * Monthly vs 3-month pricing and tablet counts for both ED Mints
 * formulations. Real <table>s (one per formulation) so the numbers are
 * crawlable, and they fit a 360px screen: 3 columns, short labels.
 */
export function MintsPlanComparison({
  ctaIds,
  blackFriday,
}: {
  ctaIds: Record<"rdt" | "odt", CtaId>;
  /** Opt-in: show each plan crossed out and priced with the coupon applied. */
  blackFriday?: BlackFridayOffer;
}) {
  const bfOne = blackFriday?.plans?.find((p) => p.label === "1-month plan");
  const bfThree = blackFriday?.plans?.find((p) => p.label === "3-month plan");
  const was = (n: number) => (
    <s className="mr-1 font-normal text-muted-foreground">
      <span className="sr-only">Regular price </span>
      {formatUsd(n)}
    </s>
  );
  return (
    <Section id="plan-comparison" className="scroll-mt-24 pt-0">
      <SectionHeading
        eyebrow="Monthly vs 3-month"
        title="ED Mints pricing: 1 month vs 3 months"
        description="Both formulations are priced the same. The 3-month plan includes more tablets and a lower price per tablet. Prices apply when a licensed provider prescribes."
      />
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {MINT_PLAN_COMPARISONS.map((p) => {
          const opt = MINT_OPTIONS.find((o) => o.id === p.id);
          if (!opt) return null;
          const cta = resolveCta(ctaIds[p.id], "plan_comparison");
          const rows: { label: string; one: ReactNode; three: ReactNode }[] = [
            {
              label: blackFriday ? "With code" : "Billed",
              one: bfOne ? (
                <>
                  {was(bfOne.regularUsd)}
                  {formatUsd(bfOne.dealUsd)} for 1 month
                </>
              ) : (
                `${formatUsd(p.monthly.priceUsd)} monthly`
              ),
              three: bfThree ? (
                <>
                  {was(bfThree.regularUsd)}
                  {formatUsd(bfThree.dealUsd)} for 3 months
                </>
              ) : (
                `${formatUsd(p.quarterly.totalUsd)} every 3 months`
              ),
            },
            {
              label: "Tablets included",
              one: `${p.monthly.tablets}`,
              three: `${p.quarterly.tablets}`,
            },
            {
              label: "Price per tablet",
              one: money(
                bfOne
                  ? Math.round((bfOne.dealUsd / p.monthly.tablets) * 100) / 100
                  : p.monthly.perTabletUsd,
              ),
              three: money(
                bfThree
                  ? Math.round((bfThree.dealUsd / p.quarterly.tablets) * 100) /
                      100
                  : p.quarterly.perTabletUsd,
              ),
            },
            {
              label: "Effective per month",
              one: formatUsd(bfOne ? bfOne.dealUsd : p.monthly.priceUsd),
              three: money(
                bfThree
                  ? Math.round((bfThree.dealUsd / 3) * 100) / 100
                  : p.quarterly.perMonthUsd,
              ),
            },
          ];
          return (
            <article
              key={p.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
            >
              <header className="flex items-center gap-4 border-b border-border p-5">
                <img
                  src={opt.photo}
                  alt={opt.photoAlt}
                  width={1024}
                  height={1024}
                  loading="lazy"
                  decoding="async"
                  className="w-16 shrink-0"
                />
                <div>
                  <h3 className="text-lg font-semibold leading-snug text-foreground">
                    {p.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">{p.dose}</p>
                </div>
              </header>
              <div className="p-3 sm:p-5">
                <table className="w-full table-fixed border-collapse text-left text-sm">
                  <caption className="sr-only">
                    {p.name} {p.dose}: 1 month plan compared with 3 month plan
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col" className="w-[28%] pb-3" />
                      <th
                        scope="col"
                        className="pb-3 pr-2 align-bottom text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        1 month
                      </th>
                      <th
                        scope="col"
                        className="rounded-t-xl bg-primary-soft/70 px-2 pb-3 pt-2 align-bottom text-xs font-semibold uppercase tracking-wide text-accent-foreground"
                      >
                        3 months
                        <span className="mt-1 flex items-center gap-1 text-[10px] normal-case tracking-normal">
                          <BadgeCheck className="size-3.5 shrink-0" />
                          Save{" "}
                          {formatUsd(
                            p.quarterly.savingsUsd +
                              (bfThree
                                ? bfThree.regularUsd - bfThree.dealUsd
                                : 0),
                          )}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.label} className="border-t border-border">
                        <th
                          scope="row"
                          className="py-3 pr-2 text-xs font-medium text-muted-foreground"
                        >
                          {r.label}
                        </th>
                        <td className="py-3 pr-2 font-semibold text-foreground">
                          {r.one}
                        </td>
                        <td
                          className={`bg-primary-soft/70 px-2 py-3 font-semibold text-foreground ${
                            i === rows.length - 1 ? "rounded-b-xl" : ""
                          }`}
                        >
                          {r.three}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {blackFriday ? (
                <p className="px-5 pb-3 text-center text-xs text-muted-foreground">
                  Prices shown with code{" "}
                  <strong className="font-mono text-foreground">
                    {blackFriday.code}
                  </strong>{" "}
                  applied at checkout.
                </p>
              ) : null}
              <div className="mt-auto p-5 pt-0">
                <Link
                  to={cta.to}
                  search={cta.search}
                  onClick={cta.onClick}
                  className="flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-base font-semibold text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Start {p.dose.split(" ").pop()} intake
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
      <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-relaxed text-muted-foreground">
        Cash-pay when prescribed, with no membership fee and no insurance
        billed. Tablet counts are per fill. Your provider decides the
        formulation and plan; prescribing is never guaranteed.
      </p>
    </Section>
  );
}
