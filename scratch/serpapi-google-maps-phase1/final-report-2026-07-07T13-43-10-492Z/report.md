# Relatorio final Fase 1 Cabedelo/PB

- Processados: 206
- Aprovados: 206
- Rejeitados: 0
- Pendentes: 127

## Cobertura
- google_maps_url: 206/206
- google_place_id: 206/206
- coordenadas: 206/206
- logradouro: 197/206
- numero: 119/206
- bairro: 206/206
- cidade_uf: 206/206
- cep: 203/206
- telefone: 155/206
- nota: 174/206
- avaliacoes: 174/206
- horario_funcionamento: 172/206

## Pendencias por tipo
- pendente_telefone_google: 51
- pendente_horario_google: 34
- pendente_numero_google: 87
- pendente_nota_google: 32
- pendente_avaliacoes_google: 32
- pendente_logradouro_google: 9
- pendente_cep: 3

## Principais erros
- 3 sem CEP no Google/SerpApi; marcados como pendente_cep.
- 34 sem tabela semanal de horario no Google/SerpApi.
- 51 sem telefone no Google/SerpApi.
- 87 sem numero no Google/SerpApi.
- 9 sem logradouro claro no Google/SerpApi; bairro mantido separado da cidade.
- 0 registros com bairro/cidade misturados apos correcao final.
