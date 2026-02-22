"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";

export default function RecordView({ recipeId }: { recipeId: string }) {
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("recently_viewed").upsert(
        {
          user_id: user.id,
          recipe_id: recipeId,
          viewed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,recipe_id" }
      );
    });
  }, [recipeId, supabase]);

  return null;
}
