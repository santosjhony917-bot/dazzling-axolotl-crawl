# FilterFood - Arquitetura de Telas e Fluxo do Usuário

Este documento mapeia o esqueleto do aplicativo FilterFood, focando na funcionalidade, dados e navegação de cada tela, detalhando a arquitetura completa das páginas e fluxos.

---

## 1. Fluxo Inicial (First Open)

### TELA 1.0: Splash Screen
* **Objetivo:** Tela de carregamento exibida rapidamente enquanto o aplicativo inicializa o sistema e verifica no banco de dados (Supabase/Firebase) se o utilizador já possui uma sessão iniciada.
* **Elementos Visuais Básicos:**
  * Logotipo principal do FilterFood (centralizado).
  * Cor de fundo sólida (da marca).
  * Indicador de carregamento (Spinner) opcional.
* **Lógica de Navegação:**
  * **Automática:** Dura de 1 a 3 segundos.
  * **Condição A:** Se é a primeira vez que o utilizador abre o app -> Vai para Onboarding (TELA 1.1).
  * **Condição B:** Se o utilizador já está logado/já conhece o app -> Vai para a sua respetiva Home.

### TELA 1.1: Onboarding (Boas-vindas)
* **Objetivo:** Explicar a proposta de valor do aplicativo para um utilizador novato de forma amigável.
* **Componente Principal:** Um carrossel deslizante (Swipe) com 3 passos.
  * **Passo 1 (Descoberta):**
    * Ilustração/Imagem: Relação a encontrar comida.
    * Título: "Bem-vindo ao Filterfood"
    * Subtexto: "Descubra os melhores restaurantes perto de você. Compare preços, avalie opções e encontre sua próxima refeição perfeita."
    * Chips de Features: Buscar, Avaliar, Favoritar.
  * **Passo 2 (Social/Comparação):**
    * Ilustração/Imagem: Grupo de amigos ou comparação.
    * Título: "Compare"
    * Subtexto: "Encontre a opção perfeita para você. Compare preços, veja onde os restaurantes estão e filtre pelo seu tipo de comida favorito."
    * Chips de Features: Preço, Localização, Tipo de comida.
  * **Passo 3 (Início):**
    * Ilustração/Imagem: Um pin de mapa ou entrada.
    * Título: "Comece Agora"
    * Subtexto: "Tudo pronto! Explore restaurantes incríveis, compare opções e aproveite sua experiência culinária perfeita."
* **Elementos Fixos na Tela:**
  * Botão "Pular" (canto inferior esquerdo) -> Direciona para a TELA 1.2 (Welcome).
  * Indicadores de página (3 pontinhos centralizados na base).
  * Botão de Ação Primária: "Próximo" (telas 1 e 2) e "Começar" (tela 3).

### TELA 1.2: Boas-vindas / Seleção de Perfil (Welcome)
* **Objetivo:** Ponto de entrada de decisão do utilizador para escolher se deseja navegar como cliente ou se é proprietário de restaurante.
* **Elementos Visuais Básicos:**
  * Logotipo "FilterFood" em destaque no topo.
  * Título central: "Bem-vindo!"
  * Subtítulo: "O que você deseja fazer hoje?"
  * Fundo vermelho com círculos decorativos.
* **Lógica de Navegação:**
  * **Botão "Encontrar Restaurantes":** Define o papel de utilizador como "customer" e navega para TELA 2.0 (Login/Cadastro do Cliente).
  * **Botão "Sou Restaurante":** Define o papel de utilizador como "restaurant" e navega para TELA 4.0 (Hub do Parceiro).

---

## 2. Fluxo de Autenticação do Cliente

