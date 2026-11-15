-- Garante que Iniciante exista com o nome curto e na primeira posição.
do $$
begin
  if exists (
    select 1 from public.graduations
    where lower(trim(name)) = 'iniciante (sem prajied)'
  ) and not exists (
    select 1 from public.graduations
    where lower(trim(name)) = 'iniciante'
  ) then
    update public.graduations
    set name = 'Iniciante', is_active = true
    where lower(trim(name)) = 'iniciante (sem prajied)';
    return;
  end if;

  if exists (
    select 1 from public.graduations
    where lower(trim(name)) = 'iniciante'
  ) then
    update public.graduations
    set is_active = true
    where lower(trim(name)) = 'iniciante';
    return;
  end if;

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
    'Iniciante',
    '#737373',
    null,
    0,
    true
  );
end;
$$;
