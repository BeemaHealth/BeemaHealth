import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  ChefHat,
  Clock3,
  Flame,
  Soup,
  Users,
} from "lucide-react";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import {
  NutritionEstimate,
  RecipeComplianceNotice,
  RecipeImage,
} from "@/components/site/RecipeBlocks";
import { Button } from "@/components/ui/button";
import { trackPageViewed } from "@/lib/analytics";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import {
  MEAL_LABELS,
  MAX_RECIPE_MULTIPLIER,
  MIN_RECIPE_MULTIPLIER,
  RECIPES,
  RECIPE_CATEGORIES,
  RECIPE_MULTIPLIER_STEP,
  closestRecipeMultiplier,
  closestRecipePeople,
  formatScaledIngredient,
  getRecipeBySlug,
  parseRecipeMultiplier,
  parseRecipeServings,
  recipeImagePath,
  recipePath,
  scaleForPeople,
  type Recipe,
} from "@/lib/recipes";
import {
  SITE_URL,
  absoluteUrl,
  breadcrumbJsonLd,
  canonicalUrl,
} from "@/lib/seo";

export const Route = createFileRoute("/recipes/$slug")({
  validateSearch: (search: Record<string, unknown>): { servings?: number } => ({
    servings: parseRecipeServings(search.servings) ?? undefined,
  }),
  loader: ({ params }) => {
    const recipe = getRecipeBySlug(params.slug);
    if (!recipe) throw notFound();
    return recipe;
  },
  head: ({ loaderData: recipe }) => {
    if (!recipe) return {};
    return {
      meta: [
        { title: `${recipe.title} | Beema Health Recipes` },
        { name: "description", content: recipe.description },
        { property: "og:title", content: recipe.title },
        { property: "og:description", content: recipe.description },
        {
          property: "og:image",
          content: absoluteUrl(recipeImagePath(recipe)),
        },
      ],
      links: [{ rel: "canonical", href: canonicalUrl(recipePath(recipe)) }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Recipes", path: "/recipes" },
              { name: recipe.title, path: recipePath(recipe) },
            ]),
          ),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(recipeJsonLd(recipe)),
        },
      ],
    };
  },
  component: RecipeDetailPage,
});

function recipeJsonLd(recipe: Recipe) {
  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.description,
    image: [absoluteUrl(recipeImagePath(recipe))],
    url: canonicalUrl(recipePath(recipe)),
    author: { "@id": `${SITE_URL}/#organization` },
    publisher: { "@id": `${SITE_URL}/#organization` },
    recipeCategory: MEAL_LABELS[recipe.meal],
    recipeYield: recipe.servings,
    prepTime: `PT${recipe.prepMinutes}M`,
    cookTime: `PT${recipe.cookMinutes}M`,
    totalTime: `PT${recipe.prepMinutes + recipe.cookMinutes}M`,
    recipeIngredient: recipe.ingredients.map(
      (ingredient) => ingredient.original,
    ),
    recipeInstructions: recipe.method.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      text: step,
    })),
  };
}

