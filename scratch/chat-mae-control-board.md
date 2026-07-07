# Chat-mae Controle de Cardapios

Atualizado em: 2026-07-07 BRT

## Missao

Preencher o app com restaurantes reais, dados confiaveis, cardapios estruturados, adicionais corretos e imagens boas.

O usuario nao precisa controlar detalhes tecnicos. O chat-mae decide a fila, audita o banco e so libera publicacao quando os dados salvos passam pelas travas.

## Estado Atual: Cabedelo/PB

Fonte autorizada: banco Supabase do projeto `gaawiewmlhorzbaixoqo`.

Resumo atual:

- Total Cabedelo/PB: 218 registros.
- Ativos nao deletados: 206.
- Prontos nao publicados: 3.
- Publicados: 0.
- Pendentes de IA: 203.
- Com Instagram salvo: 101.
- Com qualquer link/origem salvo: 69.
- Com fonte publica util de cardapio: 40.
- Com horario salvo: 171.
- Com texto quebrado/mojibake: 0.

Prontos atuais:

- Ilovepizzapb: `8322d0f6-8e08-4de7-a73f-d71c57f0291d`.
- Eu Quero Pizza: `8bae41e4-1365-4def-9857-34e4abdbf329`.
- I love burguer: `ecac91e3-52c0-4780-9867-6b3b1d096089`.

Ultima auditoria estrutural dos 3:

- Run: `scratch/restaurant-structural-ready-audit/2026-07-07T05-27-18-958Z/summary.json`.
- Resultado: `ready=3`, `blocked=0`, `issueCounts={}`.

## Nova Regra Principal

Print nao e mais auditoria obrigatoria de cardapio.

Fluxo correto:

1. Coletar fonte e salvar estrutura no banco.
2. Auditar semanticamente o banco.
3. Corrigir os erros estruturais.
4. So usar print/vision quando for imagem, galeria, cardapio visual em foto/PDF ou duvida que o banco nao resolve.

Comando padrao:

```powershell
npm run qa:structural -- --city=Cabedelo --state=PB
```

Para IDs especificos:

```powershell
npm run qa:structural -- --ids=ID1,ID2,ID3
```

## Travamento Obrigatorio Antes de Pronto p/App

Um restaurante so pode ficar pronto quando todos passarem:

- `menu_status = found`.
- `ai_validated = true`.
- Auditoria estrutural sem red findings.
- Cidade/estado corretos.
- Rua sem bairro/cidade/UF/CEP grudado.
- Bairro separado corretamente.
- Horario canonico salvo, vindo do Google ou da bio se o Google nao tiver.
- Cardapio com categorias e itens reais.
- Adicionais/opcoes corretos.
- Preco de adicional como diferenca quando for sabor/tamanho baseado em preco base.
- Sem ketchup, talheres, guardanapo, embalagem, sacola e descartaveis como adicionais publicos.
- Sem placeholder: "Sabor nao especificado", "Click aqui", "Descricao dos ingredientes...", etc.
- Sem texto quebrado/mojibake: exemplo bloqueado, `Pizzaria LitorÃ¢nea` em vez de `Pizzaria Litoranea/Litorânea`.
- Logo, capa e galeria com pelo menos 3 fotos.
- Galeria preferencialmente da API do Instagram/Apify ou Google fotos; nao usar crop ruim de screenshot.
- Nao usar iFood como fonte de cardapio.

## Ferramentas Por Papel

### 1. Chat-mae

Responsavel por:

- Decidir o proximo lote.
- Receber relatorios dos outros chats.
- Rodar auditoria estrutural no banco.
- Corrigir status.
- Bloquear publicacao quando houver erro.

Nunca delegar a decisao final de publicar.

### 2. Radar de fontes

Ferramentas: SerpApi, Firecrawl.

Responsavel por:

- Achar links de cardapio e Instagram em lote.
- Classificar fonte como verde, amarelo ou vermelho.
- Nao importar nada.

### 3. Coletor de cardapio

Ferramentas: APIs/adaptadores do projeto, Firecrawl quando for pagina publica, Browserbase/Chrome somente quando necessario.

Responsavel por:

- Extrair categorias, itens, precos, tamanhos, sabores, adicionais e combos.
- Salvar estrutura.
- Nao marcar pronto antes da auditoria estrutural.

### 4. Instagram / identidade

Ferramentas: Apify Instagram Profile Scraper, SerpApi, Chrome local apenas se indispensavel.

Responsavel por:

