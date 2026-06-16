import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { computeAge, computeBmi } from "@/lib/safety-flags";
import { listPatientRecords } from "@/lib/storage";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  component: AdminListPage,
});

function AdminListPage() {
  const records = listPatientRecords().filter((r) => r.intake?.status && r.intake.status !== "draft");

  return (
    <MarketingLayout>
      <div className="veya-container py-12">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Provider review</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Admin dashboard — prototype only. Protect with auth before production.
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
              {records.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    No submitted intakes yet.
                  </td>
                </tr>
              )}
              {records.map(({ user, eligibility, intake, flags, review }) => {
                const age = computeAge(user.dob);
                const bmi = eligibility?.bmi ?? computeBmi(eligibility?.height_ft ?? "", eligibility?.height_in ?? "", eligibility?.weight ?? "");
                return (
                  <tr key={user.id} className="border-b border-border/60">
                    <td className="px-4 py-3 font-medium">{user.first_name} {user.last_name}</td>
                    <td className="px-4 py-3">{age ?? "—"}</td>
                    <td className="px-4 py-3">{bmi ?? "—"}</td>
                    <td className="px-4 py-3">{eligibility?.city}, CO</td>
                    <td className="px-4 py-3">{intake?.submitted_at ? new Date(intake.submitted_at).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3">{eligibility?.treatment_interest?.replace(/_/g, " ") ?? "—"}</td>
                    <td className="px-4 py-3">{flags.length || "—"}</td>
                    <td className="px-4 py-3">{review?.status ?? intake?.status}</td>
                    <td className="px-4 py-3">
                      <Link to="/admin/$patientId" params={{ patientId: user.id }} className="text-primary underline">
                        Review
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </MarketingLayout>
  );
}
