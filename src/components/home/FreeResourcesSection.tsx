import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, ChefHat } from "lucide-react";
import { RecipeImage } from "@/components/site/RecipeBlocks";
import { Button } from "@/components/ui/button";
import { RECIPES } from "@/lib/recipes";

/**
 * Homepage spotlight for the two free, no-account-required resource
 * collections (recipes + educational guides). Neither lives in the primary
 * nav - both are meant to be discovered here, via SEO, and via cross-links
 * between the two, not via a persistent nav slot.
 */
export function FreeResourcesSection() {
  return (
    <section className="bg-primary-soft/45 py-16 md:py-24">
      <div className="veya-container">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent-foreground">
            Free, no account required
          </p>
          <h2 className="mt-4 text-balance text-3xl font-bold text-foreground md:text-5xl">
            Free resources to help you get started
          </h2>
          <p className="mt-5 text-pretty text-lg leading-relaxed text-muted-foreground">
            Browse recipes and evidence-based guides at no cost, whether or not
            you&apos;re a Beema patient. No intake is required.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col overflow-hidden rounded-[2rem] border border-border bg-card shadow-soft">
            <RecipeImage
              recipe={RECIPES[2]}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="aspect-[16/9]"
            />
            <div className="flex flex-1 flex-col p-6 md:p-8">
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-accent-foreground">
                <ChefHat className="size-5" aria-hidden />
                Free recipe collection
              </p>
              <h3 className="mt-3 text-xl font-semibold text-foreground md:text-2xl">
                Practical recipes for changing appetites
              </h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                12 breakfast, lunch, dinner, and light-meal ideas organized
                around fiber, smaller portions, and protein-rich eating.
              </p>
              <Button asChild className="mt-6 w-fit">
                <Link to="/recipes/">
                  Browse free recipes <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-col rounded-[2rem] border border-border bg-card p-6 shadow-soft md:p-8">
            <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-accent-foreground">
              <BookOpen className="size-5" aria-hidden />
              Free educational guides
            </p>
            <h3 className="mt-3 text-xl font-semibold text-foreground md:text-2xl">
              Researched guides on weight management
            </h3>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
              Cited, plain-language comparisons of lifestyle and GLP-1-assisted
              approaches to weight loss - grounded in peer-reviewed trials and
              clinical guidelines.
            </p>
            <Button asChild className="mt-6 w-fit">
              <Link to="/learn/">
                Explore free guides <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
