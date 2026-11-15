-- Etapa 1: autorização exclusiva e perfil administrativo.
create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Dani' check (char_length(display_name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_profiles enable row level security;

create policy "admin reads own profile"
on public.admin_profiles for select
to authenticated
using (user_id = auth.uid());

create policy "admin updates own profile"
on public.admin_profiles for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Não existe policy de INSERT: o perfil deve ser criado manualmente após criar
-- a usuária no painel do Supabase. Isso mantém o cadastro público desabilitado.
revoke all on table public.admin_profiles from anon;
grant select, update on table public.admin_profiles to authenticated;

create or replace function public.is_authorized_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_profiles where user_id = auth.uid()
  );
$$;

revoke all on function public.is_authorized_admin() from public;
grant execute on function public.is_authorized_admin() to authenticated;
