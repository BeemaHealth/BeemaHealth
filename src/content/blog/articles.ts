import { article as peptideChoice } from "@/content/blog/articles/how-to-choose-the-right-peptide-for-your-goals";
import type { BlogArticle } from "@/content/blog/types";

const articles: readonly BlogArticle[] = [peptideChoice];

export function listArticles(): readonly BlogArticle[] {
  return articles;
}

export function getArticle(slug: string): BlogArticle | undefined {
  return articles.find((article) => article.slug === slug);
}
