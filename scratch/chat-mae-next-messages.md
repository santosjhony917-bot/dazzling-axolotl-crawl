# Proximas Mensagens para os Chats

Use este arquivo como painel simples. Voce copia a mensagem do bloco correto e cola no chat indicado.

Atualizado em: 2026-07-07 BRT

## O que fazer agora

1. Objetivo atual: Cabedelo/PB.
2. Nao voltar para Campina Grande agora.
3. Nao usar print como auditoria obrigatoria de cardapio.
4. Todo lote que salvar no banco precisa rodar auditoria estrutural.
5. Nao publicar nada sem ordem do chat-mae.
6. Prioridade: restaurantes de Cabedelo que ja tem link de cardapio/origem salvo.

## Mensagem para qualquer chat antes de comecar

```text
Ordem do chat-mae:

Voce so deve trabalhar o lote e as regras abaixo. Nao publique, nao delete, nao altere outros registros e nao improvise nova estrategia.

Regra principal:
Depois de qualquer coleta salva no banco, rode ou solicite auditoria estrutural. Print nao e obrigatorio para auditar cardapio; a estrutura salva no banco e a fonte principal de verdade. Use imagem/vision apenas para galeria, cardapio em foto/PDF ou duvida que o banco nao resolve.

Relatorio obrigatorio ao final:
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

## Chat Radar SerpApi / Firecrawl

Use quando precisar descobrir fontes antes de coletar.

```text
Ordem do chat-mae:

Voce e o Radar de Fontes para Cabedelo/PB.
Sua tarefa e achar links de cardapio e Instagram rapidamente, sem importar nada.

Regras:
1. Nao exponha chave de API.
2. Nao importe no banco.
3. Nao use iFood como fonte de cardapio.
4. Verde: plataforma estruturada nao-iFood com cidade/unidade coerente.
5. Amarelo: Instagram, linkhub, post/reel, site ambiguo ou fonte sem cidade clara.
6. Vermelho: outra cidade, outra unidade, iFood, pagina fora do ar, fonte generica, resultado de busca sem cardapio.

Foque em Cabedelo/PB.

Comando sugerido:
node scratch\serpapi-menu-discovery.mjs --limit=20 --num=10 --mode=menu

Depois leia o summary/candidates gerado e entregue:
Lote trabalhado:
Restaurantes processados:
Verdes por plataforma:
Amarelos por plataforma:
Vermelhos/sem fonte:
Top 10 verdes com ID, nome, plataforma e link:
Top 10 amarelos com motivo:
Arquivos gerados:
Riscos encontrados:
Proxima recomendacao:
```

## Chat Coletor de Cardapio

Use para coletar cardapio de links ja salvos ou verdes.

### Proximo lote recomendado Cabedelo

```text
Ordem do chat-mae:

Voce e o Coletor de Cardapio de Cabedelo/PB.
Trabalhe somente estes 10 IDs, nesta ordem:

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

Fonte da fila:
scratch/chat-mae-batches/cabedelo-next-scored-menu-batch.json

Regras:
1. Nao usar iFood.
2. Antes de importar, confirme que o cardapio pertence ao mesmo restaurante/unidade de Cabedelo/PB.
3. Se o link abrir outro restaurante ou outra cidade, rejeite esse ID e explique.
4. Extraia categorias, itens, precos, tamanhos, sabores, bordas, adicionais e combos.
5. Adicional deve ser diferenca de preco quando o item tem preco base.
6. Nao salvar ketchup, talheres, guardanapo, embalagem, sacola, descartaveis, CPF ou troco como adicional publico.
7. Nao salvar texto de interface como item/opcao: "Click aqui", "Sabor nao especificado", "Descricao dos ingredientes...", etc.
8. Nao marcar pronto antes da auditoria estrutural do banco.

Depois de salvar qualquer ID, rode:
npm run qa:structural -- --ids=ec6b2565-934c-4278-9a8a-63168eb819f2,49423823-d994-4263-9597-cb829e208129,c23b0422-4e34-43be-b07e-6a494804f6fc,17c67464-7f14-4f6a-b07c-855f9c9a4593,4fa980c0-13d2-415f-97a6-e31fd3141133,1653a7ff-cb75-4303-b780-0580642c5974,eeb4213a-a5a1-4286-a33f-b6fea80cb891,2ed733a0-a4c7-4bb4-b280-21d7752c0409,3efd7101-b736-4135-9e5e-9787a854ec0e,69139ad6-c662-4fd6-b67f-aefef25c5923

Relatorio final:
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