### TELA 2.0: Login / Cadastro do Cliente (Auth Component)
* **Objetivo:** Permitir que o cliente se autentique ou crie sua conta para acessar os recursos do aplicativo.
* **Elementos Visuais Básicos:**
  * Botões de login social: "Continuar com Google" e "Continuar com Apple".
  * Linha divisória com texto "ou".
  * Inputs de formulário: E-mail e Senha.
  * Botão primário: "Entrar" (modo login) ou "Cadastrar-se" (modo cadastro).
  * Links: "Esqueceu sua senha?" (modo login) e alternador na base ("Crie uma agora" / "Entrar").
* **Lógica de Navegação:**
  * Login bem-sucedido -> Direciona para TELA 3.0 (Home do Cliente).
  * Cadastro bem-sucedido -> Envia e-mail de confirmação e mantém na tela para efetuar o login.
  * Clique em "Esqueceu sua senha?" -> Direciona para TELA 2.1 (Recuperação de Senha).
  * Clique no voltar do Header -> Retorna para TELA 1.2 (Welcome).

### TELA 2.1: Recuperação de Senha (ForgotPassword)
* **Objetivo:** Permitir a redefinição de senha para utilizadores que esqueceram suas credenciais.
* **Elementos Visuais Básicos:**
  * Header com seta para voltar e título "Recuperar Senha".
  * Input: E-mail cadastrado.
  * Botão: "Enviar link de recuperação".
* **Lógica de Navegação:**
  * Envio bem-sucedido -> Exibe mensagem de sucesso e redireciona de volta para TELA 2.0 (Login).
  * Clique na seta de voltar -> Retorna para TELA 2.0.

### TELA 2.2: Termos Legais e Privacidade (Legal)
* **Objetivo:** Exibir os termos de uso e a política de privacidade do aplicativo em conformidade com as regulamentações (LGPD).
* **Elementos Visuais Básicos:**
  * Documentação em texto estruturado.
  * Header com seta para voltar.

---

## 3. Fluxo Principal (Cliente)

### TELA 3.0: Início (Home do Cliente)
* **Objetivo:** Ponto de partida diário do utilizador. Funciona como a vitrine principal do aplicativo, oferecendo recomendações personalizadas, acesso rápido a categorias e estabelecimentos em destaque com base na localização.
* **Elementos Visuais Básicos:**
  * **Header (Topo):** Indicador de Localização atual ("Entregar em: Rua X"), acompanhado de um ícone de perfil em miniatura.
  * **Barra de Pesquisa (SoftSearchInput):** Campo de busca rápido e arredondado ("O que você quer comer hoje?").
  * **Banner / Carrossel de Destaques:** Espaço para promoções, novidades ou chamadas para recursos mágicos (ex: Combo Finder).
  * **Grade de Categorias Rápidas:** Ícones circulares em carrossel horizontal (Pizza, Hambúrguer, Sushi, Saudável, etc.).
  * **Seções de Recomendação:** Listagens horizontais (Swipe) com cartões de restaurantes ("Mais Pedidos", "Perto de Você") usando a estrutura de *soft-card*.
  * **Bottom Navigation (Barra Inferior Fixa):** Ícones para Início, Busca, Mensagens/Amigos, Favoritos e Perfil, além do botão Central Flutuante (Acesso ao Assistente/Combo Finder).
* **Lógica de Navegação:**
  * Clique na Barra de Pesquisa: Direciona para a Busca Unificada (TELA 3.1).
  * Clique numa Categoria: Direciona para a Busca Unificada (TELA 3.1) com o filtro de categoria já pré-aplicado.
  * Clique num Restaurante: Direciona para o Perfil Público do Restaurante (TELA 3.3).
  * Clique no Botão Central (+): Abre o Assistente Inteligente / Combo Finder (TELA 3.6).
  * Ícones da Bottom Nav: Alternam fluidamente entre as abas principais.

