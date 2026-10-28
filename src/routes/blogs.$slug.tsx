import { createFileRoute, notFound } from "@tanstack/react-router";
import { BlogArticleView } from "@/components/blog/BlogArticleView";
import { getArticle } from "@/content/blog/articles";
import { blogArticlePath } from "@/content/blog/paths";
import {
  blogArticleJsonLd,
  blogDocumentMeta,
  blogLeadImage,
} from "@/lib/blog-seo";
import type { BlogArticle } from "@/content/blog/types";

export const Route = createFileRoute("/blogs/$slug")({
  loader: ({ params }): BlogArticle => {
    const article = getArticle(params.slug);
    if (!article) throw notFound();
    return article;
  },
  head: ({ loaderData: article }) => {
    if (!article) {
      return {
        meta: [{ name: "robots", content: "noindex, nofollow" }],
      };
    }
    return blogDocumentMeta({
      title: article.title,
      description: article.metaDescription,
      path: blogArticlePath(article.slug),
      ogType: "article",
      image: blogLeadImage(article.blocks),
      jsonLd: blogArticleJsonLd(article, blogArticlePath(article.slug)),
    });
  },
  component: BlogArticlePage,
});

function BlogArticlePage() {
  const article = Route.useLoaderData();
  return <BlogArticleView article={article} />;
}