- Confirmar Instagram correto.
- Pegar bio, seguidores, telefone, horarios da bio, site/cardapio da bio.
- Enviar logo, capa e candidatos de galeria.

### 5. Midia / galeria

Ferramentas: Apify media original, Google fotos via SerpApi, OpenAI Vision em grade.

Responsavel por:

- Escolher 3 a 8 fotos boas.
- Rejeitar pessoas/rostos como foco, videos, posters, texto pesado, prints ruins, cardapio textual e logo-only.
- Preferir comida, fachada, ambiente ou produto bem fotografado.

### 6. QA estrutural

Ferramenta: `scratch/restaurant-ready-structural-auditor.mjs`.

Responsavel por:

- Ler o banco salvo.
- Detectar erro sem depender de print.
- Apontar codigos exatos de erro.
- Bloquear ou liberar para pronto.

## Proxima Melhor Acao

Cabedelo tem 69 registros com algum link de cardapio/origem e so 3 prontos. O caminho mais rapido agora e:

1. Priorizar os 37 restantes da fila publica ranqueada, comecando pelos 10 de maior score.
2. Processar em lotes pequenos de 10.
3. Para cada lote: coletar cardapio, enriquecer midia, rodar `qa:structural`.
4. Corrigir erros apontados.
5. So depois partir para os restaurantes sem link de cardapio.

Fila ranqueada atual:

- Arquivo: `scratch/chat-mae-batches/cabedelo-next-scored-menu-batch.json`.
- Total de candidatos com fonte publica util: 37.
- Proximo lote recomendado: os 10 primeiros do arquivo, pois a URL bate bem com o nome e nao tem risco imediato.
- Segurar fontes amarelas quando o slug do link nao bater com o nome do restaurante, mesmo se for AnotaAI/Yooga/CardapioWeb.

IDs do proximo lote recomendado:

```text
ec6b2565-934c-4278-9a8a-63168eb819f2
49423823-d994-4263-9597-cb829e208129
c23b0422-4e34-43be-b07e-6a494804f6fc
17c67464-7f14-4f6a-b07c-855f9c9a4593
4fa980c0-13d2-415f-97a6-e31fd3141133
1653a7ff-cb75-4303-b780-0580642c5974
eeb4213a-a5a1-4286-a33f-b6fea80cb891
2ed733a0-a4c7-4bb4-b280-21d7752c0409
3efd7101-b736-4135-9e5e-9787a854ec0e
69139ad6-c662-4fd6-b67f-aefef25c5923
```

## Como o Usuario Controla as Abas

Regra simples:

1. O usuario so cola o prompt que o chat-mae mandar.
2. O chat worker executa apenas aquele lote.
3. O chat worker devolve relatorio padrao.
4. O usuario cola o relatorio de volta no chat-mae.
5. O chat-mae decide o proximo passo.

Se algum chat improvisar, abrir coisa demais, tentar matar processo ou publicar sem ordem, mandar parar e relatar estado.

## Formato Obrigatorio de Relatorio

```text
Lote trabalhado:
Restaurantes processados:
Aprovados:
Amarelos/revisar:
Rejeitados:
Importados/salvos:
IDs afetados:
Auditoria estrutural:
Evidencias usadas:
Riscos encontrados:
Proxima recomendacao:
```

## Comandos Uteis

Status geral do chat-mae:

```powershell
npm run chat-mae:status -- --city=Cabedelo --state=PB
```

Auditar toda Cabedelo:

```powershell
npm run qa:structural -- --city=Cabedelo --state=PB
```

Auditar IDs:

```powershell
npm run qa:structural -- --ids=ID1,ID2,ID3
```

Radar de cardapio:

```powershell
node scratch\serpapi-menu-discovery.mjs --limit=20 --num=10 --mode=menu
```

Radar de Instagram:

```powershell
node scratch\serpapi-menu-discovery.mjs --limit=20 --num=10 --mode=instagram
```

Coleta estruturada:

```powershell
node scratch\structured-menu-collector.mjs --city=Cabedelo --limit=10 --apply
```

Enriquecer midia por Instagram/Apify:

```powershell
node scratch\apify-instagram-original-gallery-enricher.mjs --apply --candidate-limit=10 --results-limit=8
```

## Regra de Ouro

O banco e a verdade final. Se a tela parece bonita mas a estrutura do banco esta errada, esta errado. Se o banco passa na auditoria estrutural e a midia passa na curadoria, nao precisa gastar tempo com print de tela editar.