### TELA 3.1: Busca Unificada (SearchUnifiedPage)
* **Objetivo:** Permitir pesquisas flexíveis combinando busca textual com múltiplos filtros avançados aplicados simultaneamente.
* **Elementos Visuais Básicos:**
  * **Barra de Pesquisa:** Com ícone de lupa e campo para digitação.
  * **Botão de Filtros:** Abre uma gaveta lateral ou modal de filtros avançados.
  * **Chips de Filtros Rápidos:** Ordenar por preço, avaliação, distância ou taxa de entrega.
  * **Grade de Categorias:** Para navegação visual imediata.
  * **Lista de Estabelecimentos Encontrados:** Cards horizontais mostrando foto de capa, nome, nota média e distância.
* **Lógica de Navegação:**
  * Ao digitar ou aplicar filtros: A lista atualiza dinamicamente.
  * Clique em um Restaurante -> Navega para TELA 3.3 (Perfil Público).

### TELA 3.2: Resultados de Busca e Filtros (RestaurantResults)
* **Objetivo:** Exibir a lista detalhada e filtrada de restaurantes correspondentes a buscas mais complexas.
* **Elementos Visuais Básicos:**
  * Filtros ativos no topo como chips removíveis (ex: "Hambúrguer", "Preço Baixo").
  * Listagem vertical de resultados.
* **Lógica de Navegação:**
  * Clique em um restaurante -> Navega para TELA 3.3 (Perfil Público).

### TELA 3.3: Perfil Público do Restaurante (RestaurantProfilePublic)
* **Objetivo:** Mostrar as informações públicas do restaurante de forma atrativa para o cliente, servindo como cardápio digital do local.
* **Elementos Visuais Básicos:**
  * **Capa e Logotipo:** Imagem ampla no topo com overlay transparente.
  * **Ações Rápidas:** Botão de favoritar (coração), botão de ligar/WhatsApp, e botão de rota física (mapa).
  * **Seção Informativa:** Descrição, endereço, horário de funcionamento e faixa média de gastos.
  * **Grade de Fotos / Galeria:** Imagens reais do restaurante e dos pratos.
  * **Destaques do Menu:** Cards de pratos recomendados.
  * **Botão Fixo Inferior:** "Ver Cardápio Completo".
* **Lógica de Navegação:**
  * Clique em "Ver Cardápio Completo" -> Navega para TELA 3.4 (Cardápio Completo).
  * Clique em uma Imagem da Galeria -> Abre modal de zoom da imagem.
  * Seta voltar -> Retorna para TELA 3.0 ou 3.1.

### TELA 3.4: Cardápio Completo (FullMenuPage)
* **Objetivo:** Apresentar a totalidade de pratos, bebidas e sobremesas oferecidas pelo restaurante, divididos categoricamente.
* **Elementos Visuais Básicos:**
  * **Seletor de Categorias Horizontal:** Abas que rolam lateralmente (ex: "Entradas", "Pratos Principais", "Bebidas").
  * **Lista Vertical de Itens:** Contendo foto em miniatura, nome do prato, descrição detalhada dos ingredientes e valor em R$.
  * **Barra de Pesquisa de Pratos:** Para encontrar itens específicos dentro do cardápio.
* **Lógica de Navegação:**
  * Clique em um item do menu -> Abre TELA 3.5 (Detalhes do Prato).
  * Seta voltar -> Retorna para TELA 3.3 (Perfil Público).

### TELA 3.5: Detalhes do Prato / Item do Cardápio (MenuItemDetails)
* **Objetivo:** Visualização detalhada de um prato específico para tirar dúvidas do utilizador sobre ingredientes, tamanho ou preço.
* **Elementos Visuais Básicos:**
  * Imagem de alta qualidade do prato ocupando o topo da tela.
  * Título, descrição completa, preço e informações adicionais (alergênicos, tempo de preparo).
  * Botão de compartilhamento e favoritar.
* **Lógica de Navegação:**
  * Clique em Voltar -> Retorna para TELA 3.4 (Cardápio Completo) ou TELA 3.3.

