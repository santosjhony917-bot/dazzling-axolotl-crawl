# FilterFood - Objetivos, Visão e Funcionalidades do Aplicativo

Este documento consolida a visão estratégica, os objetivos de negócio e o levantamento completo das funcionalidades do aplicativo **FilterFood**, estruturado por perfis de usuários e diferenciais competitivos.

---

## 1. Visão Geral e Proposta de Valor

O **FilterFood** é uma plataforma inteligente de curadoria e busca gastronômica focada em resolver dois problemas clássicos no mercado de alimentação:
1. **Decisão e Orçamento:** O cliente final quer encontrar a comida certa pelo preço exato que cabe no seu bolso, sem ter que vasculhar dezenas de cardápios em PDF ou links de redes sociais.
2. **Socialização:** Grupos de amigos gastam muito tempo decidindo coletivamente para onde ir no happy hour devido a gostos conflitantes.

### Proposta de Valor para o Usuário
* **Transparência de Preços:** Acesso ao cardápio completo, preços reais e faixa de gastos antes de sair de casa.
* **Economia de Tempo e Dinheiro:** Localização rápida de pratos individuais com base no orçamento disponível.
* **Democracia Social:** Decisão de locais facilitada por votação interativa em salas de grupo.

### Proposta de Valor para os Restaurantes
* **Visibilidade Orgânica:** Canal direto para atrair clientes locais que buscam especificamente seus pratos ou categorias.
* **Gestão Sem Complicação:** Painel simples para atualizar dados básicos, cardápios e galeria de fotos em tempo real.
* **Inteligência de Dados (Métricas):** Entendimento de quantas pessoas visualizaram o perfil, ligaram ou traçaram rotas.

---

## 2. Objetivos Principais do Projeto

1. **Facilitar a Descoberta Local:** Conectar clientes a restaurantes e lanchonetes de bairro de forma inteligente, reduzindo o atrito de busca.
2. **Mapeamento Rápido de Cidades (Crowdsourcing):** Popular o banco de dados do sistema em novas regiões de forma rápida e barata usando freelancers (mapeadores).
3. **Decisão de Happy Hour Simplificada:** Criar uma experiência social integrada de votação que elimine a indecisão do grupo.
4. **Foco no Orçamento do Usuário (Combo Finder):** Oferecer sugestões precisas de pratos e combinações com base em um valor máximo informado pelo cliente.
5. **Conversão de Parceiros Independentes:** Criar um fluxo simplificado de atração e reivindicação de perfil para estabelecimentos que já estão na base de dados passarem a gerenciar suas informações.

---

## 3. Funcionalidades Detalhadas por Perfil de Usuário

### 3.1. Funcionalidades do Cliente (Customer)

* **Busca Unificada e Avançada:**
  * Pesquisa por texto (nome de prato, ingrediente ou restaurante).
  * Filtros por distância geolocalizada (GPS).
  * Filtros por faixa de preço e nota média de avaliação.
  * Navegação rápida por categorias de cozinha (ex: Pizza, Japonês, Saudável).
* **Combo Finder (Assistente de Orçamento):**
  * Input simples de valor máximo disponível (ex: "Quero gastar até R$ 35,00").
  * Sugestões de pratos individuais que caibam no limite estipulado, considerando distância e tipo de culinária.
* **Happy Hour Hub (Módulo Social):**
  * Criação de salas de evento com nome, data e local propostos.
  * Compartilhamento de links diretos de convite via WhatsApp.
  * Sistema de votação dinâmica em tempo real para os membros escolherem o melhor restaurante da lista sugerida.
  * Chat em grupo ou feed de atividades interno na sala de Happy Hour.
* **Favoritos e Recomendações:**
  * Lista rápida de estabelecimentos e pratos marcados com coração para acesso ágil.
  * Histórico de buscas para otimização de sugestões.
* **Gestão de Perfil e Amigos:**
  * Controle de dados cadastrais, e-mail e redefinição de senha.
  * Pesquisa de novos utilizadores pelo e-mail e envio de solicitações de amizade para compartilhar eventos.

### 3.2. Funcionalidades do Restaurante Parceiro (Partner)

* **Hub de Boas-vindas para Estabelecimentos:**
  * Landing page informativa sobre vantagens comerciais e acesso rápido a login, cadastro ou reivindicação.
