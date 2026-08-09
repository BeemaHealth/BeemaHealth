import { Link } from "@tanstack/react-router";
import { ArrowRight, ChefHat } from "lucide-react";
import { RecipeImage } from "@/components/site/RecipeBlocks";
import { Button } from "@/components/ui/button";
import { RECIPES, RECIPE_CATEGORIES } from "@/lib/recipes";

export function RecipeSpotlight() {
  return (
    <section className="bg-primary-soft/45 py-16 md:py-24">
      <div className="veya-container grid items-center gap-10 lg:grid-cols-2">
        <RecipeImage
          recipe={RECIPES[2]}
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="aspect-[4/3] rounded-[2rem] border border-border shadow-lift"
        />
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-accent-foreground">
            <ChefHat className="size-5" aria-hidden />
            Free recipe collection
          </p>
          <h2 className="mt-4 text-balance text-3xl font-bold text-foreground md:text-5xl">
            Practical recipes for changing appetites
          </h2>
          <p className="mt-5 text-pretty text-lg leading-relaxed text-muted-foreground">
            Explore 12 breakfast, lunch, dinner, and light-meal ideas organized
            around fiber, smaller portions, and protein-rich eating.
          </p>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Available to everyone—free to browse whether or not you&apos;re a
            Beema patient. No intake is required to access the collection.
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            {Object.values(RECIPE_CATEGORIES).map((category) => (
              <li
                key={category.slug}
                className="rounded-2xl border border-border bg-card p-4 text-sm font-semibold text-foreground"
              >
                {category.label}
              </li>
            ))}
          </ul>
          <Button asChild size="lg" className="mt-8">
            <Link to="/recipes/">
              Browse free recipes <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