### TELA 3.6: Assistente Inteligente / Combo Finder (ComboFinderPage)
* **Objetivo:** O grande "Matchmaker" de comida do aplicativo. Uma interface que ajuda o cliente a encontrar pratos exatos que se encaixem no seu orçamento e preferências atuais, removendo o atrito da pesquisa manual.
* **Elementos Visuais Básicos:**
  * **Avatar do Assistente:** Robô interativo no topo.
  * **Input de Orçamento Máximo:** Campo numérico para o utilizador informar quanto quer gastar (ex: "Até R$ 50,00").
  * **Filtros Adicionais:** Categorias preferidas (Massa, Hambúrguer, etc.) e distância máxima desejada.
  * **Resultados Mágicos:** Apresentação dinâmica dos pratos que atendem perfeitamente à combinação de orçamento e filtros.
* **Lógica de Navegação:**
  * Clique em um resultado recomendado -> Navega diretamente para o prato selecionado (TELA 3.5).

### TELA 3.7: Perfil do Cliente (ClientProfilePage)
* **Objetivo:** Gerenciar informações pessoais do cliente, configurações da conta, endereços favoritos e logout.
* **Elementos Visuais Básicos:**
  * Avatar do utilizador, Nome e E-mail.
  * Links de navegação: "Meus Dados", "Meus Favoritos", "Gerenciar Amigos", "Central de Ajuda" e "Termos de Uso".
  * Botão destacado de "Sair da Conta".
* **Lógica de Navegação:**
  * Clique em "Sair da Conta": Destrói o token de sessão do Supabase/Firebase e redireciona imediatamente para o Welcome (TELA 1.2).
  * Central de Ajuda -> Abre TELA 3.12 (HelpCenter).

### TELA 3.8: Favoritos (FavoritesPage)
* **Objetivo:** Centralizar todos os restaurantes e pratos marcados como favoritos pelo utilizador.
* **Elementos Visuais Básicos:**
  * Lista vertical de restaurantes curtidos.
  * Opções de busca rápida entre os favoritos.

### TELA 3.9: Gerenciamento de Amigos (FriendsPage)
* **Objetivo:** Permitir conectar-se com outros utilizadores do aplicativo para compartilhar recomendações e organizar eventos.
* **Elementos Visuais Básicos:**
  * Busca por e-mail ou username.
  * Lista de solicitações de amizade recebidas/enviadas.
  * Lista de amigos ativos.
* **Lógica de Navegação:**
  * Clique em um amigo -> Permite ver o perfil e iniciar convite.

### TELA 3.10: Hub de Eventos / Happy Hour Hub (HappyHourHub)
* **Objetivo:** Listar salas de eventos criadas pelo utilizador ou para as quais ele foi convidado, facilitando a organização em grupo.
* **Elementos Visuais Básicos:**
  * Listagem de eventos em andamento, futuros ou finalizados.
  * Botão de ação: "Criar Novo Happy Hour".
* **Lógica de Navegação:**
  * Clique em um evento -> Abre TELA 3.11 (Sala do Happy Hour).

### TELA 3.11: Sala de Happy Hour e Votação (HappyHourRoom)
* **Objetivo:** Decisão coletiva de restaurantes em tempo real através de votação.
* **Elementos Visuais Básicos:**
  * **Opções de Restaurantes:** Cards dos estabelecimentos propostos para o Happy Hour.
  * **Barra de Progresso:** Exibe o número de votos que cada restaurante possui.
  * **Membros Conectados:** Lista de avatares dos amigos na sala.
  * **Ações:** Botão para votar, adicionar nova sugestão e botão de copiar convite (link do WhatsApp).
* **Lógica de Navegação:**
  * Clique no restaurante -> Abre TELA 3.3 em nova aba para ver detalhes.

### TELA 3.12: Central de Ajuda do Cliente (HelpCenter)
* **Objetivo:** Fornecer suporte ao utilizador através de FAQ estruturada e formulário de mensagem direta para o suporte administrativo.

