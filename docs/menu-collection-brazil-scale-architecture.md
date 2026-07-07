# FilterFood Menu Collection Architecture

## Objetivo

Coletar e importar cardapios de restaurantes em escala de cidade, depois Brasil, com maxima velocidade possivel sem perder confiabilidade:

- DOM/JSON/HTML primeiro.
- Print da extensao apenas como evidencia visual.
- Zero iFood.
- Uma fonte por restaurante, confirmada contra nome/cidade/unidade.
- Cardapio importado somente quando ha itens, precos e evidencia visual suficiente.
- Add-ons reais preservados; lixo operacional removido.

## Decisao Principal

Usar lanes independentes de Chrome, cada uma com:

- perfil proprio em `.tmp/chrome-lanes/<laneId>`;
- porta CDP propria;
- extensao carregada;
- login manual do usuario em Google e Instagram;
- fila de comandos isolada por `laneId`;
- pasta de evidencias/snapshots isolada por `laneId`.

Isso evita que dois chats usem a mesma aba, capturem print errado ou apaguem o resultado um do outro.

## Fluxo Operacional

1. Gerar fila central:
   ```powershell
   node scratch\menu-collection-queue-report.mjs
   ```

2. Abrir lanes de Chrome:
   ```powershell
   node scratch\launch-chrome-lane.cjs --lane=cardapioweb-1 --port=9331 --wait-logins
   node scratch\launch-chrome-lane.cjs --lane=anotaai-1 --port=9332 --wait-logins
   node scratch\launch-chrome-lane.cjs --lane=sites-1 --port=9333 --wait-logins
   ```

3. O usuario faz login no Google e Instagram em cada janela quando solicitado.

4. Distribuir lotes:
   ```powershell
   node scratch\menu-collection-orchestrator.mjs --lanes="cardapioweb-1:9331:cardapioweb;anotaai-1:9332:anota_ai;sites-1:9333:instadelivery|brendi|saipos|olaclick|goomer|livemenu|deliverydireto|menudino|diggy|meucarrinho|yooga|pedir" --limit-per-lane=12
   ```

5. Abrir um chat Codex por lane e colar o `prompt.md` gerado para aquela lane.

6. Cada worker executa o lote com:
   ```powershell
   node scratch\collect-menu-with-extension-verification.mjs --ids-file="<ids.txt>" --lane=<laneId> --limit=<N> --apply
   ```

7. O chat-mae acompanha:
   - `scratch/menu-orchestrator/runs/<runId>/manifest.json`;
   - `scratch/menu-orchestrator/leases.json`;
   - summaries em `scratch/menu-extraction-verification/<runId>/summary.json`;
   - filas amarelas/vermelhas geradas por cada worker.

## Regras de Importacao

Importar automaticamente apenas quando:

- fonte nao e iFood;
- cidade/unidade confere;
- ha categorias, itens e precos;
- evidencia visual mostra itens e precos, nao so topo/banner;
- parser nao detecta bloqueio por login/captcha/shell;
- dry-run nao acusa flags bloqueantes;
- opcoes operacionais foram removidas;
- adicionais reais continuam presentes.

Enviar para revisao quando:

- plataforma e dificil ou desconhecida;
- a fonte tem varias unidades;
- print so mostra topo;
- ha adicionais suspeitos;
- ha cardapio por imagem/PDF sem estrutura clara;
- fonte abre mas nao prova cidade/unidade.

Rejeitar quando:

- iFood;
- cidade errada;
- restaurante fechado/inexistente;
- cardapio sem preco;
- link quebrado;
- pagina exige login;
- fonte nao e cardapio;
- evidencia visual insuficiente apos retry.

## Modelo de Lanes

Sugestao para maquina local:

| Lane | Porta | Foco | Uso |
| --- | ---: | --- | --- |
| `cardapioweb-1` | 9331 | CardapioWeb | alta taxa de sucesso |
| `anotaai-1` | 9332 | AnotaAI | JSON/API rapido |
| `sites-1` | 9333 | sites estruturados | Goomer, OlaClick, Saipos, etc. |
| `hard-1` | 9334 | fontes dificeis | imagem, PDF, multiunidade |
| `qa-1` | 9335 | auditoria | revisar amarelos/vermelhos |

Comecar com 2 a 3 lanes. Subir para 5 lanes apenas se CPU/memoria e estabilidade do Chrome ficarem ok.

## Metricas

Medir por hora:

- restaurantes processados;
- importados;
- amarelos;
- vermelhos;
- erros tecnicos;
- tempo medio por plataforma;
- taxa de sucesso por reviews_count;
- taxa de sucesso por plataforma;
- taxa de sucesso por origem: Instagram, Google, Linktree, site proprio, WhatsApp.

No final da cidade, gerar analise 80/20:

- quais plataformas renderam mais menus por minuto;
- qual faixa de reviews no Google valeu a pena;
- quantos restaurantes com zero reviews deram cardapio;
- quais categorias geraram perda de tempo;
- quais fontes devem ser puladas automaticamente na proxima cidade.

## Escala Brasil

Para escala Brasil, evoluir em camadas:

1. **Agora/local**: lanes locais + leases locais + chats humanos supervisionados.
2. **Proxima etapa**: leases no Supabase com `claimed_by`, `claimed_at`, `expires_at`, `collection_status`.
3. **Operacao regional**: workers por cidade/estado, metricas por plataforma.
4. **Automacao robusta**: filas persistentes, retries, dashboard, auditoria amostral.
5. **Produto nacional**: playbooks por plataforma e ranking dinamico de fontes por ROI.

## Prompts de Chat

Cada worker deve receber apenas:

- laneId/porta;
- arquivo `ids.txt`;
- regras obrigatorias;
- comando pronto;
- pedido de relatorio final.

O chat-mae nao coleta em paralelo com workers. Ele:

- cria lotes;
- monitora progresso;
- analisa erros;
- atualiza regras;
- decide quando aumentar/reduzir lanes;
- consolida estatisticas.
