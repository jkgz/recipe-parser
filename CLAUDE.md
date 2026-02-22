# RecipeParser — Project Conventions

## What This Is
A family recipe catalog web app built with Next.js and Supabase, deployed to Vercel. Family members (2-5 people) can sign in with Google, submit recipe URLs, favorite recipes, and see recently viewed.

## Tech Stack
- **Next.js 15** (App Router, Server Components, TypeScript)
- **Supabase** (Postgres, Google OAuth, Storage for images)
- **Vanilla CSS** (no Tailwind — styles in `src/app/globals.css`)
- **Vercel** for hosting
- **Dependencies:** `@supabase/supabase-js`, `@supabase/ssr` only

## Project Structure
```
src/
  app/
    layout.tsx              # Root layout with header + AuthButton
    page.tsx                # Home: recipe grid by meal type + favorites/recent
    globals.css             # All styles (ported from original Jekyll CSS)
    auth/callback/route.ts  # Google OAuth callback + email allow-list
    recipe/[slug]/page.tsx  # Recipe detail page
    submit/page.tsx         # URL submission form (auth required)
    favorites/page.tsx      # User's favorited recipes (auth required)
    api/parse-recipe/route.ts  # POST: parse recipe URL + upload image
  lib/
    supabase/server.ts      # Server-side Supabase client (cookie-based)
    supabase/client.ts      # Browser-side Supabase client
    types.ts                # TypeScript types (Recipe, ParsedRecipe, etc.)
    parse-recipe.ts         # TS port of parse_recipe.py
  components/
    AuthButton.tsx          # Google sign-in/out button
    RecipeCard.tsx          # Card for recipe grid
    FavoriteButton.tsx      # Heart toggle (client component)
    RecipeMeta.tsx          # Time/servings/calories bar
    NutritionTable.tsx      # Nutrition data table
  middleware.ts             # Session refresh on every request
supabase/
  schema.sql               # DB tables, RLS policies, storage bucket
scripts/
  migrate-recipes.ts       # One-time migration from markdown to Supabase
parse_recipe.py            # Original Python CLI parser (kept as utility)
```

## Database (Supabase)
- **`recipes`** — All recipe data including ingredients[], instructions[], nutrition (jsonb)
- **`user_favorites`** — (user_id, recipe_id) composite PK
- **`recently_viewed`** — (user_id, recipe_id) composite PK, viewed_at
- **Storage:** `recipe-images` bucket (public)
- **RLS:** Recipes publicly readable, insert requires auth. Favorites/recently_viewed scoped to own user.

## Meal Types
- `breakfast`, `dinner`, `dessert`, `other`

## Adding a Recipe
Users submit recipes via the `/submit` page in the web app:
1. Paste a recipe URL
2. The API route parses the page, extracts JSON-LD recipe data, downloads + uploads the image
3. Review the pre-filled form, select meal type
4. Save to Supabase

Use the `/add-recipe` command for CLI-based recipe addition.

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-side only)
- `ALLOWED_EMAILS` — Comma-separated list of allowed Google emails

## Conventions
- Recipe slugs are kebab-case derived from titles
- Images stored in Supabase Storage `recipe-images` bucket
- No external Python dependencies for parse_recipe.py (stdlib only)
- No Tailwind — all styles in globals.css using CSS custom properties
- Server Components by default; "use client" only where needed (auth, favorites, forms)