---

## 4. Área do Parceiro (Restaurante)

### TELA 4.0: Hub da Área do Restaurante (RestaurantAreaHub)
* **Objetivo:** Apresentação da plataforma de parceiros, detalhando vantagens e permitindo acesso (login) ou cadastro de novos estabelecimentos.
* **Elementos Visuais Básicos:**
  * Banners explicativos sobre visibilidade e captação de clientes.
  * Botões primários: "Cadastrar Meu Restaurante" e "Acessar Painel de Controle".
  * Link de ajuda: "Seu restaurante já está no FilterFood? Reivindique o Perfil".
* **Lógica de Navegação:**
  * Clique em "Cadastrar" -> Abre TELA 4.2 (Cadastro do Restaurante).
  * Clique em "Acessar Painel" -> Abre TELA 4.1 (Login do Restaurante).
  * Clique em "Reivindique o Perfil" -> Abre TELA 4.3 (Reivindicação).

### TELA 4.1: Login do Proprietário (RestaurantLogin)
* **Objetivo:** Login específico para donos de restaurantes acessarem seus painéis de gestão.
* **Elementos Visuais Básicos:**
  * Formulário de e-mail e senha de parceiro.
  * Botão primário "Entrar".

### TELA 4.2: Cadastro do Proprietário (RestaurantSignup)
* **Objetivo:** Fluxo estruturado passo a passo para cadastrar um novo restaurante no ecossistema da plataforma.
* **Elementos Visuais Básicos:**
  * **Passo 1 (Proprietário):** Inputs de Nome, Telefone, E-mail e Senha.
  * **Passo 2 (Restaurante):** Inputs de Nome Fantasia, CNPJ, Categoria da Cozinha e Telefone do restaurante.
  * **Passo 3 (Endereço):** Inputs de CEP, Cidade, Bairro, Logradouro e Número.
* **Lógica de Navegação:**
  * Finalização -> Efetua a criação de conta no backend e redireciona para o painel administrativo do restaurante.

### TELA 4.3: Reivindicar Restaurante (ClaimRestaurant)
* **Objetivo:** Permitir que o proprietário legitime o controle sobre um restaurante já listado no app usando um código de acesso (fornecido offline ou por e-mail pela plataforma).
* **Etapa 1: Inserção do Código:**
  * Header: Ícone de seta para voltar (<-) e título "Reivindicar Perfil".
  * Cabeçalho Principal: Ícone de chave num círculo, título "Reivindicar Restaurante", subtítulo "Use o código de acesso de 8 caracteres para liberar seu perfil.".
  * Input: "Código de Acesso" (Ex: INSIRA O CÓDIGO) com texto de ajuda "O código de 8 caracteres fornecido a você.".
  * Ação Primária: Botão "Verificar Código" (Inicialmente com opacidade reduzida/desativado até preenchimento).
* **Etapa 2: Criação de Credenciais (Pós-Validação):**
  * Objetivo: Uma vez validado o código, o utilizador deve criar a sua conta (ou fazer login se já tiver uma) para assumir a propriedade.
  * Mudança Visual: O subtítulo altera-se para "Código verificado! Agora, crie sua conta ou faça login para continuar."
  * Componentes de Registro (Similares à Etapa 3 do Cadastro):
    * Botões de Social Login (Google/Apple).
    * Separador "OU".
    * Inputs de "Seu e-mail", "Crie uma senha" e "Confirme sua senha".
    * Botão Primário: "Criar conta".
    * Rodapé: Link "Já possui cadastro? Fazer login" (caso o utilizador já seja parceiro e queira apenas adicionar outro restaurante à sua conta existente).
