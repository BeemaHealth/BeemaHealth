import { createFileRoute } from "@tanstack/react-router";
import { BlogIndexView } from "@/components/blog/BlogIndexView";
import { listArticles } from "@/content/blog/articles";
import { BLOG_INDEX_PATH } from "@/content/blog/paths";
import { blogDocumentMeta } from "@/lib/blog-seo";
import type { BlogArticle } from "@/content/blog/types";

const TITLE = "Blog | Beema Health";
const DESCRIPTION =
  "Articles from Beema Health on weight management, GLP-1 medications, and making informed treatment decisions.";

export const Route = createFileRoute("/blogs/")({
  loader: (): readonly BlogArticle[] => listArticles(),
  head: () =>
    blogDocumentMeta({
      title: TITLE,
      description: DESCRIPTION,
      path: BLOG_INDEX_PATH,
      ogType: "website",
    }),
  component: BlogIndexPage,
});

function BlogIndexPage() {
  const articles = Route.useLoaderData();
  return <BlogIndexView articles={articles} />;
}
