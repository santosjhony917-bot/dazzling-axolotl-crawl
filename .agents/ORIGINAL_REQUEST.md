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
