-- Prajieds iniciais para a academia começar a usar sem configuração manual.
-- A lista só é inserida quando ainda não existe nenhum Prajied, preservando
-- integralmente configurações que o administrador já tenha criado.
insert into public.graduations (
  name,
  primary_color,
  secondary_color,
  sort_order,
  is_active
)
select
  defaults.name,
  defaults.primary_color,
  defaults.secondary_color,
  defaults.sort_order,
  true
from (values
  ('Branco ponta vermelha',          '#F5F5F5', '#C92A2A',  0),
  ('Vermelho',                       '#C92A2A', null::text, 1),
  ('Vermelho ponta azul-claro',      '#C92A2A', '#38BDF8',  2),
  ('Azul-claro',                     '#38BDF8', null::text, 3),
  ('Azul-claro ponta azul-escuro',   '#38BDF8', '#1D4ED8',  4),
  ('Azul-escuro',                    '#1D4ED8', null::text, 5),
  ('Azul-escuro ponta preta',        '#1D4ED8', '#111111',  6),
  ('Preto',                          '#111111', null::text, 7)
) as defaults(name, primary_color, secondary_color, sort_order)
where not exists (select 1 from public.graduations);
