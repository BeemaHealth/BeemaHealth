export const RECIPE_CATEGORIES = {
  fiber: {
    slug: "fiber-forward",
    label: "Fiber-forward",
    title: "Fiber-forward recipes",
    shortDescription:
      "Ideas for adding fiber gradually with oats, lentils, beans, fruit skins, vegetables, and seeds.",
    introduction:
      "These meals emphasize oats, lentils, beans, fruit skins, vegetables, and seeds. If you are adding more fiber, increase it gradually and drink appropriate fluids; a sudden large increase can cause gas or bloating, and high-fiber meals may be poorly tolerated during significant nausea.",
    cue: "If your usual fiber intake is low, consider beginning with a half portion and building over several days while maintaining hydration.",
  },
  smallVolume: {
    slug: "small-volume",
    label: "Smaller portions",
    title: "Smaller-portion recipes",
    shortDescription:
      "Nutrient-dense options for days when you feel full sooner.",
    introduction:
      "These recipes concentrate protein and useful nutrients into physically modest portions for days when you feel full sooner. Start with the plated amount, pause midway, and save the rest if you are comfortably full. A smaller portion does not mean eating as little as possible.",
    cue: "Using a small plate or bowl and packaging leftovers before eating can make it easier to pause without feeling wasteful.",
  },
  highProtein: {
    slug: "high-protein",
    label: "Protein-rich",
    title: "Protein-rich recipes",
    shortDescription: "Options that make protein easier to prioritize.",
    introduction:
      "These meals make lean protein the anchor rather than an afterthought. Adequate protein intake and appropriately prescribed resistance training may both be part of an individualized plan; food alone cannot guarantee preservation of lean mass.",
    cue: "When appetite is limited, consider starting with the protein component, then continuing with vegetables and starch as comfortable.",
  },
} as const;

export type RecipeCategoryKey = keyof typeof RECIPE_CATEGORIES;
export type MealType = "breakfast" | "lunch" | "dinner" | "light-meal";

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  "light-meal": "Light meal",
};

export function recipeMeals(
  meal: MealType | readonly MealType[],
): readonly MealType[] {
  const values = Array.isArray(meal) ? meal : [meal];
  return Object.freeze([...new Set(values)]);
}

export function recipeHasMeal(
  meal: MealType | readonly MealType[],
  needle: MealType,
): boolean {
  return recipeMeals(meal).includes(needle);
}

export function recipeMealLabel(
  meal: MealType | readonly MealType[],
  separator = " · ",
): string {
  return recipeMeals(meal)
    .map((value) => MEAL_LABELS[value])
    .join(separator);
}

export type RecipeNutrition = Readonly<{
  calories: number;
  proteinGrams: number;
  fiberGrams: number;
}>;

export type IngredientQuantity = Readonly<{
  minimum: number;
  maximum?: number;
}>;

export type RecipeIngredient = Readonly<{
  quantity?: IngredientQuantity;
  text: string;
  original: string;
}>;

export type ScalableMethodStep = Readonly<{
  baseText: string;
  scaledTemplate: string;
  baseCount?: number;
  quantities?: Readonly<Record<string, number>>;
}>;

export type RecipeMethodStep = string | ScalableMethodStep;

export type Recipe = Readonly<{
  slug: string;
  imageSlug?: string;
  title: string;
  description: string;
  category: RecipeCategoryKey;
  meal: readonly MealType[];
  servings: string;
  servingsCount: number;
  prep: string;
  cook: string;
  prepMinutes: number;
  cookMinutes: number;
  nutrition: RecipeNutrition;
  ingredients: readonly RecipeIngredient[];
  method: readonly RecipeMethodStep[];
  chefNote: string;
  makeAhead: string;
  imageAlt: string;
}>;

export const MIN_RECIPE_SERVINGS = 1;
export const MAX_RECIPE_SERVINGS = 16;
export const MIN_RECIPE_MULTIPLIER = 0.5;
export const MAX_RECIPE_MULTIPLIER = 16;
export const RECIPE_MULTIPLIER_STEP = 0.5;
export const RECIPE_PUBLISHED_DATE = "2026-08-09";
export const RECIPE_MODIFIED_DATE = "2026-08-20";
export const RECIPE_IMAGE_WIDTHS = [480, 768, 1024, 1536] as const;

const FRACTION_RE = String.raw`\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?`;
const INGREDIENT_QUANTITY_RE = new RegExp(
  `^(${FRACTION_RE})(?:\\s+(?:to|–|-)\\s+(${FRACTION_RE}))?\\s+(.+)$`,
);

function parseFraction(value: string): number {
  const mixed = value.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const fraction = value.match(/^(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  return Number(value);
}

function parseIngredient(original: string): RecipeIngredient {
  const match = original.match(INGREDIENT_QUANTITY_RE);
  if (!match) return Object.freeze({ text: original, original });

  return Object.freeze({
    quantity: Object.freeze({
      minimum: parseFraction(match[1]),
      ...(match[2] ? { maximum: parseFraction(match[2]) } : {}),
    }),
    text: match[3],
    original,
  });
}

/** Strictly parses a people count controlled by the user or URL. */
export function parseRecipeServings(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value);
  if (!/^\d{1,2}$/.test(normalized)) return null;
  const servings = Number(normalized);
  return Number.isInteger(servings) &&
    servings >= MIN_RECIPE_SERVINGS &&
    servings <= MAX_RECIPE_SERVINGS
    ? servings
    : null;
}

/** Strictly parses detail-page multipliers in 0.5 increments. */
export function parseRecipeMultiplier(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value);
  if (!/^(?:\d{1,2})(?:\.5|\.0)?$/.test(normalized)) return null;
  const multiplier = Number(normalized);
  return Number.isFinite(multiplier) &&
    multiplier >= MIN_RECIPE_MULTIPLIER &&
    multiplier <= MAX_RECIPE_MULTIPLIER &&
    Number.isInteger(multiplier / RECIPE_MULTIPLIER_STEP)
    ? multiplier
    : null;
}

