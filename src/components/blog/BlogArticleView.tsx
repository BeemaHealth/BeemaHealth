import { Link } from "@tanstack/react-router";
import { ArrowLeft, Clock } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BlogWeightChart } from "@/components/blog/BlogWeightChart";
import { BlogRichText } from "@/components/blog/BlogRichText";
import { PreferredSourceButton } from "@/components/learn/PreferredSourceButton";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { getBlogChart } from "@/content/blog/charts";
import { segmentBlogBlocks } from "@/content/blog/faq";
import { blogHeadingId, plainBlogText } from "@/content/blog/parse";
import {
  BLOG_INDEX_PATH,
  blogImageFile,
  blogImageSrcSet,
  formatBlogDate,
} from "@/content/blog/paths";
import type { BlogArticle, BlogBlock } from "@/content/blog/types";

function headingIds(blocks: readonly BlogBlock[]): Map<number, string> {
  const used = new Map<string, number>();
  const ids = new Map<number, string>();
  blocks.forEach((block, index) => {
    if (block.type !== "heading") return;
    const base = blogHeadingId(block.text);
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    ids.set(index, count === 0 ? base : `${base}-${count + 1}`);
  });
  return ids;
}

function readingMinutes(blocks: readonly BlogBlock[]): number {
  const words = blocks
    .map((block) => {
      if (block.type === "heading") return block.text;
      if (block.type === "paragraph") return plainBlogText(block.inlines);
      if (block.type === "image" || block.type === "chart") return "";
      return block.items.map((item) => plainBlogText(item)).join(" ");
    })
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

const PROSE = "text-base leading-8 text-foreground/80 md:text-lg md:leading-9";

export function BlogArticleView({ article }: { article: BlogArticle }) {
  const ids = headingIds(article.blocks);

  return (
    <MarketingLayout>
      <header className="relative overflow-hidden bg-grad-hero pb-4 pt-10 md:pb-5 md:pt-14">
        <div className="veya-container relative z-10">
          <div className="mx-auto max-w-3xl">
            <Link
              to={BLOG_INDEX_PATH}
              activeOptions={{ exact: true }}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              All articles
            </Link>
            <h1 className="mt-6 text-balance text-3xl font-bold leading-tight tracking-tight text-foreground md:text-5xl md:leading-[1.1]">
              {article.title}
            </h1>
            <p className="mt-5 text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
              {article.excerpt}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-border/60 pt-5 text-sm text-muted-foreground">
              <PreferredSourceButton />
              <span aria-hidden="true">&middot;</span>
              <span>
                By{" "}
                <span className="font-semibold text-foreground">
                  {article.author}
                </span>
              </span>
              <span aria-hidden="true">&middot;</span>
              <time dateTime={article.date}>
                {formatBlogDate(article.date)}
              </time>
              <span aria-hidden="true">&middot;</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock aria-hidden="true" className="size-4" />
                {readingMinutes(article.blocks)} min read
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="veya-container pb-20 pt-6 md:pb-28 md:pt-8">
        <article className="mx-auto max-w-3xl space-y-6 break-words">
          {segmentBlogBlocks(article.blocks).map((segment) => {
            const index = segment.index;
            if (segment.kind === "faq") {
              return (
                <section key={index} aria-labelledby={ids.get(index)}>
                  <h2
                    id={ids.get(index)}
                    className="scroll-mt-28 text-balance pt-8 text-2xl font-bold tracking-tight text-foreground md:text-3xl"
                  >
                    {segment.heading}
                  </h2>
                  <Accordion type="single" collapsible className="mt-6">
                    {segment.entries.map((entry, entryIndex) => (
                      <AccordionItem
                        key={entry.question}
                        value={`faq-${entryIndex}`}
                        className="mb-3 rounded-2xl border border-border bg-card px-5"
                      >
                        <AccordionTrigger className="text-left text-base font-medium text-foreground md:text-lg">
                          {entry.question}
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3 text-base leading-7 text-muted-foreground">
                          {entry.answer.map((inlines, answerIndex) => (
                            <p key={answerIndex}>
                              <BlogRichText inlines={inlines} />
                            </p>
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </section>
              );
            }
            const block = segment.block;
            if (block.type === "heading") {
              const Tag = block.level === 2 ? "h2" : "h3";
              return (
                <Tag
                  key={index}
                  id={ids.get(index)}
                  className={
                    block.level === 2
                      ? "scroll-mt-28 text-balance pt-8 text-2xl font-bold tracking-tight text-foreground md:text-3xl"
                      : "scroll-mt-28 text-balance pt-4 text-lg font-semibold tracking-tight text-foreground md:text-xl"
                  }
                >
                  {block.text}
                </Tag>
              );
            }
            if (block.type === "chart") {
              const chart = getBlogChart(block.id);
              return chart ? (
                <BlogWeightChart key={index} chart={chart} />
              ) : null;
            }
            if (block.type === "image") {
              return (
                <figure key={index} className="my-8">
                  <img
                    src={blogImageFile(block.src)}
                    srcSet={blogImageSrcSet(block.src, block.width)}
                    sizes="(min-width: 768px) 768px, 100vw"
                    width={block.width}
                    height={block.height}
                    alt={block.alt}
                    loading="lazy"
                    decoding="async"
                    className="h-auto w-full rounded-2xl border border-border shadow-soft"
                  />
                </figure>
              );
            }
            if (block.type === "list") {
              return (
                <ul key={index} className={`space-y-3 ${PROSE}`}>
                  {block.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex gap-3">
                      <span
                        aria-hidden="true"
                        className="mt-3.5 size-2 shrink-0 rounded-full bg-primary md:mt-4"
                      />
                      <span>
                        <BlogRichText inlines={item} />
                      </span>
                    </li>
                  ))}
                </ul>
              );
            }
            if (block.disclaimer) {
              return (
                <p
                  key={index}
                  className="mt-10 rounded-2xl border border-border bg-muted/50 p-5 text-sm leading-relaxed text-muted-foreground md:p-6"
                >
                  <BlogRichText inlines={block.inlines} />
                </p>
              );
            }
            return (
              <p key={index} className={PROSE}>
                <BlogRichText inlines={block.inlines} />
              </p>
            );
          })}
          <div className="border-t border-border pt-8">
            <Link
              to={BLOG_INDEX_PATH}
              activeOptions={{ exact: true }}
              className="inline-flex items-center gap-2 text-sm font-semibold text-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back to all articles
            </Link>
          </div>
        </article>
      </div>
    </MarketingLayout>
  );
}
