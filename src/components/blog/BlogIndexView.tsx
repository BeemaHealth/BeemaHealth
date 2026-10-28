import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { blogArticlePath, formatBlogDate } from "@/content/blog/paths";
import type { BlogArticle } from "@/content/blog/types";

export function BlogIndexView({
  articles,
}: {
  articles: readonly BlogArticle[];
}) {
  return (
    <MarketingLayout>
      <section className="bg-grad-hero pb-10 pt-14 md:pb-14 md:pt-20">
        <div className="veya-container">
          <div className="mx-auto max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              The Beema Health blog
            </p>
            <h1 className="mt-3 text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              Straight answers on weight loss and GLP-1 care
            </h1>
            <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
              Plain-language articles to help you weigh the evidence, ask better
              questions, and make informed treatment decisions.
            </p>
          </div>
        </div>
      </section>

      <section className="pb-16 pt-2 md:pb-24">
        <div className="veya-container">
          {articles.length === 0 ? (
            <p className="mx-auto max-w-3xl text-sm text-muted-foreground">
              No articles yet.
            </p>
          ) : (
            <ul className="mx-auto grid max-w-3xl gap-5">
              {articles.map((article) => (
                <li key={article.slug}>
                  <Link
                    to={blogArticlePath(article.slug)}
                    className="group block rounded-3xl border border-border bg-card p-6 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:p-8"
                  >
                    <p className="text-sm text-muted-foreground">
                      <time dateTime={article.date}>
                        {formatBlogDate(article.date)}
                      </time>
                    </p>
                    <h2 className="mt-2 text-balance text-xl font-semibold tracking-tight text-foreground md:text-2xl">
                      {article.title}
                    </h2>
                    <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
                      {article.excerpt}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-foreground group-hover:text-primary">
                      Read article
                      <ArrowRight
                        aria-hidden="true"
                        className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </MarketingLayout>
  );
}
