-- Teste transacional para executar no SQL Editor após todas as migrations.
-- Nenhuma alteração é persistida: o script termina com ROLLBACK.
begin;

do $$
declare
  v_admin_id uuid;
  v_graduation_id uuid;
  v_student_id uuid;
  v_current_month date := date_trunc('month', now() at time zone 'America/Sao_Paulo')::date;
  v_inactive_month date := (date_trunc('month', now() at time zone 'America/Sao_Paulo') - interval '1 month')::date;
  v_first_active_month date := (date_trunc('month', now() at time zone 'America/Sao_Paulo') - interval '2 months')::date;
  v_future_one date := (date_trunc('month', now() at time zone 'America/Sao_Paulo') + interval '1 month')::date;
  v_future_two date := (date_trunc('month', now() at time zone 'America/Sao_Paulo') + interval '2 months')::date;
  v_generated integer;
  v_paid integer;
begin
  select user_id into v_admin_id from public.admin_profiles limit 1;
  if v_admin_id is null then raise exception 'Crie o perfil administrativo antes dos testes'; end if;

  perform set_config('request.jwt.claim.sub', v_admin_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin_id, 'role', 'authenticated')::text, true);

  if not public.is_authorized_admin() then raise exception 'Falha na autorização administrativa'; end if;
  if has_table_privilege('anon', 'public.students', 'select') then raise exception 'anon possui SELECT em students'; end if;
  if has_function_privilege('anon', 'public.generate_monthly_payments(date)', 'execute') then raise exception 'anon pode gerar mensalidades'; end if;
  if not has_function_privilege('authenticated', 'public.generate_monthly_payments(date)', 'execute') then raise exception 'authenticated não pode executar geração'; end if;

  if public.month_due_date('2027-02-01', 31) <> '2027-02-28' then raise exception 'Falha no vencimento de fevereiro'; end if;
  if public.month_due_date('2028-02-01', 31) <> '2028-02-29' then raise exception 'Falha no vencimento de ano bissexto'; end if;

  select id into v_graduation_id from public.graduations where is_active order by sort_order limit 1;
  if v_graduation_id is null then raise exception 'Nenhum Prajied ativo para o teste'; end if;

  v_student_id := public.create_student(
    '__TESTE_TRANSACIONAL__', '', null,
    (now() at time zone 'America/Sao_Paulo')::date,
    v_graduation_id, 310, 31, '', 'full', null
  );

  -- Simula dois meses ativos separados por um mês integralmente inativo.
  delete from public.monthly_payments where student_id = v_student_id;
  delete from public.student_status_history where student_id = v_student_id;
  update public.students set financial_start_month = v_first_active_month where id = v_student_id;
  update public.student_billing_terms set effective_from = v_first_active_month where student_id = v_student_id;
  insert into public.student_status_history(student_id, status, effective_date, notes) values
    (v_student_id, 'active', v_first_active_month, 'teste'),
    (v_student_id, 'inactive', v_inactive_month, 'teste'),
    (v_student_id, 'active', v_current_month, 'teste');

  v_generated := public.generate_monthly_payments();
  if (select count(*) from public.monthly_payments where student_id = v_student_id) <> 2 then
    raise exception 'A geração não respeitou o período integralmente inativo';
  end if;
  if exists (select 1 from public.monthly_payments where student_id = v_student_id and competence = v_inactive_month) then
    raise exception 'Foi criada cobrança em mês integralmente inativo';
  end if;

  v_generated := public.generate_monthly_payments();
  if v_generated <> 0 then raise exception 'A segunda geração não foi idempotente'; end if;

  v_paid := public.pay_student_competencies(v_student_id, array[v_future_one, v_future_two], v_current_month, 'pix');
  if v_paid <> 2 then raise exception 'Pagamento antecipado não quitou todas as competências'; end if;
  if (select count(*) from public.payment_records pr join public.monthly_payments mp on mp.id = pr.monthly_payment_id where mp.student_id = v_student_id and pr.voided_at is null) <> 2 then
    raise exception 'Pagamento antecipado não foi registrado integralmente';
  end if;

  begin
    perform public.pay_student_competencies(v_student_id, array[v_future_one, v_future_two], v_current_month, 'pix');
    raise exception 'Pagamento antecipado duplicado foi aceito';
  exception when unique_violation then
    null;
  end;
end;
$$;

rollback;
