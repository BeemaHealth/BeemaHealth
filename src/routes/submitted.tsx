import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { FlowLayout } from "@/components/quiz/FlowLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/submitted")({
  component: SubmittedPage,
});

function SubmittedPage() {
  return (
    <FlowLayout progress={100}>
      <div className="w-full max-w-lg text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-success/15">
          <CheckCircle2 className="size-9 text-success" />
        </span>
        <h1 className="mt-6 text-3xl font-bold text-foreground">
          Your intake has been submitted for provider review.
        </h1>
        <div className="mt-8 rounded-3xl border border-border bg-card p-6 text-left shadow-soft">
          <dl className="space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-semibold text-foreground">Pending provider review</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Expected review</dt>
              <dd className="font-semibold text-foreground">24–72 hours</dd>
            </div>
          </dl>
          <p className="mt-5 text-sm text-muted-foreground">
            Prescription is not guaranteed. Your provider may approve, deny, request
            more information, or recommend labs.
          </p>
        </div>
        <Button asChild size="lg" className="mt-8">
          <Link to="/dashboard">Go to your dashboard</Link>
        </Button>
      </div>
    </FlowLayout>
  );
}
