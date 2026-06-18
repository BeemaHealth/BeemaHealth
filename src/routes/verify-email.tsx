import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FlowLayout } from "@/components/quiz/FlowLayout";
import { QuizShell } from "@/components/quiz/quiz-primitives";
import { Button } from "@/components/ui/button";
import { verifyEmail } from "@/lib/api/client";

export const Route = createFileRoute("/verify-email")({
  validateSearch: (s: Record<string, unknown>) => ({
    token: (s.token as string) || "",
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await verifyEmail(token);
        if (!cancelled) {
          setStatus("success");
          setMessage("Your email is verified. You can continue to your medical intake.");
        }
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setMessage(e instanceof Error ? e.message : "Verification failed.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <FlowLayout progress={0}>
      <QuizShell
        label="Email verification"
        title={status === "loading" ? "Verifying your email…" : status === "success" ? "Email verified" : "Verification failed"}
        subtitle={status === "loading" ? "Please wait a moment." : message}
      >
        {status === "success" && (
          <Button className="w-full" onClick={() => navigate({ to: "/intake" })}>
            Continue to medical intake
          </Button>
        )}
        {status === "error" && (
          <div className="grid gap-3">
            <Button variant="outline" className="w-full" asChild>
              <Link to="/verify-email/pending">Resend verification email</Link>
            </Button>
            <Button variant="ghost" className="w-full" asChild>
              <Link to="/login" search={{ redirect: "/intake" }}>Log in</Link>
            </Button>
          </div>
        )}
      </QuizShell>
    </FlowLayout>
  );
}
