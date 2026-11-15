-- A academia não utiliza o Prajied Branco sem ponta.
-- Corrige referências existentes para o primeiro nível válido antes da exclusão.
do $$
declare
  v_white_id uuid;
  v_first_valid_id uuid;
begin
  select id into v_white_id
  from public.graduations
  where lower(trim(name)) = 'branco'
  limit 1;

  if v_white_id is null then
    return;
  end if;

  select id into v_first_valid_id
  from public.graduations
  where lower(trim(name)) = 'branco ponta vermelha'
  limit 1;

  if v_first_valid_id is null then
    raise exception 'O Prajied Branco ponta vermelha precisa existir antes da correção';
  end if;

  update public.students
  set current_graduation_id = v_first_valid_id
  where current_graduation_id = v_white_id;

  update public.graduation_history
  set graduation_id = v_first_valid_id
  where graduation_id = v_white_id;

  delete from public.graduations
  where id = v_white_id;
end;
$$;
