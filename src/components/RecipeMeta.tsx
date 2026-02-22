import type { Recipe } from "@/lib/types";

export default function RecipeMeta({ recipe }: { recipe: Recipe }) {
  return (
    <div className="recipe-meta">
      {recipe.prep_time && (
        <span className="meta-item">
          <strong>Prep:</strong> {recipe.prep_time}
        </span>
      )}
      {recipe.cook_time && (
        <span className="meta-item">
          <strong>Cook:</strong> {recipe.cook_time}
        </span>
      )}
      {recipe.total_time && (
        <span className="meta-item">
          <strong>Total:</strong> {recipe.total_time}
        </span>
      )}
      {recipe.servings && (
        <span className="meta-item">
          <strong>Servings:</strong> {recipe.servings}
        </span>
      )}
      {recipe.calories && (
        <span className="meta-item">
          <strong>Calories:</strong> {recipe.calories}
        </span>
      )}
    </div>
  );
}
