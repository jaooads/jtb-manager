# Daniel Muay Thai — Gestão

Aplicação mobile first para gestão da academia, construída com React, TypeScript, Vite e Supabase.

## Rodar localmente

1. Instale as dependências com `npm install`.
2. Copie `.env.example` para `.env.local`.
3. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores públicos do projeto Supabase.
4. Execute a migration de `supabase/migrations` pelo Supabase CLI ou SQL Editor.
5. Rode `npm run dev`.

## Configuração segura do Supabase

1. Em Authentication, desative novos cadastros públicos.
2. Crie a usuária Dani manualmente com e-mail confirmado.
3. Copie o UUID criado em Authentication > Users.
4. No SQL Editor, execute:

```sql
insert into public.admin_profiles (user_id, display_name)
values ('UUID_DA_USUARIA', 'Dani');
```

Nunca use a chave `service_role` no frontend. A aplicação utiliza apenas a chave anônima e RLS.

## GitHub Pages

Em Settings > Secrets and variables > Actions > Variables, configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Depois habilite GitHub Pages com source **GitHub Actions**. O workflow gera o `base path` automaticamente e usa `HashRouter` para evitar erros 404.

No Supabase, adicione a URL publicada e a variação terminada em `#/redefinir-senha` às Redirect URLs de Authentication.

## Marca

O ativo atual está em `public/branding/daniel-muay-thai.png`. Substitua esse arquivo pelo PNG oficial transparente, mantendo o mesmo nome, caso possua o original em alta resolução. Os ícones PWA devem então ser regenerados.

## Comandos

- `npm run dev`: desenvolvimento
- `npm test`: testes
- `npm run typecheck`: validação TypeScript
- `npm run build`: build de produção