export function scaleForPeople(
  selectedPeople: number,
  baseServings: number,
): number {
  const validPeople = parseRecipeServings(selectedPeople);
  if (
    validPeople == null ||
    !Number.isInteger(baseServings) ||
    baseServings < 1
  ) {
    return 1;
  }
  return validPeople / baseServings;
}

export function closestRecipeMultiplier(scale: number): number {
  if (!Number.isFinite(scale)) return 1;
  return Math.min(
    MAX_RECIPE_MULTIPLIER,
    Math.max(
      MIN_RECIPE_MULTIPLIER,
      Math.round(scale / RECIPE_MULTIPLIER_STEP) * RECIPE_MULTIPLIER_STEP,
    ),
  );
}

export function closestRecipePeople(
  multiplier: number,
  baseServings: number,
): number {
  const validMultiplier = parseRecipeMultiplier(multiplier) ?? 1;
  if (!Number.isInteger(baseServings) || baseServings < 1) return 1;
  return Math.min(
    MAX_RECIPE_SERVINGS,
    Math.max(MIN_RECIPE_SERVINGS, Math.round(validMultiplier * baseServings)),
  );
}

export function formatCulinaryQuantity(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";

  const whole = Math.floor(value);
  const remainder = value - whole;
  const conventionalFractions = [
    { value: 0, label: "" },
    { value: 1 / 8, label: "1/8" },
    { value: 1 / 4, label: "1/4" },
    { value: 1 / 3, label: "1/3" },
    { value: 1 / 2, label: "1/2" },
    { value: 2 / 3, label: "2/3" },
    { value: 3 / 4, label: "3/4" },
    { value: 1, label: "" },
  ] as const;
  const nearest = conventionalFractions.reduce((best, candidate) =>
    Math.abs(candidate.value - remainder) < Math.abs(best.value - remainder)
      ? candidate
      : best,
  );
  const adjustedWhole = whole + (nearest.value === 1 ? 1 : 0);
  if (!nearest.label) return String(adjustedWhole);
  return adjustedWhole > 0
    ? `${adjustedWhole} ${nearest.label}`
    : nearest.label;
}

export function formatScaledIngredient(
  ingredient: RecipeIngredient,
  scale: number,
): string {
  if (!Number.isFinite(scale) || scale <= 0 || !ingredient.quantity) {
    return ingredient.original;
  }
  if (scale === 1) return ingredient.original;

  const minimum = formatCulinaryQuantity(ingredient.quantity.minimum * scale);
  const maximum =
    ingredient.quantity.maximum === undefined
      ? ""
      : ` to ${formatCulinaryQuantity(ingredient.quantity.maximum * scale)}`;
  const maximumValue =
    ingredient.quantity.maximum === undefined
      ? ingredient.quantity.minimum * scale
      : ingredient.quantity.maximum * scale;
  const text =
    ingredient.quantity.minimum * scale > 1 || maximumValue > 1
      ? pluralizeIngredientText(ingredient.text)
      : ingredient.text;
  return `${minimum}${maximum} ${text}`;
}

export function formatRecipeMethodStep(
  step: RecipeMethodStep,
  scale: number,
): string {
  if (typeof step === "string") return step;
  if (!Number.isFinite(scale) || scale <= 0 || scale === 1) {
    return step.baseText;
  }
  let text = step.scaledTemplate;
  if (step.baseCount != null) {
    const count = Math.max(1, Math.round(step.baseCount * scale));
    text = text.replaceAll("{{count}}", String(count));
  }
  if (step.quantities) {
    for (const [key, amount] of Object.entries(step.quantities)) {
      text = text.replaceAll(
        `{{${key}}}`,
        formatCulinaryQuantity(amount * scale),
      );
    }
  }
  return text;
}

export function formatRecipeGroceryList({
  title,
  scaleLabel,
  ingredients,
}: {
  title: string;
  scaleLabel: string;
  ingredients: readonly string[];
}): string {
  const lines = [
    title.trim(),
    scaleLabel.trim(),
    "",
    ...ingredients
      .map((ingredient) => ingredient.trim())
      .filter((ingredient) => ingredient.length > 0)
      .map((ingredient) => `- ${ingredient}`),
  ];
  return lines.join("\n");
}

const SCALABLE_SINGULAR_WORD_RE =
  /\b(cup|tablespoon|teaspoon|pound|ounce|can|scoop|egg|onion|apple|cucumber|lemon|lime|pear|tortilla|wedge)\b/;

function pluralizeIngredientText(text: string): string {
  return text.replace(SCALABLE_SINGULAR_WORD_RE, (word) =>
    word.endsWith("ch") ? `${word}es` : `${word}s`,
  );
}