* **Lógica de Navegação:**
  * Clique em "Verificar Código" (Sucesso): O código é validado no backend e a tela transita dinamicamente para a Etapa 2.
  * Clique em "Criar conta" (Sucesso): Associa o utilizador ao restaurante reivindicado no Firebase/Supabase e direciona para o Painel do Restaurante (TELA 4.4).
  * Clique em "Fazer login" (Rodapé Etapa 2): Direciona para a TELA 4.1 (Login do Restaurante), passando o parâmetro do código de reivindicação para associar após o login.
  * Clique na Seta (Voltar): Retorna para a TELA 4.0 (Área do Restaurante).

### TELA 4.4: Configurações de Perfil e Dados Básicos (ProfileSettingsPage)
* **Objetivo:** Gestão de dados essenciais do restaurante (logotipo, capa, horário de funcionamento, contatos e endereço).
* **Elementos Visuais Básicos:**
  * Inputs para edição de Nome Fantasia, Telefone, Descrição.
  * Configuração semanal de horários com botões de liga/desliga para cada dia.
  * Botões de upload para Logo e Banner de capa.
  * Botão de Ação: "Salvar Dados".

### TELA 4.5: Gerenciamento do Cardápio (MenuManagement)
* **Objetivo:** Exibir a estrutura de categorias do cardápio do estabelecimento, facilitando a adição ou remoção de seções.
* **Elementos Visuais Básicos:**
  * Lista de categorias cadastradas (ex: "Massas", "Bebidas").
  * Ações: Editar nome, excluir categoria ou reordenar.
  * Botão: "Adicionar Categoria".
* **Lógica de Navegação:**
  * Clique em uma categoria -> Navega para TELA 4.6 (Detalhes da Categoria).

### TELA 4.6: Detalhes da Categoria / Itens do Cardápio (CategoryDetails)
* **Objetivo:** Gerenciar os pratos individuais vinculados a uma determinada categoria.
* **Elementos Visuais Básicos:**
  * Lista de pratos cadastrados na categoria atual.
  * Ações para cada prato: Editar dados (Nome, Descrição, Preço, Foto) ou deletar.
  * Botão: "Adicionar Prato".

### TELA 4.7: Galeria de Fotos e Imagens (GalleryManagement)
* **Objetivo:** Upload de fotos promocionais e de ambiente do restaurante para visualização dos clientes.
* **Elementos Visuais Básicos:**
  * Grade de fotos atual da galeria.
  * Funcionalidade de arrastar e soltar para reordenar a exibição.
  * Botão de Upload e campos para legenda de cada foto.

### TELA 4.8: Upgrade de Plano / Premium Hub (Upgrade)
* **Objetivo:** Permitir a assinatura do plano Premium para obter recursos estatísticos avançados e destaque nas pesquisas.
* **Elementos Visuais Básicos:**
  * Comparação visual dos planos (Free vs Premium) com chips de vantagens.
  * Botão de assinatura integrado.

### TELA 4.9: Relatórios e Métricas de Desempenho (MetricsPage)
* **Objetivo:** Exibição de gráficos contendo estatísticas de visitas e interações dos utilizadores com a página do restaurante.
* **Elementos Visuais Básicos:**
  * Gráfico de visualizações semanais/mensais.
  * Contadores numéricos de visualizações do perfil, cliques no telefone, e cliques para traçar rota.

### TELA 4.10: Central de Suporte do Parceiro (HelpCenter)
* **Objetivo:** FAQs focadas na gestão de restaurantes na plataforma e canal de contato direto com os administradores.

---

## 5. Portal do Freelancer (Coleta e Mapeamento)

### TELA 5.0: Portal de Trabalho do Freelancer (FreelancerPortal)
* **Objetivo:** Área gamificada para freelancers realizarem mapeamento de estabelecimentos na rua, cadastrando novos locais em troca de recompensas financeiras.
* **Elementos Visuais Básicos:**
  * **Dashboard de Ganhos:** Mostra saldo a receber, prêmios e contagem de tarefas enviadas/aprovadas.
  * **Lista de Tarefas:** Exibe restaurantes que precisam de fotos de cardápio ou validação presencial.
  * **Formulário de Coleta:** Campos para capturar o nome do restaurante, telefone, fotos do estabelecimento físico/cardápio impresso, e coordenadas exatas de GPS.
  * **Histórico de Envio:** Acompanhamento de tarefas sob moderação administrativa.

