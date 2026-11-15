-- Remove o nome pessoal usado nas versões iniciais do perfil administrativo.
alter table public.admin_profiles
alter column display_name set default 'Administrador';

update public.admin_profiles
set display_name = 'Administrador';
