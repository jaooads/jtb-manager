-- Etapa 3: configurações, mensalidades, pagamentos e auditoria financeira.

create table public.system_settings (
  singleton boolean primary key default true check (singleton),
  default_monthly_fee numeric(12,2) not null default 150 check (default_monthly_fee >= 0),
  default_due_day smallint not null default 10 check (default_due_day between 1 and 31),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.system_settings(singleton) values (true) on conflict do nothing;

create table public.student_billing_terms (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  effective_from date not null check (extract(day from effective_from) = 1),
  monthly_fee numeric(12,2) not null check (monthly_fee >= 0),
  due_day smallint not null check (due_day between 1 and 31),
  created_at timestamptz not null default now(),
  unique(student_id, effective_from)
);

insert into public.student_billing_terms(student_id, effective_from, monthly_fee, due_day)
select id, financial_start_month, monthly_fee, due_day from public.students
on conflict (student_id, effective_from) do nothing;

create table public.monthly_payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  competence date not null check (extract(day from competence) = 1),
  due_date date not null,
  amount numeric(12,2) not null check (amount >= 0),
  state text not null default 'pending' check (state in ('pending', 'paid', 'cancelled')),
  cancellation_reason text,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id, competence)
);

create index monthly_payments_competence_idx on public.monthly_payments(competence);
create index monthly_payments_due_state_idx on public.monthly_payments(due_date, state);
create index monthly_payments_student_idx on public.monthly_payments(student_id, competence desc);

create table public.payment_records (
  id uuid primary key default gen_random_uuid(),
  monthly_payment_id uuid not null references public.monthly_payments(id) on delete restrict,
  paid_at date not null,
  payment_method text not null check (payment_method in ('pix', 'cash', 'card', 'transfer')),
  amount numeric(12,2) not null check (amount >= 0),
  recorded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid references auth.users(id),
  void_reason text
);

create unique index payment_records_one_active_per_charge
on public.payment_records(monthly_payment_id)
where voided_at is null;
create index payment_records_paid_at_idx on public.payment_records(paid_at) where voided_at is null;

create trigger system_settings_set_updated_at before update on public.system_settings
for each row execute function public.set_updated_at();
create trigger monthly_payments_set_updated_at before update on public.monthly_payments
for each row execute function public.set_updated_at();

alter table public.system_settings enable row level security;
alter table public.student_billing_terms enable row level security;
alter table public.monthly_payments enable row level security;
alter table public.payment_records enable row level security;

create policy "authorized admin manages settings" on public.system_settings
for all to authenticated using (public.is_authorized_admin()) with check (public.is_authorized_admin());
create policy "authorized admin reads billing terms" on public.student_billing_terms
for select to authenticated using (public.is_authorized_admin());
create policy "authorized admin reads monthly payments" on public.monthly_payments
for select to authenticated using (public.is_authorized_admin());
create policy "authorized admin reads payment records" on public.payment_records
for select to authenticated using (public.is_authorized_admin());

revoke all on public.system_settings, public.student_billing_terms, public.monthly_payments, public.payment_records from anon;
grant select, update on public.system_settings to authenticated;
grant select on public.student_billing_terms, public.monthly_payments, public.payment_records to authenticated;
revoke insert, update, delete on public.students from authenticated;

create or replace function public.month_due_date(p_competence date, p_due_day integer)
returns date
language sql
immutable
set search_path = public
as $$
  select least(
    date_trunc('month', p_competence)::date + (p_due_day - 1),
    (date_trunc('month', p_competence) + interval '1 month - 1 day')::date
  );
$$;

