# Scraper Scale Operating Model

Generated on 2026-07-07 from checkpoint branch `checkpoint/antes-limpeza-scraper-escala`.

## Current Diagnosis

- Repository: `C:\Users\meuno\Downloads\dazzling-axolotl-crawl-main\dazzling-axolotl-crawl-main`
- Git top-level: `C:/Users/meuno/Downloads/dazzling-axolotl-crawl-main/dazzling-axolotl-crawl-main`
- Current branch: `checkpoint/antes-limpeza-scraper-escala`
- Working tree: clean before worktree creation.
- Existing worktrees before this setup: only the main project worktree.
- Preserved checkpoint commits:
  - `22e0cc1e` app, CRM and visual updates
  - `1eb7c7fd` Chrome extension scraping helpers
  - `c252e8cc` Supabase CRM and launch migrations
  - `eb368d76` scraping and QA scripts
  - `cc877ace` scraping operation data and reports
  - `ac771bd9` cleanup ignore rules for scraper runs

## Created Worktrees

All worktrees were created under:

```powershell
C:\Users\meuno\Downloads\dazzling-axolotl-crawl-worktrees
```

Each worktree has a dedicated branch:

| Worktree | Branch | Responsibility |
|---|---|---|
| `wt-infra-fila` | `codex/wt-infra-fila` | Central queue, locks, attempts, priorities |
| `wt-google-dataforseo` | `codex/wt-google-dataforseo` | Google/DataForSEO phase 1 data |
| `wt-instagram-apify` | `codex/wt-instagram-apify` | Instagram validation and enrichment |
| `wt-fontes-cardapio` | `codex/wt-fontes-cardapio` | Menu source discovery and validation |
| `wt-extracao-cardapio-core` | `codex/wt-extracao-cardapio-core` | Structured menu contract and validation rules |
| `wt-extracao-anotaai` | `codex/wt-extracao-anotaai` | AnotaAI extraction |
| `wt-extracao-cardapioweb-yooga` | `codex/wt-extracao-cardapioweb-yooga` | CardapioWeb, Yooga, Goomer, Menudino |
| `wt-extracao-sites-pdf` | `codex/wt-extracao-sites-pdf` | Own sites, PDFs, images, public pages |
| `wt-fotos-media-qa` | `codex/wt-fotos-media-qa` | Logo, cover and gallery QA |
| `wt-auditoria-final` | `codex/wt-auditoria-final` | Final semantic audit and ready gate |
| `wt-admin-ui-review` | `codex/wt-admin-ui-review` | Admin/review UI only |
| `wt-integracao-git` | `codex/wt-integracao-git` | Merge, tests, conflict resolution |

## Exact Worktree Commands

```powershell
$base = 'checkpoint/antes-limpeza-scraper-escala'
$parent = 'C:\Users\meuno\Downloads\dazzling-axolotl-crawl-worktrees'
New-Item -ItemType Directory -Force -Path $parent | Out-Null

git worktree add -b codex/wt-infra-fila "$parent\wt-infra-fila" $base
git worktree add -b codex/wt-google-dataforseo "$parent\wt-google-dataforseo" $base
git worktree add -b codex/wt-instagram-apify "$parent\wt-instagram-apify" $base
git worktree add -b codex/wt-fontes-cardapio "$parent\wt-fontes-cardapio" $base
git worktree add -b codex/wt-extracao-cardapio-core "$parent\wt-extracao-cardapio-core" $base
git worktree add -b codex/wt-extracao-anotaai "$parent\wt-extracao-anotaai" $base
git worktree add -b codex/wt-extracao-cardapioweb-yooga "$parent\wt-extracao-cardapioweb-yooga" $base
git worktree add -b codex/wt-extracao-sites-pdf "$parent\wt-extracao-sites-pdf" $base
git worktree add -b codex/wt-fotos-media-qa "$parent\wt-fotos-media-qa" $base
git worktree add -b codex/wt-auditoria-final "$parent\wt-auditoria-final" $base
git worktree add -b codex/wt-admin-ui-review "$parent\wt-admin-ui-review" $base
git worktree add -b codex/wt-integracao-git "$parent\wt-integracao-git" $base
```

## Mother Chat Operating Rules

The mother chat is the director. It should not run heavy scraping, own broad code changes, or process restaurant batches directly.

The mother chat should:

- Maintain this operating model.
- Assign lots to leaders.
- Read leader reports.
- Decide blockers.
- Maintain priority by city, source type and readiness risk.
- Consolidate counts.
- Tell `wt-integracao-git` which branches are ready to integrate.

The mother chat should not:

- Mark restaurants ready.
- Extract menus.
- Collect media.
- Edit extractor logic except for small coordination docs.
- Consume queue items directly.

## Central Queue Model

Preferred Supabase table: `restaurant_operation_queue`.

