import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { computeAge, computeBmi } from "@/lib/safety-flags";
import { fetchAdminPatients, isApiEnabled } from "@/lib/api/client";
import { listPatientRecords } from "@/lib/storage";
import { Button } from "@/components/ui/button";

type AdminRow = {
  id: string;
  first_name: string;
  last_name: string;
  age: number | null;
  bmi: number | null;
  city: string;
  submitted_at: string | null;
  treatment_interest: string;
  flag_count: number;
  status: string;
};

export const Route = createFileRoute("/admin")({
  component: AdminListPage,
});

function AdminListPage() {
  const [rows, setRows] = useState<AdminRow[]>([]);

  useEffect(() => {
    if (isApiEnabled()) {
      fetchAdminPatients()
        .then((data) => setRows((data as AdminRow[]) ?? []))
        .catch(() => setRows([]));
      return;
    }
    const records = listPatientRecords().filter(
      (r) => r.intake?.status && r.intake.status !== "draft",
    );
    setRows(
      records.map(({ user, eligibility, intake, flags, review }) => ({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        age: computeAge(user.dob),
        bmi:
          eligibility?.bmi ??
          computeBmi(
            eligibility?.height_ft ?? "",
            eligibility?.height_in ?? "",
            eligibility?.weight ?? "",
          ),
        city: eligibility?.city ?? "",
        submitted_at: intake?.submitted_at ?? null,
        treatment_interest: eligibility?.treatment_interest ?? "",
        flag_count: flags.length,
        status: review?.status ?? intake?.status ?? "draft",
      })),
    );
  }, []);

  return (
    <MarketingLayout>
      <div className="veya-container py-12">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Provider review</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isApiEnabled()
                ? "Connected to Django API — provider login required."
                : "Local prototype mode — data from browser storage."}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/">Exit admin</Link>
          </Button>
        </div>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                {["Patient", "Age", "BMI", "Location", "Submitted", "Interest", "Flags", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    No submitted intakes yet.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/60">
                  <td className="px-4 py-3 font-medium">{row.first_name} {row.last_name}</td>
                  <td className="px-4 py-3">{row.age ?? "—"}</td>
                  <td className="px-4 py-3">{row.bmi ?? "—"}</td>
                  <td className="px-4 py-3">{row.city}, CO</td>
                  <td className="px-4 py-3">{row.submitted_at ? new Date(row.submitted_at).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">{row.treatment_interest?.replace(/_/g, " ") ?? "—"}</td>
                  <td className="px-4 py-3">{row.flag_count || "—"}</td>
                  <td className="px-4 py-3">{row.status}</td>
                  <td className="px-4 py-3">
                    <Link to="/admin/$patientId" params={{ patientId: row.id }} className="text-primary underline">
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MarketingLayout>
  );
}
