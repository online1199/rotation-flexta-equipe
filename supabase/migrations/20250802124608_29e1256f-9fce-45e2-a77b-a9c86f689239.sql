-- Table des profils liés à auth.users
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  first_name text,
  last_name text,
  created_at timestamp default now()
);

-- Activer RLS sur profiles
alter table profiles enable row level security;

-- Policy: chaque utilisateur peut accéder à son propre profil
create policy "Users can manage their profile"
on profiles
for all
using (auth.uid() = id);

-- Table: members (les 5 personnes de l'équipe)
create table members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  name text not null,
  created_at timestamp default now()
);

-- Table: leaves (congés)
create table leaves (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  created_at timestamp default now()
);

-- Table: locked_days
create table locked_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  date_iso text not null,
  eighteen text[] not null default '{}',
  sixteen text[] not null default '{}',
  absents text[] not null default '{}',
  missing integer not null default 0,
  created_at timestamp default now()
);

-- Activer RLS sur toutes les tables
alter table members enable row level security;
alter table leaves enable row level security;
alter table locked_days enable row level security;

-- Policies pour members
create policy "Users can access their members"
on members
for all
using (auth.uid() = user_id);

-- Policies pour leaves (accès via member_id)
create policy "Users can access leaves for their members"
on leaves
for all
using (
  exists (
    select 1 from members 
    where members.id = leaves.member_id 
    and members.user_id = auth.uid()
  )
);

-- Policies pour locked_days
create policy "Users can access their locked days"
on locked_days
for all
using (auth.uid() = user_id);

-- Fonction pour créer automatiquement un profil à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name'
  );
  return new;
end;
$$;

-- Trigger pour créer le profil automatiquement
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();