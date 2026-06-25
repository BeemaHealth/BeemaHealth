import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AccountSectionCard } from "@/components/portal/AccountSectionCard";
import { Button } from "@/components/ui/button";
import {
  fetchStaffDropoffAnalytics,
  fetchStaffFunnelAnalytics,
  type FunnelAnalyticsStep,
} from "@/lib/api/client";
import { BarChart3 } from "lucide-react";

export const Route = createFileRoute("/staff/analytics")({
  component: StaffAnalyticsPage,
});

function StaffAnalyticsPage() {
  const [slug, setSlug] = useState<"qualify" | "intake">("qualify");
  const [funnel, setFunnel] = useState<FunnelAnalyticsStep[]>([]);
  const [dropoff, setDropoff] = useState<FunnelAnalyticsStep[]>([]);

  useEffect(() => {
    void Promise.all([
      fetchStaffFunnelAnalytics({ questionnaire_slug: slug }),
      fetchStaffDropoffAnalytics(slug),
    ]).then(([f, d]) => {
      setFunnel(f.steps);
      setDropoff(d.steps);
    });
  }, [slug]);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Funnel analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Step views, completions, and drop-off.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={slug === "qualify" ? "default" : "outline"}
            size="sm"
            onClick={() => setSlug("qualify")}
          >
            Qualify
          </Button>
          <Button
            variant={slug === "intake" ? "default" : "outline"}
            size="sm"
            onClick={() => setSlug("intake")}
          >
            Intake
          </Button>
        </div>
      </div>

      <AccountSectionCard tone="orders" title="Step funnel" icon={BarChart3}>
        {funnel.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No events recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">Step</th>
                  <th className="py-2 pr-4">Views</th>
                  <th className="py-2 pr-4">Completions</th>
                </tr>
              </thead>
              <tbody>
                {funnel.map((row) => (
                  <tr key={row.step_key} className="border-b border-border/60">
                    <td className="py-2 pr-4 font-medium">{row.step_key}</td>
                    <td className="py-2 pr-4">{row.views}</td>
                    <td className="py-2 pr-4">{row.completions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AccountSectionCard>

      <AccountSectionCard tone="primary" title="Drop-off rate" icon={BarChart3}>
        {dropoff.length === 0 ? (
          <p className="text-sm text-muted-foreground">No drop-off data yet.</p>
        ) : (
          <div className="space-y-3">
            {dropoff.map((row) => (
              <div key={row.step_key}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{row.step_key}</span>
                  <span className="text-muted-foreground">
                    {row.dropoff_percent ?? 0}%
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${Math.min(100, row.dropoff_percent ?? 0)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </AccountSectionCard>
    </div>
  );
}
