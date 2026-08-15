import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MAX_RECIPE_MULTIPLIER,
  MEAL_LABELS,
  MIN_RECIPE_MULTIPLIER,
  RECIPE_IMAGE_WIDTHS,
  RECIPE_MODIFIED_DATE,
  RECIPE_PUBLISHED_DATE,
  RECIPES,
  RECIPE_CATEGORIES,
  RECIPE_SLUGS,
  closestRecipeMultiplier,
  closestRecipePeople,
  formatCulinaryQuantity,
  formatRecipeMethodStep,
  formatScaledIngredient,
  getRecipeBySlug,
  getRecipesByCategory,
  parseRecipeMultiplier,
  parseRecipeServings,
  recipeImagePath,
  recipeImageSrcSet,
  recipePath,
  scaleForPeople,
} from "../recipes";
import { recipeCollectionJsonLd, recipeJsonLd } from "../recipe-seo";
import { SITE_URL } from "../seo";
import { OVERFLOW, STRICT_FIELD_ATTACKS } from "./fixtures/malicious-payloads";

describe("recipe collection", () => {
  it("contains exactly the 12 supplied recipes", () => {
    expect(RECIPES).toHaveLength(12);
    expect(new Set(RECIPE_SLUGS)).toHaveLength(12);
  });

  it("has one recipe per meal type in each category", () => {
    const expectedMeals = Object.keys(MEAL_LABELS).sort();

    for (const category of Object.keys(RECIPE_CATEGORIES) as Array<
      keyof typeof RECIPE_CATEGORIES
    >) {
      const recipes = getRecipesByCategory(category);
      expect(recipes).toHaveLength(4);
      expect(recipes.map((recipe) => recipe.meal).sort()).toEqual(
        expectedMeals,
      );
    }
  });

  it("keeps every client-facing recipe complete", () => {
    for (const recipe of RECIPES) {
      expect(recipe.title).not.toBe("");
      expect(recipe.description).not.toBe("");
      expect(recipe.servings).not.toBe("");
      expect(recipe.servingsCount).toBeGreaterThanOrEqual(1);
      expect(recipe.servingsCount).toBeLessThanOrEqual(16);
      expect(recipe.prep).not.toBe("");
      expect(recipe.cook).not.toBe("");
      expect(recipe.ingredients.length).toBeGreaterThan(0);
      expect(recipe.method.length).toBeGreaterThan(0);
      expect(recipe.chefNote).not.toBe("");
      expect(recipe.makeAhead).not.toBe("");
      expect(recipe.nutrition.calories).toBeGreaterThan(0);
      expect(recipe.nutrition.proteinGrams).toBeGreaterThan(0);
      expect(recipe.nutrition.fiberGrams).toBeGreaterThanOrEqual(0);
      expect(getRecipeBySlug(recipe.slug)).toBe(recipe);
    }
  });

  it("uses explicit serving yields, including the special frittata yield", () => {
    for (const recipe of RECIPES) {
      expect(recipe.servings).toMatch(/servings?/);
    }
    expect(RECIPES[4].servings).toBe("3 servings (2 mini frittatas each)");
  });

  it("keeps all recipe data immutable", () => {
    expect(Object.isFrozen(RECIPES)).toBe(true);
    for (const recipe of RECIPES) {
      expect(Object.isFrozen(recipe)).toBe(true);
      expect(Object.isFrozen(recipe.nutrition)).toBe(true);
      expect(Object.isFrozen(recipe.ingredients)).toBe(true);
      expect(Object.isFrozen(recipe.method)).toBe(true);
      for (const step of recipe.method) {
        if (typeof step !== "string") expect(Object.isFrozen(step)).toBe(true);
      }
      for (const ingredient of recipe.ingredients) {
        expect(Object.isFrozen(ingredient)).toBe(true);
        if (ingredient.quantity) {
          expect(Object.isFrozen(ingredient.quantity)).toBe(true);
        }
      }
    }
  });

  it("uses canonical paths and predictable image filenames", () => {
    const recipeImagesDirectory = resolve(
      __dirname,
      "../../../public/images/recipes",
    );
    const expectedImageNames = RECIPES.flatMap((recipe) =>
      RECIPE_IMAGE_WIDTHS.map((width) => {
        const suffix = width === 1536 ? "" : `-${width}w`;
        return `${recipe.imageSlug ?? recipe.slug}${suffix}.webp`;
      }),
    ).sort();

    expect(readdirSync(recipeImagesDirectory).sort()).toEqual(
      expectedImageNames,
    );

    for (const recipe of RECIPES) {
      expect(recipe.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(recipePath(recipe)).toBe(`/recipes/${recipe.slug}/`);
      expect(recipeImagePath(recipe)).toBe(
        `/images/recipes/${recipe.imageSlug ?? recipe.slug}.webp`,
      );
      for (const width of RECIPE_IMAGE_WIDTHS) {
        const imagePath = recipeImagePath(recipe, width);
        const diskPath = resolve(__dirname, `../../../public${imagePath}`);
        expect(existsSync(diskPath), imagePath).toBe(true);
        expect(statSync(diskPath).size, imagePath).toBeGreaterThan(5_000);
        expect(statSync(diskPath).size, imagePath).toBeLessThan(500_000);
      }
      expect(recipeImageSrcSet(recipe)).toContain(
        `${recipeImagePath(recipe, 480)} 480w`,
      );
      expect(recipeImageSrcSet(recipe)).toContain(
        `${recipeImagePath(recipe)} 1536w`,
      );
    }
  });

  it("uses non-efficacy category framing", () => {
    expect(RECIPE_CATEGORIES.fiber.title).toBe("Fiber-forward recipes");
    expect(RECIPE_CATEGORIES.fiber.shortDescription).toBe(
      "Ideas for adding fiber gradually with oats, lentils, beans, fruit skins, vegetables, and seeds.",
    );
    expect(RECIPE_CATEGORIES.smallVolume.title).toBe("Smaller-portion recipes");
    expect(RECIPE_CATEGORIES.smallVolume.shortDescription).toBe(
      "Nutrient-dense options for days when you feel full sooner.",
    );
    expect(RECIPE_CATEGORIES.highProtein.title).toBe("Protein-rich recipes");
    expect(RECIPE_CATEGORIES.highProtein.shortDescription).toBe(
      "Options that make protein easier to prioritize.",
    );
  });

  it("does not include branded drug names or review claims", () => {
    const serialized = JSON.stringify({ RECIPES, RECIPE_CATEGORIES });

    for (const prohibited of [
      "Ozempic",
      "Wegovy",
      "Zepbound",
      "Mounjaro",
      "Rybelsus",
      "doctor reviewed",
      "clinically reviewed",
      "dietitian reviewed",
    ]) {
      expect(serialized.toLowerCase()).not.toContain(prohibited.toLowerCase());
    }
  });
});

describe("recipe serving controls", () => {
  it.each(Array.from({ length: 16 }, (_, index) => index + 1))(
    "accepts an integer people count of %i",
    (value) => {
      expect(parseRecipeServings(value)).toBe(value);
      expect(parseRecipeServings(String(value))).toBe(value);
    },
  );

  it.each([
    ...STRICT_FIELD_ATTACKS,
    ...OVERFLOW,
    "",
    " ",
    "0",
    "-1",
    "1.5",
    "17",
    "NaN",
    "Infinity",
    Number.NaN,
    Number.POSITIVE_INFINITY,
    null,
    undefined,
    {},
    [],
  ])("rejects an invalid or malicious people count %j", (value) => {
    expect(parseRecipeServings(value)).toBeNull();
  });

  it("accepts multipliers from 0.5x through 16x in 0.5 steps", () => {
    for (
      let value = MIN_RECIPE_MULTIPLIER;
      value <= MAX_RECIPE_MULTIPLIER;
      value += 0.5
    ) {
      expect(parseRecipeMultiplier(value)).toBe(value);
      expect(parseRecipeMultiplier(String(value))).toBe(value);
    }
  });

  it.each([
    ...STRICT_FIELD_ATTACKS,
    ...OVERFLOW,
    "",
    "0",
    "-0.5",
    "0.25",
    "1.25",
    "16.5",
    "NaN",
    "Infinity",
    Number.NaN,
    Number.NEGATIVE_INFINITY,
  ])("rejects an invalid or malicious multiplier %j", (value) => {
    expect(parseRecipeMultiplier(value)).toBeNull();
  });

  it("computes people scaling for all 12 base recipes", () => {
    for (const recipe of RECIPES) {
      expect(scaleForPeople(recipe.servingsCount, recipe.servingsCount)).toBe(
        1,
      );
      expect(scaleForPeople(1, recipe.servingsCount)).toBeCloseTo(
        1 / recipe.servingsCount,
      );
      expect(scaleForPeople(16, recipe.servingsCount)).toBeCloseTo(
        16 / recipe.servingsCount,
      );
    }
  });

  it("falls back to a safe 1x scale for invalid values", () => {
    expect(scaleForPeople(0, 4)).toBe(1);
    expect(scaleForPeople(Number.POSITIVE_INFINITY, 4)).toBe(1);
    expect(scaleForPeople(4, 0)).toBe(1);
  });

  it("preserves effective scale as closely as each mode permits", () => {
    expect(closestRecipeMultiplier(scaleForPeople(3, 4))).toBe(1);
    expect(closestRecipeMultiplier(scaleForPeople(6, 4))).toBe(1.5);
    expect(closestRecipePeople(1.5, 4)).toBe(6);
    expect(closestRecipePeople(16, 4)).toBe(16);
  });
});

describe("recipe ingredient scaling", () => {
  it("preserves exact supplied ingredient wording at 1x for all recipes", () => {
    for (const recipe of RECIPES) {
      for (const ingredient of recipe.ingredients) {
        expect(formatScaledIngredient(ingredient, 1)).toBe(ingredient.original);
      }
    }
  });

  it("structures every leading numeric amount and leaves qualitative amounts unchanged", () => {
    for (const recipe of RECIPES) {
      for (const ingredient of recipe.ingredients) {
        if (/^\d/.test(ingredient.original)) {
          expect(ingredient.quantity, ingredient.original).toBeDefined();
        } else {
          expect(ingredient.quantity, ingredient.original).toBeUndefined();
        }
      }
    }
  });

  it("formats fractions, decimals, mixed quantities, and ranges", () => {
    expect(formatCulinaryQuantity(0.75)).toBe("3/4");
    expect(formatCulinaryQuantity(1.5)).toBe("1 1/2");
    expect(formatCulinaryQuantity(2.25)).toBe("2 1/4");
    expect(formatCulinaryQuantity(1 / 3)).toBe("1/3");
    expect(formatCulinaryQuantity(4 / 9)).toBe("1/2");
    expect(formatCulinaryQuantity(0.1)).toBe("1/8");

    const mixed = RECIPES[1].ingredients.find((ingredient) =>
      ingredient.original.startsWith("1 1/2 cups"),
    )!;
    expect(formatScaledIngredient(mixed, 0.5)).toBe(
      "3/4 cups dry red lentils, rinsed",
    );

    const range = RECIPES[7].ingredients.find((ingredient) =>
      ingredient.original.startsWith("1 to 2 tablespoons"),
    )!;
    expect(formatScaledIngredient(range, 1.5)).toBe(
      "1 1/2 to 3 tablespoons milk, as needed",
    );

    const decimalContext = RECIPES[1].ingredients.find((ingredient) =>
      ingredient.original.includes("14.5 ounces"),
    )!;
    expect(formatScaledIngredient(decimalContext, 2)).toBe(
      "2 cans (14.5 ounces) no-salt-added diced tomatoes",
    );

    const singularUnit = RECIPES[0].ingredients.find(
      (ingredient) =>
        ingredient.original ===
        "1 cup low-fat milk or fortified unsweetened soy milk",
    )!;
    expect(formatScaledIngredient(singularUnit, 2)).toBe(
      "2 cups low-fat milk or fortified unsweetened soy milk",
    );
  });

  it("preserves base method wording and scales only explicit count tokens", () => {
    for (const recipe of RECIPES) {
      for (const step of recipe.method) {
        expect(formatRecipeMethodStep(step, 1)).toBe(
          typeof step === "string" ? step : step.baseText,
        );
      }
    }

    const frittataStep = RECIPES[4].method[0];
    expect(formatRecipeMethodStep(frittataStep, 0.5)).toContain("Coat 3 cups");
    expect(formatRecipeMethodStep(frittataStep, 2)).toContain("Coat 12 cups");
    expect(formatRecipeMethodStep(frittataStep, 2)).toContain("350°F");
  });

  it("does not scale qualitative ingredients", () => {
    const pinch = RECIPES[0].ingredients.find((ingredient) =>
      ingredient.original.startsWith("Pinch"),
    )!;
    expect(formatScaledIngredient(pinch, 16)).toBe("Pinch of kosher salt");
  });

  it("never mutates recipe A, recipe B, or shared collection data", () => {
    const before = JSON.stringify(RECIPES);
    const recipeA = RECIPES[0];
    const recipeB = RECIPES[1];
    const recipeBFirstIngredient = recipeB.ingredients[0].original;

    recipeA.ingredients.map((ingredient) =>
      formatScaledIngredient(ingredient, 8),
    );

    expect(JSON.stringify(RECIPES)).toBe(before);
    expect(recipeB.ingredients[0].original).toBe(recipeBFirstIngredient);
    expect(getRecipeBySlug(recipeA.slug)).toBe(recipeA);
    expect(getRecipeBySlug(recipeB.slug)).toBe(recipeB);
  });

  it("never emits NaN or Infinity for invalid scales", () => {
    for (const recipe of RECIPES) {
      for (const ingredient of recipe.ingredients) {
        for (const scale of [Number.NaN, Number.POSITIVE_INFINITY, 0, -1]) {
          const rendered = formatScaledIngredient(ingredient, scale);
          expect(rendered).not.toMatch(/NaN|Infinity/);
          expect(rendered).toBe(ingredient.original);
        }
      }
    }
  });
});

describe("recipe compliance and SEO markup", () => {
  const detailRoute = readFileSync(
    resolve(__dirname, "../../routes/recipes/$slug.tsx"),
    "utf-8",
  );
  const hubRoute = readFileSync(
    resolve(__dirname, "../../routes/recipes/index.tsx"),
    "utf-8",
  );
  const recipeBlocks = readFileSync(
    resolve(__dirname, "../../components/site/RecipeBlocks.tsx"),
    "utf-8",
  );
  const header = readFileSync(
    resolve(__dirname, "../../components/site/SiteHeader.tsx"),
    "utf-8",
  );
  const footer = readFileSync(
    resolve(__dirname, "../../components/site/SiteFooter.tsx"),
    "utf-8",
  );
  const homepageResource = readFileSync(
    resolve(__dirname, "../../components/home/FreeResourcesSection.tsx"),
    "utf-8",
  );
  const faqRoute = readFileSync(
    resolve(__dirname, "../../routes/faq.tsx"),
    "utf-8",
  );
  const semaglutideRoute = readFileSync(
    resolve(__dirname, "../../routes/semaglutide.tsx"),
    "utf-8",
  );
  const tirzepatideRoute = readFileSync(
    resolve(__dirname, "../../routes/tirzepatide.tsx"),
    "utf-8",
  );
  const weightLossRoute = readFileSync(
    resolve(__dirname, "../../routes/weight-loss.tsx"),
    "utf-8",
  );
  const howItWorksRoute = readFileSync(
    resolve(__dirname, "../../routes/how-it-works.tsx"),
    "utf-8",
  );
  const normalizedBlocks = recipeBlocks.replace(/\s+/g, " ");
  const normalizedHomepageResource = homepageResource.replace(/\s+/g, " ");
  const normalizedWeightLossRoute = weightLossRoute.replace(/\s+/g, " ");
  const normalizedHowItWorksRoute = howItWorksRoute.replace(/\s+/g, " ");

  it("keeps recipe analytics generic and PHI-free", () => {
    expect(detailRoute).toContain('trackPageViewed("recipe_detail")');
    expect(detailRoute).not.toMatch(/trackPageViewed\(`recipe:/);
    expect(hubRoute).toContain('trackPageViewed("recipes")');
    expect(`${detailRoute}\n${hubRoute}`).not.toMatch(
      /trackPageViewed\([^)]*(servings|multiplier|category|symptom|nutrition)/i,
    );
  });

  it("includes the required review and symptom disclosures", () => {
    expect(normalizedBlocks).toContain(
      "This recipe has not been clinically or dietitian reviewed.",
    );
    expect(normalizedBlocks).toContain(
      "Nutrition values are estimates and vary by ingredient brand, portion size, and preparation.",
    );
    expect(normalizedBlocks).toContain(
      "This content is not medical advice or treatment for medication side effects.",
    );
    expect(normalizedBlocks).toContain(
      "persistent, severe, or worsening. If you may be experiencing a medical emergency, call 911.",
    );
  });

  it("includes provenance, dated content, sources, and care education links", () => {
    expect(recipeBlocks).toContain(
      "This collection may contain illustrative, digitally generated images.",
    );
    expect(hubRoute).toContain("RecipeImageDisclosure");
    expect(detailRoute).toContain("RecipeImageDisclosure");
    expect(recipeBlocks).not.toContain(
      "Illustrative, digitally generated image; not a photograph of the prepared recipe.",
    );
    expect(`${recipeBlocks}\n${hubRoute}\n${detailRoute}`).not.toContain(
      "Illustrative image of",
    );
    expect(`${hubRoute}\n${detailRoute}`).toContain("Published August 9, 2026");
    expect(hubRoute).toContain("www.obesity.org/nutritional-priorities");
    expect(hubRoute).toContain("niddk.nih.gov/health-information");
    expect(hubRoute).toContain("fsis.usda.gov/food-safety");
    for (const path of [
      'to="/weight-loss/"',
      'to="/semaglutide/"',
      'to="/tirzepatide/"',
    ]) {
      expect(hubRoute).toContain(path);
      expect(detailRoute).toContain(path);
    }
  });

  it("uses USDA-aligned lentil soup leftover guidance", () => {
    expect(getRecipeBySlug("smoky-red-lentil-carrot-soup")?.makeAhead).toBe(
      "Divide into shallow containers and refrigerate promptly for up to 4 days, or freeze for up to 3 months. Reheat soup to a rolling boil.",
    );
  });

  it("keeps descriptive dish alt text and explicit image dimensions", () => {
    expect(recipeBlocks).toContain("alt={recipe.imageAlt}");
    expect(recipeBlocks).toContain("width={1536}");
    expect(recipeBlocks).toContain("height={1024}");
    for (const recipe of RECIPES) {
      expect(recipe.imageAlt.toLowerCase()).not.toContain("illustrative");
      expect(recipe.imageAlt.toLowerCase()).not.toContain(
        "digitally generated",
      );
    }
  });

  it("uses ItemList and Recipe schema without unsupported clinical or nutrition claims", () => {
    const collectionSchema = recipeCollectionJsonLd();
    expect(collectionSchema["@type"]).toBe("ItemList");
    expect(collectionSchema.numberOfItems).toBe(12);
    expect(collectionSchema.itemListElement).toHaveLength(12);
    expect(collectionSchema.itemListElement.map((item) => item.name)).toEqual(
      RECIPES.map((recipe) => recipe.title),
    );

    for (const recipe of RECIPES) {
      const schema = recipeJsonLd(recipe);
      expect(schema["@type"]).toBe("Recipe");
      expect(schema.url).toBe(`${SITE_URL}${recipePath(recipe)}`);
      expect(schema.mainEntityOfPage).toBe(schema.url);
      expect(schema.image).toEqual([`${SITE_URL}${recipeImagePath(recipe)}`]);
      expect(schema.image.every((image) => image.startsWith("https://"))).toBe(
        true,
      );
      expect(schema.datePublished).toBe(RECIPE_PUBLISHED_DATE);
      expect(schema.dateModified).toBe(RECIPE_MODIFIED_DATE);
      expect(schema.author).toMatchObject({
        "@type": "Organization",
        name: "Beema Health",
      });
      expect(schema.prepTime).toBe(`PT${recipe.prepMinutes}M`);
      expect(schema.cookTime).toBe(`PT${recipe.cookMinutes}M`);
      expect(schema.totalTime).toBe(
        `PT${recipe.prepMinutes + recipe.cookMinutes}M`,
      );
      expect(schema.recipeYield).toBe(recipe.servings);
      expect(schema.recipeIngredient).toEqual(
        recipe.ingredients.map((ingredient) => ingredient.original),
      );
      expect(schema.recipeInstructions).toEqual(
        recipe.method.map((step, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          text: formatRecipeMethodStep(step, 1),
        })),
      );
      expect(schema).not.toHaveProperty("nutrition");
      expect(schema).not.toHaveProperty("aggregateRating");
      expect(schema).not.toHaveProperty("review");
      expect(schema).not.toHaveProperty("reviewedBy");
    }

    const structuredDataSources = `${hubRoute}\n${detailRoute}`;
    expect(structuredDataSources).not.toContain("MedicalWebPage");
    expect(structuredDataSources).not.toContain("reviewedBy");
    expect(structuredDataSources).not.toContain("aggregateRating");
    expect(detailRoute).not.toMatch(/\bnutrition:\s*\{/);
  });

  it("sets base canonicals and route-specific social metadata", () => {
    expect(hubRoute).toContain(
      '{ property: "og:url", content: canonicalUrl("/recipes") }',
    );
    expect(hubRoute).toContain('name: "twitter:title"');
    expect(detailRoute).toContain(
      '{ property: "og:url", content: canonicalUrl(recipePath(recipe)) }',
    );
    expect(detailRoute).toContain('name: "twitter:title"');
    expect(detailRoute).toContain(
      'links: [{ rel: "canonical", href: canonicalUrl(recipePath(recipe)) }]',
    );
  });

  it("keeps discovery contextual and clearly free to everyone", () => {
    expect(header).toContain('label: "Resources"');
    expect(header).toContain('label: "About"');
    expect(header).not.toContain('to: "/the-comb/"');
    expect(header).toContain('to: "/recipes/"');
    expect(header).toContain('to: "/learn/"');
    expect(header).toContain('to: "/about/"');
    expect(header).toContain('to: "/faq/"');
    expect(header).toContain('to: "/contact/"');
    expect(footer).toContain('title: "Resources"');
    expect(footer).not.toContain('to: "/the-comb/"');
    expect(footer).toContain('to: "/recipes/"');
    expect(footer).toContain('to: "/learn/"');
    expect(faqRoute).not.toContain('to="/recipes/"');
    expect(homepageResource).toContain('to="/learn/"');
    expect(homepageResource).not.toContain('to="/the-comb/"');

    for (const source of [
      homepageResource,
      semaglutideRoute,
      tirzepatideRoute,
      weightLossRoute,
      howItWorksRoute,
    ]) {
      expect(source).toContain('to="/recipes/"');
    }

    expect(normalizedHomepageResource).not.toContain("The Comb");
    expect(normalizedHomepageResource).toContain("Free recipe collection");
    expect(normalizedHomepageResource).toContain("Free educational guides");
    expect(normalizedHomepageResource).toContain("No intake is required");
    expect(normalizedWeightLossRoute).toContain(
      "free to browse whether or not",
    );
    expect(normalizedWeightLossRoute).toContain("No intake is required");
    expect(normalizedHowItWorksRoute).toContain(
      "free to everyone whether or not",
    );
    expect(normalizedHowItWorksRoute).toContain(
      "not personalized nutrition care",
    );
  });
});
