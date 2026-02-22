import type { ParsedRecipe } from "./types";

function cleanText(val: unknown): string {
  if (!val) return "";
  if (Array.isArray(val)) val = val.map(String).join(" ");
  let s = String(val);
  s = s.replace(/<[^>]+>/g, "");
  // Decode common HTML entities
  s = s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
  return s.trim();
}

function parseDuration(iso: unknown): string {
  if (!iso) return "";
  const s = String(iso);
  const m = s.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!m) return s;
  let h = parseInt(m[1] || "0", 10);
  let mn = parseInt(m[2] || "0", 10);
  const sec = parseInt(m[3] || "0", 10);
  if (mn >= 60) {
    h += Math.floor(mn / 60);
    mn = mn % 60;
  }
  const parts: string[] = [];
  if (h) parts.push(`${h} hour${h !== 1 ? "s" : ""}`);
  if (mn) parts.push(`${mn} minute${mn !== 1 ? "s" : ""}`);
  if (sec && parts.length === 0) parts.push(`${sec} seconds`);
  return parts.join(" ");
}

function parseInstructions(raw: unknown): string[] {
  if (typeof raw === "string") {
    return raw
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (Array.isArray(raw)) {
    const steps: string[] = [];
    for (const item of raw) {
      if (typeof item === "string") {
        steps.push(cleanText(item));
      } else if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        if (obj["@type"] === "HowToSection") {
          const subs = obj.itemListElement;
          if (Array.isArray(subs)) {
            for (const sub of subs) {
              if (sub && typeof sub === "object") {
                steps.push(cleanText((sub as Record<string, unknown>).text));
              }
            }
          }
        } else {
          steps.push(cleanText(obj.text));
        }
      }
    }
    return steps.filter(Boolean);
  }
  return [];
}

function parseIngredients(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((i) => cleanText(i)).filter(Boolean);
  }
  return [];
}

function parseNutrition(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const result: Record<string, string> = {};
  const mapping: Record<string, string> = {
    calories: "calories",
    fatContent: "fat",
    carbohydrateContent: "carbs",
    proteinContent: "protein",
    fiberContent: "fiber",
    sodiumContent: "sodium",
    sugarContent: "sugar",
    cholesterolContent: "cholesterol",
  };
  for (const [key, label] of Object.entries(mapping)) {
    const val = obj[key];
    if (val) {
      result[label] = String(val).replace(" calories", "").trim();
    }
  }
  return result;
}

function getImageUrl(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && raw.length > 0) return getImageUrl(raw[0]);
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    return String(obj.url || obj.contentUrl || "");
  }
  return "";
}

function parseAuthor(raw: unknown): string {
  if (Array.isArray(raw)) {
    return raw
      .map((a) => parseAuthor(a))
      .filter(Boolean)
      .join(", ");
  }
  if (raw && typeof raw === "object") {
    return cleanText((raw as Record<string, unknown>).name);
  }
  return cleanText(raw);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function extractJsonLd(html: string): Record<string, unknown>[] {
  const pattern =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis;
  const recipes: Record<string, unknown>[] = [];
  let match;
  while ((match = pattern.exec(html)) !== null) {
    let data: unknown;
    try {
      data = JSON.parse(match[1]);
    } catch {
      continue;
    }
    if (
      data &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      "@graph" in (data as Record<string, unknown>)
    ) {
      data = (data as Record<string, unknown>)["@graph"];
    }
    const items = Array.isArray(data) ? data : [data];
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const obj = item as Record<string, unknown>;
      const itemType = obj["@type"];
      if (Array.isArray(itemType)) {
        if (itemType.includes("Recipe")) recipes.push(obj);
      } else if (itemType === "Recipe") {
        recipes.push(obj);
      }
    }
  }
  return recipes;
}

export async function parseRecipeFromUrl(url: string): Promise<ParsedRecipe> {
  const resp = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  if (!resp.ok) {
    throw new Error(`Failed to fetch URL: ${resp.status}`);
  }
  const html = await resp.text();
  const recipes = extractJsonLd(html);
  if (recipes.length === 0) {
    throw new Error("No JSON-LD Recipe found on page");
  }

  const recipe = recipes[0];
  const title = cleanText(recipe.name);
  const slug = slugify(title);
  const nutrition = parseNutrition(recipe.nutrition);

  let calories: number | null = null;
  if (nutrition.calories) {
    const m = nutrition.calories.match(/\d+/);
    if (m) calories = parseInt(m[0], 10);
  }

  let tags: string[] = [];
  const keywords = recipe.keywords;
  if (typeof keywords === "string") {
    tags = keywords
      .split(",")
      .map((t) => cleanText(t))
      .filter(Boolean);
  } else if (Array.isArray(keywords)) {
    tags = keywords.map((t) => cleanText(t)).filter(Boolean);
  }

  return {
    title,
    slug,
    source_url: url,
    image_url: getImageUrl(recipe.image),
    author: parseAuthor(recipe.author),
    description: cleanText(recipe.description),
    prep_time: parseDuration(recipe.prepTime),
    cook_time: parseDuration(recipe.cookTime),
    total_time: parseDuration(recipe.totalTime),
    servings: cleanText(recipe.recipeYield),
    calories,
    ingredients: parseIngredients(recipe.recipeIngredient),
    instructions: parseInstructions(recipe.recipeInstructions),
    nutrition,
    tags,
  };
}