const RECIPE_DATA = [
  {
    slug: "pear-chia-oatmeal-cinnamon-cottage-cream",
    imageSlug: "pear-chia-oatmeal",
    title: "Pear-Chia Oatmeal with Cinnamon Cottage Cream",
    description:
      "Warm oats and pear with chia, topped by a cool cinnamon protein cream.",
    category: "fiber",
    meal: "breakfast",
    servings: "1 serving",
    servingsCount: 1,
    prep: "5 min",
    cook: "8 min",
    prepMinutes: 5,
    cookMinutes: 8,
    nutrition: { calories: 405, proteinGrams: 24, fiberGrams: 12 },
    ingredients: [
      "1/2 cup old-fashioned rolled oats",
      "1 tablespoon chia seeds",
      "1/2 ripe pear, skin on, finely diced",
      "1 cup low-fat milk or fortified unsweetened soy milk",
      "1/4 teaspoon ground cinnamon, divided",
      "Pinch of kosher salt",
      "1/3 cup low-fat cottage cheese",
      "1/2 teaspoon vanilla extract",
    ],
    method: [
      "Combine the oats, chia, pear, milk, half the cinnamon, and salt in a small saucepan. Bring to a gentle simmer over medium heat.",
      "Cook 5 to 7 minutes, stirring often, until the oats are tender and the chia has thickened the milk.",
      "Blend or vigorously whisk the cottage cheese with vanilla and the remaining cinnamon until creamy.",
      "Spoon the oatmeal into a bowl and swirl the cottage cream over the top.",
    ],
    chefNote:
      "Dice the pear small so it softens in the same time as the oats. If you are increasing fiber, start with half the chia and work upward.",
    makeAhead: "Refrigerate up to 3 days. Thin with milk when reheating.",
    imageAlt:
      "Pear-chia oatmeal topped with cinnamon cottage cream in a breakfast bowl",
  },
  {
    slug: "smoky-red-lentil-carrot-soup",
    title: "Smoky Red Lentil & Carrot Soup",
    description:
      "A velvety one-pot soup with red lentils, sweet carrots, cumin, and smoked paprika.",
    category: "fiber",
    meal: "lunch",
    servings: "4 servings",
    servingsCount: 4,
    prep: "12 min",
    cook: "30 min",
    prepMinutes: 12,
    cookMinutes: 30,
    nutrition: { calories: 315, proteinGrams: 17, fiberGrams: 11 },
    ingredients: [
      "1 tablespoon extra-virgin olive oil",
      "1 medium yellow onion, diced",
      "3 medium carrots, diced",
      "2 garlic cloves, minced",
      "1 teaspoon ground cumin",
      "1/2 teaspoon smoked paprika",
      "1 1/2 cups dry red lentils, rinsed",
      "1 can (14.5 ounces) no-salt-added diced tomatoes",
      "6 cups low-sodium vegetable or chicken broth",
      "3/4 teaspoon kosher salt, or to taste",
      "1 tablespoon lemon juice, optional",
      "1/4 cup chopped parsley",
    ],
    method: [
      "Warm the olive oil in a soup pot over medium heat. Add the onion and carrots with a pinch of salt; cook 6 to 7 minutes, until softened but not browned.",
      "Add the garlic, cumin, and smoked paprika. Stir for 30 seconds, until fragrant.",
      "Add the lentils, tomatoes, and broth. Bring to a boil, then reduce to a steady simmer and partially cover.",
      "Cook 20 to 25 minutes, stirring occasionally, until the lentils collapse and the carrots are tender.",
      "Blend about one-third of the soup with an immersion blender, leaving some texture. Season with salt and optional lemon juice, then finish with parsley.",
    ],
    chefNote:
      "Blending only part of the pot creates body without cream. Red lentils thicken as they stand, so loosen leftovers with broth or water.",
    makeAhead:
      "Divide into shallow containers and refrigerate promptly for up to 4 days, or freeze for up to 3 months. Reheat soup to a rolling boil.",
    imageAlt: "Smoky red lentil and carrot soup finished with chopped parsley",
  },
  {
    slug: "turkey-black-bean-stuffed-sweet-potatoes",
    title: "Turkey & Black Bean Stuffed Sweet Potatoes",
    description:
      "Crisp-skinned sweet potatoes filled with cumin turkey, black beans, spinach, and salsa.",
    category: "fiber",
    meal: "dinner",
    servings: "4 servings",
    servingsCount: 4,
    prep: "15 min",
    cook: "50 min",
    prepMinutes: 15,
    cookMinutes: 50,
    nutrition: { calories: 435, proteinGrams: 31, fiberGrams: 13 },
    ingredients: [
      "4 medium sweet potatoes, scrubbed",
      "12 ounces 93% lean ground turkey",
      "1 teaspoon extra-virgin olive oil",
      "1 teaspoon ground cumin",
      "1/2 teaspoon smoked paprika",
      "1/2 teaspoon kosher salt",
      "1 1/3 cups no-salt-added black beans, rinsed and drained",
      "2 packed cups baby spinach, chopped",
      "3/4 cup mild salsa",
      "1/2 cup shredded reduced-fat cheddar",
      "2 scallions, thinly sliced",
    ],
    method: [
      "Heat the oven to 425°F. Prick the sweet potatoes several times with a fork and place on a sheet pan. Roast 40 to 50 minutes, until completely tender.",
      "While the potatoes roast, heat the olive oil in a skillet over medium-high. Add the turkey and cook 5 to 6 minutes, breaking it into small crumbles.",
      "Stir in cumin, smoked paprika, and salt. Add the black beans, spinach, and salsa; cook 3 minutes, until the spinach wilts and the filling is hot.",
      "Split each sweet potato lengthwise and fluff the flesh with a fork. Spoon in the turkey-bean mixture and top with cheddar.",
      "Return to the oven for 3 to 5 minutes to melt the cheese. Finish with scallions.",
    ],
    chefNote:
      "Roast the potatoes directly on a metal pan for better caramelization. If this fiber load is a large jump, begin with half a potato and half the filling.",
    makeAhead: "Refrigerate potatoes and filling separately for up to 4 days.",
    imageAlt:
      "Roasted sweet potatoes filled with turkey, black beans, spinach, salsa, and cheddar",
  },
  {
    slug: "apple-blackberry-oat-bran-breakfast-bake",
    title: "Apple-Blackberry Oat-Bran Breakfast Bake",
    description:
      "A soft, spoonable oat-bran bake loaded with fruit but balanced by egg and cottage cheese.",
    category: "fiber",
    meal: "light-meal",
    servings: "4 servings",
    servingsCount: 4,
    prep: "12 min",
    cook: "30 min",
    prepMinutes: 12,
    cookMinutes: 30,
    nutrition: { calories: 350, proteinGrams: 20, fiberGrams: 10 },
    ingredients: [
      "2 cups oat bran",
      "1 teaspoon baking powder",
      "1 teaspoon ground cinnamon",
      "1/4 teaspoon kosher salt",
      "2 large eggs",
      "1 1/2 cups low-fat milk or fortified unsweetened soy milk",
      "1 cup low-fat cottage cheese",
      "1 teaspoon vanilla extract",
      "1 large apple, skin on, finely diced",
      "2 cups blackberries, fresh or frozen",
      "2 tablespoons maple syrup, optional",
      "Cooking spray",
    ],
    method: [
      "Heat the oven to 350°F. Coat an 8-inch square baking dish with cooking spray.",
      "Whisk the oat bran, baking powder, cinnamon, and salt in a large bowl.",
      "In a second bowl, whisk the eggs, milk, cottage cheese, vanilla, and maple syrup. Stir the wet mixture into the dry ingredients.",
      "Fold in the apple and blackberries. Pour into the baking dish and smooth the top.",
      {
        baseText:
          "Bake 25 to 30 minutes, until the center is set but still moist. Rest 10 minutes before cutting into four portions.",
        scaledTemplate:
          "Bake 25 to 30 minutes, until the center is set but still moist. Rest 10 minutes before cutting into {{count}} portions.",
        baseCount: 4,
      },
    ],
    chefNote:
      "Oat bran absorbs liquid quickly. Bake as soon as the batter is mixed, and pull it while the center remains tender rather than dry.",
    makeAhead: "Refrigerate up to 4 days. Reheat with a splash of milk.",
    imageAlt:
      "Apple and blackberry oat-bran breakfast bake served in a small dish",
  },
  {
    slug: "roasted-pepper-egg-feta-mini-frittatas",
    title: "Roasted Pepper, Egg & Feta Mini Frittatas",
    description:
      "Two compact, tender egg cakes with sweet pepper, spinach, and briny feta.",
    category: "smallVolume",
    meal: "breakfast",
    servings: "3 servings (2 mini frittatas each)",
    servingsCount: 3,
    prep: "10 min",
    cook: "18 min",
    prepMinutes: 10,
    cookMinutes: 18,
    nutrition: { calories: 285, proteinGrams: 29, fiberGrams: 1 },
    ingredients: [
      "6 large eggs",
      "1 cup liquid egg whites",
      "1/2 cup low-fat cottage cheese",
      "1/3 cup finely diced roasted red pepper, patted dry",
      "1/2 cup finely chopped baby spinach",
      "1/4 cup crumbled feta",
      "2 tablespoons chopped chives",
      "1/4 teaspoon garlic powder",
      "1/4 teaspoon kosher salt",
      "Black pepper",
      "Cooking spray",
    ],
    method: [
      {
        baseText:
          "Heat the oven to 350°F. Coat six cups of a standard muffin tin with cooking spray.",
        scaledTemplate:
          "Heat the oven to 350°F. Coat {{count}} cups of a standard muffin tin with cooking spray.",
        baseCount: 6,
      },
      "Blend the eggs, egg whites, cottage cheese, garlic powder, salt, and a few grinds of pepper until smooth and lightly foamy.",
      "Divide the roasted pepper, spinach, feta, and chives among the prepared cups.",
      "Pour in the egg mixture, filling each cup about three-quarters full. Gently stir each cup once so the vegetables are suspended.",
      "Bake for 15 to 18 minutes, until the centers are just set. Cool 5 minutes before loosening with a thin spatula.",
    ],
    chefNote:
      "Blending cottage cheese into the eggs makes the frittatas creamy without increasing their physical volume. Avoid overbaking; they should spring back gently, not feel rubbery.",
    makeAhead:
      "Refrigerate up to 4 days. Reheat two frittatas for 45 to 60 seconds in the microwave.",
    imageAlt:
      "Roasted pepper, spinach, and feta mini frittatas on a small plate",
  },
  {
    slug: "lemon-herb-chicken-hummus-cucumber-boats",
    title: "Lemon-Herb Chicken Hummus Cucumber Boats",
    description:
      "Cool cucumber carries a concentrated chicken-and-hummus filling with almost no fuss.",
    category: "smallVolume",
    meal: "lunch",
    servings: "2 servings",
    servingsCount: 2,
    prep: "15 min",
    cook: "0 min with cooked chicken",
    prepMinutes: 15,
    cookMinutes: 0,
    nutrition: { calories: 285, proteinGrams: 32, fiberGrams: 3 },
    ingredients: [
      "1 large English cucumber",
      "6 ounces cooked chicken breast, finely chopped",
      "1/2 cup plain hummus",
      "2 tablespoons crumbled feta",
      "1 tablespoon chopped fresh dill or parsley",
      "1 teaspoon lemon zest",
      "1 teaspoon lemon juice",
      "Pinch of kosher salt and black pepper",
    ],
    method: [
      "Halve the cucumber lengthwise. Use a teaspoon to scrape out the watery seeds, leaving a sturdy shell. Cut each half crosswise into two boats.",
      "In a bowl, stir together the chicken, hummus, feta, dill, lemon zest, lemon juice, salt, and pepper.",
      "Spoon the filling firmly into the cucumber boats. Chill for 10 minutes if time allows, then serve two boats per person.",
    ],
    chefNote:
      "Finely chopping the chicken creates a cohesive, scoopable filling. If raw cucumber feels too bulky, serve the filling alone with a few peeled cucumber coins.",
    makeAhead:
      "Make the filling up to 3 days ahead. Fill the cucumbers shortly before eating so they stay crisp.",
    imageAlt: "Cucumber boats filled with lemon-herb chicken, hummus, and feta",
  },
  {
    slug: "miso-ginger-turkey-rice-cup",
    title: "Miso-Ginger Turkey Rice Cup",
    description:
      "A compact savory bowl with glossy turkey, edamame, and just enough rice.",
    category: "smallVolume",
    meal: "dinner",
    servings: "4 servings",
    servingsCount: 4,
    prep: "15 min",
    cook: "15 min",
    prepMinutes: 15,
    cookMinutes: 15,
    nutrition: { calories: 355, proteinGrams: 31, fiberGrams: 3 },
    ingredients: [
      "1 pound 93% lean ground turkey",
      "1 teaspoon neutral oil",
      "8 ounces cremini mushrooms, finely chopped",
      "1 small zucchini, finely diced",
      "1 cup shelled edamame, thawed",
      "1 tablespoon white miso",
      "1 tablespoon reduced-sodium soy sauce",
      "1 tablespoon rice vinegar",
      "1 teaspoon grated fresh ginger",
      "1 teaspoon toasted sesame oil",
      "1 1/3 cups cooked jasmine rice",
      "2 scallions, thinly sliced",
    ],
    method: [
      "Whisk the miso, soy sauce, rice vinegar, ginger, sesame oil, and 2 tablespoons water in a small bowl.",
      "Heat the neutral oil in a wide skillet over medium-high. Add the turkey and cook, breaking it into small crumbles, for 5 to 6 minutes.",
      "Add the mushrooms and zucchini. Cook 4 minutes, until their moisture evaporates and the turkey begins to brown.",
      "Stir in the edamame and miso mixture. Cook 1 to 2 minutes, until glossy and hot.",
      {
        baseText:
          "Divide the rice among four small bowls or cups. Spoon the turkey mixture on top and finish with scallions.",
        scaledTemplate:
          "Divide the rice among {{count}} small bowls or cups. Spoon the turkey mixture on top and finish with scallions.",
        baseCount: 4,
      },
    ],
    chefNote:
      "Chopping the vegetables finely keeps the portion compact and gives every bite the same balance. Use a small bowl; visual scale helps the meal feel complete.",
    makeAhead:
      "Refrigerate up to 4 days. Add a teaspoon of water before reheating.",
    imageAlt: "Miso-ginger turkey with edamame and rice in a compact bowl",
  },
  {
    slug: "vanilla-lemon-ricotta-berry-bowl",
    title: "Vanilla-Lemon Ricotta Berry Bowl",
    description:
      "A spoonable, cheesecake-like bowl with whey protein and a bright berry finish.",
    category: "smallVolume",
    meal: "light-meal",
    servings: "1 serving",
    servingsCount: 1,
    prep: "5 min",
    cook: "0 min",
    prepMinutes: 5,
    cookMinutes: 0,
    nutrition: { calories: 360, proteinGrams: 33, fiberGrams: 3 },
    ingredients: [
      "3/4 cup part-skim ricotta",
      "1/2 scoop vanilla whey or other tolerated protein powder",
      "1 to 2 tablespoons milk, as needed",
      "1/2 teaspoon finely grated lemon zest",
      "1/4 teaspoon vanilla extract",
      "1 teaspoon maple syrup, optional",
      "1/3 cup fresh blueberries or chopped strawberries",
      "Pinch of ground cinnamon",
    ],
    method: [
      "Whisk the ricotta, protein powder, 1 tablespoon milk, lemon zest, vanilla, and maple syrup until smooth and mousse-like. Add the second tablespoon of milk only if needed.",
      "Spoon into a small bowl, top with berries, and finish with cinnamon.",
    ],
    chefNote:
      "Different protein powders thicken differently. Add milk by the teaspoon so the bowl stays rich rather than becoming soupy.",
    makeAhead:
      "Mix the ricotta base up to 2 days ahead. Add berries at serving time.",
    imageAlt:
      "Vanilla-lemon ricotta bowl topped with fresh berries and cinnamon",
  },
  {
    slug: "herbed-turkey-cottage-cheese-breakfast-scramble",
    title: "Herbed Turkey & Cottage Cheese Breakfast Scramble",
    description:
      "Soft curds, browned turkey, and fresh chives in a breakfast that puts protein first.",
    category: "highProtein",
    meal: "breakfast",
    servings: "1 serving",
    servingsCount: 1,
    prep: "8 min",
    cook: "8 min",
    prepMinutes: 8,
    cookMinutes: 8,
    nutrition: { calories: 365, proteinGrams: 42, fiberGrams: 2 },
    ingredients: [
      "1 teaspoon extra-virgin olive oil",
      "2 ounces cooked lean turkey breakfast sausage, crumbled",
      "1 packed cup baby spinach, roughly chopped",
      "1 large egg",
      "1/2 cup liquid egg whites",
      "1/3 cup low-fat cottage cheese",
      "1 tablespoon chopped fresh chives",
      "1/8 teaspoon garlic powder",
      "Pinch of kosher salt and black pepper",
    ],
    method: [
      "Warm the olive oil in an 8-inch nonstick skillet over medium heat. Add the turkey and cook for 1 to 2 minutes, until hot and lightly browned.",
      "Add the spinach and cook just until wilted, about 30 seconds. Reduce the heat to medium-low.",
      "Whisk the egg, egg whites, garlic powder, salt, and pepper in a small bowl. Pour into the skillet and stir slowly with a silicone spatula, sweeping the bottom and sides.",
      "When the eggs are softly set but still glossy, fold in the cottage cheese. Cook 30 to 45 seconds more; the curds should stay creamy rather than dry.",
      "Remove from the heat, scatter with chives, and serve immediately.",
    ],
    chefNote:
      "Keep the heat low after the eggs enter. Cottage cheese releases moisture, which creates a tender scramble if you stop cooking while the eggs still look slightly underdone.",
    makeAhead:
      "Cook and crumble the turkey up to 3 days ahead. Scramble the eggs fresh for the best texture.",
    imageAlt:
      "Herbed turkey and cottage cheese breakfast scramble with spinach and chives",
  },
  {
    slug: "charred-lemon-chicken-quinoa-bowl",
    title: "Charred Lemon Chicken Quinoa Bowl",
    description:
      "Smoky-edged chicken, warm quinoa, chickpeas, and a bright herb vinaigrette.",
    category: "highProtein",
    meal: "lunch",
    servings: "4 servings",
    servingsCount: 4,
    prep: "20 min",
    cook: "18 min",
    prepMinutes: 20,
    cookMinutes: 18,
    nutrition: { calories: 480, proteinGrams: 50, fiberGrams: 7 },
    ingredients: [
      "1 1/4 pounds boneless, skinless chicken breast",
      "1 teaspoon smoked paprika",
      "1 teaspoon ground cumin",
      "3/4 teaspoon kosher salt, divided",
      "1/4 teaspoon black pepper",
      "2 tablespoons extra-virgin olive oil, divided",
      "2 medium zucchini, cut into thick half-moons",
      "2 cups cooked quinoa",
      "1 cup no-salt-added chickpeas, rinsed and drained",
      "1/4 cup crumbled feta",
      "1 lemon",
      "1/3 cup chopped flat-leaf parsley",
      "2 tablespoons chopped fresh mint or dill",
    ],
    method: [
      "Heat a grill pan or heavy skillet over medium-high heat. Pat the chicken dry, then season with paprika, cumin, 1/2 teaspoon salt, pepper, and 1 tablespoon olive oil.",
      "Cook the chicken for 5 to 7 minutes per side, or until the thickest part reaches 165°F. Transfer to a board and rest for 5 minutes.",
      "Add the zucchini to the same pan and cook for 4 to 5 minutes, turning occasionally, until browned but not mushy.",
      "Zest the lemon into a small bowl. Add 2 tablespoons lemon juice, the remaining olive oil, remaining salt, parsley, and mint; whisk into a loose vinaigrette.",
      {
        baseText:
          "Divide the quinoa, chickpeas, and zucchini among four bowls. Slice the chicken and arrange it on top. Spoon over the herb vinaigrette and finish with feta.",
        scaledTemplate:
          "Divide the quinoa, chickpeas, and zucchini among {{count}} bowls. Slice the chicken and arrange it on top. Spoon over the herb vinaigrette and finish with feta.",
        baseCount: 4,
      },
    ],
    chefNote:
      "Resting the chicken is not optional: it keeps the juices in the meat instead of on the cutting board. For meal prep, pack the vinaigrette separately.",
    makeAhead:
      "Refrigerate components for up to 4 days. Serve warm or room temperature.",
    imageAlt:
      "Charred lemon chicken quinoa bowl with chickpeas, zucchini, herbs, and feta",
  },
  {
    slug: "mustard-rosemary-pork-tenderloin-white-bean-mash",
    imageSlug: "mustard-rosemary-pork-white-bean-mash",
    title: "Mustard-Rosemary Pork Tenderloin with White Bean Mash",
    description:
      "A restaurant-style lean roast with a silky, fiber-rich bean puree and crisp green beans.",
    category: "highProtein",
    meal: "dinner",
    servings: "4 servings",
    servingsCount: 4,
    prep: "15 min",
    cook: "28 min",
    prepMinutes: 15,
    cookMinutes: 28,
    nutrition: { calories: 425, proteinGrams: 47, fiberGrams: 8 },
    ingredients: [
      "1 1/4 pounds pork tenderloin, silver skin removed",
      "1 tablespoon Dijon mustard",
      "1 tablespoon chopped fresh rosemary",
      "1 teaspoon garlic powder",
      "3/4 teaspoon kosher salt, divided",
      "1/4 teaspoon black pepper",
      "2 tablespoons extra-virgin olive oil, divided",
      "2 cans (15 ounces each) cannellini beans, rinsed and drained",
      "1/2 cup low-sodium chicken broth, plus more as needed",
      "2 tablespoons finely grated Parmesan",
      "12 ounces green beans, trimmed",
      "1 teaspoon lemon juice",
    ],
    method: [
      "Heat the oven to 425°F. Rub the pork with Dijon, rosemary, garlic powder, 1/2 teaspoon salt, pepper, and 1 tablespoon olive oil.",
      "Heat an oven-safe skillet over medium-high. Sear the pork for about 2 minutes per side, then transfer the skillet to the oven. Roast 12 to 16 minutes, until the center reaches 145°F. Rest 5 to 10 minutes before slicing.",
      "Meanwhile, combine the beans and broth in a saucepan over medium heat. Simmer 5 minutes, then blend with an immersion blender until mostly smooth. Stir in Parmesan and enough broth to make a soft mash.",
      "Steam or blanch the green beans until crisp-tender, 4 to 5 minutes. Toss with the remaining olive oil, lemon juice, and remaining salt.",
      "Spoon the white bean mash onto plates, top with sliced pork, and serve the green beans alongside.",
    ],
    chefNote:
      "Pork tenderloin is lean and can dry quickly. Pull it from the oven as soon as it reaches 145°F; carryover heat will finish the center while it rests.",
    makeAhead:
      "The bean mash keeps 4 days. Reheat gently with a splash of broth.",
    imageAlt:
      "Mustard-rosemary pork tenderloin over white bean mash with green beans",
  },
  {
    slug: "smoky-turkey-taco-stuffed-peppers",
    title: "Smoky Turkey Taco-Stuffed Peppers",
    description:
      "Lean turkey, black beans, and salsa baked into sweet pepper shells.",
    category: "highProtein",
    meal: "light-meal",
    servings: "4 servings",
    servingsCount: 4,
    prep: "15 min",
    cook: "25 min",
    prepMinutes: 15,
    cookMinutes: 25,
    nutrition: { calories: 395, proteinGrams: 38, fiberGrams: 7 },
    ingredients: [
      "4 medium bell peppers, halved lengthwise and seeded",
      "1 pound 93% lean ground turkey",
      "1 teaspoon extra-virgin olive oil",
      "2 teaspoons ground cumin",
      "1 teaspoon smoked paprika",
      "1/2 teaspoon dried oregano",
      "1/2 teaspoon kosher salt",
      "1 cup no-salt-added black beans, rinsed and drained",
      "3/4 cup mild salsa, plus more for serving",
      "1/2 cup shredded reduced-fat cheddar",
      "2 tablespoons chopped cilantro or scallions",
    ],
    method: [
      "Heat the oven to 400°F. Arrange the pepper halves cut-side up in a 9-by-13-inch baking dish. Add 1/4 cup water to the dish, cover with foil, and bake for 10 minutes.",
      "Meanwhile, heat the olive oil in a skillet over medium-high. Add the turkey and cook, breaking it into small crumbles, until no pink remains, 6 to 7 minutes.",
      "Stir in cumin, paprika, oregano, salt, black beans, and salsa. Cook 2 minutes, just until the mixture is cohesive and hot.",
      "Drain any water from the pepper dish. Divide the filling among the pepper halves and top with cheddar.",
      "Bake uncovered for 10 to 12 minutes, until the cheese melts and the peppers are tender. Finish with cilantro or scallions.",
    ],
    chefNote:
      "Pre-baking the pepper halves prevents the common problem of a hot filling trapped inside a nearly raw pepper.",
    makeAhead:
      "Assemble up to 24 hours ahead or freeze cooked portions for up to 2 months.",
    imageAlt:
      "Bell peppers filled with smoky turkey, black beans, salsa, and melted cheddar",
  },
  {
    slug: "chicken-and-beef-fajitas",
    title: "Chicken and Beef Fajitas",
    description:
      "Crisp-tender peppers and onion with warm chicken and steak strips, tucked into low-carb tortillas.",
    category: "highProtein",
    meal: ["lunch", "dinner"],
    servings: "4 servings (2 fajitas each)",
    servingsCount: 4,
    prep: "15 min",
    cook: "15 min",
    prepMinutes: 15,
    cookMinutes: 15,
    nutrition: { calories: 530, proteinGrams: 47, fiberGrams: 9 },
    ingredients: [
      "3 medium bell peppers (red, green, and yellow), sliced into 1/4-inch strips",
      "1 large yellow onion, sliced into 1/4-inch strips",
      "2 tablespoons extra-virgin olive oil",
      "12 ounces cooked chicken fajita strips, or cooked boneless skinless chicken breast, sliced",
      "12 ounces cooked beef fajita strips, or cooked flank or skirt steak, sliced",
      "1 teaspoon chili powder",
      "1 teaspoon ground cumin",
      "1/2 teaspoon smoked paprika",
      "1/4 teaspoon garlic powder",
      "3/4 teaspoon kosher salt, divided",
      "1/2 teaspoon black pepper, divided",
      "8 low-carb flour tortillas (6 to 8 inch)",
      "1/2 cup shredded Colby-Jack cheese",
      "1/2 cup guacamole or sliced avocado",
      "1/2 cup light sour cream",
      "8 lime wedges",
    ],
    method: [
      {
        baseText:
          "Slice 3 medium bell peppers and 1 large yellow onion into 1/4-inch strips. If the 12 ounces cooked chicken and 12 ounces cooked beef are in large pieces, cut them into thin strips about 1/2 inch wide. Set out 8 low-carb tortillas, 1/2 cup shredded Colby-Jack, 1/2 cup guacamole, 1/2 cup sour cream, and 8 lime wedges so the toppings are ready when the filling comes off the heat.",
        scaledTemplate:
          "Slice {{peppers}} medium bell peppers and {{onion}} large yellow onion into 1/4-inch strips. If the {{chicken}} ounces cooked chicken and {{beef}} ounces cooked beef are in large pieces, cut them into thin strips about 1/2 inch wide. Set out {{tortillas}} low-carb tortillas, {{cheese}} cup shredded Colby-Jack, {{guacamole}} cup guacamole, {{sourCream}} cup sour cream, and {{limes}} lime wedges so the toppings are ready when the filling comes off the heat.",
        quantities: {
          peppers: 3,
          onion: 1,
          chicken: 12,
          beef: 12,
          tortillas: 8,
          cheese: 0.5,
          guacamole: 0.5,
          sourCream: 0.5,
          limes: 8,
        },
      },
      {
        baseText:
          "Heat 2 tablespoons extra-virgin olive oil in a 12-inch skillet over medium-high heat until the oil shimmers, about 1 minute.",
        scaledTemplate:
          "Heat {{oil}} tablespoons extra-virgin olive oil in a 12-inch skillet over medium-high heat until the oil shimmers, about 1 minute.",
        quantities: { oil: 2 },
      },
      {
        baseText:
          "Add the sliced peppers and onion. Sprinkle with 1/2 teaspoon of the kosher salt and 1/4 teaspoon of the black pepper. Stir-fry, tossing every 30 to 45 seconds, until the vegetables are glossy and crisp-tender, 6 to 8 minutes. They should still have a little bite, not turn soft or browned.",
        scaledTemplate:
          "Add the sliced peppers and onion. Sprinkle with {{salt}} teaspoon of the kosher salt and {{pepper}} teaspoon of the black pepper. Stir-fry, tossing every 30 to 45 seconds, until the vegetables are glossy and crisp-tender, 6 to 8 minutes. They should still have a little bite, not turn soft or browned.",
        quantities: { salt: 0.5, pepper: 0.25 },
      },
      {
        baseText:
          "Sprinkle 1 teaspoon chili powder, 1 teaspoon ground cumin, 1/2 teaspoon smoked paprika, and 1/4 teaspoon garlic powder over the vegetables. Stir for 20 to 30 seconds, until the spices smell toasty.",
        scaledTemplate:
          "Sprinkle {{chili}} teaspoon chili powder, {{cumin}} teaspoon ground cumin, {{paprika}} teaspoon smoked paprika, and {{garlic}} teaspoon garlic powder over the vegetables. Stir for 20 to 30 seconds, until the spices smell toasty.",
        quantities: {
          chili: 1,
          cumin: 1,
          paprika: 0.5,
          garlic: 0.25,
        },
      },
      {
        baseText:
          "Add the 12 ounces cooked chicken strips and 12 ounces cooked beef strips. Toss until every strip is coated in the peppers, onion, and spices. Cook, stirring often, until the meat is heated through and steaming, 3 to 4 minutes. Season with the remaining 1/4 teaspoon kosher salt and 1/4 teaspoon black pepper. Taste and adjust. Remove the skillet from the heat.",
        scaledTemplate:
          "Add the {{chicken}} ounces cooked chicken strips and {{beef}} ounces cooked beef strips. Toss until every strip is coated in the peppers, onion, and spices. Cook, stirring often, until the meat is heated through and steaming, 3 to 4 minutes. Season with the remaining {{salt}} teaspoon kosher salt and {{pepper}} teaspoon black pepper. Taste and adjust. Remove the skillet from the heat.",
        quantities: { chicken: 12, beef: 12, salt: 0.25, pepper: 0.25 },
      },
      {
        baseText:
          "Warm the 8 tortillas using one of these methods. Microwave: stack them between two slightly damp paper towels and heat 20 to 30 seconds, until steamy. Oven: wrap the stack in foil and heat at 350°F for 8 to 10 minutes.",
        scaledTemplate:
          "Warm the {{tortillas}} tortillas using one of these methods. Microwave: stack them between two slightly damp paper towels and heat 20 to 30 seconds, until steamy. Oven: wrap the stack in foil and heat at 350°F for 8 to 10 minutes.",
        quantities: { tortillas: 8 },
      },
      {
        baseText:
          "Build 8 fajitas, 2 per person. Fill each warm tortilla with about 1/2 cup of the meat-and-pepper mixture, dividing the skillet evenly. Top each fajita with 1 tablespoon sour cream, 1 tablespoon guacamole, and 1 tablespoon shredded Colby-Jack. Serve at once with lime wedges.",
        scaledTemplate:
          "Build {{tortillas}} fajitas, 2 per person. Fill each warm tortilla with about 1/2 cup of the meat-and-pepper mixture, dividing the skillet evenly. Top each fajita with 1 tablespoon sour cream, 1 tablespoon guacamole, and 1 tablespoon shredded Colby-Jack. Serve at once with lime wedges.",
        quantities: { tortillas: 8 },
      },
    ],
    chefNote:
      "Pre-cooked fajita meat keeps this under 20 minutes. If you are starting from raw, cook the chicken to 165°F and the beef to at least 145°F, rest 5 minutes, then slice and continue from the vegetable step. When cooking for more than 4 people, use a second skillet or cook the vegetables in two batches so they sear instead of steam.",
    makeAhead:
      "Slice the vegetables and meat up to 1 day ahead. Refrigerate the cooked filling for up to 3 days. Reheat in a skillet over medium heat until steaming. Warm tortillas and add toppings just before serving.",
    imageAlt:
      "Chicken and beef fajitas in low-carb tortillas with peppers, onion, guacamole, sour cream, and Colby-Jack",
  },
] as const;

