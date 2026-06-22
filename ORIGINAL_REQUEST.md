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

## Follow-up — 2026-06-22T05:30:57Z

# Teamwork Project Prompt — Draft

> Status: Launched

O objetivo é corrigir a lógica de extração do link da bio do Instagram dentro da extensão do Chrome (`background.js`). Atualmente, o robô não está conseguindo encontrar o link do Linktree/Anota AI na nova estrutura de DOM do Instagram, resultando no erro "Nenhum link de cardápio encontrado na Bio do Instagram".

Working directory: c:\Users\meuno\Downloads\dazzling-axolotl-crawl-main\dazzling-axolotl-crawl-main

## Requirements

### R1. Corrigir Seletor de DOM do Instagram
A função `handleMenuScrapeFromInstagram` injeta um script na aba do Instagram para procurar tags `<a>`. No entanto, na nova interface do Instagram, o link da bio pode estar ofuscado, renderizado dentro de `span` simulando cliques, ou usando classes geradas (ex: `x1i10hfl`). O agente deve debugar a página de um Instagram real (ex: `https://www.instagram.com/alainesfiharia/`) e ajustar a varredura para extrair o URL corretamente, seja olhando o `href`, textos, atributos de navegação, ou até mesmo fazendo requisições alternativas.

### R2. Preservar Estabilidade
A lógica de `chrome.runtime.connect` e o polling de 15 tentativas (7.5s) não devem ser quebradas, pois já resolvem a queda de portas e o carregamento do React. A correção deve focar estritamente em **encontrar a URL correta na bio**.

## Acceptance Criteria

### Verificação Objetiva
- [ ] Um script em Node.js usando Puppeteer (modo não-headless ou com sessão simulada) deve acessar `https://www.instagram.com/alainesfiharia/` e ser capaz de imprimir a URL externa correta usando a MESMA lógica injetada que será colocada no `background.js`.
- [ ] O código final da extensão (pasta public e dist) não pode retornar o erro "Nenhum link de cardápio encontrado" ao inspecionar esse perfil específico.

## Follow-up — 2026-06-22T13:23:27Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Fix Instagram Gallery extraction via Chrome Extension with AI filtering

O sistema deve extrair as fotos do feed do Instagram do restaurante usando **exclusivamente a Extensão do Chrome**, e então usar Inteligência Artificial no backend para filtrar apenas as fotos boas (que contenham comida/pratos), descartando panfletos, textos ou pessoas.

Working directory: c:\Users\meuno\Downloads\dazzling-axolotl-crawl-main\dazzling-axolotl-crawl-main
Integrity mode: development

## Requirements

### R1. Coleta 100% via Extensão do Chrome (Sessão Logada)
A coleta das imagens do feed (posts quadrados) do Instagram deve ocorrer *apenas* via script injetado pela extensão do Chrome (`background.js`), para aproveitar o estado "logado" do usuário e contornar proteções anti-bot. Não tente usar puppeteer local ou requisições HTTP do servidor para o HTML do Instagram. A extensão deve pegar o Base64 ou a URL em alta resolução das primeiras N fotos.

### R2. Momento Correto do Fluxo
A coleta das fotos para a galeria só deve acontecer no painel de validação (`CityValidation.tsx`) **depois** que o link do Instagram for validado como pertencente ao restaurante (junto ou logo após o "Passo 4/5" de coleta de Logo).

### R3. Filtro de Qualidade via IA
Quando as imagens chegarem no painel, elas devem passar por um prompt de Visão da IA (Gemini/OpenAI) antes de serem adicionadas ao Supabase. 
Regras:
- OBRIGATÓRIO: A foto foca em comida/bebida/pratos reais.
- PROIBIDO: Fotos com pessoas, cadeiras vazias, fotos de cardápio impresso, banners promocionais ou memes.

## Acceptance Criteria

### 1. Robustez do Scraper e Triagem
- [ ] O script não sofre bloqueio do Instagram, pois roda dentro do DOM do usuário logado via extensão do Chrome.
- [ ] Um lote misto de imagens (ex: 2 de comida, 1 flyer de texto, 1 pessoa comendo) extraído da página resulta apenas no salvamento das 2 de comida na galeria final do sistema.
- [ ] O visual do modal de "Validação de Dados (QA)" exibe essas fotos limpas na seção "Galeria de Fotos" no final do processo de aprovação de um restaurante.

