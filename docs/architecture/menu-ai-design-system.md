# Sistema de experiência — Home IA dos cardápios

Este documento é a fonte de verdade visual e comportamental da experiência de descoberta. Foi derivado do checklist `ui-ux-pro-max`; o gerador automatizado da skill não está presente nesta cópia do repositório.

## Princípios

- **IA-first e content-first:** localização, promessa, compositor e resposta ocupam a primeira dobra.
- **Confiança antes de encantamento:** fonte, preço e estado de cobertura têm prioridade sobre decoração.
- **Uma ação primária:** “Perguntar à IA”. Exploração, Happy Hour e categorias são secundários.
- **Uma sessão:** home, busca detalhada e apresentação expandida compartilham intenção, filtros e resultados.
- **Estados honestos:** carregando localização, localização ausente, verificando cobertura, sem cobertura, buscando, parcial, vazio, erro, offline e dado antigo possuem mensagens e recuperação próprias.
- **Landing como assinatura:** a landing é a fonte oficial da identidade visual da Home — coral/laranja expressivo, tipografia forte, grafismos circulares e contraste alto. A personagem pode aparecer de forma compacta no cabeçalho, onboarding e ajuda; ela não é obrigatória no hero funcional. A Home herda essa linguagem sem copiar a baixa densidade de uma página institucional.
- **Densidade de aplicativo:** cabeçalho utilitário, módulo funcional da IA e início do catálogo real precisam aparecer na primeira dobra; manifesto e explicação longa pertencem à landing ou ao tour.
- **Tecnologia percebida pelo comportamento:** estados de interpretação, consulta e verificação ficam visíveis. Gradiente, brilho ciano e superfícies em vidro representam a presença da IA, mas nunca substituem informação real.
- **Demonstração sem ambiguidade:** enquanto não houver cobertura publicada, itens ilustrativos podem provar a experiência apenas em desenvolvimento ou modo demo, sempre rotulados no bloco e no card e sem compartilhar o contrato de resultados reais.

## Base visual

- Manter os tokens semânticos existentes `--ff-primary`, `--ff-background`, `--ff-text-primary`, `--ff-border-soft` e `--ff-shadow-card`.
- Usar Poppins no corpo e Lobster apenas no wordmark; texto de formulário tem pelo menos 16 px no mobile.
- Ritmo de espaçamento de 4/8 px; raios, grafismos, contraste e sombras seguem a família usada na landing.
- Lucide é o conjunto único de ícones estruturais; emojis não funcionam como navegação ou controle.
- Movimento de 150–300 ms apenas quando explica mudança de estado; respeitar `prefers-reduced-motion`.
- O módulo principal da IA pode usar a superfície coral/laranja da landing, com texto branco e o compositor em superfície clara; feed e resultados continuam em branco ou `--ff-surface-warm` para legibilidade.
- O contraste tecnológico vem da combinação coral da landing + grafite `#211A1B` + acento ciano próximo de `#64EFE5`, presente também na personagem. Ciano é sinal de processamento/verificação; coral continua sendo marca e ação.
- O compositor AI-native usa borda gradiente sutil e mudança de estado. Durante processamento, o feedback assume shimmer/pulso reduzível, não um spinner isolado sem contexto.
- A personagem, quando usada, e os grafismos da landing identificam o recurso de IA, mas não podem cobrir campos, resultados ou ações. Sombras devem manter leitura de produto, não aparência publicitária.
- A tela `/restaurant-area-hub` permanece uma referência de acabamento para cartões e estados neutros, não de identidade nem de composição da Home.

## Acessibilidade e interação

- Contraste AA: 4,5:1 em texto normal e 3:1 em texto grande/elementos gráficos relevantes.
- Todo controle possui nome acessível, foco visível e alvo mínimo de 44×44 px.
- O compositor tem nome acessível inequívoco, helper text associado, erro junto ao campo e Enter/Shift+Enter previsíveis; no módulo compacto, o título visível pode exercer o papel contextual enquanto o `label` permanece disponível ao leitor de tela.
- Progresso e respostas usam regiões `aria-live`; foco vai para o título da resposta após conclusão.
- Cor nunca é o único sinal de erro, sucesso, aberto/fechado ou seleção.
- Zoom de 200%, teclado e leitor de tela não podem perder ações.

## Responsividade e desempenho

- Validar 320, 375, 390, 448, 768 e 1024 px, incluindo landscape.
- Não permitir rolagem horizontal da página; listas longas usam paginação ou virtualização.
- Reservar dimensões de mídia/skeleton para CLS menor que 0,1.
- Imagens abaixo da dobra usam lazy loading, dimensões declaradas e formato otimizado quando disponível.
- Conteúdo recebe padding para safe area e para a navegação fixa.

## Critérios de aceite visual

- Em teste de cinco segundos, pelo menos 80% descreve “IA que consulta cardápios disponíveis”.
- A primeira dobra contém uma única ação primária funcional.
- Nenhum botão sugere voz, localização ou resultado que não esteja implementado.
- Axe não encontra violações críticas/sérias no fluxo principal.
- LCP móvel p75 menor que 2,5 s, INP menor que 200 ms e nenhum conteúdo fica escondido pela bottom nav.
