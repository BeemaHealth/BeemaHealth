import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { QuizProgressBar } from "@/components/quiz/quiz-primitives";
import type { ReactNode } from "react";

export function FlowLayout({
  children,
  progress,
  exitTo = "/",
}: {
  children: ReactNode;
  progress: number;
  exitTo?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-grad-hero">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="veya-container flex h-16 items-center justify-between">
          <Link to="/" aria-label="Beema Health home">
            <Logo />
          </Link>
          <Link
            to={exitTo}
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Exit
          </Link>
        </div>
        <QuizProgressBar progress={progress} />
      </header>
      <main className="flex flex-1 items-start justify-center px-5 py-10 md:py-16">
        {children}
      </main>
    </div>
  );
}