```text
Ordem do chat-mae:

Voce e o Coletor de Cardapio de Cabedelo/PB.
Trabalhe somente os IDs que o chat-mae mandar. Se nenhum ID foi mandado, pare e peca IDs.

Regras de coleta:
1. Nao usar iFood.
2. Extrair categorias, itens, precos, tamanhos, sabores, bordas, adicionais e combos.
3. Adicional deve ser diferenca de preco quando o item tem preco base.
4. Nao salvar ketchup, talheres, guardanapo, embalagem, sacola, descartaveis, CPF ou troco como adicional publico.
5. Nao salvar texto de interface como item/opcao: "Click aqui", "Sabor nao especificado", "Descricao dos ingredientes...", etc.
6. Nao marcar pronto antes da auditoria estrutural do banco.
7. Se a fonte tiver endereco/cidade, confirme Cabedelo/PB. Se nao tiver, use Google/Instagram ja salvos para validar.

Comando de auditoria apos salvar:
npm run qa:structural -- --ids=COLE_IDS_AQUI

Relatorio final:
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

## Chat Instagram / Identidade

Use para confirmar Instagram, bio, seguidores, telefone, horario e links.

```text
Ordem do chat-mae:

Voce e o Instagram/Identidade de Cabedelo/PB.
Use Apify/SerpApi primeiro. Chrome local/Browserbase so se o chat-mae mandar.

Regras:
1. Confirmar se o perfil pertence ao restaurante correto de Cabedelo/PB.
2. Coletar Instagram URL, seguidores, nome, bio, telefone, horario na bio e link da bio.
3. Se o Google nao tem horario e a bio tem, extraia em formato interpretavel para o app.
4. Nao buscar cardapio no Instagram sem sinal claro: cardapio, menu, pedido, delivery, link da bio ou destaque permitido.
5. Nao importar cardapio por foto sem passar pelo fluxo de OCR/QA.

Relatorio final:
Lote trabalhado:
Restaurantes processados:
Instagram encontrados:
Instagram rejeitados:
Telefones/horarios extraidos:
Links de cardapio candidatos:
IDs afetados:
Evidencias usadas:
Riscos encontrados:
Proxima recomendacao:
```

## Chat Midia / Galeria

Use para logo, capa e fotos publicaveis.

```text
Ordem do chat-mae:

Voce e o Curador de Midia de Cabedelo/PB.
Sua tarefa e preencher logo, capa e galeria com qualidade.

Regras:
1. Preferir imagens originais da API do Instagram/Apify.
2. Usar Google fotos via SerpApi como fallback.
3. Nao usar video/reel como foto.
4. Nao usar pessoas/rostos como foco.
5. Nao usar poster, cardapio textual, print ruim, foto borrada, logo-only na galeria.
6. Galeria ideal: 3 a 8 fotos boas.
7. Para economizar OpenAI Vision, crie grid numerada e peca uma unica avaliacao por restaurante.

Comando sugerido:
node scratch\apify-instagram-original-gallery-enricher.mjs --apply --candidate-limit=10 --results-limit=8

Depois rode auditoria estrutural dos IDs alterados:
npm run qa:structural -- --ids=COLE_IDS_AQUI

Relatorio final:
Lote trabalhado:
Restaurantes processados:
Logos/capas salvas:
Galerias salvas:
Rejeicoes de imagem:
IDs afetados:
Auditoria estrutural:
Evidencias usadas:
Riscos encontrados:
Proxima recomendacao:
```

## Chat QA Estrutural

Use quando quiser auditar o que ficou salvo no banco.

```text
Ordem do chat-mae:

Voce e o QA Estrutural.
Nao olhe print primeiro. Audite o banco.

Rode:
npm run qa:structural -- --ids=COLE_IDS_AQUI

Se for cidade inteira:
npm run qa:structural -- --city=Cabedelo --state=PB

Procure principalmente:
- endereco quebrado;
- bairro errado;
- horario ausente ou nao canonico;
- falta de logo/capa/galeria;
- cardapio sem categorias/itens;
- ketchup/talheres/guardanapos/embalagem como adicionais;
- "Sabor nao especificado";
- "Click aqui" como item;
- adicional com preco cheio em vez de diferenca;
- texto quebrado/mojibake em nome, endereco, categoria, item ou adicional;
- fonte iFood.

Relatorio final:
Lote trabalhado:
Restaurantes auditados:
Ready:
Needs review:
Blocked:
Principais issue codes:
IDs bloqueados:
Arquivo summary.json:
Proxima recomendacao:
```

## Mensagem para chat perdido ou confuso

```text
Voce esta sob controle do chat-mae.
Pare novas coletas agora.
Nao publique, nao delete e nao importe nada.

Responda somente:
1. Voce esta rodando algum comando agora?
2. Qual lote/IDs estava processando?
3. Houve alteracao no banco?
4. Qual pasta de evidencia foi gerada?
5. Qual erro ou risco apareceu?
```
