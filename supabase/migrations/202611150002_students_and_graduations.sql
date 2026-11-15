-- Etapa 2: alunos, Prajieds e históricos.
create extension if not exists pgcrypto;

create table public.graduations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 60),
  primary_color text not null check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text check (secondary_color is null or secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer not null check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name)
);

create unique index graduations_sort_order_key on public.graduations(sort_order);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) between 2 and 160),
  phone text check (phone is null or char_length(phone) <= 24),
  birth_date date,
  training_start_date date not null,
  current_graduation_id uuid not null references public.graduations(id),
  monthly_fee numeric(12,2) not null check (monthly_fee >= 0),
  due_day smallint not null check (due_day between 1 and 31),
  notes text check (notes is null or char_length(notes) <= 2000),
  status text not null default 'active' check (status in ('active', 'inactive')),
  registration_date date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  financial_start_month date not null default date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date,
  deactivated_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (extract(day from financial_start_month) = 1),
  check (birth_date is null or birth_date <= (now() at time zone 'America/Sao_Paulo')::date),
  check (training_start_date <= (now() at time zone 'America/Sao_Paulo')::date)
);

create index students_full_name_idx on public.students using gin (to_tsvector('simple', full_name));
create index students_status_idx on public.students(status);
create index students_graduation_idx on public.students(current_graduation_id);

create table public.graduation_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  graduation_id uuid not null references public.graduations(id),
  graduated_at date not null,
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index graduation_history_student_date_idx
on public.graduation_history(student_id, graduated_at desc);

create table public.student_status_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  status text not null check (status in ('active', 'inactive')),
  effective_date date not null,
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now()
);

