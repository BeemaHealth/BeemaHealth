import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { loginUser } from "@/lib/api/client";
import { FlowLayout } from "@/components/quiz/FlowLayout";
import { Field, PasswordInput, QuizShell, inputCls } from "@/components/quiz/quiz-primitives";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: (s.redirect as string) || "/dashboard",
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const session = await loginUser(email, password);
      if (!session.user.email_verified && redirect === "/intake") {
        navigate({ to: "/verify-email/pending" });
        return;
      }
      navigate({ to: redirect });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    }
  }

  return (
    <FlowLayout progress={0}>
      <QuizShell label="Login" title="Welcome back">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <Field label="Email" required>
            <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password" required>
            <PasswordInput value={password} onChange={setPassword} />
          </Field>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full">Log in</Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          New patient?{" "}
          <Link to="/qualify" className="text-primary underline">Start eligibility check</Link>
        </p>
      </QuizShell>
    </FlowLayout>
  );
}
