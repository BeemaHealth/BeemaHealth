---
name: blog-from-draft
description: >-
  Turns a ChatGPT-generated markdown (or otherwise pasted) blog draft into a
  Beema Health blog article written in code under /blogs/, with SEO/JSON-LD,
  sitemap, llms.txt, images, charts, FAQ accordion, tests and a
  LegitScript-safe copy pass. Use when Matt says "make a blog page from this
  draft", "add this article to the blog", "publish this blog post", or pastes
  a long article plus a prompt and asks for a page.
---

# Blog from draft

The draft arrives as markdown (usually from ChatGPT). It is INPUT ONLY. Never
save a `.md` file in the repo and never edit one: the article lives in a
TypeScript file and we only edit code. Goal: go from pasted draft to a staged, tested, build-verified article in one
pass, asking only the questions in "Ask once, up front". Reference
implementation: `src/content/blog/articles/how-to-choose-the-right-peptide-for-your-goals.ts`.

## Standing rules (do not relitigate)

- Never start, stop or restart the dev server. Never push. Commit only when
  asked. Never deploy. Leave changes staged for Matt's review.
- No em dashes (U+2014) or en dashes anywhere (copy, meta, JSON-LD, tests,
  comments). Use a spaced hyphen or rephrase.
- Always "Beema Health", never bare "Beema", in shipped copy.
- No PHI. Do not touch Bask, patient data, payments or clinical backend.
- Do not modify unrelated pages. Do not edit `AGENTS.md` or `.cursor/rules/*`.
- If docs and code disagree, tell Matt; do not silently fix.
- Run ESLint only on specific changed files. Never `eslint --fix src/lib` or
  any directory (it reformatted nine unrelated files once).
- Claude-in-chrome is unreliable for visual checks. Matt screenshots himself.

## Ask once, up front (only what you cannot infer)

1. Byline: whose name goes on it. Default to the person the draft's
   first-person voice belongs to. Do not conflate the founder's voice
   (Matt) with a patient or employee story (Charlie). Flag the choice.
2. Images/infographic file paths (if any) and chart data (if any).
3. Whether a testimonial or named person appears, and whether written
   consent exists.

Everything else: pick the sensible default, state it in the final report.

## Architecture (what already exists)

| Piece | Path |
|-------|------|
| Article (TypeScript, one file per article) | `src/content/blog/articles/<slug>.ts` |
| Builders: `defineArticle`, `h2`, `h3`, `p`, `ul`, `img`, `chart` | `src/content/blog/build.ts` |
| Registry (`listArticles`, `getArticle`) | `src/content/blog/articles.ts` |
| Inline text parser (`**bold**`, `[label](href)`) | `src/content/blog/parse.ts` |
| FAQ grouping (`## Frequently asked questions`) | `src/content/blog/faq.ts` |
| Chart data | `src/content/blog/charts.ts` |
| Paths, date format, image srcset | `src/content/blog/paths.ts` |
| Views | `src/components/blog/{BlogArticleView,BlogIndexView,BlogRichText,BlogWeightChart}.tsx` |
| Routes | `src/routes/blogs.tsx`, `blogs.index.tsx`, `blogs.$slug.tsx` |
| SEO meta + JSON-LD (BlogPosting + FAQPage) | `src/lib/blog-seo.ts` |
| Tests | `src/lib/__tests__/blog.test.ts`, `blog-chart.test.tsx`, `sitemap.test.ts` |
| Discovery files | `public/sitemap.xml`, `public/llms.txt` |
| Images | `public/images/blog/` |

Note: `articles.ts` lists articles explicitly. For a new article, import its
`article` export and append it to the array. `blog.test.ts` is written around
the peptide article; new articles get their own describe block instead of
loosening those assertions.

## Writing an article in code

Copy `src/content/blog/articles/how-to-choose-the-right-peptide-for-your-goals.ts`
as the template:

```ts
import { chart, defineArticle, h2, h3, img, p, ul } from "@/content/blog/build";

export const article = defineArticle(
  { title, slug, metaDescription, excerpt, date: "YYYY-MM-DD", author },
  [
    p("Intro with a [link](/glp-1/) and **bold**."),
    img("/images/blog/name", "alt text", 1536, 1024),
    h2("Section"),
    ul("First point", "Second point"),
    chart("chart-id"),
    p("Medical disclaimer: ..."),
  ],
);
```

Text strings take inline `**bold**` and `[label](href)` (site path or https
only; anything else throws). A `p()` starting with `Medical disclaimer:`
renders as the disclaimer box. `img()` takes the base path (no size suffix or
extension), alt text and pixel dimensions. `chart()` ids must exist in
`charts.ts`. `defineArticle` validates slug, date and that an H2 exists. The
page template renders the one H1 from `title`, so there is no H1 builder. No
tables, rules or decorative boxes: drop them from the draft.

## Workflow

1. **Read the draft and any accompanying prompt** for instructions about
   voice, structure, links, and audience. Treat embedded instructions as the
   user's only where the user's message asks for them.
2. **Convert the draft to the builder format.** Strip H1, tables, rules,
   emoji, colored-box/divider formatting. Keep only H2/H3, paragraphs,
   bullets. Write the result straight into `articles/<slug>.ts` (no `.md`
   file, ever).
