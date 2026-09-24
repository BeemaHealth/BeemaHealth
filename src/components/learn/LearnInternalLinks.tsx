import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SurfaceCard } from "@/components/site/primitives";
import {
  articleMoneyPages,
  getRelatedArticles,
} from "@/content/learn/registry";
import { learnPath, type LearnArticle } from "@/content/learn/types";
import type { LearnMoneyPage } from "@/content/learn/money-pages";

export function LearnInternalLinks({
  article,
  extraMoneyPages = [],
}: {
  article: LearnArticle;
  extraMoneyPages?: readonly LearnMoneyPage[];
}) {
  const related = getRelatedArticles(article);
  const moneyFromArticle = articleMoneyPages(article);
  const money = [
    ...moneyFromArticle,
    ...extraMoneyPages.filter(
      (page) =>
        !moneyFromArticle.some((existing) => existing.href === page.href),
    ),
  ];

  if (related.length === 0 && money.length === 0) return null;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {related.length > 0 ? (
        <SurfaceCard className="h-full">
          <h2 className="text-lg font-semibold text-foreground">
            Related education
          </h2>
          <ul className="mt-4 space-y-3">
            {related.map((item) => (
              <li key={learnPath(item.vertical, item.slug)}>
                <Link
                  to={learnPath(item.vertical, item.slug)}
                  className="group flex items-start justify-between gap-3 text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                >
                  <span>{item.title}</span>
                  <ArrowRight
                    className="mt-0.5 size-4 shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </SurfaceCard>
      ) : null}
      {money.length > 0 ? (
        <SurfaceCard className="h-full">
          <h2 className="text-lg font-semibold text-foreground">
            Program pages
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            These pages describe Beema Health&apos;s live medical weight-loss
            offering. They are commercial pages, not this educational article.
          </p>
          <ul className="mt-4 space-y-3">
            {money.map((page) => (
              <li key={page.href}>
                <Link
                  to={page.href}
                  className="group flex items-start justify-between gap-3 text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                >
                  <span>{page.label}</span>
                  <ArrowRight
                    className="mt-0.5 size-4 shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </SurfaceCard>
      ) : null}
    </div>
  );
}
