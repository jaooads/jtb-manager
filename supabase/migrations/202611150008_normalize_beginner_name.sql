-- Garante o nome curto caso a versão anterior da migration já tenha sido aplicada.
update public.graduations
set name = 'Iniciante'
where lower(trim(name)) = 'iniciante (sem prajied)'
  and not exists (
    select 1 from public.graduations where lower(trim(name)) = 'iniciante'
  );
