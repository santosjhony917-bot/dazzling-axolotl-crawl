# `rewrite-search-query-ai`

Fallback controlado de recuperação para a busca de cardápios. A função apenas
reescreve termos; ela não devolve restaurantes, itens, preços ou disponibilidade.
Falha, timeout, indisponibilidade do provedor e circuito aberto mantêm as
variantes determinísticas no contrato `{ expandedQueries, usedAI }`.

## Configuração

- `OPENAI_API_KEY` — chave somente do servidor. Não há fallback para variáveis
  `VITE_*`.
- `SEARCH_REWRITE_ALLOWED_ORIGINS` — origens adicionais, separadas por vírgula.
  Em produção, declare explicitamente cada host do aplicativo.
- `SEARCH_REWRITE_ALLOWED_MODELS` — allowlist separada por vírgula. Padrão:
  `gpt-4o-mini`.
- `SEARCH_REWRITE_MODEL` — modelo escolhido; se não pertencer à allowlist, a
  primeira opção permitida é usada.
- `SEARCH_REWRITE_TIMEOUT_MS` — `1000..5000`; padrão `4000`.
- `SEARCH_REWRITE_RATE_LIMIT_PER_MINUTE` — `1..60`; padrão `20`.
- `SEARCH_REWRITE_CACHE_TTL_SECONDS` — `0..3600`; padrão `600`.
- `SEARCH_REWRITE_CACHE_MAX_ENTRIES` — `10..1000`; padrão `200`.
- `SEARCH_REWRITE_CIRCUIT_OPEN_SECONDS` — `5..300`; padrão `30`.

Limites fixos: corpo de 8 KiB, consulta bruta de 240 caracteres, consulta de
banco/variante de 120 caracteres, no máximo cinco fallbacks e cinco variantes
de saída. O prompt está fixado como `menu-rewrite-v1`.

## Privacidade e observabilidade

E-mail, URL e padrões de telefone são removidos antes do provedor. Logs são
estruturados e contêm apenas `trace_id`, motivo, latência, contagens, modelo,
versão e uso agregado de tokens — nunca consulta ou variantes.

Cache, rate limit e circuit breaker são limitados ao isolate da Edge Function.
Isso protege o piloto e evita rajadas locais, mas não substitui quota/cache
distribuídos para escala horizontal. Antes do piloto ampliado, usar uma RPC
atômica ou serviço distribuído com TTL.

## Teste focal local

```powershell
node --experimental-strip-types --test scratch/rewrite-search-query-ai.test.mjs
```

O teste transpila a função, executa o handler com runtime simulado e cobre CORS,
validação, contrato, allowlist de modelo, cache, rate limit e circuit breaker sem
chamar o provedor real.
