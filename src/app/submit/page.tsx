"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { MealType, ParsedRecipe } from "@/lib/types";
import { MEAL_TYPES } from "@/lib/types";

export default function SubmitPage() {
  const supabase = createClient();
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const [parsed, setParsed] = useState<
    (ParsedRecipe & { image_path: string | null }) | null
  >(null);
  const [mealType, setMealType] = useState<MealType>("dinner");

  // Editable fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [servings, setServings] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [instructions, setInstructions] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/");
      } else {
        setAuthed(true);
      }
    });
  }, [supabase.auth, router]);

  async function handleParse() {
    setLoading(true);
    setError("");
    setParsed(null);

    try {
      const resp = await fetch("/api/parse-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || "Failed to parse recipe");
        return;
      }
      setParsed(data);
      setTitle(data.title);
      setDescription(data.description);
      setServings(data.servings);
      setIngredients(data.ingredients.join("\n"));
      setInstructions(data.instructions.join("\n"));
    } catch {
      setError("Failed to parse recipe");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!parsed) return;
    setSaving(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from("recipes").insert({
      title,
      slug: parsed.slug,
      source_url: parsed.source_url,
      image_path: parsed.image_path,
      meal_type: mealType,
      prep_time: parsed.prep_time || null,
      cook_time: parsed.cook_time || null,
      total_time: parsed.total_time || null,
      servings: servings || null,
      calories: parsed.calories,
      author: parsed.author || null,
      description: description || null,
      tags: parsed.tags,
      ingredients: ingredients.split("\n").filter(Boolean),
      instructions: instructions.split("\n").filter(Boolean),
      nutrition: parsed.nutrition,
      created_by: user?.id,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    router.push(`/recipe/${parsed.slug}`);
  }

  if (!authed) return null;

  return (
    <>
      <h1>Add a Recipe</h1>

      {!parsed && (
        <div className="submit-form">
          <div className="form-group">
            <label htmlFor="url">Recipe URL</label>
            <input
              id="url"
              type="url"
              placeholder="https://www.example.com/recipe/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleParse}
            disabled={loading || !url}
          >
            {loading ? (
              <>
                <span className="loading-spinner" /> Parsing...
              </>
            ) : (
              "Parse Recipe"
            )}
          </button>
          {error && <p className="error-message">{error}</p>}
        </div>
      )}

      {parsed && (
        <div className="submit-form">
          {parsed.image_path && (
            <img
              className="recipe-hero"
              src={parsed.image_path}
              alt={title}
              style={{ marginBottom: "1rem" }}
            />
          )}

          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="meal-type">Meal Type</label>
              <select
                id="meal-type"
                value={mealType}
                onChange={(e) => setMealType(e.target.value as MealType)}
              >
                {MEAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="servings">Servings</label>
              <input
                id="servings"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="ingredients">Ingredients (one per line)</label>
            <textarea
              id="ingredients"
              rows={10}
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="instructions">Instructions (one step per line)</label>
            <textarea
              id="instructions"
              rows={8}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || !title}
            >
              {saving ? (
                <>
                  <span className="loading-spinner" /> Saving...
                </>
              ) : (
                "Save Recipe"
              )}
            </button>
            <button
              className="btn"
              onClick={() => {
                setParsed(null);
                setError("");
              }}
            >
              Start Over
            </button>
          </div>
          {error && <p className="error-message">{error}</p>}
        </div>
      )}
    </>
  );
}