create index student_status_history_student_date_idx
on public.student_status_history(student_id, effective_date desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger graduations_set_updated_at
before update on public.graduations
for each row execute function public.set_updated_at();

create trigger students_set_updated_at
before update on public.students
for each row execute function public.set_updated_at();

create trigger graduation_history_set_updated_at
before update on public.graduation_history
for each row execute function public.set_updated_at();

alter table public.graduations enable row level security;
alter table public.students enable row level security;
alter table public.graduation_history enable row level security;
alter table public.student_status_history enable row level security;

create policy "authorized admin manages graduations" on public.graduations
for all to authenticated using (public.is_authorized_admin())
with check (public.is_authorized_admin());

create policy "authorized admin manages students" on public.students
for all to authenticated using (public.is_authorized_admin())
with check (public.is_authorized_admin());

create policy "authorized admin manages graduation history" on public.graduation_history
for all to authenticated using (public.is_authorized_admin())
with check (public.is_authorized_admin());

create policy "authorized admin manages status history" on public.student_status_history
for all to authenticated using (public.is_authorized_admin())
with check (public.is_authorized_admin());

revoke all on public.graduations, public.students, public.graduation_history, public.student_status_history from anon;
grant select, insert, update, delete on public.graduations to authenticated;
grant select, insert, update on public.students to authenticated;
grant select, insert, update, delete on public.graduation_history to authenticated;
grant select, insert on public.student_status_history to authenticated;

create or replace function public.create_student(
  p_full_name text,
  p_phone text,
  p_birth_date date,
  p_training_start_date date,
  p_graduation_id uuid,
  p_monthly_fee numeric,
  p_due_day smallint,
  p_notes text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not public.is_authorized_admin() then
    raise exception 'Acesso não autorizado' using errcode = '42501';
  end if;

  insert into public.students (
    full_name, phone, birth_date, training_start_date, current_graduation_id,
    monthly_fee, due_day, notes, registration_date, financial_start_month
  ) values (
    trim(p_full_name), nullif(trim(p_phone), ''), p_birth_date, p_training_start_date,
    p_graduation_id, p_monthly_fee, p_due_day, nullif(trim(p_notes), ''),
    v_today, date_trunc('month', v_today)::date
  ) returning id into v_student_id;

  insert into public.student_status_history(student_id, status, effective_date, notes)
  values (v_student_id, 'active', v_today, 'Cadastro inicial');

  insert into public.graduation_history(student_id, graduation_id, graduated_at, notes)
  values (v_student_id, p_graduation_id, p_training_start_date, 'Prajied no cadastro inicial');

  return v_student_id;
end;
$$;

create or replace function public.set_student_status(
  p_student_id uuid,
  p_status text,
  p_effective_date date,
  p_notes text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_authorized_admin() then
    raise exception 'Acesso não autorizado' using errcode = '42501';
  end if;
  if p_status not in ('active', 'inactive') then
    raise exception 'Situação inválida' using errcode = '22023';
  end if;

  update public.students
  set status = p_status,
      deactivated_at = case when p_status = 'inactive' then p_effective_date else null end
  where id = p_student_id and status <> p_status;

  if not found then
    raise exception 'Aluno inexistente ou já está nesta situação' using errcode = 'P0002';
  end if;

  insert into public.student_status_history(student_id, status, effective_date, notes)
  values (p_student_id, p_status, p_effective_date, nullif(trim(p_notes), ''));
end;
$$;

create or replace function public.record_graduation(
  p_student_id uuid,
  p_graduation_id uuid,
  p_graduated_at date,
  p_notes text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_history_id uuid;
begin
  if not public.is_authorized_admin() then
    raise exception 'Acesso não autorizado' using errcode = '42501';
  end if;

  update public.students set current_graduation_id = p_graduation_id where id = p_student_id;
  if not found then raise exception 'Aluno não encontrado' using errcode = 'P0002'; end if;

  insert into public.graduation_history(student_id, graduation_id, graduated_at, notes)
  values (p_student_id, p_graduation_id, p_graduated_at, nullif(trim(p_notes), ''))
  returning id into v_history_id;
  return v_history_id;
end;
$$;

create or replace function public.reorder_graduations(p_ordered_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_position integer := 0;
begin
  if not public.is_authorized_admin() then
    raise exception 'Acesso não autorizado' using errcode = '42501';
  end if;
  if cardinality(p_ordered_ids) <> (select count(*) from public.graduations) then
    raise exception 'A lista deve conter todos os Prajieds' using errcode = '22023';
  end if;

  update public.graduations set sort_order = sort_order + 100000;
  foreach v_id in array p_ordered_ids loop
    update public.graduations set sort_order = v_position where id = v_id;
    if not found then raise exception 'Prajied não encontrado' using errcode = 'P0002'; end if;
    v_position := v_position + 1;
  end loop;
end;
$$;

create or replace function public.correct_graduation_record(
  p_history_id uuid,
  p_graduation_id uuid,
  p_graduated_at date,
  p_notes text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_current_graduation_id uuid;
begin
  if not public.is_authorized_admin() then
    raise exception 'Acesso não autorizado' using errcode = '42501';
  end if;
  update public.graduation_history
  set graduation_id = p_graduation_id, graduated_at = p_graduated_at, notes = nullif(trim(p_notes), '')
  where id = p_history_id
  returning student_id into v_student_id;
  if not found then raise exception 'Registro não encontrado' using errcode = 'P0002'; end if;

  select graduation_id into v_current_graduation_id
  from public.graduation_history
  where student_id = v_student_id
  order by graduated_at desc, created_at desc
  limit 1;
  update public.students set current_graduation_id = v_current_graduation_id where id = v_student_id;
end;
$$;

revoke all on function public.create_student(text, text, date, date, uuid, numeric, smallint, text) from public;
revoke all on function public.set_student_status(uuid, text, date, text) from public;
revoke all on function public.record_graduation(uuid, uuid, date, text) from public;
revoke all on function public.reorder_graduations(uuid[]) from public;
revoke all on function public.correct_graduation_record(uuid, uuid, date, text) from public;
grant execute on function public.create_student(text, text, date, date, uuid, numeric, smallint, text) to authenticated;
grant execute on function public.set_student_status(uuid, text, date, text) to authenticated;
grant execute on function public.record_graduation(uuid, uuid, date, text) to authenticated;
grant execute on function public.reorder_graduations(uuid[]) to authenticated;
grant execute on function public.correct_graduation_record(uuid, uuid, date, text) to authenticated;
