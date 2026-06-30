# Rotina de Testes do Validar IA com Subagents

Objetivo: testar restaurantes reais de Campina Grande, um por vez, para aprender novos padroes de coleta sem publicar dados duvidosos.

## Regra Central

A Fase 1 entrega apenas o link do Google Maps. O teste do Validar IA deve partir somente do restaurante da fila e do `google_maps_url`.

Campos como `other_url`, `external_url`, `ifood_url`, `instagram`, logs antigos ou fontes ja gravadas no banco podem ser usados apenas para auditoria posterior. Eles nunca devem ser usados como atalho de entrada pelo executor.

## Papeis

### Coordenador

Responsavel por escolher o restaurante, abrir a rodada, manter a decisao conservadora e consolidar o relatorio final.

Pode:
- ler codigo, banco e logs;
- abrir subagents;
- consolidar regras novas;
- decidir se o proximo teste deve esperar correcao.

Nao pode:
- publicar automaticamente quando houver duvida;
- testar restaurantes em paralelo.

### Executor Chrome

Unico agente autorizado a controlar o Chrome e clicar em `Validar IA`.

Pode:
- abrir `/admin/login` e a tela de validacao;
- selecionar exatamente um restaurante;
- clicar em `Validar IA`;
- monitorar visualmente as abas abertas pela extensao;
- pausar se houver captcha, login, bloqueio, travamento ou ambiguidade.

Nao pode:
- publicar automaticamente;
- apagar dados sem ordem explicita;
- usar URL de cardapio ja salva como entrada;
- fechar abas de fonte original antes dos auditores registrarem evidencias.

### Auditor de Logs

Somente leitura. Acompanha o painel `bash / qa-logs`, `ai_log`, `menu_status_reason` e eventos relevantes da extensao.

Ferramentas uteis:
- `scratch/monitor_validar_ia_restaurant.cjs <restaurant_id> --once`
- painel de logs da tela `CityValidation.tsx`

### Auditor Supabase

Somente leitura. Confere dados salvos no banco depois da execucao.

Ferramentas uteis:
- `scratch/audit_validar_ia_restaurant.cjs <restaurant_id>`
- consultas read-only no Supabase

Verifica:
- status do restaurante;
- menu, categorias, itens, grupos e opcoes;
- galeria;
- contatos candidatos;
- Instagram e seguidores;
- fonte do cardapio;
- import runs e evidencias.

### Auditor Perfil Publico

Somente leitura. Abre o perfil publico e o cardapio completo apos a validacao, sem publicar.

Verifica:
- se o cardapio ficou legivel;
- se combos e itens configuraveis usam a mesma logica de escolhas;
- se os precos simulados fazem sentido;
- se categorias nao foram inventadas;
- se imagens estao bem proporcionadas;
- se galeria aparece com fotos boas;
- se textos nao cortam nomes importantes.

### Auditor Fonte Original

Somente leitura. Compara a fonte original encontrada pelo Validar IA com o resultado salvo.

Verifica:
- plataforma real;
- categorias originais;
- precos;
- obrigatorios x opcionais;
- combos;
- sabores de pizza inteira x meia pizza;
- imagens em maior resolucao disponivel;
- se houve perda ou invencao de itens.

## Sequencia de Uma Rodada

1. Coordenador escolhe um restaurante da fila de Campina Grande.
2. Auditor Supabase captura snapshot inicial.
3. Executor Chrome abre a tela de validacao e roda `Validar IA` somente nesse restaurante.
4. Auditor de Logs acompanha a execucao e marca travamentos, fallbacks e bloqueios.
5. Se o sistema encontrar fonte de cardapio, Auditor Fonte Original confere a fonte.
6. Auditor Supabase confere o que foi salvo.
7. Se estiver publicado ou pronto para app, Auditor Perfil Publico confere a UX.
8. Coordenador consolida o relatorio.
9. A decisao final deve ser uma das tres:
   - `pronto`;
   - `revisao humana`;
   - `rejeitado`.

## Bloqueios Obrigatorios

