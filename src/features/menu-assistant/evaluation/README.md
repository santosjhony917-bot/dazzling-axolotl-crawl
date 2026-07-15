# Avaliação dourada do parser de intenção

`golden-v1.json` é um conjunto offline, versionado e revisável de consultas em português brasileiro. Ele avalia apenas a interpretação da pergunta; não contém restaurantes, itens, preços de catálogo ou resultados sintéticos.

Execute:

```bash
npm run test:menu-intent-golden
```

O runner informa acurácia exata por campo e bloqueia regressões abaixo dos gates. Campos estruturados críticos usam meta mínima de 90%, conforme o plano do produto. Exclusões, restrições, quantidade de pessoas e preço máximo usam 95% porque um falso positivo nesses campos pode produzir uma recomendação incompatível ou enganosa. A busca lexical (`searchText` e `dishTerms`) permanece em 90%; recall de catálogo e ranking pertencem a outra avaliação, com itens reais e revisão humana.

Para alterar uma expectativa, atualize o caso e incremente `datasetVersion`. Um novo comportamento do parser deve entrar primeiro como caso de regressão em `parser.test.ts` e também aparecer no conjunto dourado quando representar linguagem de usuário real.
