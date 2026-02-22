"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export default function FavoriteButton({
  recipeId,
  className,
}: {
  recipeId: string;
  className?: string;
}) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      supabase
        .from("user_favorites")
        .select("recipe_id")
        .eq("user_id", user.id)
        .eq("recipe_id", recipeId)
        .single()
        .then(({ data }) => {
          setIsFavorite(!!data);
        });
    });
  }, [recipeId, supabase]);

  if (!userId) return null;

  async function toggle() {
    if (isFavorite) {
      await supabase
        .from("user_favorites")
        .delete()
        .eq("user_id", userId!)
        .eq("recipe_id", recipeId);
      setIsFavorite(false);
    } else {
      await supabase
        .from("user_favorites")
        .insert({ user_id: userId!, recipe_id: recipeId });
      setIsFavorite(true);
    }
  }

  return (
    <button
      className={`favorite-btn ${className ?? ""}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      {isFavorite ? "\u2764\uFE0F" : "\u2661"}
    </button>
  );
}
