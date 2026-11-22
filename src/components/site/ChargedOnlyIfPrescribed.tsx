import { formatUsd } from "@/lib/medication-pricing";

/**
 * Multi-month plan total with its comparison price crossed out, followed by
 * the billing-timing statement: "<s>$597</s> $497 for 3 months, charged only
 * if prescribed." Use under any price box that leads with a monthly figure
 * on a multi-month plan, so the full plan price is never a surprise at
 * checkout. The comparison price is skipped when it is not higher than the
 * plan price, so we never cross out a price that is not a real saving.
 */
export function ChargedOnlyIfPrescribed({
  totalUsd,
  regularUsd,
  months,
}: {
  totalUsd: number;
  /** Comparison price for the same term (e.g. the monthly rate times months). */
  regularUsd?: number;
  months: number;
}) {
  return (
    <>
      {regularUsd != null && regularUsd > totalUsd ? (
        <>
          <s>
            <span className="sr-only">Regular price </span>
            {formatUsd(regularUsd)}
          </s>{" "}
        </>
      ) : null}
      <strong className="font-semibold text-foreground">
        {formatUsd(totalUsd)}
      </strong>{" "}
      for {months} months, charged only if prescribed.
    </>
  );
}
