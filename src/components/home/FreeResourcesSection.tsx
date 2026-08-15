import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, ChefHat, ImageIcon } from "lucide-react";
import { RecipeImage } from "@/components/site/RecipeBlocks";
import { Button } from "@/components/ui/button";
import {
  LEARN_GUIDES_IMAGE_ALT,
  learnGuidesImagePath,
  learnGuidesImageSrcSet,
} from "@/lib/learn-guides-image";
import { RECIPES } from "@/lib/recipes";
import { cn } from "@/lib/utils";

const CARD_IMAGE_SIZES = "(min-width: 1024px) 50vw, 100vw";

function LearnGuidesImage({ className }: { className?: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={cn(
        "relative min-w-0 max-w-full overflow-hidden bg-primary-soft",
        className,
      )}
    >
      {failed ? (
        <div className="absolute inset-0 grid place-items-center bg-grad-hero p-6 text-center">
          <div>
            <ImageIcon
              className="mx-auto size-8 text-accent-foreground/60"
              aria-hidden
            />
            <p className="mt-3 text-sm font-semibold text-accent-foreground">
              Free educational guides
            </p>
          </div>
        </div>
      ) : (
        <picture className="block h-full w-full">
          <source
            type="image/webp"
            srcSet={learnGuidesImageSrcSet()}
            sizes={CARD_IMAGE_SIZES}
          />
          <img
            src={learnGuidesImagePath()}
            srcSet={learnGuidesImageSrcSet()}
            alt={LEARN_GUIDES_IMAGE_ALT}
            width={1536}
            height={1024}
            loading="lazy"
            sizes={CARD_IMAGE_SIZES}
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        </picture>
      )}
    </div>
  );
}

/**
 * Homepage spotlight for the free content library (recipes + educational
 * guides today; workout and cooking videos later). Linked from the
 * header/footer Resources dropdown as well as this homepage band.
 */
export function FreeResourcesSection() {
  return (
    <section className="bg-primary-soft/45 py-16 md:py-24">
      <div className="veya-container">
        <div className="max-w-2xl">
          <h2 className="text-balance text-3xl font-bold text-foreground md:text-5xl">
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
              sizes={CARD_IMAGE_SIZES}
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

          <div className="flex flex-col overflow-hidden rounded-[2rem] border border-border bg-card shadow-soft">
            <LearnGuidesImage className="aspect-[16/9]" />
            <div className="flex flex-1 flex-col p-6 md:p-8">
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-accent-foreground">
                <BookOpen className="size-5" aria-hidden />
                Free educational guides
              </p>
              <h3 className="mt-3 text-xl font-semibold text-foreground md:text-2xl">
                Researched guides on weight management
              </h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                Cited, plain-language guides on lifestyle, resistance training,
                rest intervals, and glucagon-like peptide-1-assisted approaches
                to weight loss, grounded in peer-reviewed trials and clinical
                guidelines.
              </p>
              <Button asChild className="mt-6 w-fit">
                <Link to="/learn/">
                  Explore free guides <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