function RecipeDetailPage() {
  const recipe = Route.useLoaderData();
  const { servings: requestedServings } = Route.useSearch();
  const initialPeople = requestedServings ?? recipe.servingsCount;
  const category = RECIPE_CATEGORIES[recipe.category];
  const cta = resolveCta(CTA_IDS.recipe_detail);
  const related = RECIPES.filter(
    (candidate) =>
      candidate.category === recipe.category && candidate.slug !== recipe.slug,
  ).slice(0, 3);

  useEffect(() => {
    trackPageViewed("recipe_detail");
  }, [recipe.slug]);

  return (
    <MarketingLayout>
      <article>
        <header className="bg-grad-hero py-10 md:py-16">
          <div className="veya-container">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <li>
                  <Link to="/" className="hover:text-foreground">
                    Home
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li>
                  <Link to="/recipes/" className="hover:text-foreground">
                    Recipes
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li aria-current="page" className="text-foreground">
                  {recipe.title}
                </li>
              </ol>
            </nav>

            <div className="mt-8 grid items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-accent-foreground">
                  {category.label} · {MEAL_LABELS[recipe.meal]}
                </p>
                <h1 className="mt-4 text-balance text-4xl font-bold leading-tight text-foreground md:text-5xl">
                  {recipe.title}
                </h1>
                <p className="mt-5 text-pretty text-lg leading-relaxed text-muted-foreground">
                  {recipe.description}
                </p>
                <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <QuickStat
                    icon={<Users className="size-5" aria-hidden />}
                    label="Base yield"
                    value={recipe.servings}
                  />
                  <QuickStat
                    icon={<Clock3 className="size-5" aria-hidden />}
                    label="Prep"
                    value={recipe.prep}
                  />
                  <QuickStat
                    icon={<Flame className="size-5" aria-hidden />}
                    label="Cook"
                    value={recipe.cook}
                  />
                  <QuickStat
                    icon={<Soup className="size-5" aria-hidden />}
                    label="Meal"
                    value={MEAL_LABELS[recipe.meal]}
                  />
                </div>
                <div className="mt-6 rounded-2xl border border-border bg-card p-4">
                  <NutritionEstimate recipe={recipe} />
                </div>
              </div>
              <RecipeImage
                recipe={recipe}
                eager
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="aspect-[4/3] rounded-[2rem] border border-border shadow-lift"
              />
            </div>
          </div>
        </header>

        <section className="py-16 md:py-24">
          <div className="veya-container grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <RecipeQuantityPanel
                key={recipe.slug}
                recipe={recipe}
                initialPeople={initialPeople}
              />
            </div>

            <div>
              <h2 className="text-3xl font-semibold text-foreground">Method</h2>
              <ol className="mt-8 space-y-8">
                {recipe.method.map((step, index) => (
                  <li key={step} className="flex gap-5">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary font-semibold text-primary-foreground">
                      {index + 1}
                    </span>
                    <p className="pt-1 text-base leading-relaxed text-muted-foreground">
                      {step}
                    </p>
                  </li>
                ))}
              </ol>

              <div className="mt-12 grid gap-5 md:grid-cols-2">
                <aside className="rounded-3xl border border-primary/25 bg-primary-soft p-6">
                  <ChefHat
                    className="size-6 text-accent-foreground"
                    aria-hidden
                  />
                  <h2 className="mt-4 text-xl font-semibold text-foreground">
                    Chef&apos;s note
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {recipe.chefNote}
                  </p>
                </aside>
                <aside className="rounded-3xl border border-border bg-muted/60 p-6">
                  <Clock3
                    className="size-6 text-accent-foreground"
                    aria-hidden
                  />
                  <h2 className="mt-4 text-xl font-semibold text-foreground">
                    Make ahead
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {recipe.makeAhead}
                  </p>
                </aside>
              </div>

              <div className="mt-12 rounded-3xl border border-border bg-background p-6 md:p-8">
                <p className="text-sm font-semibold uppercase tracking-wide text-accent-foreground">
                  {category.title}
                </p>
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  {category.introduction}
                </p>
                <p className="mt-4 font-medium leading-relaxed text-foreground">
                  {category.cue}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-primary-soft/50 py-16">
          <div className="veya-container">
            <RecipeComplianceNotice />
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="veya-container">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-accent-foreground">
                  Keep cooking
                </p>
                <h2 className="mt-2 text-3xl font-bold text-foreground">
                  More from this collection
                </h2>
              </div>
              <Link
                to="/recipes/"
                search={{ servings: initialPeople }}
                className="inline-flex items-center gap-2 font-semibold text-foreground"
              >
                All recipes <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {related.map((candidate) => (
                <Link
                  key={candidate.slug}
                  to={recipePath(candidate)}
                  search={{ servings: initialPeople }}
                  className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent-foreground">
                    {MEAL_LABELS[candidate.meal]}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-foreground">
                    {candidate.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {candidate.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-ink py-16 text-ink-foreground">
          <div className="veya-container text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Questions about GLP-1 care?
            </p>
            <h2 className="mx-auto mt-3 max-w-3xl text-balance text-3xl font-bold md:text-4xl">
              Could a treatment plan be right for you?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-ink-foreground/70">
              Start an online visit so a licensed provider can evaluate whether
              prescription treatment is appropriate.
            </p>
            <Button asChild size="xl" className="mt-8">
              <Link to={cta.to} search={cta.search} onClick={cta.onClick}>
                {cta.label} <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        </section>

        <div className="veya-container py-8">
          <Link
            to="/recipes/"
            search={{ servings: initialPeople }}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to all recipes
          </Link>
        </div>
      </article>
    </MarketingLayout>
  );
}

type ScaleMode = "people" | "multiplier";

function RecipeQuantityPanel({
  recipe,
  initialPeople,
}: {
  recipe: Recipe;
  initialPeople: number;
}) {
  const [mode, setMode] = useState<ScaleMode>("people");
  const [people, setPeople] = useState(initialPeople);
  const [multiplier, setMultiplier] = useState(() =>
    closestRecipeMultiplier(
      scaleForPeople(initialPeople, recipe.servingsCount),
    ),
  );
  const scale =
    mode === "people"
      ? scaleForPeople(people, recipe.servingsCount)
      : multiplier;
  const scaledIngredients = useMemo(
    () =>
      recipe.ingredients.map((ingredient) =>
        formatScaledIngredient(ingredient, scale),
      ),
    [recipe.ingredients, scale],
  );
  const announcement =
    mode === "people"
      ? `Ingredient quantities scaled for ${people} ${people === 1 ? "person" : "people"}.`
      : `Ingredient quantities scaled to ${multiplier} times the original recipe.`;

  function changeMode(nextMode: ScaleMode) {
    if (nextMode === mode) return;
    if (nextMode === "multiplier") {
      setMultiplier(
        closestRecipeMultiplier(scaleForPeople(people, recipe.servingsCount)),
      );
    } else {
      setPeople(closestRecipePeople(multiplier, recipe.servingsCount));
    }
    setMode(nextMode);
  }

  return (
    <div className="sticky top-24 rounded-3xl border border-border bg-card p-6 shadow-soft md:p-8">
      <h2 className="text-2xl font-semibold text-foreground">Ingredients</h2>
      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-foreground">
          Scale quantities by
        </legend>
        <div className="mt-2 flex gap-2">
          {(["people", "multiplier"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={mode === option}
              onClick={() => changeMode(option)}
              className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                mode === option
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground"
              }`}
            >
              {option === "people" ? "People" : "Multiplier"}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-4">
        {mode === "people" ? (
          <>
            <label
              htmlFor={`recipe-people-${recipe.slug}`}
              className="text-sm font-semibold text-foreground"
            >
              Number of people
            </label>
            <select
              id={`recipe-people-${recipe.slug}`}
              value={people}
              onChange={(event) => {
                const nextPeople = parseRecipeServings(event.target.value);
                if (nextPeople != null) setPeople(nextPeople);
              }}
              className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {Array.from({ length: 16 }, (_, index) => index + 1).map(
                (count) => (
                  <option key={count} value={count}>
                    {count} {count === 1 ? "person" : "people"}
                  </option>
                ),
              )}
            </select>
          </>
        ) : (
          <>
            <label
              htmlFor={`recipe-multiplier-${recipe.slug}`}
              className="text-sm font-semibold text-foreground"
            >
              Recipe multiplier
            </label>
            <select
              id={`recipe-multiplier-${recipe.slug}`}
              value={multiplier}
              onChange={(event) => {
                const nextMultiplier = parseRecipeMultiplier(
                  event.target.value,
                );
                if (nextMultiplier != null) setMultiplier(nextMultiplier);
              }}
              className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {Array.from(
                {
                  length:
                    (MAX_RECIPE_MULTIPLIER - MIN_RECIPE_MULTIPLIER) /
                      RECIPE_MULTIPLIER_STEP +
                    1,
                },
                (_, index) =>
                  MIN_RECIPE_MULTIPLIER + index * RECIPE_MULTIPLIER_STEP,
              ).map((value) => (
                <option key={value} value={value}>
                  {value}×
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      <p
        className="mt-4 text-sm text-muted-foreground"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement} Base yield: {recipe.servings}.
      </p>
      <ul className="mt-6 divide-y divide-border">
        {scaledIngredients.map((ingredient, index) => (
          <li
            key={`${recipe.slug}-${index}`}
            className="py-3 text-sm leading-relaxed text-foreground"
          >
            {ingredient}
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuickStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <span className="text-accent-foreground">{icon}</span>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
