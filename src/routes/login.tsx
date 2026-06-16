import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { loginUser } from "@/lib/api/client";
import { FlowLayout } from "@/components/quiz/FlowLayout";
import { Field, QuizShell, inputCls } from "@/components/quiz/quiz-primitives";
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
      await loginUser(email, password);
      navigate({ to: redirect });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    }
  }

  return (
    <FlowLayout progress={0}>
      <QuizShell step={0} totalSteps={1} label="Login" title="Welcome back">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <Field label="Email" required>
            <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password" required>
            <input type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} />
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