* **Reivindicação de Estabelecimentos (Claim Flow):**
  * Entrada de código exclusivo de 8 caracteres (fornecido offline pela plataforma ou freelancer) para assumir o controle de um restaurante pré-cadastrado.
  * Criação dinâmica de credenciais e vínculo automático do proprietário à empresa.
* **Painel de Gestão Cadastral:**
  * Edição de nome fantasia, telefone corporativo, redes sociais, CNPJ e tipo de cozinha.
  * Cadastro de horário de funcionamento detalhado por dia da semana (aberto/fechado e janelas de horas).
  * Upload simplificado de logotipo (imagem de perfil) e banner de capa.
* **Gerenciador de Cardápio (Menu Creator):**
  * Criação, renomeação, ordenação e exclusão de categorias (ex: Entradas, Pratos Executivos, Sucos).
  * Cadastro e edição de pratos contendo: Foto do prato, Nome, Descrição dos ingredientes, Preço e Tags.
* **Gerenciador da Galeria de Fotos:**
  * Upload múltiplo de fotos do ambiente e de pratos.
  * Sistema drag-and-drop para ordenar a ordem das imagens de destaque do estabelecimento.
  * Adição de legendas descritivas em cada foto.
* **Assinatura e Upgrades (Plano Premium):**
  * Tela de checkout/upgrade detalhando benefícios do Plano Premium (Destaque nas buscas, acesso a relatórios e suporte rápido).
* **Métricas de Desempenho (Analytics):**
  * Gráfico histórico de visualizações do perfil do restaurante.
  * Contador de cliques de rota (Google Maps), cliques no número de telefone e cliques de visualização de pratos.

### 3.3. Funcionalidades do Freelancer (Mapper)

* **Dashboard de Ganhos:**
  * Visualização de saldo financeiro acumulado por tarefas concluídas e validadas.
  * Histórico de envio de tarefas com status (Pendente, Aprovada, Rejeitada).
* **Mapeamento e Cadastro Físico:**
  * Geolocalização em tempo real exibindo estabelecimentos próximos que necessitam de auditoria ou novos cadastros.
  * Cadastro simplificado via celular: Nome do local, telefone, endereço, fotos da fachada e do cardápio físico impresso.
  * Envio direto para moderação do admin para validação e liberação do saldo.

### 3.4. Funcionalidades do Administrador (Admin)

* **Dashboard Consolidado:**
  * Visão geral de novos usuários cadastrados, faturamento de assinaturas, tarefas pendentes de freelancers e requisições de reivindicação de restaurantes.
* **Gerenciamento de Restaurantes (Moderação Geral):**
  * Ativação, suspensão ou exclusão de perfis de restaurantes.
  * Moderação e correção de cardápios e categorias cadastrados.
* **Coletor e Importador do Google Places:**
  * Busca integrada com a API do Google Maps para localizar restaurantes por palavra-chave e raio de localização.
  * Importação em lote dos estabelecimentos encontrados diretamente para o banco de dados do FilterFood, permitindo iniciar as operações em novas cidades rapidamente.
* **Auditoria de Freelancers:**
  * Revisão de fotos enviadas, coordenadas geográficas e dados de cardápio preenchidos por freelancers.
  * Botões de aprovação (credita o saldo para o freelancer) ou reprovação com campo de feedback.
* **Gestão de Planos e Preços:**
  * Configuração de limites do plano Grátis e tarifas do Plano Premium.

---

## 4. Diferenciais Competitivos

* **Foco no Prato e no Preço, não apenas no Restaurante:** Ao contrário de marketplaces de delivery tradicionais que focam apenas nas marcas dos restaurantes, o FilterFood destaca o prato e o seu valor final, conectando o usuário à refeição exata.
* **O Assistente de Orçamento Inteligente (Combo Finder):** Uma ferramenta extremamente rápida e direta que substitui a pesquisa demorada por pratos que caibam no bolso de forma gamificada.
* **Gamificação de Mapeamento (Freelancers):** Uma engine de expansão geográfica única, permitindo que a base de dados cresça de forma orgânica e acelerada, sem depender de cadastros manuais lentos pela equipe de vendas.
* **Fórmula Social Própria (Happy Hour Hub):** O aplicativo age como o facilitador social definitivo, criando engajamento e compartilhamento viral (links compartilhados no WhatsApp trazem novos usuários direto para o app).