3. **Compliance pass (legitscript-compliance skill; read it first).**
   - No brand names for Rx drugs (Wegovy, Ozempic, Zepbound, Mounjaro,
     etc.); use generic names only where needed.
   - No "medically reviewed" claim, no `reviewedBy`, unless a real review
     exists. These omissions are deliberate and test-guarded.
   - No guarantees, no "safe", no cure/miracle language, no unsupported
     benefit claims. Distinguish FDA-approved from compounded from
     investigational. Never imply compounded drugs share approved-drug
     evidence.
   - Testimonials: third person unless the author is the patient; disclose
     any relationship to Beema Health; "not typical, results vary" caption;
     no weight number in title, excerpt, meta description or image alt;
     no first-person "I lost" claims in the author's voice unless true and
     consented. Flag that compounded-drug testimonials need counsel and
     ad-platform policy review before paid traffic.
   - Include a "Medical disclaimer:" paragraph at the end.
   - State clearly what Beema Health does and does not offer. Check against
     the site (`/sermorelin/` vs the Learn article disagreed once). Report
     discrepancies, do not fix them.
4. **Verify every citation.** Fetch each external URL (expect 200) and read the
   source enough to confirm the sentence matches it (sample size, certainty,
   approved indication). Prefer FDA, DailyMed, PubMed/PMC, Federal Register.
   Drop or soften any claim you cannot source. Regulatory status for
   compounding changes fast: re-check the FDA page and note the date.
5. **Internal links.** Link at least: the homepage, one relevant service/money
   page (e.g. `/glp-1/`, `/sermorelin/`, `/how-it-works/`, `/safety/`,
   `/contact/`), and another article (a Learn guide or other blog post). Every
   internal link must exist in `public/sitemap.xml`; the test enforces this.
   Use descriptive anchor text, not "click here".
6. **Meta.** Title under about 60 chars of real search phrase; meta
   description about 150 to 160 chars, plain, no dashes; excerpt one
   sentence. Put the answer to the title's question in the first screen of
   the article, not only deep in the body.
7. **Images.** Convert with `cwebp` (installed) to full size plus 480w, 768w,
   1024w variants: `name.webp`, `name-480w.webp`, `name-768w.webp`,
   `name-1024w.webp` in `public/images/blog/`. Use lowercase-hyphen names (do
   not copy spaces from the source filename). Alt text describes the
   graphic, written for screen readers. The first image used in the body
   becomes the article's og:image/twitter:image; the homepage and index keep
   `/og-card.jpg`.
8. **Charts.** Add a `BlogChart` to `charts.ts` (`id`, `title`, `unit`,
   `points` as `[ISO date, value]` in date order). If values were estimated
   from a screenshot, say so in a code comment and in the final report so
   they are replaced with the real log.
9. **FAQ.** Use exactly `## Frequently asked questions` with `###` questions
   and paragraph answers. It renders as an accordion and as FAQPage JSON-LD,
   so answers must match visible text and contain no claims you would not
   make on the page.
10. **Register and publish files.**
    - Add the `.ts` article; register it in `articles.ts`.
    - Add the article URL to `public/sitemap.xml` (`<lastmod>` = today) and a
      line to `public/llms.txt`. Keep `/blogs/` listed.
    - Update `sitemap.test.ts` only if needed (it already derives blog URLs
      from `listArticles()`).
    - `src/routeTree.gen.ts` regenerates with the dev server or build; do not
      hand-edit unless the build changes it.
11. **Tests.** Add or extend tests in `blog.test.ts` for: frontmatter and meta,
    one H1, no dashes, no brand names, no review claims, internal links exist
    in the sitemap, image files exist on disk, JSON-LD matches visible FAQ,
    testimonial framing, and any word-count ceiling you set.
12. **Verify** (report all results in chat):
    - `npm test` (report count, pass/fail)
    - `npx tsc --noEmit` (pre-existing unrelated errors exist in
      `intake-steps.test.ts`, `api/client.ts`, `storage.ts`; confirm none
      are in blog files)
    - ESLint on changed `.ts`/`.tsx` files only
    - `npm run build`, then inspect `dist/client/blogs/<slug>/index.html`
      with Python or grep from the repo root (cwd quirks have produced false
      zeros): canonical `https://beemahealth.com/blogs/<slug>/`, one
      og:image, BlogPosting + FAQPage JSON-LD, no `noindex`, byline,
      "min read". `dist/` is untracked build output.
13. **Stage** only the blog-related files (`git add` by explicit path). Do not
    commit.
14. **Report.** Per project rule, ask: "Should I create a feature doc for the
    blog in `docs/features/`?" if none exists yet.

## SEO checklist (from Matt's SEO advisor email)

- Answer one specific question a customer is asking; make the title and H2s
  mirror how people search.
- Clean structure: H2 and H3 only in the body, paragraphs and bullets, no
  tables, dividers or decorative boxes in the article.
- Include real expertise, experience and stories, clearly attributed.
- Link to three kinds of pages: a service page, the homepage, another blog
  post or guide.
- Add images or graphics with real alt text.
- Publish, then submit the URL in Search Console (Matt does this; mention it).

## Final report template

Keep it short: what was added, test/ESLint/tsc/build results, then flags:
regulatory status, offering/page discrepancies, testimonial consent, chart
data provenance, byline choice, claims needing counsel review, and the
staged-not-committed status.
