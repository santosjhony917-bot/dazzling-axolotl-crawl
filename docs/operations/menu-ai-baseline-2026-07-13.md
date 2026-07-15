# Baseline operacional — IA dos cardápios

**Snapshot remoto somente leitura:** `gaawiewmlhorzbaixoqo`  
**Congelado em:** 13/07/2026 21:09:39 UTC

Este baseline não deve ser recalculado retroativamente. Novas medições usam outro timestamp e preservam este denominador.

## Catálogo

| Indicador | Baseline |
|---|---:|
| Restaurantes totais | 9.016 |
| Ativos e não excluídos | 8.414 |
| Publicados | 0 |
| Ativos com ao menos um item ativo | 110 |
| `menu_status = found` | 31 |
| Itens ativos com preço | 5.026 |
| Opções pesquisáveis | 4.694 |
| Itens com componentes de combo estruturados | 375 |
| Itens com `serves_count` | 0 |

Como as RPCs públicas filtram `is_published = true`, a busca pública real retorna zero neste snapshot.

## Segurança

- 16 tabelas do schema exposto estavam com RLS desativado.
- `anon` e `authenticated` possuíam grants excessivos de mutação nas tabelas centrais auditadas.
- A página legal afirmava RLS robusto, sem correspondência com o estado remoto.
- Ativar RLS sem políticas previamente testadas pode interromper writers legítimos; a correção deve ser uma migration transacional testada e o rollback não pode reabrir o banco.

## Inverdades no runtime inicial

- `Home.tsx`: vitrines estáticas, notas derivadas de ID, horário presumido e botão de voz sem voz.
- `useNearbyRestaurants.ts`: erro e resultado vazio eram substituídos por restaurantes fictícios.
- `AiChatBalloon.tsx` e `ComboFinderPage.tsx`: coordenadas padrão e catálogo simulado.
- `comboParser.ts`: itens e bebidas inexistentes podiam ser introduzidos.
- `UserSearchLocationContext.tsx`: ausência/erro se convertia silenciosamente em Cabo Branco.
- `FeatureTour.tsx`: limite diário e desbloqueio por convite sem contrato equivalente no runtime.

## Linha de base de experiência

- A ação principal da home navegava para `/search`; a resposta da IA não permanecia na home.
- Home, busca e assistente tinham parsers e estados independentes.
- Erro, zero correspondência e ausência de cobertura não eram distinguíveis.
- Não existia suíte frontend formal cobrindo a jornada de descoberta.

## Regras de comparação

Cada execução futura registra, no mínimo: `trace_id`, timestamp, região, consulta anonimizada/hash, status final, origem factual, top 3, latência por componente, uso/custo de IA, erro, feedback e ação útil. Fixtures de demonstração ficam fora das métricas.

## Limite operacional do fallback de IA

O hardening local de `rewrite-search-query-ai` inclui validação e limites de
entrada/saída, CORS por allowlist, chave somente de servidor, modelo permitido,
JSON Schema, timeout, cache, rate limit, circuit breaker e logs sem consulta
bruta. O contrato do cliente permanece `{ expandedQueries, usedAI }` e falha do
provedor preserva as variantes determinísticas.

Cache, rate limit e circuit breaker são **por isolate da Edge Function**. Eles
reduzem custo e rajadas durante desenvolvimento/canário, mas não provam uma
quota global quando houver escala horizontal. Antes do piloto ampliado, a quota
e o cache precisam de armazenamento distribuído com TTL (RPC atômica ou serviço
dedicado), com teste concorrente e métrica de chamadas efetivamente bloqueadas.
Nenhuma infraestrutura distribuída nem configuração remota foi aplicada neste
baseline. Configuração e teste focal estão no README da própria função.
