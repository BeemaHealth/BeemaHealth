import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AccountSectionCard } from "@/components/portal/AccountSectionCard";
import { Button } from "@/components/ui/button";
import { fetchStaffSummary, type StaffSummary } from "@/lib/api/client";
import { BarChart3, ListChecks, Users } from "lucide-react";

export const Route = createFileRoute("/staff/")({
  component: StaffDashboardPage,
});

function StaffDashboardPage() {
  const [summary, setSummary] = useState<StaffSummary | null>(null);

  useEffect(() => {
    void fetchStaffSummary()
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Staff dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ops CRM: funnel analytics, questionnaires, and patient pipeline.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <AccountSectionCard tone="contact" title="Patients" icon={Users}>
          <p className="text-3xl font-bold text-foreground">
            {summary?.total_patients ?? "N/A"}
          </p>
          <p className="text-sm text-muted-foreground">Registered accounts</p>
        </AccountSectionCard>
        <AccountSectionCard
          tone="contact"
          title="Active funnels"
          icon={BarChart3}
        >
          <p className="text-3xl font-bold text-foreground">
            {summary?.active_funnel_sessions ?? "N/A"}
          </p>
          <p className="text-sm text-muted-foreground">Anonymous sessions</p>
        </AccountSectionCard>
        <AccountSectionCard
          tone="consent"
          title="Submitted intakes"
          icon={ListChecks}
        >
          <p className="text-3xl font-bold text-foreground">
            {summary?.submitted_intakes ?? "N/A"}
          </p>
          <p className="text-sm text-muted-foreground">Awaiting or in review</p>
        </AccountSectionCard>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/staff/analytics">View analytics</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/staff/questionnaires">Edit questionnaires</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/staff/patients">Patient pipeline</Link>
        </Button>
      </div>
    </div>
  );
}
