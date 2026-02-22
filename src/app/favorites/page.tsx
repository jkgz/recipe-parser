import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import RecipeCard from "@/components/RecipeCard";
import FavoriteButton from "@/components/FavoriteButton";
import type { Recipe } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Favorites — Our Family Recipes",
};

export default async function FavoritesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: favs } = await supabase
    .from("user_favorites")
    .select("recipe_id")
    .eq("user_id", user.id);

  let recipes: Recipe[] = [];
  if (favs && favs.length > 0) {
    const ids = favs.map((f) => f.recipe_id);
    const { data } = await supabase.from("recipes").select("*").in("id", ids);
    recipes = data ?? [];
  }

  return (
    <>
      <h1>Your Favorites</h1>
      {recipes.length === 0 ? (
        <p style={{ color: "var(--color-muted)", marginTop: "1rem" }}>
          No favorites yet. Click the heart on a recipe to save it here.
        </p>
      ) : (
        <div className="recipe-grid">
          {recipes.map((recipe) => (
            <div key={recipe.id} style={{ position: "relative" }}>
              <RecipeCard recipe={recipe} />
              <FavoriteButton recipeId={recipe.id} className="on-card" />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
