export interface Recipe {
  id: string;
  title: string;
  slug: string;
  source_url: string | null;
  image_path: string | null;
  meal_type: "breakfast" | "dinner" | "dessert" | "other";
  prep_time: string | null;
  cook_time: string | null;
  total_time: string | null;
  servings: string | null;
  calories: number | null;
  author: string | null;
  description: string | null;
  tags: string[];
  date_added: string;
  ingredients: string[];
  instructions: string[];
  nutrition: Record<string, string>;
  created_at: string;
  created_by: string | null;
}

export interface UserFavorite {
  user_id: string;
  recipe_id: string;
  created_at: string;
}

export interface RecentlyViewed {
  user_id: string;
  recipe_id: string;
  viewed_at: string;
}

export interface ParsedRecipe {
  title: string;
  slug: string;
  source_url: string;
  image_url: string;
  author: string;
  description: string;
  prep_time: string;
  cook_time: string;
  total_time: string;
  servings: string;
  calories: number | null;
  ingredients: string[];
  instructions: string[];
  nutrition: Record<string, string>;
  tags: string[];
}

export type MealType = "breakfast" | "dinner" | "dessert" | "other";

export const MEAL_TYPES: MealType[] = ["breakfast", "dinner", "dessert", "other"];
