import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { SurfaceCard } from "@/components/site/primitives";
import { Button } from "@/components/ui/button";
import { syncIntake, syncReview } from "@/lib/api/client";
import { computeSafetyFlags } from "@/lib/safety-flags";
import { listPatientRecords, saveSafetyFlags } from "@/lib/storage";
import type { IntakeStatus, ProviderDecision } from "@/lib/types/mvp";

export const Route = createFileRoute("/admin/$patientId")({
  component: AdminDetailPage,
});

function AdminDetailPage() {
  const { patientId } = Route.useParams();
  const record = listPatientRecords().find((r) => r.user.id === patientId);
  const [decision, setDecision] = useState<ProviderDecision | "">(record?.review?.decision ?? "");
  const [internalNote, setInternalNote] = useState(record?.review?.internal_note ?? "");
  const [patientNote, setPatientNote] = useState(record?.review?.patient_note ?? "");
  const [status, setStatus] = useState<IntakeStatus>(record?.review?.status ?? record?.intake?.status ?? "submitted");

  if (!record) {
    return (
      <MarketingLayout>
        <div className="veya-container py-16 text-center">Patient not found.</div>
      </MarketingLayout>
    );
  }

  const { user, eligibility, intake, consent, flags } = record;

  async function saveReview() {
    if (!intake) return;
    const review = {
      id: crypto.randomUUID(),
      user_id: user.id,
      reviewer_id: "admin-prototype",
      status,
      internal_note: internalNote,
      patient_note: patientNote,
      decision,
      reviewed_at: new Date().toISOString(),
    };
    await syncReview(review);
    await syncIntake({ ...intake, status });
    saveSafetyFlags(user.id, computeSafetyFlags(user, eligibility, intake, !!consent));
    alert("Review saved.");
  }

  return (
    <MarketingLayout>
      <div className="veya-container py-12">
        <Link to="/admin" className="text-sm text-primary underline">← Back to list</Link>
        <h1 className="mt-4 text-3xl font-bold">{user.first_name} {user.last_name}</h1>
        <p className="text-muted-foreground">BMI {eligibility?.bmi ?? "—"} · {eligibility?.city}, Colorado</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <SurfaceCard className="space-y-3 p-6 text-sm">
            <h2 className="text-lg font-semibold">Patient summary</h2>
            <p>Email: {user.email}</p>
            <p>Phone: {user.phone}</p>
            <p>Treatment interest: {eligibility?.treatment_interest}</p>
            <p>Budget: {eligibility?.budget}</p>
            <p>Prior GLP-1: {(intake?.weight_history as { prior_meds?: string[] })?.prior_meds?.join(", ") || "—"}</p>
          </SurfaceCard>

          <SurfaceCard className="p-6">
            <h2 className="text-lg font-semibold">Safety flags ({flags.length})</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {flags.map((f) => (
                <li key={f.id} className="rounded-xl bg-warning/10 px-3 py-2">{f.description}</li>
              ))}
              {flags.length === 0 && <li className="text-muted-foreground">No flags</li>}
            </ul>
          </SurfaceCard>
        </div>

        <SurfaceCard className="mt-6 p-6">
          <h2 className="text-lg font-semibold">Provider decision</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Software organizes information only — does not recommend or prescribe medication.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              Decision
              <select className="mt-1 w-full rounded-xl border border-input px-3 py-2" value={decision} onChange={(e) => setDecision(e.target.value as ProviderDecision)}>
                <option value="">Select…</option>
                <option value="needs_more_info">Needs more information</option>
                <option value="not_appropriate">Not appropriate for treatment</option>
                <option value="labs_required">Labs required</option>
                <option value="approved">Approved for prescription consideration</option>
                <option value="prescription_sent_outside">Prescription sent outside platform</option>
              </select>
            </label>
            <label className="text-sm">
              Patient status
              <select className="mt-1 w-full rounded-xl border border-input px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value as IntakeStatus)}>
                {["submitted", "under_review", "more_info_needed", "approved", "not_approved", "prescription_sent"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-4 block text-sm">
            Internal clinical note
            <textarea className="mt-1 w-full rounded-xl border border-input px-3 py-2" rows={3} value={internalNote} onChange={(e) => setInternalNote(e.target.value)} />
          </label>
          <label className="mt-4 block text-sm">
            Patient-facing note
            <textarea className="mt-1 w-full rounded-xl border border-input px-3 py-2" rows={3} value={patientNote} onChange={(e) => setPatientNote(e.target.value)} />
          </label>
          <Button className="mt-4" onClick={() => void saveReview()}>Save review</Button>
        </SurfaceCard>

        {consent && (
          <SurfaceCard className="mt-6 p-6 text-sm">
            <h2 className="font-semibold">Consent record</h2>
            <p className="mt-2">Signed: {consent.typed_signature} on {new Date(consent.signed_at).toLocaleString()}</p>
          </SurfaceCard>
        )}
      </div>
    </MarketingLayout>
  );
}
