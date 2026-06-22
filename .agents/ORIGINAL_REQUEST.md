# Original User Request

## Initial Request — 2026-06-22T04:51:55Z

O objetivo é resolver o erro de comunicação (`The message port closed before a response was received`) e garantir que a coleta de cardápios (via Instagram e Linktree/Anota AI) funcione perfeitamente de ponta a ponta usando apenas a Extensão do Chrome, sem precisar de fallbacks.

Working directory: c:\Users\meuno\Downloads\dazzling-axolotl-crawl-main\dazzling-axolotl-crawl-main

## Requirements

### R1. Corrigir Comunicação da Extensão
O painel envia a ação `scrapeMenuFromInstagram` para a extensão, mas a porta fecha instantaneamente com o erro `The message port closed before a response was received`. O agente deve identificar e corrigir a causa raiz desse crash instantâneo no Service Worker da extensão.

### R2. Validar Extração de Cardápio
A extensão deve ser capaz de abrir a aba do Instagram, encontrar o Linktree, navegar até o Anota AI (ou site similar) e extrair o cardápio em formato rawText/JSON de forma autônoma.

### R3. Resiliência a Bloqueios (Tabs API)
A extensão precisa lidar corretamente com o erro `Tabs cannot be edited right now` (que ocorre quando o usuário arrasta abas do Chrome), garantindo que a extração não falhe miseravelmente caso o Chrome bloqueie a criação temporária de abas.

## Acceptance Criteria

### Verificação Objetiva
- [ ] O script de teste automatizado Puppeteer (`scratch/test_ext_communication.cjs`) deve enviar o ping e a ação de scrape sem receber erro de porta fechada.
- [ ] A extensão consegue extrair com sucesso um cardápio do Anota AI de forma invisível.
- [ ] O painel (`CityValidation.tsx`) não aciona o log de `Fallback: Buscando cardápio via API local (Puppeteer)...` ao processar um restaurante validado.

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
