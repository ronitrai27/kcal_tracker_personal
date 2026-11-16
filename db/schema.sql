-- App tables (Better Auth creates user/session/account/verification itself).

create table if not exists profile (
  user_id text primary key references "user"(id) on delete cascade,
  sex text not null check (sex in ('male', 'female')),
  age int not null,
  height_cm numeric(5,1) not null,
  weight_kg numeric(5,2) not null,
  target_weight_kg numeric(5,2) not null,
  target_days int not null,
  activity text not null,
  units jsonb not null default '{}',
  bmr int not null,
  tdee int not null,
  plan_name text not null,
  plan_source text not null,
  daily_kcal int not null,
  protein_g int not null,
  carbs_g int not null,
  fat_g int not null,
  fiber_g int not null,
  plan_days int,
  plan_end_date date,
  started_on date not null default current_date,
  onboarded_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Web-searched tips, cached so every step loads instantly after the first fetch.
create table if not exists tip_cache (
  topic text primary key,
  title text not null,
  tips jsonb not null,
  sources jsonb not null,
  fetched_at timestamptz not null default now()
);

-- Everything the user eats. eaten_on is the user's local calendar day.
create table if not exists meal_entry (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user"(id) on delete cascade,
  eaten_on date not null,
  slot text not null check (slot in ('breakfast', 'brunch', 'lunch', 'snack', 'dinner')),
  name text not null,
  qty numeric(8,2),
  unit text,
  kcal int not null check (kcal >= 0),
  protein_g numeric(6,1) not null default 0,
  carbs_g numeric(6,1) not null default 0,
  fat_g numeric(6,1) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists meal_entry_user_day on meal_entry (user_id, eaten_on);
