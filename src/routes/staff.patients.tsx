import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AccountSectionCard } from "@/components/portal/AccountSectionCard";
import { Button } from "@/components/ui/button";
import { fetchStaffPatients, type StaffPatientRow } from "@/lib/api/client";
import { Users } from "lucide-react";

export const Route = createFileRoute("/staff/patients")({
  component: StaffPatientsPage,
});

const STAGE_FILTERS = [
  { value: "", label: "All" },
  { value: "registered", label: "Registered" },
  { value: "draft", label: "Intake draft" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under review" },
];

function StaffPatientsPage() {
  const [stage, setStage] = useState("");
  const [rows, setRows] = useState<StaffPatientRow[]>([]);

  useEffect(() => {
    void fetchStaffPatients(stage || undefined)
      .then((data) => setRows(data.patients))
      .catch(() => setRows([]));
  }, [stage]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Patient pipeline</h1>
        <p className="text-sm text-muted-foreground">
          Ops view — funnel stage, last activity, and attribution.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STAGE_FILTERS.map((f) => (
          <Button
            key={f.value || "all"}
            size="sm"
            variant={stage === f.value ? "default" : "outline"}
            onClick={() => setStage(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <AccountSectionCard
        tone="contact"
        title={`Patients (${rows.length})`}
        icon={Users}
      >
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No patients match this filter.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Stage</th>
                  <th className="py-2 pr-3">Last step</th>
                  <th className="py-2 pr-3">UTM</th>
                  <th className="py-2">Variant</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="py-2 pr-3">
                      <div className="font-medium">
                        {row.first_name} {row.last_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {row.email}
                      </div>
                    </td>
                    <td className="py-2 pr-3">{row.stage}</td>
                    <td className="py-2 pr-3">{row.last_step_key || "—"}</td>
                    <td className="py-2 pr-3">{row.utm_source || "—"}</td>
                    <td className="py-2">{row.variant_key || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AccountSectionCard>
    </div>
  );
}
