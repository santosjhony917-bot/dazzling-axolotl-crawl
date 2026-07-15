# Prontidão dos consumidores públicos para as migrations 0063/0064

Data da auditoria: 2026-07-13. Escopo: frontend público/cliente, projeções do catálogo e RPCs. Nenhuma migration ou função foi aplicada remotamente.

## Decisão operacional

As migrations 0063 e 0064 devem ser promovidas juntas, primeiro em banco descartável. A 0063 fecha as tabelas-base com RLS; a 0064 fornece os contratos públicos que substituem as leituras diretas. Aplicar apenas a 0063 mantém os dados seguros, mas deixa consumidores sem dados até a 0064 existir.

O adaptador `src/integrations/supabase/publicCatalog.ts` tenta sempre o contrato novo. O caminho legado só é acionado quando o PostgREST informa que a view ou função ainda não existe (`PGRST202`, `PGRST205`, `42P01` ou `42883`, incluindo as mensagens equivalentes de schema cache). Não há fallback para erro de autorização, timeout, erro SQL, registro inelegível ou resultado vazio; esses casos precisam continuar visíveis como erro/ausência real.

## Matriz de consumidores

| Superfície | Contrato primário após 0064 | Compatibilidade pré-migration | Situação |
|---|---|---|---|
| Home/Search da IA | `search_public_catalog` e `get_public_catalog_coverage` | `search_menu_items` somente se a RPC nova não existir; critérios não provados permanecem parciais | pronto no código |
| Perfil público e cardápio completo | `public_catalog_restaurants`, `public_catalog_menu_sections`, `public_catalog_menu_categories`, `public_catalog_menu_entries`, opções e galeria públicas | tabelas-base com seleção mínima e gates antigos, somente se a projeção estiver ausente | refatorado |
| Detalhe de item | `public_catalog_menu_entries`, opções públicas e `public_catalog_restaurants` | item/categoria/base validados conservadoramente, somente se a projeção estiver ausente | refatorado |
| Galeria pública | `public_catalog_gallery` | valida primeiro o restaurante público e só então lê a galeria antiga | refatorado |
| Restaurantes próximos e resultados | `find_public_catalog_restaurants` | `find_nearby_restaurants` somente se a nova função não existir; IDs são revalidados antes do retorno | refatorado |
| Assistentes legados de combinação | RPC pública de proximidade + `public_catalog_menu_entries` | mesmos fallbacks estreitos do adaptador | refatorado, embora as rotas atuais apontem para a Home |
| Pratos em destaque/hook legado de busca | `search_public_catalog` | `search_menu_items` somente quando a função nova está ausente | refatorado |
| Favoritos | lê IDs em `user_favorites` e hidrata por `public_catalog_restaurants` | projeção antiga controlada pelo adaptador | refatorado |
| Happy Hour | busca/hidrata restaurantes por `public_catalog_restaurants`; a sala não faz mais join com `restaurants(*)` | projeção antiga controlada pelo adaptador | refatorado |
| Reivindicação de restaurante | não consulta mais `restaurants.claim_code` no navegador; a validação real fica na Edge Function autenticada `claim-restaurant` | nenhuma leitura pública do segredo | refatorado |
| Área do proprietário | tabelas-base sob políticas owner/admin da 0063 | não se aplica | acesso direto intencional |
| Administração/coleta | tabelas-base sob admin/service role | não se aplica | acesso direto intencional; exige teste de persona |

## Novos contratos públicos

- Views somente leitura: `public_catalog_restaurants`, `public_catalog_menu_items`, `public_catalog_menu_sections`, `public_catalog_menu_categories`, `public_catalog_menu_entries`, `public_catalog_menu_option_groups`, `public_catalog_menu_item_options` e `public_catalog_gallery`.
- RPCs públicas limitadas: `find_public_catalog_restaurants`, `search_public_catalog` e `get_public_catalog_coverage`.
- Todas as views limpam ACLs preservadas por `CREATE OR REPLACE` de `PUBLIC`, `anon`, `authenticated` e `service_role` antes de conceder apenas `SELECT`.
- As RPCs legadas `find_nearby_restaurants` e `search_menu_items` deixam de ser executáveis pelo navegador após a 0064 e permanecem disponíveis somente ao `service_role`.
- A distância usa Haversine, sem depender de o PostGIS estar instalado no schema `public`.

Itens ilustrativos podem ser usados na interface enquanto estiverem claramente rotulados e isolados do catálogo real. Eles continuam fora das projeções auditadas (`is_illustrative = false` é requisito de publicação); permitir uma ilustração visual não deve transformá-la em evidência de preço, cobertura ou disponibilidade.

## Evidência local

- `node scripts/validate-catalog-access-contract.mjs`: 86 verificações aprovadas.
- `npx tsc -p tsconfig.app.json --noEmit`: aprovado.
- `npm run build`: aprovado, 2.485 módulos transformados.
- ESLint focal: zero erros; restam quatro avisos preexistentes de dependências de hooks em Happy Hour/ComboFinder.

Os testes pgTAP em `supabase/tests/database/` foram preparados, mas não executados nesta máquina: Docker não está disponível e o histórico remoto usa versões que não correspondem ao diretório local. A validação estática não substitui execução PostgreSQL.

## Bloqueios antes de promoção

1. Criar branch/projeto Supabase descartável com snapshot de schema imediatamente anterior à 0063.
2. Reconciliar o histórico de migrations nesse ambiente; não usar `migration repair` no projeto de produção como atalho.
3. Aplicar 0063 e 0064 juntas e executar os dois testes pgTAP para `anon`, cliente, proprietário, admin e `service_role`.
4. Validar manualmente perfil público, detalhe de item, favoritos, Happy Hour e proximidade com um registro elegível e um inelegível.
5. Ensaiar rollback por feature flag/forward fix. Rollback nunca significa desabilitar RLS nem reabrir as RPCs legadas ao navegador.
6. Só então liberar canário. Até essa etapa, nenhuma escrita ou deployment remoto está autorizado por esta auditoria.
