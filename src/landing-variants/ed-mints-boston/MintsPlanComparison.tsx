import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { formatUsd } from "@/lib/medication-pricing";
import type { BlackFridayOffer } from "../template/BlackFriday";
import { MINT_PLAN_COMPARISONS } from "./plan-comparison";

const money = (n: number) =>
  Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;

/**
 * Pricing for one ED Mints formulation, rendered inside its card: two price
 * tiles (1 month, 3 months) up front, and the detail (active ingredients,
 * tablets, price per tablet, effective monthly cost) in a native <details>
 * so the card stays uncluttered. The detail table stays in the DOM, so the
 * numbers remain crawlable.
 */
export function MintsPlanTable({
  id,
  blackFriday,
  children,
}: {
  id: "rdt" | "odt";
  /** Description and bullets shown at the top of the dropdown. */
  children?: ReactNode;
  /** Opt-in: show each plan crossed out and priced with the coupon applied. */
  blackFriday?: BlackFridayOffer;
}) {
  const p = MINT_PLAN_COMPARISONS.find((c) => c.id === id);
  if (!p) return null;
  const bfOne = blackFriday?.plans?.find((l) => l.label === "1-month plan");
  const bfThree = blackFriday?.plans?.find((l) => l.label === "3-month plan");

  const oneUsd = bfOne ? bfOne.dealUsd : p.monthly.priceUsd;
  const threeUsd = bfThree ? bfThree.dealUsd : p.quarterly.totalUsd;
  const saveUsd =
    p.quarterly.savingsUsd +
    (bfThree ? bfThree.regularUsd - bfThree.dealUsd : 0);
  const perMonthThree = bfThree
    ? Math.round((bfThree.dealUsd / 3) * 100) / 100
    : p.quarterly.perMonthUsd;

  const was = (n: number) => (
    <s className="mr-1.5 text-base font-normal text-muted-foreground">
      <span className="sr-only">Regular price </span>
      {formatUsd(n)}
    </s>
  );

  const details: { label: string; one: ReactNode; three: ReactNode }[] = [
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
          ? Math.round((bfThree.dealUsd / p.quarterly.tablets) * 100) / 100
          : p.quarterly.perTabletUsd,
      ),
    },
    {
      label: "Effective per month",
      one: formatUsd(oneUsd),
      three: money(perMonthThree),
    },
  ];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-3xl font-semibold tracking-tight text-foreground">
          {bfOne ? was(bfOne.regularUsd) : null}
          {formatUsd(oneUsd)}
          <span className="ml-1 text-base font-medium text-muted-foreground">
            /month
          </span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          or {bfThree ? was(bfThree.regularUsd) : null}
          {formatUsd(threeUsd)} billed every 3 months (save {formatUsd(saveUsd)}
          )
          {blackFriday ? (
            <>
              {" "}
              with code{" "}
              <strong className="font-mono text-foreground">
                {blackFriday.code}
              </strong>
            </>
          ) : null}
        </p>
      </div>
      <details className="group rounded-xl border border-border">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
          Details
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-3 border-t border-border px-4 py-3">
          {children}
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Active ingredients
            </p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">
              {p.ingredients.join(" + ")}
            </p>
          </div>
          <table className="w-full table-fixed border-collapse text-left text-sm">
            <caption className="sr-only">
              {p.name} {p.dose}: 1 month plan compared with 3 month plan
            </caption>
            <thead>
              <tr>
                <th scope="col" className="w-[40%] pb-2" />
                <th
                  scope="col"
                  className="pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  1 month
                </th>
                <th
                  scope="col"
                  className="pb-2 text-xs font-semibold uppercase tracking-wide text-accent-foreground"
                >
                  3 months
                </th>
              </tr>
            </thead>
            <tbody>
              {details.map((r) => (
                <tr key={r.label} className="border-t border-border">
                  <th
                    scope="row"
                    className="py-2 pr-2 text-xs font-medium text-muted-foreground"
                  >
                    {r.label}
                  </th>
                  <td className="py-2 font-semibold text-foreground">
                    {r.one}
                  </td>
                  <td className="py-2 font-semibold text-foreground">
                    {r.three}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