```sql
create table if not exists public.restaurant_operation_queue (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  city text not null,
  state text,
  stage text not null check (stage in (
    'google_dataforseo',
    'instagram_apify',
    'fontes_cardapio',
    'extracao_anotaai',
    'extracao_cardapioweb_yooga',
    'extracao_sites_pdf',
    'fotos_media_qa',
    'auditoria_final'
  )),
  status text not null default 'pending' check (status in (
    'pending',
    'locked',
    'done',
    'blocked',
    'rejected',
    'error'
  )),
  priority integer not null default 100,
  locked_by text,
  locked_until timestamptz,
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  last_error text,
  last_report jsonb,
  source_ref text,
  raw_data jsonb,
  result_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index if not exists restaurant_operation_queue_pick_idx
  on public.restaurant_operation_queue (stage, status, priority, created_at);

create index if not exists restaurant_operation_queue_lock_idx
  on public.restaurant_operation_queue (locked_until)
  where status = 'locked';

create unique index if not exists restaurant_operation_queue_unique_open_stage
  on public.restaurant_operation_queue (restaurant_id, stage)
  where status in ('pending', 'locked', 'error', 'blocked');
```

Atomic item claim pattern:

```sql
with next_item as (
  select id
  from public.restaurant_operation_queue
  where stage = $1
    and (
      status = 'pending'
      or (status = 'locked' and locked_until < now())
      or (status = 'error' and attempt_count < max_attempts)
    )
  order by priority asc, created_at asc
  limit 1
  for update skip locked
)
update public.restaurant_operation_queue q
set
  status = 'locked',
  locked_by = $2,
  locked_until = now() + interval '20 minutes',
  attempt_count = attempt_count + 1,
  started_at = coalesce(started_at, now()),
  updated_at = now()
from next_item
where q.id = next_item.id
returning q.*;
```

Hard rule: no worker can mark `ready` directly. Only `wt-auditoria-final` may promote a restaurant to app-ready after all checks pass.

## Worker Report Template

Every leader report must use this shape:

```markdown
## Leader Report

- Lote trabalhado:
- Quantidade processada:
- Quantidade aprovada:
- Quantidade bloqueada:
- IDs afetados:
- Arquivos alterados:
- Scripts usados:
- Erros encontrados:
- Proximo lote recomendado:
- O que precisa do chat-mae:
```

## Quality Gates

Block when any of these is true:

- Menu source has no city/unit confirmation.
- iFood is the menu source.
- Add-on stores full item price instead of price delta.
- Operational groups such as ketchup, cutlery or napkin are treated as sellable options.
- Instruction/title/free observation becomes a sellable option.
- Gallery image has a person as the main subject.
- Poster, promo art or video enters the gallery.
- CEP, address, neighborhood or city is inconsistent.
- Hours are absent when a reliable source has hours.
- Instagram match is weak, homonymous or unsupported by phone/address/name.

## Exact Leader Prompts

Use each prompt in the corresponding worktree.

### wt-infra-fila

```text
Voce e o lider de infraestrutura de fila. Trabalhe somente no worktree wt-infra-fila. Sua missao e criar e manter a fila central local/Supabase para a operacao de restaurantes. Implemente status por restaurante, stage, locked_by, locked_until, attempt_count, last_error, prioridade, cidade, timestamps e relatorios. Nao faca coleta pesada, nao extraia cardapio e nao marque Pronto p/App. Entregue migracoes/scripts seguros, testes quando cabivel e relatorio no formato padrao.
```

### wt-google-dataforseo

```text
Voce e o lider Google/DataForSEO. Trabalhe somente no worktree wt-google-dataforseo. Substitua SerpApi por DataForSEO quando aplicavel e colete fase 1 do Google Maps: nome, endereco, numero, bairro, cidade, UF, CEP, telefone, reviews, rating, latitude, longitude, horario, place_id, maps_url, raw_data e fonte. Nao extraia cardapio e nao marque Pronto p/App. Consuma apenas itens da fila do seu stage e reporte no formato padrao.
```

### wt-instagram-apify

```text
Voce e o lider Instagram/Apify. Trabalhe somente no worktree wt-instagram-apify. Valide Instagram via Apify e Google, coletando bio, seguidores, telefone, horario na bio, link da bio, logo e posts. Corrija falsos negativos com evidencia. Nao extraia cardapio e nao marque Pronto p/App. Bloqueie homologos fracos e reporte no formato padrao.
```

### wt-fontes-cardapio

```text
Voce e o lider de fontes de cardapio. Trabalhe somente no worktree wt-fontes-cardapio. Encontre fontes de cardapio fora do iFood, valide que a fonte pertence ao restaurante correto e confirme cidade/unidade por nome, endereco, telefone ou Instagram. Classifique como verde, amarelo ou rejeitado. Envie verdes para extracao. Se nao houver fonte confiavel, bloqueie/rejeite conforme regra. Nao extraia cardapio.
```

### wt-extracao-cardapio-core