---

## 6. Painel de Administração Geral (Admin)

### TELA 6.0: Login do Admin (AdminLogin)
* **Objetivo:** Autenticação dos administradores gerais da plataforma FilterFood.
* **Elementos Visuais Básicos:**
  * Campos de e-mail e senha administrativa.

### TELA 6.1: Dashboard Principal do Admin (AdminDashboard)
* **Objetivo:** Apresentar painel consolidado com a saúde do ecossistema e as pendências de aprovação.
* **Elementos Visuais Básicos:**
  * Cards de contagem: Restaurantes Totais, Usuários Cadastrados, Solitações de Reivindicação, e Tarefas sob Auditoria.
  * Lista de solicitações de reivindicação pendentes.
  * Menu lateral ou abas de gerenciamento administrativo.

### TELA 6.2: Gerenciamento Geral de Restaurantes (AdminRestaurants)
* **Objetivo:** Listagem completa de todos os estabelecimentos integrados ao banco de dados para edição, banimento ou moderação.
* **Elementos Visuais Básicos:**
  * Busca geral por nome de restaurante.
  * Filtros de status (Ativo, Rascunho, Pendente de Aprovação, Reivindicado).
  * Ações: Editar dados, Moderar Cardápio, Alterar Status do Plano.
* **Lógica de Navegação:**
  * Clique em "Editar" -> Abre TELA 6.3 (Edição do Restaurante).
  * Clique em "Ver Cardápio" -> Abre TELA 6.4 (Cardápio do Restaurante no Admin).

### TELA 6.3: Edição / Moderação de Restaurante pelo Admin (AdminEditRestaurant)
* **Objetivo:** Editar todas as informações cruciais de um estabelecimento de forma irrestrita.
* **Elementos Visuais Básicos:**
  * Formulário completo de dados de contato, endereço, plano ativo, status do perfil e coordenadas GPS.
  * Botão para validar e aprovar reivindicações de perfil pendentes de parceiros.

### TELA 6.4: Gerenciamento do Cardápio pelo Admin (AdminRestaurantMenu)
* **Objetivo:** Moderar e corrigir cardápios de restaurantes de forma direta.
* **Elementos Visuais Básicos:**
  * Visualização de categorias e itens do menu do restaurante selecionado com botões de edição direta e exclusão.

### TELA 6.5: Coletor e Importador do Google Maps (GoogleMapsCollector)
* **Objetivo:** Ferramenta interna do administrador para coletar e importar novos restaurantes em lote usando a API do Google Places.
* **Elementos Visuais Básicos:**
  * Campos para buscar por termo de interesse (ex: "pizzaria") e cidade/raio geográfico.
  * Visualização de estabelecimentos encontrados no Google.
  * Botões de seleção e "Importar Estabelecimentos".

### TELA 6.6: Monitoramento de Tarefas e Freelancers (FreelancerMonitor)
* **Objetivo:** Avaliar dados e mídias de estabelecimentos enviados por freelancers cadastrados, aprovando o pagamento das tarefas após auditoria.

### TELA 6.7: Gerenciamento de Administradores (ManageAdmins)
* **Objetivo:** Adicionar ou remover contas de utilizadores com privilégios administrativos.

### TELA 6.8: Gerenciamento e Configuração de Planos (ManagePlans)
* **Objetivo:** Configurar valores mensais e os recursos liberados para assinantes premium.

### TELA 6.9: Categorias Populares (PopularCategories)
* **Objetivo:** Visualização estatística das categorias e termos de buscas culinárias mais pesquisados pelos clientes.
