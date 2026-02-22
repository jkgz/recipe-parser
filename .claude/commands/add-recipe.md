---
name: add-recipe
description: Add a recipe to the catalog from a URL
user_invocable: true
---

# Add Recipe from URL

The user will provide a recipe URL. Follow these steps:

## Steps

1. **Parse the recipe**: Run `python3 parse_recipe.py "<url>"` to get structured JSON data and confirm it has a title, ingredients, and instructions. If the parser fails (no JSON-LD found), manually extract the recipe data from the page using WebFetch.

2. **Determine meal type**: Ask the user which category if unclear, otherwise infer from the recipe:
   - `breakfast` — morning meals, brunch items, overnight oats, etc.
   - `dinner` — main courses, soups, stews, etc.
   - `dessert` — sweets, baked goods, etc.
   - `other` — snacks, sides, drinks, sauces, etc.

3. **Download and upload image**: Use the image URL from the parsed data to download the image, then upload it to Supabase Storage `recipe-images` bucket using the Supabase CLI or a quick script.

4. **Insert into Supabase**: Insert the recipe into the `recipes` table with all parsed fields (title, slug, source_url, image_path, meal_type, prep_time, cook_time, total_time, servings, calories, author, description, tags, ingredients, instructions, nutrition).

   You can do this via the Supabase CLI or a quick Node script using the service role key:
   ```bash
   npx tsx -e "
   const { createClient } = require('@supabase/supabase-js');
   const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
   // ... insert logic
   "
   ```

5. **Confirm**: Tell the user the recipe was added and provide the URL path (`/recipe/<slug>`).