export const RECIPES: readonly Recipe[] = Object.freeze(
  RECIPE_DATA.map((recipe) =>
    Object.freeze({
      ...recipe,
      meal: recipeMeals(recipe.meal),
      nutrition: Object.freeze({ ...recipe.nutrition }),
      ingredients: Object.freeze(recipe.ingredients.map(parseIngredient)),
      method: Object.freeze(
        recipe.method.map((step) =>
          typeof step === "string"
            ? step
            : Object.freeze({
                ...step,
                ...("quantities" in step && step.quantities
                  ? { quantities: Object.freeze({ ...step.quantities }) }
                  : {}),
              }),
        ),
      ),
    }),
  ),
);

export const RECIPE_SLUGS = RECIPES.map((recipe) => recipe.slug);

export function recipePath(recipe: Pick<Recipe, "slug">): string {
  return `/recipes/${recipe.slug}/`;
}

export function recipeImagePath(
  recipe: Pick<Recipe, "slug" | "imageSlug">,
  width: (typeof RECIPE_IMAGE_WIDTHS)[number] = 1536,
): string {
  const suffix = width === 1536 ? "" : `-${width}w`;
  return `/images/recipes/${recipe.imageSlug ?? recipe.slug}${suffix}.webp`;
}

export function recipeImageSrcSet(
  recipe: Pick<Recipe, "slug" | "imageSlug">,
): string {
  return RECIPE_IMAGE_WIDTHS.map(
    (width) => `${recipeImagePath(recipe, width)} ${width}w`,
  ).join(", ");
}

export function getRecipeBySlug(slug: string): Recipe | undefined {
  return RECIPES.find((recipe) => recipe.slug === slug);
}

export function getRecipesByCategory(category: RecipeCategoryKey): Recipe[] {
  return RECIPES.filter((recipe) => recipe.category === category);
}

export function nutritionEstimate(recipe: Recipe): string {
  const { calories, proteinGrams, fiberGrams } = recipe.nutrition;
  return `About ${calories} kcal | ${proteinGrams} g protein | ${fiberGrams} g fiber`;
}
