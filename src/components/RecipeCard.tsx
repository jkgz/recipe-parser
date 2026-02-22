import Link from "next/link";
import type { Recipe } from "@/lib/types";

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Link href={`/recipe/${recipe.slug}`} className="recipe-card">
      {recipe.image_path && (
        <img src={recipe.image_path} alt={recipe.title} />
      )}
      <div className="card-body">
        <h3>{recipe.title}</h3>
        <span className="card-meta">
          {recipe.meal_type}
          {recipe.total_time ? ` · ${recipe.total_time}` : ""}
        </span>
      </div>
    </Link>
  );
}
