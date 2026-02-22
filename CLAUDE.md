# RecipeParser — Project Conventions

## What This Is
A personal recipe catalog stored as markdown files, served as a static site via GitHub Pages (Jekyll).

## Project Structure
- `recipes/` — Recipe markdown files organized by meal type (breakfast, dinner, dessert, other)
- `images/` — Downloaded recipe photos (named matching the recipe slug)
- `parse_recipe.py` — Python script to extract JSON-LD recipe data from URLs (stdlib only)
- `generate_index.py` — Regenerates `index.md` from all recipes in `recipes/`
- `_layouts/` — Jekyll layout templates
- `assets/style.css` — Mobile-friendly CSS
- `_config.yml` — Jekyll config for GitHub Pages

## Recipe Markdown Format
Each recipe is a markdown file with YAML frontmatter. See any file in `recipes/` for the template.

Key frontmatter fields: `layout`, `title`, `source_url`, `image`, `meal_type`, `prep_time`, `cook_time`, `total_time`, `servings`, `calories`, `author`, `description`, `tags`, `date_added`, `nutrition`

Body sections: `## Ingredients` (bulleted list), `## Instructions` (numbered list), `## Nutrition` (table)

## Adding a Recipe
1. Run `python3 parse_recipe.py <url>` to extract recipe data and download the photo
2. Create a markdown file in the appropriate `recipes/<meal_type>/` folder using the slug as filename
3. Run `python3 generate_index.py` to rebuild the index page

Use the `/add-recipe` skill to automate this workflow.

## Meal Types
- `breakfast`
- `dinner`
- `dessert`
- `other`

## Conventions
- Recipe filenames use kebab-case slugs matching the recipe title
- Images are saved as `images/<slug>.jpg` (or .png/.webp as appropriate)
- Always regenerate index.md after adding/removing recipes
- No external Python dependencies — stdlib only for parse_recipe.py
