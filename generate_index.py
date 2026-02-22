#!/usr/bin/env python3
"""Generate index.md by scanning recipes/ folders.

Usage: python3 generate_index.py
"""

import re
from pathlib import Path

MEAL_TYPE_ORDER = ["breakfast", "dinner", "dessert", "other"]
PROJECT_DIR = Path(__file__).parent


def parse_frontmatter(filepath):
    """Extract YAML frontmatter as a dict (simple parser, no PyYAML needed)."""
    text = filepath.read_text()
    m = re.match(r"^---\s*\n(.*?)\n---", text, re.DOTALL)
    if not m:
        return {}
    fm = {}
    for line in m.group(1).split("\n"):
        match = re.match(r'^(\w[\w_]*)\s*:\s*"?(.*?)"?\s*$', line)
        if match:
            key, val = match.groups()
            fm[key] = val
    return fm


def build_index():
    recipes_dir = PROJECT_DIR / "recipes"
    grouped = {}

    for md_file in sorted(recipes_dir.rglob("*.md")):
        fm = parse_frontmatter(md_file)
        if not fm.get("title"):
            continue
        meal_type = fm.get("meal_type", "other")
        rel_path = md_file.relative_to(PROJECT_DIR)
        # Jekyll serves .md as .html
        url_path = "/" + str(rel_path).replace(".md", ".html")
        grouped.setdefault(meal_type, []).append({
            "title": fm["title"],
            "image": fm.get("image", ""),
            "total_time": fm.get("total_time", ""),
            "url": url_path,
        })

    lines = [
        "---",
        "layout: default",
        'title: "Our Family Recipes"',
        "---",
        "",
        "# Our Family Recipes",
        "",
        "_Use your browser's search (Ctrl+F / Cmd+F) to find recipes by ingredient or name._",
        "",
    ]

    for meal_type in MEAL_TYPE_ORDER:
        recipes = grouped.get(meal_type, [])
        if not recipes:
            continue
        lines.append(f'<h2 class="meal-type">{meal_type.title()}</h2>')
        lines.append("")
        lines.append('<div class="recipe-grid">')
        for r in recipes:
            img_html = ""
            if r["image"]:
                img_html = f'  <img src="{{{{ \'{r["image"]}\' | relative_url }}}}" alt="{r["title"]}">'
            time_html = f' &middot; {r["total_time"]}' if r["total_time"] else ""
            lines.append(f'<a class="recipe-card" href="{{{{ \'{r["url"]}\' | relative_url }}}}">')
            if img_html:
                lines.append(img_html)
            lines.append(f'  <div class="card-body">')
            lines.append(f'    <h3>{r["title"]}</h3>')
            lines.append(f'    <span class="card-meta">{meal_type.title()}{time_html}</span>')
            lines.append(f'  </div>')
            lines.append(f'</a>')
        lines.append("</div>")
        lines.append("")

    index_path = PROJECT_DIR / "index.md"
    index_path.write_text("\n".join(lines) + "\n")
    print(f"Generated {index_path} with {sum(len(v) for v in grouped.values())} recipes")


if __name__ == "__main__":
    build_index()
