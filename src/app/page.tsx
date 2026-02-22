import { createClient } from "@/lib/supabase/server";
import RecipeCard from "@/components/RecipeCard";
import FavoriteButton from "@/components/FavoriteButton";
import Link from "next/link";
import type { Recipe, MealType } from "@/lib/types";
import { MEAL_TYPES } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();

  const { data: recipes } = await supabase
    .from("recipes")
    .select("*")
    .order("date_added", { ascending: false });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let favoriteRecipes: Recipe[] = [];
  let recentRecipes: Recipe[] = [];

  if (user) {
    const { data: favs } = await supabase
      .from("user_favorites")
      .select("recipe_id")
      .eq("user_id", user.id);

    if (favs && favs.length > 0) {
      const favIds = favs.map((f) => f.recipe_id);
      const { data } = await supabase
        .from("recipes")
        .select("*")
        .in("id", favIds);
      favoriteRecipes = data ?? [];
    }

    const { data: recent } = await supabase
      .from("recently_viewed")
      .select("recipe_id")
      .eq("user_id", user.id)
      .order("viewed_at", { ascending: false })
      .limit(6);

    if (recent && recent.length > 0) {
      const recentIds = recent.map((r) => r.recipe_id);
      const { data } = await supabase
        .from("recipes")
        .select("*")
        .in("id", recentIds);
      // Preserve order from recently_viewed
      const recipeMap = new Map((data ?? []).map((r) => [r.id, r]));
      recentRecipes = recentIds
        .map((id) => recipeMap.get(id))
        .filter(Boolean) as Recipe[];
    }
  }

  const grouped = MEAL_TYPES.reduce(
    (acc, type) => {
      const items = (recipes ?? []).filter(
        (r: Recipe) => r.meal_type === type
      );
      if (items.length > 0) acc[type] = items;
      return acc;
    },
    {} as Record<MealType, Recipe[]>
  );

  return (
    <>
      <h1>Our Family Recipes</h1>

      {user && (
        <p style={{ marginTop: "0.5rem" }}>
          <Link href="/submit" className="btn btn-primary">
            + Add Recipe
          </Link>{" "}
          <Link href="/favorites" className="btn">
            Favorites
          </Link>
        </p>
      )}

      {user && favoriteRecipes.length > 0 && (
        <>
          <h2 className="meal-type">Your Favorites</h2>
          <div className="scroll-section">
            {favoriteRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        </>
      )}

      {user && recentRecipes.length > 0 && (
        <>
          <h2 className="meal-type">Recently Viewed</h2>
          <div className="scroll-section">
            {recentRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        </>
      )}

      {Object.entries(grouped).map(([type, items]) => (
        <section key={type}>
          <h2 className="meal-type">{type}</h2>
          <div className="recipe-grid">
            {items.map((recipe) => (
              <div key={recipe.id} style={{ position: "relative" }}>
                <RecipeCard recipe={recipe} />
                {user && (
                  <FavoriteButton
                    recipeId={recipe.id}
                    className="on-card"
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      {(!recipes || recipes.length === 0) && (
        <p style={{ marginTop: "2rem", color: "var(--color-muted)" }}>
          No recipes yet. Sign in to add your first recipe!
        </p>
      )}
    </>
  );
}
