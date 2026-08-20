import {
  RECIPE_MODIFIED_DATE,
  RECIPE_PUBLISHED_DATE,
  RECIPES,
  formatRecipeMethodStep,
  recipeImagePath,
  recipeMealLabel,
  recipePath,
  type Recipe,
} from "@/lib/recipes";
import { SITE_URL, absoluteUrl, canonicalUrl } from "@/lib/seo";

export function recipeCollectionJsonLd() {
  return {
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
  };
}

export function recipeJsonLd(recipe: Recipe) {
  const canonical = canonicalUrl(recipePath(recipe));

  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.description,
    image: [absoluteUrl(recipeImagePath(recipe))],
    url: canonical,
    mainEntityOfPage: canonical,
    datePublished: RECIPE_PUBLISHED_DATE,
    dateModified: RECIPE_MODIFIED_DATE,
    author: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Beema Health",
      url: canonicalUrl("/"),
    },
    publisher: { "@id": `${SITE_URL}/#organization` },
    recipeCategory: recipeMealLabel(recipe.meal, ", "),
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
      text: formatRecipeMethodStep(step, 1),
    })),
  };
}
