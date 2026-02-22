/**
 * One-time migration script: reads existing markdown recipes and images,
 * uploads to Supabase Storage and inserts into the recipes table.
 *
 * Usage:
 *   npx tsx scripts/migrate-recipes.ts
 *
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

// Load .env.local from project root
config({ path: path.join(__dirname, "..", ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const RECIPES_DIR = path.join(__dirname, "..", "recipes");
const IMAGES_DIR = path.join(__dirname, "..", "images");

interface FrontMatter {
  [key: string]: string | string[] | number | Record<string, string>;
}

function parseFrontmatter(content: string): {
  meta: FrontMatter;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const meta: FrontMatter = {};
  const lines = match[1].split("\n");
  let currentKey = "";
  let inArray = false;
  let inObject = false;
  let arrayValues: string[] = [];
  let objectValues: Record<string, string> = {};

  for (const line of lines) {
    if (inArray) {
      if (line.match(/^\s+-\s+/)) {
        arrayValues.push(line.replace(/^\s+-\s+/, "").trim());
        continue;
      } else {
        meta[currentKey] = arrayValues;
        inArray = false;
        arrayValues = [];
      }
    }
    if (inObject) {
      if (line.match(/^\s+\w+:/)) {
        const [, k, v] = line.match(/^\s+(\w+):\s*"?([^"]*)"?$/) || [];
        if (k) objectValues[k] = v;
        continue;
      } else {
        meta[currentKey] = objectValues;
        inObject = false;
        objectValues = {};
      }
    }

    const keyMatch = line.match(/^(\w+):\s*(.*)/);
    if (!keyMatch) continue;
    const key = keyMatch[1];
    let value = keyMatch[2].trim();
    currentKey = key;

    if (value === "" || value === "[]") {
      // Could be start of array or object block, or empty
      // Peek: if next lines start with "  -", it's array; "  key:", it's object
      const idx = lines.indexOf(line);
      const nextLine = lines[idx + 1] || "";
      if (nextLine.match(/^\s+-\s+/)) {
        inArray = true;
        arrayValues = [];
      } else if (nextLine.match(/^\s+\w+:/)) {
        inObject = true;
        objectValues = {};
      } else {
        meta[key] = value === "[]" ? [] : "";
      }
      continue;
    }

    // Strip quotes
    value = value.replace(/^"(.*)"$/, "$1");

    // Number
    if (/^\d+$/.test(value)) {
      meta[key] = parseInt(value, 10);
    } else {
      meta[key] = value;
    }
  }

  // Flush
  if (inArray) meta[currentKey] = arrayValues;
  if (inObject) meta[currentKey] = objectValues;

  return { meta, body: match[2] };
}

function parseBody(body: string) {
  const ingredients: string[] = [];
  const instructions: string[] = [];
  let section = "";

  for (const line of body.split("\n")) {
    if (line.startsWith("## Ingredients")) {
      section = "ingredients";
      continue;
    }
    if (line.startsWith("## Instructions")) {
      section = "instructions";
      continue;
    }
    if (line.startsWith("## Nutrition")) {
      section = "";
      continue;
    }

    if (section === "ingredients" && line.startsWith("- ")) {
      ingredients.push(line.slice(2).trim());
    }
    if (section === "instructions" && /^\d+\.\s/.test(line)) {
      instructions.push(line.replace(/^\d+\.\s*/, "").trim());
    }
  }

  return { ingredients, instructions };
}

async function uploadImage(slug: string): Promise<string | null> {
  // Find image file
  const extensions = [".jpg", ".jpeg", ".png", ".webp"];
  for (const ext of extensions) {
    const filepath = path.join(IMAGES_DIR, `${slug}${ext}`);
    if (fs.existsSync(filepath)) {
      const buffer = fs.readFileSync(filepath);
      const contentType =
        ext === ".png"
          ? "image/png"
          : ext === ".webp"
            ? "image/webp"
            : "image/jpeg";
      const fileName = `${slug}${ext}`;

      const { error } = await supabase.storage
        .from("recipe-images")
        .upload(fileName, buffer, { contentType, upsert: true });

      if (error) {
        console.error(`Failed to upload ${fileName}:`, error.message);
        return null;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("recipe-images").getPublicUrl(fileName);
      return publicUrl;
    }
  }
  return null;
}

async function migrate() {
  const mealDirs = fs.readdirSync(RECIPES_DIR);

  for (const mealType of mealDirs) {
    const dirPath = path.join(RECIPES_DIR, mealType);
    if (!fs.statSync(dirPath).isDirectory()) continue;

    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const slug = file.replace(".md", "");
      const content = fs.readFileSync(path.join(dirPath, file), "utf-8");
      const { meta, body } = parseFrontmatter(content);
      const { ingredients, instructions } = parseBody(body);

      console.log(`Migrating: ${meta.title || slug}`);

      const imagePath = await uploadImage(slug);

      const { error } = await supabase.from("recipes").upsert(
        {
          title: meta.title as string,
          slug,
          source_url: (meta.source_url as string) || null,
          image_path: imagePath,
          meal_type: mealType,
          prep_time: (meta.prep_time as string) || null,
          cook_time: (meta.cook_time as string) || null,
          total_time: (meta.total_time as string) || null,
          servings: meta.servings ? String(meta.servings) : null,
          calories:
            typeof meta.calories === "number" ? meta.calories : null,
          author: (meta.author as string) || null,
          description: (meta.description as string) || null,
          tags: Array.isArray(meta.tags) ? meta.tags : [],
          date_added: (meta.date_added as string) || new Date().toISOString().split("T")[0],
          ingredients,
          instructions,
          nutrition:
            typeof meta.nutrition === "object" && !Array.isArray(meta.nutrition)
              ? meta.nutrition
              : {},
        },
        { onConflict: "slug" }
      );

      if (error) {
        console.error(`  Error: ${error.message}`);
      } else {
        console.log(`  Done (image: ${imagePath ? "yes" : "no"})`);
      }
    }
  }

  console.log("\nMigration complete!");
}

migrate().catch(console.error);
