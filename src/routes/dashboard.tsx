import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { SurfaceCard } from "@/components/site/primitives";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth";
import { fetchDashboard } from "@/lib/api/client";
import { getEligibility, getIntake, getReview, getSession } from "@/lib/storage";
import type { DashboardData } from "@/lib/types/mvp";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    await requireAuth({
      redirectTo: "/login",
      redirectPath: location.pathname,
    });
  },
  loader: async (): Promise<DashboardData> => {
    const apiData = await fetchDashboard();
    if (apiData) return apiData;

    const session = getSession();
    if (!session) {
      throw redirect({ to: "/login", search: { redirect: "/dashboard" } });
    }
    const intake = getIntake(session.user.id);
    const eligibility = getEligibility(session.user.id);
    const review = getReview(session.user.id);
    return {
      user: session.user,
      intake_status: review?.status ?? intake?.status ?? "draft",
      submitted_at: intake?.submitted_at ?? null,
      treatment_interest: eligibility?.treatment_interest ?? null,
      patient_note: review?.patient_note ?? "",
    };
  },
  component: DashboardPage,
});

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under provider review",
  more_info_needed: "More information needed",
  approved: "Approved",
  not_approved: "Not approved",
  prescription_sent: "Prescription sent",
};

function DashboardPage() {
  const data = Route.useLoaderData();

  return (
    <MarketingLayout>
      <div className="veya-container py-12 md:py-16">
        <h1 className="text-3xl font-bold text-foreground">
          Welcome, {data.user.first_name}
        </h1>
        <p className="mt-2 text-muted-foreground">Your patient dashboard — MVP view.</p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <SurfaceCard className="p-6">
            <h2 className="text-lg font-semibold text-foreground">Intake status</h2>
            <p className="mt-3 text-2xl font-bold text-primary">
              {STATUS_LABELS[data.intake_status] ?? data.intake_status}
            </p>
            {data.submitted_at && (
              <p className="mt-2 text-sm text-muted-foreground">
                Submitted {new Date(data.submitted_at).toLocaleDateString()}
              </p>
            )}
            {data.treatment_interest && (
              <p className="mt-2 text-sm text-muted-foreground">
                Treatment interest: {data.treatment_interest.replace(/_/g, " ")}
              </p>
            )}
          </SurfaceCard>

          <SurfaceCard className="p-6">
            <h2 className="text-lg font-semibold text-foreground">Message from care team</h2>
            {data.patient_note ? (
              <p className="mt-3 text-sm leading-relaxed text-foreground">{data.patient_note}</p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No message yet. Your provider will leave a note here when they review your intake.
              </p>
            )}
          </SurfaceCard>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/intake">
              {data.intake_status === "draft" ? "Continue intake" : "Update intake"}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/intake">Upload documents</Link>
          </Button>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          No secure messaging in MVP. Provider notes appear here after admin review.
        </p>
      </div>
    </MarketingLayout>
  );
}
