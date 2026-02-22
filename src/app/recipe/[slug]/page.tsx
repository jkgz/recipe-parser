import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import RecipeMeta from "@/components/RecipeMeta";
import NutritionTable from "@/components/NutritionTable";
import FavoriteButton from "@/components/FavoriteButton";
import RecordView from "./record-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: recipe } = await supabase
    .from("recipes")
    .select("title, description")
    .eq("slug", slug)
    .single();

  if (!recipe) return { title: "Recipe Not Found" };
  return {
    title: `${recipe.title} — Our Family Recipes`,
    description: recipe.description,
  };
}

export default async function RecipePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: recipe } = await supabase
    .from("recipes")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!recipe) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="recipe">
      <h1>
        {recipe.title}
        {user && (
          <>
            {" "}
            <FavoriteButton recipeId={recipe.id} />
          </>
        )}
      </h1>

      {recipe.image_path && (
        <img
          className="recipe-hero"
          src={recipe.image_path}
          alt={recipe.title}
        />
      )}

      {recipe.description && (
        <p className="recipe-description">{recipe.description}</p>
      )}

      <RecipeMeta recipe={recipe} />

      {recipe.author && (
        <p className="recipe-author">By {recipe.author}</p>
      )}

      <h2>Ingredients</h2>
      <ul>
        {recipe.ingredients.map((item: string, i: number) => (
          <li key={i}>{item}</li>
        ))}
      </ul>

      <h2>Instructions</h2>
      <ol>
        {recipe.instructions.map((step: string, i: number) => (
          <li key={i}>{step}</li>
        ))}
      </ol>

      <NutritionTable nutrition={recipe.nutrition} />

      {recipe.source_url && (
        <p className="recipe-source">
          <a href={recipe.source_url} target="_blank" rel="noopener noreferrer">
            View original recipe
          </a>
        </p>
      )}

      {user && <RecordView recipeId={recipe.id} />}
    </div>
  );
}