create or replace function public.student_active_during_month(p_student_id uuid, p_competence date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with periods as (
    select status, effective_date,
      lead(effective_date) over (order by effective_date, created_at) as next_date
    from public.student_status_history
    where student_id = p_student_id
  )
  select exists (
    select 1 from periods
    where status = 'active'
      and effective_date < (date_trunc('month', p_competence) + interval '1 month')::date
      and coalesce(next_date, 'infinity'::date) > date_trunc('month', p_competence)::date
  );
$$;

create or replace function public.generate_monthly_payments(p_through_month date default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_through date := coalesce(date_trunc('month', p_through_month)::date, date_trunc('month', now() at time zone 'America/Sao_Paulo')::date);
  v_current date := date_trunc('month', now() at time zone 'America/Sao_Paulo')::date;
  v_count integer;
begin
  if not public.is_authorized_admin() then raise exception 'Acesso não autorizado' using errcode = '42501'; end if;
  if v_through > v_current then raise exception 'A geração automática não pode avançar além do mês atual' using errcode = '22023'; end if;

  insert into public.monthly_payments(student_id, competence, due_date, amount)
  select s.id, months.competence, public.month_due_date(months.competence, terms.due_day), terms.monthly_fee
  from public.students s
  cross join lateral generate_series(s.financial_start_month, v_through, interval '1 month') as series(month_value)
  cross join lateral (select series.month_value::date as competence) months
  cross join lateral (
    select monthly_fee, due_day from public.student_billing_terms
    where student_id = s.id and effective_from <= months.competence
    order by effective_from desc limit 1
  ) terms
  where public.student_active_during_month(s.id, months.competence)
  on conflict (student_id, competence) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Substitui a função da Etapa 2 para criar o aluno, seus históricos, termos
-- financeiros e primeira mensalidade em uma única transação.
drop function public.create_student(text, text, date, date, uuid, numeric, smallint, text);

create function public.create_student(
  p_full_name text,
  p_phone text,
  p_birth_date date,
  p_training_start_date date,
  p_graduation_id uuid,
  p_monthly_fee numeric,
  p_due_day smallint,
  p_notes text,
  p_first_payment_mode text,
  p_first_payment_amount numeric default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_competence date := date_trunc('month', now() at time zone 'America/Sao_Paulo')::date;
  v_month_end date := (date_trunc('month', now() at time zone 'America/Sao_Paulo') + interval '1 month - 1 day')::date;
  v_first_amount numeric(12,2);
begin
  if not public.is_authorized_admin() then raise exception 'Acesso não autorizado' using errcode = '42501'; end if;
  if p_first_payment_mode not in ('full', 'proportional', 'custom') then raise exception 'Modalidade da primeira mensalidade inválida' using errcode = '22023'; end if;

  v_first_amount := case p_first_payment_mode
    when 'full' then p_monthly_fee
    when 'proportional' then round(p_monthly_fee * ((v_month_end - v_today + 1)::numeric / extract(day from v_month_end)::numeric), 2)
    when 'custom' then p_first_payment_amount
  end;
  if v_first_amount is null or v_first_amount < 0 then raise exception 'Valor da primeira mensalidade inválido' using errcode = '22023'; end if;

  insert into public.students(full_name, phone, birth_date, training_start_date, current_graduation_id, monthly_fee, due_day, notes, registration_date, financial_start_month)
  values (trim(p_full_name), nullif(trim(p_phone), ''), p_birth_date, p_training_start_date, p_graduation_id, p_monthly_fee, p_due_day, nullif(trim(p_notes), ''), v_today, v_competence)
  returning id into v_student_id;

  insert into public.student_status_history(student_id, status, effective_date, notes) values (v_student_id, 'active', v_today, 'Cadastro inicial');
  insert into public.graduation_history(student_id, graduation_id, graduated_at, notes) values (v_student_id, p_graduation_id, p_training_start_date, 'Prajied no cadastro inicial');
  insert into public.student_billing_terms(student_id, effective_from, monthly_fee, due_day) values (v_student_id, v_competence, p_monthly_fee, p_due_day);
  insert into public.monthly_payments(student_id, competence, due_date, amount) values (v_student_id, v_competence, public.month_due_date(v_competence, p_due_day), v_first_amount);
  return v_student_id;
end;
$$;

create or replace function public.update_student(
  p_student_id uuid,
  p_full_name text,
  p_phone text,
  p_birth_date date,
  p_training_start_date date,
  p_monthly_fee numeric,
  p_due_day smallint,
  p_notes text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_fee numeric;
  v_old_due smallint;
  v_effective date := (date_trunc('month', now() at time zone 'America/Sao_Paulo') + interval '1 month')::date;
begin
  if not public.is_authorized_admin() then raise exception 'Acesso não autorizado' using errcode = '42501'; end if;
  select monthly_fee, due_day into v_old_fee, v_old_due from public.students where id = p_student_id for update;
  if not found then raise exception 'Aluno não encontrado' using errcode = 'P0002'; end if;

  update public.students set full_name = trim(p_full_name), phone = nullif(trim(p_phone), ''), birth_date = p_birth_date,
    training_start_date = p_training_start_date, monthly_fee = p_monthly_fee, due_day = p_due_day, notes = nullif(trim(p_notes), '')
  where id = p_student_id;

  if v_old_fee <> p_monthly_fee or v_old_due <> p_due_day then
    insert into public.student_billing_terms(student_id, effective_from, monthly_fee, due_day)
    values (p_student_id, v_effective, p_monthly_fee, p_due_day)
    on conflict (student_id, effective_from) do update set monthly_fee = excluded.monthly_fee, due_day = excluded.due_day;
  end if;
end;
$$;

create or replace function public.register_payments(
  p_monthly_payment_ids uuid[],
  p_paid_at date,
  p_payment_method text
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expected integer := cardinality(p_monthly_payment_ids);
  v_count integer;
begin
  if not public.is_authorized_admin() then raise exception 'Acesso não autorizado' using errcode = '42501'; end if;
  if v_expected is null or v_expected = 0 then raise exception 'Selecione pelo menos uma mensalidade' using errcode = '22023'; end if;
  if p_payment_method not in ('pix', 'cash', 'card', 'transfer') then raise exception 'Forma de pagamento inválida' using errcode = '22023'; end if;
  if p_paid_at > (now() at time zone 'America/Sao_Paulo')::date then raise exception 'A data do pagamento não pode estar no futuro' using errcode = '22023'; end if;

  perform 1 from public.monthly_payments where id = any(p_monthly_payment_ids) for update;
  select count(*) into v_count from public.monthly_payments where id = any(p_monthly_payment_ids) and state = 'pending';
  if v_count <> v_expected then raise exception 'Uma ou mais mensalidades não estão disponíveis para pagamento' using errcode = '23505'; end if;

  insert into public.payment_records(monthly_payment_id, paid_at, payment_method, amount, recorded_by)
  select id, p_paid_at, p_payment_method, amount, auth.uid()
  from public.monthly_payments where id = any(p_monthly_payment_ids);
  update public.monthly_payments set state = 'paid' where id = any(p_monthly_payment_ids);
  return v_count;
end;
$$;

create or replace function public.pay_student_competencies(
  p_student_id uuid,
  p_competencies date[],
  p_paid_at date,
  p_payment_method text
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_competence date;
  v_term record;
  v_ids uuid[] := '{}';
  v_payment_id uuid;
  v_student record;
begin
  if not public.is_authorized_admin() then raise exception 'Acesso não autorizado' using errcode = '42501'; end if;
  select * into v_student from public.students where id = p_student_id and status = 'active' for update;
  if not found then raise exception 'Aluno ativo não encontrado' using errcode = 'P0002'; end if;
  if cardinality(p_competencies) is null or cardinality(p_competencies) = 0 then raise exception 'Selecione competências' using errcode = '22023'; end if;

  foreach v_competence in array p_competencies loop
    v_competence := date_trunc('month', v_competence)::date;
    if v_competence < v_student.financial_start_month then raise exception 'Competência anterior ao início financeiro' using errcode = '22023'; end if;
    select monthly_fee, due_day into v_term from public.student_billing_terms
      where student_id = p_student_id and effective_from <= v_competence order by effective_from desc limit 1;
    insert into public.monthly_payments(student_id, competence, due_date, amount)
    values (p_student_id, v_competence, public.month_due_date(v_competence, v_term.due_day), v_term.monthly_fee)
    on conflict (student_id, competence) do update set student_id = excluded.student_id
    returning id into v_payment_id;
    v_ids := array_append(v_ids, v_payment_id);
  end loop;
  return public.register_payments(v_ids, p_paid_at, p_payment_method);
end;
$$;

create or replace function public.void_payment(p_payment_record_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_monthly_payment_id uuid;
begin
  if not public.is_authorized_admin() then raise exception 'Acesso não autorizado' using errcode = '42501'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'Informe o motivo da correção' using errcode = '22023'; end if;
  update public.payment_records set voided_at = now(), voided_by = auth.uid(), void_reason = trim(p_reason)
  where id = p_payment_record_id and voided_at is null returning monthly_payment_id into v_monthly_payment_id;
  if not found then raise exception 'Pagamento ativo não encontrado' using errcode = 'P0002'; end if;
  update public.monthly_payments set state = 'pending' where id = v_monthly_payment_id;
end;
$$;

create or replace function public.set_monthly_payment_cancelled(
  p_monthly_payment_id uuid,
  p_cancelled boolean,
  p_reason text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_authorized_admin() then raise exception 'Acesso não autorizado' using errcode = '42501'; end if;
  if p_cancelled then
    if nullif(trim(p_reason), '') is null then raise exception 'Informe o motivo do cancelamento' using errcode = '22023'; end if;
    update public.monthly_payments set state = 'cancelled', cancellation_reason = trim(p_reason), cancelled_at = now()
    where id = p_monthly_payment_id and state = 'pending';
  else
    update public.monthly_payments set state = 'pending', cancellation_reason = null, cancelled_at = null
    where id = p_monthly_payment_id and state = 'cancelled';
  end if;
  if not found then raise exception 'Mensalidade não disponível para esta operação' using errcode = 'P0002'; end if;
end;
$$;

create or replace view public.monthly_payment_details
with (security_invoker = true)
as
select mp.*,
  case when mp.state = 'cancelled' then 'cancelled'
       when mp.state = 'paid' then 'paid'
       when mp.due_date < (now() at time zone 'America/Sao_Paulo')::date then 'overdue'
       else 'pending' end as display_status,
  pr.id as active_payment_record_id,
  pr.paid_at,
  pr.payment_method,
  s.full_name as student_name,
  s.status as student_status
from public.monthly_payments mp
join public.students s on s.id = mp.student_id
left join public.payment_records pr on pr.monthly_payment_id = mp.id and pr.voided_at is null;

grant select on public.monthly_payment_details to authenticated;
revoke all on function public.month_due_date(date, integer) from public;
revoke all on function public.student_active_during_month(uuid, date) from public;
revoke all on function public.generate_monthly_payments(date) from public;
revoke all on function public.create_student(text, text, date, date, uuid, numeric, smallint, text, text, numeric) from public;
revoke all on function public.update_student(uuid, text, text, date, date, numeric, smallint, text) from public;
revoke all on function public.register_payments(uuid[], date, text) from public;
revoke all on function public.pay_student_competencies(uuid, date[], date, text) from public;
revoke all on function public.void_payment(uuid, text) from public;
revoke all on function public.set_monthly_payment_cancelled(uuid, boolean, text) from public;
grant execute on function public.generate_monthly_payments(date) to authenticated;
grant execute on function public.create_student(text, text, date, date, uuid, numeric, smallint, text, text, numeric) to authenticated;
grant execute on function public.update_student(uuid, text, text, date, date, numeric, smallint, text) to authenticated;
grant execute on function public.register_payments(uuid[], date, text) to authenticated;
grant execute on function public.pay_student_competencies(uuid, date[], date, text) to authenticated;
grant execute on function public.void_payment(uuid, text) to authenticated;
grant execute on function public.set_monthly_payment_cancelled(uuid, boolean, text) to authenticated;
