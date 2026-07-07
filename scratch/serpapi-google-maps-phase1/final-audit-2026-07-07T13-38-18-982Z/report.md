# Relatorio Fase 1 Cabedelo/PB

- Run: 2026-07-07T13-38-18-982Z
- Modo apply: nao
- SerpApi details: nao

## Resumo

- Processados: 206
- Aprovados: 206
- Rejeitados: 
- Pendentes: 125
- Atualizacoes aplicadas: 0

## Cobertura final

- google_maps_url: 206/206
- google_place_id: 206/206
- coordenadas: 206/206
- endereco: 206/206
- numero: 121/206
- bairro: 190/206
- cidade_uf: 206/206
- cep: 203/206
- telefone: 155/206
- whatsapp_url: 154/206
- nota: 174/206
- avaliacoes: 174/206
- horario_funcionamento: 172/206

## Pendencias por tipo

- pendente_telefone_google: 51
- pendente_nota_google: 32
- pendente_avaliacoes_google: 32
- pendente_numero_google: 85
- pendente_horario_google: 34
- pendente_cep: 3

## Principais erros encontrados

- 3 aprovados sem CEP no Google/SerpApi; marcados como pendente_cep em coleta_logs.
- 34 aprovados sem tabela semanal de horario no Google/SerpApi; nao foi inventado horario.
- 51 aprovados sem telefone no Google/SerpApi.
- 32 aprovados sem nota/avaliacoes no Google/SerpApi.
- 0 rejeicoes nesta auditoria final; os checks anteriores de fechado e nao-restaurante tambem retornaram zero suspeitos ativos.
