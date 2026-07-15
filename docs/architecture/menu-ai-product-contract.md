# Contrato de produto — IA dos cardápios

**Status:** aprovado para implementação  
**Versão:** 1.0  
**Data:** 13/07/2026

## Proposta canônica

> Pergunte o que você quer comer. A IA consulta cardápios reais perto de você e mostra opções que cabem na sua intenção.

## Trabalho do produto

1. Interpretar prato, ingredientes, orçamento, quantidade de pessoas, ocasião, restrições e localização.
2. Consultar somente restaurantes e itens explicitamente publicados e elegíveis.
3. Mostrar preço, tipo de preço, fonte, frescor e motivo da correspondência sem gerar fatos.
4. Permitir refinar a intenção e abrir o cardápio ou canal oficial do restaurante.

## Cinco intenções prioritárias

- Encontrar um prato ou ingrediente.
- Respeitar orçamento total ou por pessoa.
- Montar opções para casal ou grupo.
- Aplicar exclusões e preferências alimentares sem prometer segurança clínica.
- Encontrar opções adequadas a uma ocasião e região.

## Invariantes

- O modelo pode interpretar ou reescrever uma consulta; nunca é fonte de restaurante, item, preço, avaliação, horário ou disponibilidade.
- Cada fato apresentado deve resolver para um ID publicado e uma fonte auditável.
- Erro, ausência de cobertura e zero correspondência são estados diferentes.
- Nenhuma fixture ou fallback de demonstração pode atravessar o build de produção sem flag e rótulo explícitos.
- “Todos os cardápios” só poderá ser usado com denominador externo auditável e cobertura mínima aprovada; a copy padrão evita absolutos.

## Fora do escopo

- Delivery, pagamento, reserva ou garantia de disponibilidade em tempo real.
- Avaliações ou economia inferidas.
- Garantia sobre alergênicos.
- Inferência de quantidade servida quando a fonte não informa.

## Métrica norte

`buscas com pelo menos uma opção útil e comprovável no top 3 / buscas avaliadas`

Meta de piloto: pelo menos 80%, com fabricação igual a zero e preço/tipo/fonte corretos em 100% dos cards auditados.

## Gate de comunicação

Landing, onboarding, tour, home, busca e navegação devem usar este contrato. Uma nova alegação só é publicada quando existe teste, fonte ou métrica que a sustente.