Marcar como revisao humana quando:
- fonte do cardapio nao for confirmada;
- cardapio nao tiver preco;
- cardapio estiver incompleto;
- plataforma exigir login, captcha ou bloqueio;
- Instagram correto for ambiguo;
- cidade/unidade da bio nao bater com o Maps;
- grupos obrigatorios e opcionais ficarem misturados;
- combo exigir escolhas mas for salvo como composicao fixa errada;
- imagens de galeria forem ruins, de pessoas, videos, mesas vazias/sujas, prints sem comida ou material irrelevante;
- houver duvida se a categoria foi inventada.

## Relatorio Por Restaurante

Use este modelo em cada rodada:

```md
# Relatorio Validar IA - <nome do restaurante>

Restaurante:
- ID:
- Cidade:
- Google Maps:
- Data/hora do teste:
- Executor Chrome:
- Auditores:

## 1. Fonte do cardapio encontrada
- Fonte:
- Plataforma:
- Caminho de descoberta: Maps -> Instagram -> bio/hub -> fonte
- Confirmacao de cidade/unidade:
- Evidencias:

## 2. Dados coletados
- Nome:
- Categoria:
- Endereco:
- Coordenadas:
- Horarios:
- Instagram:
- Seguidores:
- Telefone principal:
- Contatos candidatos:
- Galeria:
- Cardapio: categorias / itens / opcoes

## 3. Erros do scraper
- Erros:
- Onde aconteceu:
- Impacto:
- Reproducao:

## 4. Erros de UX no perfil publico
- Lista:
- Print/link:
- Severidade:

## 5. Erros de galeria
- Quantidade salva:
- Fontes usadas:
- Fotos rejeitadas:
- Problemas:

## 6. Erros de telefone/Instagram
- Instagram correto?
- Seguidores capturados?
- Telefone/WhatsApp capturado?
- Contato ficou principal ou candidato?

## 7. Regras novas aprendidas
- Regra:
- Onde implementar:
- Serve para outros restaurantes?

## 8. Necessidade de novo adaptador
- Sim/nao:
- Plataforma:
- Por que fallback nao basta:

## 9. Decisao
- Decisao: pronto | revisao humana | rejeitado
- Justificativa:
- Proximo passo:
```

## Primeira Fila Recomendada

Todos devem ser testados a partir do `google_maps_url`, sem usar URLs externas ja salvas como entrada.

1. `Brazile Pizzaria` (`bd43f394-ad2d-4f29-b212-0402923478d0`)
   - Motivo: tem indicio historico de `cardapioweb.com`, plataforma diferente do Anota AI.
   - Cuidado: iniciar somente pelo Maps; o Cardapio Web precisa ser redescoberto pelo fluxo.

2. `Sushi Lom` (`f931319f-a4d0-4760-b466-f4a9fa18494d`)
   - Motivo: categoria com alta chance de cardapio estruturado externo e variacoes.

3. `Mana Acai & Lanches` (`800812e9-25dc-41b4-ae48-ae91675e81d2`)
   - Motivo: acai/lanches costuma ter plataformas com adicionais e montaveis.

4. `Pizzaria dom roberto` (`67f5a816-00d7-48e9-8e88-7c7a8dd40fb2`)
   - Motivo: pizzaria ajuda a testar sabores inteiros/meia pizza, bordas e combos.

## Regras De Aprendizado Que Devem Ser Conferidas

- Galeria: priorizar Instagram feed e Google; aceitar ate 8 fotos boas; rejeitar videos, pessoas, mesas vazias/sujas e imagens irrelevantes; ambiente pode entrar se for boa foto do local.
- Cardapio: ordem de busca e Instagram bio/hub primeiro; depois destaques/feed; depois fotos de cardapio recentes do Google, ate 1 ano.
- Fotos de cardapio do Google nao sao galeria automaticamente.
- Fotos de galeria nao sao fonte de cardapio automaticamente.
- Itens opcionais operacionais, como descartavel, talher, guardanapo e embalagem, nao devem aparecer no app publico.
- Combos com escolhas devem usar a mesma estrutura visual e logica de soma dos itens configuraveis.
- Pizza meia/meia: opcoes com `1/2` representam meia pizza; opcoes sem `1/2` representam pizza inteira e nao devem combinar com outra meia como se fossem duas metades.
- Se uma escolha obrigatoria tiver menor opcao marcada por padrao, o total inicial deve refletir esse valor real.
