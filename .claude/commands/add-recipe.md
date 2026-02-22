---
name: add-recipe
description: Add a recipe to the catalog from a URL
user_invocable: true
---

# Add Recipe from URL

The user will provide a recipe URL. Follow these steps:

## Steps

1. **Parse the recipe**: Run `python3 parse_recipe.py "<url>"` to extract structured recipe data and download the photo to `images/`.

2. **Review the output**: Check that the JSON output has a title, ingredients, and instructions. If the parser fails (no JSON-LD found), manually extract the recipe data from the page using WebFetch.

3. **Determine meal type**: Ask the user which category if unclear, otherwise infer from the recipe:
   - `breakfast` — morning meals, brunch items, overnight oats, etc.
   - `dinner` — main courses, soups, stews, etc.
   - `dessert` — sweets, baked goods, etc.
   - `other` — snacks, sides, drinks, sauces, etc.

4. **Create the recipe markdown file**: Save to `recipes/<meal_type>/<slug>.md` using this template:

```markdown
---
layout: recipe
title: "<title>"
source_url: "<url>"
image: "/images/<slug>.jpg"
meal_type: <meal_type>
prep_time: "<prep_time>"
cook_time: "<cook_time>"
total_time: "<total_time>"
servings: "<servings>"
calories: <calories_number>
author: "<author>"
description: "<description>"
tags:
  - <tag1>
  - <tag2>
date_added: <today's date YYYY-MM-DD>
nutrition:
  calories: "<calories>"
  fat: "<fat>"
  carbs: "<carbs>"
  protein: "<protein>"
  fiber: "<fiber>"
---

## Ingredients

- ingredient 1
- ingredient 2
...

## Instructions

1. Step one.

2. Step two.
...

## Nutrition

| Calories | Fat | Carbs | Protein | Fiber |
|----------|-----|-------|---------|-------|
| <cal>    | <f> | <c>   | <p>     | <fi>  |
```

5. **Regenerate the index**: Run `python3 generate_index.py` to update the catalog page.

6. **Commit and push**: Stage the new recipe file, image, and updated index.md. Commit with message "Add recipe: <title>" and push to origin.

7. **Confirm**: Tell the user the recipe was added, show the file path, and note it's been pushed to the site.
