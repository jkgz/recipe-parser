-- RecipeParser: Supabase schema
-- Run this in the Supabase SQL Editor after creating your project.

-- 1. Recipes table
create table public.recipes (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slug text unique not null,
  source_url text,
  image_path text,
  meal_type text not null check (meal_type in ('breakfast', 'dinner', 'dessert', 'other')),
  prep_time text,
  cook_time text,
  total_time text,
  servings text,
  calories int,
  author text,
  description text,
  tags text[] default '{}',
  date_added date default current_date,
  ingredients text[] default '{}',
  instructions text[] default '{}',
  nutrition jsonb default '{}',
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

-- 2. User favorites
create table public.user_favorites (
  user_id uuid references auth.users(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, recipe_id)
);

-- 3. Recently viewed
create table public.recently_viewed (
  user_id uuid references auth.users(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete cascade,
  viewed_at timestamptz default now(),
  primary key (user_id, recipe_id)
);

-- 4. Indexes
create index recipes_meal_type_idx on public.recipes(meal_type);
create index recipes_slug_idx on public.recipes(slug);
create index user_favorites_user_idx on public.user_favorites(user_id);
create index recently_viewed_user_idx on public.recently_viewed(user_id);
create index recently_viewed_viewed_at_idx on public.recently_viewed(user_id, viewed_at desc);

-- 5. RLS policies

-- Recipes: publicly readable, insert/update requires auth
alter table public.recipes enable row level security;

create policy "Recipes are publicly readable"
  on public.recipes for select
  using (true);

create policy "Authenticated users can insert recipes"
  on public.recipes for insert
  to authenticated
  with check (true);

create policy "Users can update their own recipes"
  on public.recipes for update
  to authenticated
  using (created_by = auth.uid());

-- User favorites: scoped to own user
alter table public.user_favorites enable row level security;

create policy "Users can view own favorites"
  on public.user_favorites for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own favorites"
  on public.user_favorites for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can delete own favorites"
  on public.user_favorites for delete
  to authenticated
  using (user_id = auth.uid());

-- Recently viewed: scoped to own user
alter table public.recently_viewed enable row level security;

create policy "Users can view own recently viewed"
  on public.recently_viewed for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own recently viewed"
  on public.recently_viewed for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own recently viewed"
  on public.recently_viewed for update
  to authenticated
  using (user_id = auth.uid());

-- 6. Storage bucket for recipe images
insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', true);

create policy "Recipe images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'recipe-images');

create policy "Authenticated users can upload recipe images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'recipe-images');
