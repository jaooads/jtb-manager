-- Alunos ainda não graduados devem iniciar sem receber um Prajied por engano.
do $$
begin
  if exists (
    select 1
    from public.graduations
    where lower(trim(name)) in ('iniciante', 'iniciante (sem prajied)')
  ) then
    return;
  end if;

  -- Abre a posição zero sem colidir com a restrição única de ordenação.
  update public.graduations
  set sort_order = sort_order + 1000;

  update public.graduations
  set sort_order = sort_order - 999;

  insert into public.graduations (
    name,
    primary_color,
    secondary_color,
    sort_order,
    is_active
  ) values (
    'Iniciante (sem Prajied)',
    '#737373',
    null,
    0,
    true
  );
end;
$$;
