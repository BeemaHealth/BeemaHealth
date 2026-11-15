import { article as peptideChoice } from "@/content/blog/articles/how-to-choose-the-right-peptide-for-your-goals";
import { article as peptideSideEffects } from "@/content/blog/articles/peptide-side-effects-bpc-157-tb-500-ghk-cu-mots-c-sermorelin";
import type { BlogArticle } from "@/content/blog/types";

const articles: readonly BlogArticle[] = [peptideSideEffects, peptideChoice];

export function listArticles(): readonly BlogArticle[] {
  return articles;
}

export function getArticle(slug: string): BlogArticle | undefined {
  return articles.find((article) => article.slug === slug);
}
