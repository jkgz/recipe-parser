#!/usr/bin/env python3
"""Extract JSON-LD Recipe data from a URL and output structured JSON.

Usage: python3 parse_recipe.py <url>

No external dependencies — uses only Python 3 stdlib.
"""

import json
import os
import re
import sys
import urllib.request
import urllib.error
from html import unescape
from pathlib import Path


def fetch_html(url):
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) "
                      "Chrome/120.0.0.0 Safari/537.36",
    })
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read().decode("utf-8", errors="replace")


def extract_json_ld(html):
    """Find all <script type="application/ld+json"> blocks and return Recipe objects."""
    pattern = r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>'
    blocks = re.findall(pattern, html, re.DOTALL | re.IGNORECASE)

    recipes = []
    for block in blocks:
        try:
            data = json.loads(block)
        except json.JSONDecodeError:
            continue

        # Handle @graph arrays
        if isinstance(data, dict) and "@graph" in data:
            data = data["@graph"]

        items = data if isinstance(data, list) else [data]
        for item in items:
            if not isinstance(item, dict):
                continue
            item_type = item.get("@type", "")
            if isinstance(item_type, list):
                if "Recipe" in item_type:
                    recipes.append(item)
            elif item_type == "Recipe":
                recipes.append(item)

    return recipes


def clean_text(val):
    """Strip HTML tags and decode entities."""
    if not val:
        return ""
    if isinstance(val, list):
        val = " ".join(str(v) for v in val)
    val = str(val)
    val = re.sub(r"<[^>]+>", "", val)
    return unescape(val).strip()


def parse_duration(iso):
    """Convert ISO 8601 duration (PT1H30M) to human-readable string."""
    if not iso:
        return ""
    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", str(iso), re.IGNORECASE)
    if not m:
        return str(iso)
    hours, mins, secs = m.groups()
    h = int(hours or 0)
    mn = int(mins or 0)
    s = int(secs or 0)
    # Convert large minute values
    if mn >= 60:
        h += mn // 60
        mn = mn % 60
    parts = []
    if h:
        parts.append(f"{h} hour{'s' if h != 1 else ''}")
    if mn:
        parts.append(f"{mn} minute{'s' if mn != 1 else ''}")
    if s and not parts:
        parts.append(f"{s} seconds")
    return " ".join(parts)


def parse_instructions(raw):
    """Normalize instructions into a list of step strings."""
    if isinstance(raw, str):
        return [s.strip() for s in re.split(r'\n+', raw) if s.strip()]
    if isinstance(raw, list):
        steps = []
        for item in raw:
            if isinstance(item, str):
                steps.append(clean_text(item))
            elif isinstance(item, dict):
                if item.get("@type") == "HowToSection":
                    for sub in item.get("itemListElement", []):
                        steps.append(clean_text(sub.get("text", "")))
                else:
                    steps.append(clean_text(item.get("text", "")))
        return [s for s in steps if s]
    return []


def parse_ingredients(raw):
    if isinstance(raw, list):
        return [clean_text(i) for i in raw if clean_text(i)]
    return []


def parse_nutrition(raw):
    if not isinstance(raw, dict):
        return {}
    result = {}
    mapping = {
        "calories": "calories",
        "fatContent": "fat",
        "carbohydrateContent": "carbs",
        "proteinContent": "protein",
        "fiberContent": "fiber",
        "sodiumContent": "sodium",
        "sugarContent": "sugar",
        "cholesterolContent": "cholesterol",
    }
    for key, label in mapping.items():
        val = raw.get(key, "")
        if val:
            val = str(val).replace(" calories", "").strip()
            result[label] = val
    return result


def get_image_url(raw):
    if isinstance(raw, str):
        return raw
    if isinstance(raw, list) and raw:
        return get_image_url(raw[0])
    if isinstance(raw, dict):
        return raw.get("url", raw.get("contentUrl", ""))
    return ""


def _parse_author(raw):
    if isinstance(raw, list):
        names = [_parse_author(a) for a in raw]
        return ", ".join(n for n in names if n)
    if isinstance(raw, dict):
        return clean_text(raw.get("name", ""))
    return clean_text(raw)


def slugify(text):
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


def download_image(url, slug):
    """Download image and save to images/ directory. Returns relative path."""
    if not url:
        return ""
    ext = ".jpg"
    m = re.search(r"\.(jpe?g|png|webp|gif)", url, re.IGNORECASE)
    if m:
        ext = "." + m.group(1).lower()
        if ext == ".jpeg":
            ext = ".jpg"

    images_dir = Path(__file__).parent / "images"
    images_dir.mkdir(exist_ok=True)
    filename = f"{slug}{ext}"
    filepath = images_dir / filename

    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                          "AppleWebKit/537.36 (KHTML, like Gecko) "
                          "Chrome/120.0.0.0 Safari/537.36",
        })
        with urllib.request.urlopen(req, timeout=15) as resp:
            filepath.write_bytes(resp.read())
        return f"/images/{filename}"
    except Exception as e:
        print(f"Warning: could not download image: {e}", file=sys.stderr)
        return ""


def parse_recipe(url):
    html = fetch_html(url)
    recipes = extract_json_ld(html)

    if not recipes:
        print("Error: no JSON-LD Recipe found on page.", file=sys.stderr)
        sys.exit(1)

    recipe = recipes[0]
    title = clean_text(recipe.get("name", ""))
    slug = slugify(title)

    image_url = get_image_url(recipe.get("image", ""))
    local_image = download_image(image_url, slug)

    nutrition = parse_nutrition(recipe.get("nutrition", {}))
    calories_num = ""
    if nutrition.get("calories"):
        m = re.search(r"\d+", nutrition["calories"])
        if m:
            calories_num = int(m.group())

    result = {
        "title": title,
        "slug": slug,
        "source_url": url,
        "image": local_image,
        "image_url": image_url,
        "author": _parse_author(recipe.get("author", "")),
        "description": clean_text(recipe.get("description", "")),
        "prep_time": parse_duration(recipe.get("prepTime", "")),
        "cook_time": parse_duration(recipe.get("cookTime", "")),
        "total_time": parse_duration(recipe.get("totalTime", "")),
        "servings": clean_text(recipe.get("recipeYield", "")),
        "calories": calories_num,
        "ingredients": parse_ingredients(recipe.get("recipeIngredient", [])),
        "instructions": parse_instructions(recipe.get("recipeInstructions", [])),
        "nutrition": nutrition,
        "tags": [clean_text(t) for t in recipe.get("keywords", "").split(",") if clean_text(t)] if isinstance(recipe.get("keywords"), str) else [clean_text(t) for t in recipe.get("keywords", []) if clean_text(t)],
    }

    return result


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <url>", file=sys.stderr)
        sys.exit(1)

    data = parse_recipe(sys.argv[1])
    print(json.dumps(data, indent=2))