```text
Voce e o lider do contrato unico de cardapio estruturado. Trabalhe somente no worktree wt-extracao-cardapio-core. Defina categorias, itens, precos, descricoes, imagens, grupos, opcoes, min/max, obrigatorio/opcional e price_delta. Crie validacoes contra adicional com preco cheio, titulo como opcao, instrucao como opcao, ketchup/talher/guardanapo e observacao livre como adicional. Nao faca coleta operacional.
```

### wt-extracao-anotaai

```text
Voce e o lider de extracao AnotaAI. Trabalhe somente no worktree wt-extracao-anotaai. Extraia cardapios AnotaAI em alto volume respeitando adicionais, min/max, obrigatoriedade e price_delta. Gere relatorio por lote e evidencias. Nao cuide de fotos, nao valide Instagram e nao marque Pronto p/App.
```

### wt-extracao-cardapioweb-yooga

```text
Voce e o lider de extracao CardapioWeb/Yooga/Goomer/Menudino. Trabalhe somente no worktree wt-extracao-cardapioweb-yooga. Extraia cardapios dessas plataformas, valide unidades/fontes e nao invente adicionais quando a fonte nao tiver estrutura. Bloqueie fonte ambigua. Nao cuide de fotos e nao marque Pronto p/App.
```

### wt-extracao-sites-pdf

```text
Voce e o lider de extracao de site, PDF, imagem e pagina publica. Trabalhe somente no worktree wt-extracao-sites-pdf. Use OCR/OpenAI Vision quando necessario. Aprove somente quando a fonte confirmar restaurante, cidade e unidade. Preserve raw evidence. Nao cuide de fotos de galeria e nao marque Pronto p/App.
```

### wt-fotos-media-qa

```text
Voce e o lider de fotos e media QA. Trabalhe somente no worktree wt-fotos-media-qa. Colete logo, capa e 3-8 fotos boas usando Instagram/Google quando possivel. Rejeite pessoa como assunto principal, poster, video, arte promocional e imagem borrada/cortada ruim. Prefira comida real, fachada ou ambiente. Use grid + Vision para economizar tokens. Nao extraia cardapio e nao marque Pronto p/App.
```

### wt-auditoria-final

```text
Voce e o lider de auditoria final. Trabalhe somente no worktree wt-auditoria-final. Audite semanticamente pelo banco: endereco, CEP, telefone, horario, Instagram, seguidores, cardapio, adicionais e midia. Somente voce pode marcar Pronto p/App, e apenas quando tudo passar. Bloqueie fonte fraca, estrutura suspeita, media ruim ou inconsistencias.
```

### wt-admin-ui-review

```text
Voce e o lider de UI admin/review. Trabalhe somente no worktree wt-admin-ui-review. Melhore telas de revisao/admin quando necessario para acelerar decisao humana e auditoria. Nao faca coleta, nao mexa em extratores, nao altere fila exceto leitura/visualizacao.
```

### wt-integracao-git

```text
Voce e o lider de integracao Git. Trabalhe somente no worktree wt-integracao-git. Integre branches aprovadas, resolva conflitos, rode testes/builds, prepare commits e mantenha main estavel. Nao faca coleta operacional e nao altere regras de negocio sem decisao do chat-mae.
```

## Cabedelo First, Then Scale

Phase 0: freeze the checkpoint and use Cabedelo as the calibration city.

Phase 1: `wt-infra-fila` creates queue tables/scripts and seeds Cabedelo restaurants by stage.

Phase 2: run Google/DataForSEO and Instagram/Apify on Cabedelo until base profile quality is stable.

Phase 3: run menu source discovery. Only green sources move to extraction.

Phase 4: run extraction by platform:

- AnotaAI items to `wt-extracao-anotaai`
- CardapioWeb/Yooga/Goomer/Menudino items to `wt-extracao-cardapioweb-yooga`
- Sites/PDF/images to `wt-extracao-sites-pdf`

Phase 5: run media QA.

Phase 6: run final audit. Only final audit can mark ready.

Phase 7: after Cabedelo has stable pass/block metrics, clone the same queue process for the next city with city-specific priority and source rules.

## Anti-Overload Rules For Mother Chat

- Maximum one operational decision batch per leader report.
- Leaders must summarize counts and blockers; they must not paste raw dumps.
- Mother chat assigns lots by queue stage, not by individual restaurant unless there is a blocker.
- Integration happens only after a leader branch has a clean report and tests/build notes.
- Heavy artifacts stay in `scratch/` and should not be copied into chat unless summarized.
- Use `wt-integracao-git` for branch merges, never the mother chat directly.

## Immediate Next Action

Start with `wt-infra-fila`.

1. Open `C:\Users\meuno\Downloads\dazzling-axolotl-crawl-worktrees\wt-infra-fila`.
2. Implement the queue migration and claim/complete/block helper scripts.
3. Seed a small Cabedelo pilot batch.
4. Report back using the standard leader report.

