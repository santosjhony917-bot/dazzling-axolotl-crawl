# Campina Grande - Estrategia sem WhatsApp

Atualizado em: 2026-07-06 14:25 BRT

## Estado atual

- Restaurantes ativos em Campina Grande/PB: 1.912.
- Restaurantes com cardapio ja importado no app: 31.
- Dados importados: 201 categorias, 1.490 itens, 10.310 opcoes/adicionais.
- Restaurantes com Instagram salvo: 984.
- Restaurantes sem Instagram salvo: 928.
- Restaurantes com fonte de cardapio nao-iFood salva: 228.
- Restaurantes com fonte salva mas ainda sem cardapio importado: 197.
- Restaurantes sem fonte de cardapio e sem cardapio importado: 1.684.

## Fila de coleta por fonte

Fila `needs_recollection` atual:

- Total em fila: 185.
- Verdes: 101.
- Amarelos: 82.
- Vermelhos: 2.

Plataformas principais na fila:

- CardapioWeb: 35 verdes.
- AnotaAI: 42 totais; 6 verdes e 36 amarelos por canonicalizacao/unidade.
- InstaDelivery: 16 verdes.
- OlaClick: 11 verdes.
- Saipos: 9 verdes.
- Brendi: 5 verdes.
- Menudino: 4 verdes.
- Diggy: 4 verdes.
- Meucarrinho: 3 verdes.
- Yooga/Goomer/Pedir/DeliveryMuch: pequenos lotes.
- Unknown/Cardapio generico: 31 unknown + 12 cardapio_other, precisam de triagem.

## Instagram

- 984 restaurantes tem Instagram salvo.
- Bio/menu dos Instagrams foi processado para 980 deles.
- Resultados da bio:
  - 221 acharam fonte de cardapio na bio.
  - 676 sem link publico de cardapio.
  - 52 so iFood.
  - 26 links invalidos corrigidos.
- Conclusao: bio pura ja deu o que tinha que dar; nao vale insistir amplo em destaque/OCR sem alvo.

## Prioridade por avaliacoes

Maior valor imediato:

1. Importar/validar as 197 fontes ja salvas, com foco nos 101 verdes.
2. Rodar SerpApi para os 1.684 sem fonte, priorizando restaurantes com 100+ avaliacoes.
3. Usar Firecrawl para confirmar links publicos achados.
4. Usar Chrome/extension so para amarelos, Instagram e validacao de unidade.
5. Usar OpenAI Vision apenas quando o cardapio estiver em imagem/PDF.

## Sem WhatsApp

WhatsApp fica pausado. Nao usar para pedir cardapio.

Motivo:

- Baixa taxa de captura.
- Risco de bloqueio.
- Custo operacional alto.
- Agora temos SerpApi + Firecrawl + OpenAI Vision, que reduzem a necessidade de contato direto.

## Proxima ordem operacional

### Fase 1 - Ganho rapido

Importar/coletar fontes ja conhecidas:

- CardapioWeb verdes primeiro.
- AnotaAI verdes e amarelos de alta avaliacao depois.
- InstaDelivery/OlaClick/Saipos/Brendi em lotes por plataforma.
- Segurar unknown e duplicidades para revisao.

### Fase 2 - Radar de fontes

Rodar SerpApi em lotes:

- Primeiro restaurantes sem fonte e com 500+ avaliacoes.
- Depois 100-499 avaliacoes.
- Depois 20-99.
- Nao gastar tempo em 0/sem review ate medir retorno.

### Fase 3 - Confirmacao

Para cada candidato:

- Link de plataforma estruturada: Firecrawl ou adaptador.
- Site publico: Firecrawl.
- Instagram: Chrome logado valida bio/destaques.
- Imagem/PDF: OpenAI Vision.

### Fase 4 - QA e importacao

Antes de importar:

- Confirmar cidade/unidade.
- Confirmar itens e precos.
- Preservar adicionais reais.
- Remover lixo operacional: ketchup/catchup, talheres, guardanapos, sacola, embalagem, descartaveis, CPF, troco.
- Rejeitar iFood.

