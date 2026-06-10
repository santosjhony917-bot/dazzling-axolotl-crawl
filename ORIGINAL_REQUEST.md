# Original User Request

## Initial Request — 2026-06-06T21:06:50Z

O projeto consiste em um sistema de agentes autônomos trabalhando em equipe para auditar continuamente todas as telas do aplicativo GrubGo (incluindo a área do cliente, área do restaurante e painel administrativo). O objetivo é identificar desvios em relação ao tema oficial (Soft UI, cores Fire-Red #EF2A39, fonte Poppins, cantos arredondados de 20px, sombras de 6% e 12%) e aplicar correções incrementais e contínuas no código, garantindo que a compilação do sistema nunca seja corrompida.

Working directory: c:\Users\meuno\Downloads\dazzling-axolotl-crawl-main\dazzling-axolotl-crawl-main
Integrity mode: development

## Requirements

### R1. Auditoria Estética Incremental Multitela
Os agentes devem varrer todos os arquivos de páginas e componentes em `src/` de forma incremental e contínua. Devem identificar desvios do design system oficial do GrubGo:
- Sombras pesadas ou pretas duras.
- Fontes diferentes de Poppins (para textos gerais) ou Lobster (para logotipos).
- Cantos arredondados diferentes de `rounded-[20px]` / `rounded-xl` para cards padrão.
- Uso de cores vermelhas/laranjas fora da paleta Fire-Red (`#EF2A39` / HSL `357 86% 57%`).
Para cada desvio encontrado, os agentes devem aplicar correções diretamente no código.

### R2. Verificação de Compilação
Após qualquer alteração de estilo ou marcação, os agentes devem rodar o comando de build para garantir que nenhuma modificação quebrou a compilação do TypeScript ou do empacotador Vite.

## Acceptance Criteria

### Integridade do Build (Verificação Programática)
- [ ] O comando de compilação de produção `npm run build` é executado e finalizado com sucesso (retornando código 0 e sem erros de TypeScript).

### Coerência de Design System (Verificação por Auditor)
- [ ] Todos os cards e botões modificados utilizam sombras suaves Soft UI (`shadow-soft`, `shadow-float` ou sombras HSL com opacidade máxima de 12% para vermelho e 6% para preto/cinza).
- [ ] Elementos com imagens flutuantes modificados utilizam sombreamento sutil e difuso (ex: opacidade máxima de 8% de preto) em vez de manchas escuras duras.
- [ ] A tipografia padrão utilizada em todos os arquivos modificados é estritamente configurada como Poppins, e Lobster para logos corporativos.
