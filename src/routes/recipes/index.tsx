import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ChefHat, SlidersHorizontal } from "lucide-react";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import {
  RecipeCard,
  RecipeComplianceNotice,
  RecipeImage,
} from "@/components/site/RecipeBlocks";
import { Button } from "@/components/ui/button";
import { trackPageViewed } from "@/lib/analytics";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import {
  MEAL_LABELS,
  RECIPES,
  RECIPE_CATEGORIES,
  parseRecipeServings,
  recipePath,
  type MealType,
  type RecipeCategoryKey,
} from "@/lib/recipes";
import { breadcrumbJsonLd, canonicalUrl } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/recipes/")({
  validateSearch: (search: Record<string, unknown>): { servings?: number } => ({
    servings: parseRecipeServings(search.servings) ?? undefined,
  }),
  head: () => ({
    meta: [
      { title: "Practical Recipe Collection | Beema Health" },
      {
        name: "description",
        content:
          "Explore 12 practical recipes organized around gradually adding fiber, smaller portions, and protein-rich eating, with estimated nutrition and make-ahead guidance.",
      },
      {
        property: "og:title",
        content: "Beema Health Recipe Collection",
      },
      {
        property: "og:description",
        content:
          "An illustrated collection of breakfast, lunch, dinner, and light-meal recipes for everyday nutrition needs.",
      },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/recipes") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Recipes", path: "/recipes" },
          ]),
        ),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Beema Health recipe collection",
          numberOfItems: RECIPES.length,
          itemListElement: RECIPES.map((recipe, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: recipe.title,
            url: canonicalUrl(recipePath(recipe)),
          })),
        }),
      },
    ],
  }),
  component: RecipesPage,
});

type CategoryFilter = "all" | RecipeCategoryKey;
type MealFilter = "all" | MealType;

const CATEGORY_ENTRIES = Object.entries(RECIPE_CATEGORIES) as [
  RecipeCategoryKey,
  (typeof RECIPE_CATEGORIES)[RecipeCategoryKey],
][];

function RecipesPage() {
  const { servings: requestedServings } = Route.useSearch();
  const servings = requestedServings ?? 4;
  const navigate = Route.useNavigate();
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [meal, setMeal] = useState<MealFilter>("all");
  const cta = resolveCta(CTA_IDS.recipes_hub);

  useEffect(() => {
    trackPageViewed("recipes");
  }, []);

  const visibleRecipes = useMemo(
    () =>
      RECIPES.filter(
        (recipe) =>
          (category === "all" || recipe.category === category) &&
          (meal === "all" || recipe.meal === meal),
      ),
    [category, meal],
  );

  return (
    <MarketingLayout>
      <section className="relative overflow-hidden bg-grad-hero">
        <div className="veya-container grid min-h-[36rem] items-stretch gap-10 py-12 lg:grid-cols-[1.05fr_.95fr] lg:py-16">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-foreground">
              <ChefHat className="size-4" aria-hidden />
              Beema Health recipe collection
            </span>
            <h1 className="mt-6 max-w-3xl text-balance text-4xl font-bold leading-tight text-foreground md:text-6xl">
              Practical meals for the way appetite can change
            </h1>
            <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
              Browse fiber-forward, smaller-portion, and protein-rich recipes,
              each with estimated nutrition, straightforward methods, and
              make-ahead notes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <a href="#browse-recipes">
                  Browse recipes <ArrowRight aria-hidden />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to={cta.to} search={cta.search} onClick={cta.onClick}>
                  {cta.label}
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              This educational collection is free and available to everyone. No
              intake or patient relationship is required to browse it.
            </p>
          </div>
          <RecipeImage
            recipe={RECIPES[9]}
            eager
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="min-h-80 rounded-[2rem] border border-border shadow-lift lg:min-h-full"
          />
        </div>
      </section>

      <section className="border-y border-border bg-background py-14">
        <div className="veya-container grid gap-5 md:grid-cols-3">
          {CATEGORY_ENTRIES.map(([key, item]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setCategory(key);
                document
                  .getElementById("browse-recipes")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="rounded-3xl border border-border bg-card p-6 text-left shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-accent-foreground">
                4 recipes
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {item.shortDescription}
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                Explore collection <ArrowRight className="size-4" aria-hidden />
              </span>
            </button>
          ))}
        </div>
      </section>

      <section id="browse-recipes" className="scroll-mt-24 py-16 md:py-24">
        <div className="veya-container">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-accent-foreground">
                <SlidersHorizontal className="size-4" aria-hidden />
                Filter the collection
              </p>
              <h2 className="mt-3 text-3xl font-bold text-foreground md:text-4xl">
                Find a recipe for today
              </h2>
            </div>
            <p aria-live="polite" className="text-sm text-muted-foreground">
              Showing {visibleRecipes.length} of {RECIPES.length} recipes
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center">
              <label
                htmlFor="global-recipe-servings"
                className="text-sm font-semibold text-foreground"
              >
                Cooking for
              </label>
              <select
                id="global-recipe-servings"
                value={servings}
                onChange={(event) => {
                  const nextServings = parseRecipeServings(event.target.value);
                  if (nextServings == null) return;
                  void navigate({
                    search: (current) => ({
                      ...current,
                      servings: nextServings,
                    }),
                    replace: true,
                  });
                }}
                className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-28"
                aria-describedby="global-recipe-servings-help"
              >
                {Array.from({ length: 16 }, (_, index) => index + 1).map(
                  (count) => (
                    <option key={count} value={count}>
                      {count} {count === 1 ? "person" : "people"}
                    </option>
                  ),
                )}
              </select>
              <p
                id="global-recipe-servings-help"
                className="text-sm text-muted-foreground"
              >
                Recipe links below will open with quantities scaled for this
                many people.
              </p>
            </div>
            <FilterRow label="Nutrition focus">
              <FilterButton
                active={category === "all"}
                onClick={() => setCategory("all")}
              >
                All
              </FilterButton>
              {CATEGORY_ENTRIES.map(([key, item]) => (
                <FilterButton
                  key={key}
                  active={category === key}
                  onClick={() => setCategory(key)}
                >
                  {item.label}
                </FilterButton>
              ))}
            </FilterRow>
            <FilterRow label="Meal">
              <FilterButton
                active={meal === "all"}
                onClick={() => setMeal("all")}
              >
                All meals
              </FilterButton>
              {(Object.entries(MEAL_LABELS) as [MealType, string][]).map(
                ([key, label]) => (
                  <FilterButton
                    key={key}
                    active={meal === key}
                    onClick={() => setMeal(key)}
                  >
                    {label}
                  </FilterButton>
                ),
              )}
            </FilterRow>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visibleRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.slug}
                recipe={recipe}
                servings={servings}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary-soft/50 py-16">
        <div className="veya-container">
          <RecipeComplianceNotice scope="collection" />
        </div>
      </section>

      <section className="bg-ink py-16 text-ink-foreground">
        <div className="veya-container text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Questions about treatment?
          </p>
          <h2 className="mx-auto mt-3 max-w-3xl text-balance text-3xl font-bold md:text-4xl">
            Could a GLP-1 treatment plan be right for you?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-ink-foreground/70">
            A licensed provider can evaluate your health history and determine
            whether prescription treatment is appropriate.
          </p>
          <Button asChild size="xl" className="mt-8">
            <Link to={cta.to} search={cta.search} onClick={cta.onClick}>
              {cta.label} <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <span className="w-32 shrink-0 text-sm font-semibold text-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
