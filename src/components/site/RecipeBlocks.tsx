import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  ImageIcon,
  MapPin,
  Siren,
  Stethoscope,
  Users,
} from "lucide-react";
import {
  JURISDICTIONAL_NOTICE_BODY,
  JURISDICTIONAL_NOTICE_TITLE,
} from "@/lib/jurisdictional-notice";
import {
  MEAL_LABELS,
  RECIPE_CATEGORIES,
  nutritionEstimate,
  recipeImagePath,
  recipePath,
  type Recipe,
} from "@/lib/recipes";
import { cn } from "@/lib/utils";

export function RecipeImage({
  recipe,
  className,
  sizes,
  eager = false,
}: {
  recipe: Recipe;
  className?: string;
  sizes?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const imageDescription =
    recipe.imageAlt.charAt(0).toLowerCase() + recipe.imageAlt.slice(1);

  return (
    <div className={cn("relative overflow-hidden bg-primary-soft", className)}>
      {failed ? (
        <div className="absolute inset-0 grid place-items-center bg-grad-hero p-6 text-center">
          <div>
            <ImageIcon
              className="mx-auto size-8 text-accent-foreground/60"
              aria-hidden
            />
            <p className="mt-3 text-sm font-semibold text-accent-foreground">
              {recipe.title}
            </p>
          </div>
        </div>
      ) : (
        <img
          src={recipeImagePath(recipe)}
          alt={`Illustrative image of ${imageDescription}`}
          width={1536}
          height={1024}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          sizes={sizes}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
      {!failed && (
        <span className="absolute bottom-3 right-3 rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-foreground shadow-soft backdrop-blur-sm">
          Illustrative image
        </span>
      )}
    </div>
  );
}

export function RecipeCard({
  recipe,
  servings,
}: {
  recipe: Recipe;
  servings?: number;
}) {
  const category = RECIPE_CATEGORIES[recipe.category];

  return (
    <Link
      to={recipePath(recipe)}
      search={servings === undefined ? {} : { servings }}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <RecipeImage
        recipe={recipe}
        className="aspect-[4/3]"
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
      />
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-foreground">
          {category.label} · {MEAL_LABELS[recipe.meal]}
        </p>
        <h3 className="mt-2 text-xl font-semibold leading-tight text-foreground">
          {recipe.title}
        </h3>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
          {recipe.description}
        </p>
        <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="size-4" aria-hidden />
            {recipe.prepMinutes + recipe.cookMinutes} min
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
            View recipe
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-1"
              aria-hidden
            />
          </span>
        </div>
      </div>
    </Link>
  );
}

function Notice({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-5">
      <div className="flex gap-3">
        <span className="mt-0.5 text-accent-foreground">{icon}</span>
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <div className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RecipeComplianceNotice({
  scope = "recipe",
}: {
  scope?: "recipe" | "collection";
}) {
  return (
    <section
      aria-labelledby="recipe-information-title"
      className="rounded-3xl border border-border bg-muted/50 p-6 md:p-8"
    >
      <h2
        id="recipe-information-title"
        className="text-2xl font-semibold text-foreground"
      >
        Important information
      </h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Notice
          icon={<BookOpen className="size-5" aria-hidden />}
          title="Educational content"
        >
          {scope === "recipe"
            ? "Prepared by Beema Health for general educational use. This recipe has not been clinically or dietitian reviewed. Nutrition values are estimates and vary by ingredient brand, portion size, and preparation. This content is not medical advice or treatment for medication side effects."
            : "Prepared by Beema Health for general educational use. These recipes have not been clinically or dietitian reviewed. Nutrition values are estimates and vary by ingredient brand, portion size, and preparation. This content is not medical advice or treatment for medication side effects."}
        </Notice>
        <Notice
          icon={<Stethoscope className="size-5" aria-hidden />}
          title="Treatment requires evaluation"
        >
          GLP-1 medications are prescription-only. A licensed provider must
          evaluate whether treatment is appropriate; completing an online visit
          does not guarantee a prescription.
        </Notice>
        <Notice
          icon={<Users className="size-5" aria-hidden />}
          title="Individual experiences vary"
        >
          Appetite, food tolerance, symptoms, and treatment results vary by
          person. Stop eating when comfortably full and seek individualized
          guidance when needed.
        </Notice>
        <Notice
          icon={<MapPin className="size-5" aria-hidden />}
          title={JURISDICTIONAL_NOTICE_TITLE}
        >
          {JURISDICTIONAL_NOTICE_BODY}
        </Notice>
        <Notice
          icon={<Siren className="size-5" aria-hidden />}
          title="Symptoms and emergencies"
        >
          Contact a licensed healthcare provider if symptoms are persistent,
          severe, or worsening. If you may be experiencing a medical emergency,
          call 911.
        </Notice>
      </div>
    </section>
  );
}

export function NutritionEstimate({ recipe }: { recipe: Recipe }) {
  return (
    <p className="text-sm font-medium text-muted-foreground">
      Estimated nutrition per serving: {nutritionEstimate(recipe)}
    </p>
  );
}
