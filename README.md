# Daniel Muay Thai — Gestão

Aplicação mobile first para gestão da academia, construída com React, TypeScript, Vite e Supabase.

## Rodar localmente

1. Instale as dependências com `npm install`.
2. Copie `.env.example` para `.env.local`.
3. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores públicos do projeto Supabase.
4. Execute as migrations de `supabase/migrations` pelo Supabase CLI ou SQL Editor, respeitando a ordem dos nomes dos arquivos.
5. Rode `npm run dev`.

## Configuração segura do Supabase

1. Em Authentication, desative novos cadastros públicos.
2. Crie o usuário administrador manualmente com e-mail confirmado.
3. Copie o UUID criado em Authentication > Users.
4. No SQL Editor, execute:

```sql
insert into public.admin_profiles (user_id, display_name)
values ('UUID_DO_USUARIO', 'Administrador');
```

Depois de autorizar o usuário, execute `202611150002_students_and_graduations.sql` para ativar os módulos de alunos e Prajieds e, em seguida, `202611150003_default_graduations.sql` para carregar os Prajieds iniciais. A carga inicial só acontece se a tabela estiver vazia e pode ser editada pelo administrador.

Execute depois `202611150004_financial.sql` para ativar configurações financeiras, primeira mensalidade, geração automática, pagamentos e auditoria.

Se a carga inicial de Prajieds já tiver sido executada, aplique também `202611150005_remove_white_graduation.sql` para excluir o Prajied Branco sem ponta.

O dashboard, os relatórios por período e o lembrete de aniversários de hoje e dos próximos sete dias fazem parte da Etapa 4.

Nunca use a chave `service_role` no frontend. A aplicação utiliza apenas a chave anônima e RLS.

## GitHub Pages

Em Settings > Secrets and variables > Actions > Variables, configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Depois habilite GitHub Pages com source **GitHub Actions**. O workflow gera o `base path` automaticamente e usa `HashRouter` para evitar erros 404.

Essas duas configurações são obrigatórias: o workflow interrompe o deploy quando as variáveis públicas não estão presentes, evitando publicar uma aplicação desconectada do Supabase.

No Supabase, adicione a URL publicada e a variação terminada em `#/redefinir-senha` às Redirect URLs de Authentication.

## Marca

O ativo atual está em `public/branding/daniel-muay-thai.png`. Substitua esse arquivo pelo PNG oficial transparente, mantendo o mesmo nome, caso possua o original em alta resolução. Os ícones PWA devem então ser regenerados.

## Comandos

- `npm run dev`: desenvolvimento
- `npm test`: testes
- `npm run typecheck`: validação TypeScript
- `npm run build`: build de produção

## Testes do banco

Após aplicar todas as migrations, execute `supabase/tests/financial_and_rls.sql` no SQL Editor. O teste valida autorização, RLS, vencimentos 29/30/31, geração idempotente, períodos de inatividade e pagamentos antecipados. Todo o cenário roda em uma transação finalizada com `ROLLBACK`.
