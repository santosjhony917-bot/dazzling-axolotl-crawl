# Ideias de Layout para a Homepage do GrubGo
Este documento apresenta 3 abordagens criativas e visualmente impactantes para reposicionar e redesenhar as categorias e o Happy Hour Hub no GrubGo, mantendo o estilo **Soft UI** (neumorfismo suave, sombras ricas, cantos muito arredondados e transições táteis).

---

## 🎨 Elementos de Estilo Comuns (Tokens Soft UI)
Para manter a consistência com a interface suave do GrubGo, sugerimos utilizar as seguintes classes base do Tailwind:
- **Fundo Padrão**: `bg-[#F5F6FA]` (um cinza extremamente claro que permite o contraste de sombras claras e escuras).
- **Sombra Soft Em relevo (Convexa)**: `shadow-[6px_6px_16px_rgba(163,177,198,0.35),-6px_-6px_16px_rgba(255,255,255,0.8)]`
- **Sombra Soft Afundada (Côncava)**: `shadow-[inset_4px_4px_8px_rgba(163,177,198,0.25),inset_-4px_-4px_8px_rgba(255,255,255,0.7)]`
- **Cantos**: `rounded-[24px]` para cards principais e `rounded-[16px]` para pílulas e botões.

---

### Abordagem 1: Bento Grid Assimétrico e Promocional
*(Foco em Inovação, Densidade de Informação e Visual Premium)*

#### Descrição do Layout
Abaixo da barra de busca, substituímos o carrossel simples por uma **Bento Grid** assimétrica de 3 colunas e 2 linhas.
1. **Bloco Happy Hour Hub** (ocupa 2 colunas e 2 linhas - destaque principal): Um card grande contendo um gradiente gradativo caloroso (laranja-pêssego a vermelho), uma ilustração minimalista e informações dinâmicas do grupo de Happy Hour ativo (ex: fotos sobrepostas de amigos online, indicador pulsante).
2. **Blocos de Categorias Principais** (ocupam 1 coluna cada): Dois cards menores empilhados verticalmente.
   - Bloco Superior: Categoria \"Próximos\" com ícone de localização e distância média.
   - Bloco Inferior: Categoria \"Saudável\" com ícone de folha/nutrição e quantidade de restaurantes.
3. **Categorias Secundárias**: Um carrossel horizontal discreto logo abaixo da Bento Grid para outras opções (\"Tudo\", \"Preço\", \"Combos\", \"Sobremesas\") com pílulas minimalistas.

#### Justificativa de UX
- **Hierarquia Visual Imediata**: O Happy Hour ganha destaque como o recurso \"matador\" do app, chamando a atenção imediatamente sem poluir o restante da tela.
- **Redução do Erro de Toque**: Os cards da Bento Grid são grandes (mínimo de 80x80px para os pequenos e 170x170px para o de Happy Hour), excedendo de longe os limites de acessibilidade (44x44px), sendo excelentes para uso em movimento.
- **Estética Moderna**: O Bento Grid é a principal tendência de UI móvel atual (Apple, Microsoft), combinando perfeitamente com cantos super arredondados e sombras suaves do Soft UI.

#### Esboço de Código (Tailwind CSS + React)
```tsx
// Exemplo de Bento Grid para Home.tsx
<div className=\"grid grid-cols-3 gap-4 px-5 mb-8\">
  {/* Card Happy Hour Hub (2 colunas, 2 linhas) */}
  <div className=\"col-span-2 row-span-2 bg-gradient-to-br from-[#FF7E40] to-[#EF2A39] rounded-[24px] p-5 flex flex-col justify-between text-white shadow-[8px_8px_20px_rgba(239,42,57,0.3)] relative overflow-hidden active:scale-98 transition-transform duration-200 cursor-pointer\">
    {/* Micro-animação de pulso para indicar atividade */}
    <div className=\"absolute top-4 right-4 flex h-3 w-3\">
      <span className=\"animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75\"></span>
      <span className=\"relative inline-flex rounded-full h-3 w-3 bg-green-400\"></span>
    </div>
    
    <div>
      <span className=\"text-xs uppercase tracking-wider font-semibold text-white/80\">Social Hub</span>
      <h3 className=\"font-['Poppins'] font-bold text-xl mt-1 leading-tight\">Happy Hour</h3>
      <p className=\"text-sm text-white/90 mt-1\">3 amigos ativos agora</p>
    </div>

    {/* Avatares dos amigos sobrepostos */}
    <div className=\"flex items-center mt-4 gap-2\">
      <div className=\"flex -space-x-3\">
        <img className=\"w-8 h-8 rounded-full border-2 border-[#EF2A39]\" src=\"https://api.dicebear.com/7.x/avataaars/svg?seed=A\" alt=\"Friend 1\" />
        <img className=\"w-8 h-8 rounded-full border-2 border-[#EF2A39]\" src=\"https://api.dicebear.com/7.x/avataaars/svg?seed=B\" alt=\"Friend 2\" />
        <img className=\"w-8 h-8 rounded-full border-2 border-[#EF2A39]\" src=\"https://api.dicebear.com/7.x/avataaars/svg?seed=C\" alt=\"Friend 3\" />
      </div>
      <span className=\"text-xs font-medium bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-md\">Entrar</span>
    </div>
  </div>

  {/* Card Categoria 1: Próximos (1 coluna, 1 linha) */}
  <div className=\"bg-white rounded-[24px] p-4 flex flex-col justify-between items-start shadow-[6px_6px_16px_rgba(163,177,198,0.2),-6px_-6px_16px_rgba(255,255,255,0.8)] active:scale-95 transition-transform duration-200 cursor-pointer\">
    <div className=\"p-2 bg-red-50 rounded-xl text-[#EF2A39]\">
      <MapPin className=\"w-5 h-5\" />
    </div>
    <div className="mt-2">
      <span className=\"text-xs text-[#6A6A6A] font-medium\">Distância</span>
      <h4 className=\"font-semibold text-sm text-[#3C2F2F] leading-tight\">Próximos</h4>
    </div>
  </div>

  {/* Card Categoria 2: Saudável (1 coluna, 1 linha) */}
  <div className=\"bg-white rounded-[24px] p-4 flex flex-col justify-between items-start shadow-[6px_6px_16px_rgba(163,177,198,0.2),-6px_-6px_16px_rgba(255,255,255,0.8)] active:scale-95 transition-transform duration-200 cursor-pointer\">
    <div className=\"p-2 bg-green-50 rounded-xl text-green-500\">
      <Leaf className=\"w-5 h-5\" />
    </div>
    <div className="mt-2">
      <span className=\"text-xs text-[#6A6A6A] font-medium\">Fit & Bio</span>
      <h4 className=\"font-semibold text-sm text-[#3C2F2F] leading-tight\">Saudável</h4>
    </div>
  </div>
</div>
```

---

### Abordagem 2: Floating Bottom Sheet & Horizontal Dynamic Pills
*(Foco em Ergonomia, Minimalismo e Experiência de Uso com Uma Mão)*

#### Descrição do Layout
A página mantém um estilo extremamente minimalista e limpo.
1. **Categorias no Topo**: O carrossel horizontal existente é refinado. Em vez de botões cinzas chapados, usamos pílulas neumórficas com relevo realista. O item ativo parece \"afundado\" (côncavo) na tela, enquanto os inativos parecem \"flutuar\" (convexos) com sombras duplas sutis.
2. **Happy Hour Hub como Floating Action Card (FAC)**: Um card flutuante posicionado na parte inferior da tela, logo acima da barra de navegação principal. Ele se assemelha a um reprodutor de música flutuante do iOS. É estreito, ocupa quase toda a largura (`mx-5`), tem fundo em vidro/glassmorphism desfocado e contém um botão de ação rápida para o Happy Hour.

#### Justificativa de UX
- **Zona de Toque Natural (Polegar)**: Colocar o acesso ao Happy Hour na parte inferior (zona verde da tela no mapa de calor ergonômico) aumenta a taxa de cliques (CTR) e facilita o uso com apenas uma mão.
- **Feedback Tátil Rígido (Soft UI)**: A troca de estado das pílulas de ativo (shadow-inset) para inativo (shadow-outset) replica a sensação física de pressionar botões de verdade, aumentando a satisfação tátil (perceived quality).
- **Sem Interrupção visual**: O card flutuante não compete com o grid principal de restaurantes e rola sutilmente junto com a página ou permanece fixado com um efeito de fade-out ao rolar para baixo.

#### Esboço de Código (Tailwind CSS + React)
```tsx
{/* Carrossel de Categorias Refinado */}
<div className=\"mb-8 pl-5\">
  <ScrollArea className=\"w-full whitespace-nowrap\">
    <div className=\"flex gap-4 pr-5 pb-4 pt-2\">
      {categories.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`h-[48px] px-6 rounded-full font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
              isSelected
                ? 'bg-[#F5F6FA] text-[#EF2A39] shadow-[inset_3px_3px_6px_rgba(0,0,0,0.1),inset_-3px_-3px_6px_rgba(255,255,255,0.8)] border border-[#EF2A39]/10'
                : 'bg-[#F5F6FA] text-[#6A6A6A] shadow-[4px_4px_10px_rgba(163,177,198,0.4),-4px_-4px_10px_rgba(255,255,255,0.9)] hover:text-[#3C2F2F]'
            }`}
          >
            {cat.icon}
            <span>{cat.label}</span>
          </button>
        );
      })}
    </div>
  </ScrollArea>
</div>

{/* Happy Hour Floating Action Card */}
<div className=\"fixed bottom-24 left-0 right-0 z-40 px-5 pointer-events-none animate-slide-up\">
  <div className=\"pointer-events-auto w-full h-[68px] bg-white/85 backdrop-blur-xl border border-white/40 rounded-[22px] px-4 flex items-center justify-between shadow-[0_10px_30px_rgba(0,0,0,0.08)]\">
    <div className=\"flex items-center gap-3\">
      <div className=\"w-10 h-10 rounded-full bg-gradient-to-tr from-[#FF7E40] to-[#EF2A39] flex items-center justify-center text-white shadow-md\">
        <Beer className=\"w-5 h-5 animate-bounce\" />
      </div>
      <div>
        <h4 className=\"font-semibold text-sm text-[#3C2F2F] leading-tight\">Happy Hour em Grupo</h4>
        <p className=\"text-xs text-[#6A6A6A]\">Participe e economize até 30%</p>
      </div>
    </div>
    <button 
      onClick={() => navigate('/happy-hour')}
      className=\"bg-[#EF2A39] text-white text-xs font-semibold px-4 py-2.5 rounded-full hover:bg-[#d82230] transition-colors active:scale-95 shadow-[0_4px_10px_rgba(239,42,57,0.2)]\"
    >
      Entrar
    </button>
  </div>
</div>
```

---

### Abordagem 3: Hero Banner Interativo + Carrossel de Categorias Expandido
*(Foco em Storytelling, Apelo Comercial e Facilidade de Navegação)*

#### Descrição do Layout
Organização em cascata vertical clássica de aplicativos de delivery de alto nível (estilo iFood/Uber Eats premium).
1. **Hero Banner Interativo**: Posicionado logo abaixo da busca. Ele serve como o cartão de visitas do Happy Hour. Apresenta um design limpo, tipografia expressiva e um botão de ação com relevo acentuado. O banner pode ser arrastado para o lado para revelar outros destaques (banners rotativos).
2. **Carrossel de Categorias Verticalizado**: Em vez de apenas um botão retangular com texto, cada categoria é representada por um card vertical maior contendo um ícone 3D estilizado ou ilustração colorida em cima e o rótulo embaixo.

#### Justificativa de UX
- **Reconhecimento Visual Rápido (Heurísticas de UX)**: Ícones e ilustrações coloridas reduzem a carga de leitura. O usuário localiza \"Combos\" ou \"Saudável\" pela imagem/ícone antes de ler o texto, tornando a navegação subconsciente e veloz.
- **Fluxo de Leitura Natural**: Segui o fluxo \"Top-Down\" padrão. A busca resolve a intenção direta; o banner cria o desejo (Happy Hour); o carrossel de categorias ajuda na exploração; e o grid de restaurantes entrega a ação final.
- **Espaço para Conteúdo Promocional**: O banner do Happy Hour permite colocar informações de descontos dinâmicos (ex: \"Chopp em dobro até 20h\"), gerando forte apelo financeiro e de urgência para o usuário.

#### Esboço de Código (Tailwind CSS + React)
```tsx
{/* Hero Banner do Happy Hour */}
<div className=\"px-5 mb-8\">
  <div className=\"w-full bg-[#3C2F2F] rounded-[28px] p-6 relative overflow-hidden shadow-lg border border-[#4d3d3d]\">
    {/* Efeitos de Fundo (Círculos Soft UI e desfoque) */}
    <div className=\"absolute -right-10 -top-10 w-40 h-40 rounded-full bg-[#EF2A39] opacity-35 blur-2xl pointer-events-none\" />
    <div className=\"absolute -left-10 -bottom-10 w-32 h-32 rounded-full bg-[#FF9633] opacity-20 blur-xl pointer-events-none\" />
    
    <div className=\"relative z-10 max-w-[70%]\">
      <span className=\"bg-[#EF2A39] text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider\">
        Novidade
      </span>
      <h2 className=\"font-['Poppins'] font-bold text-2xl text-white mt-3 leading-snug\">
        Crie seu grupo de Happy Hour!
      </h2>
      <p className=\"text-white/70 text-xs mt-1.5 leading-relaxed\">
        Convide amigos e desbloqueie descontos exclusivos em tempo real nos pratos selecionados.
      </p>
      
      <button 
        onClick={() => navigate('/happy-hour')}
        className=\"mt-4 bg-white text-[#3C2F2F] hover:bg-slate-100 font-semibold text-xs px-5 py-3 rounded-xl transition-all duration-200 active:scale-95 shadow-[0_4px_12px_rgba(255,255,255,0.15)] flex items-center gap-1.5\"
      >
        <Sparkles className=\"w-4 h-4 text-[#FF9633]\" />
        Iniciar Grupo
      </button>
    </div>
    
    {/* Ilustração ou Elemento Visual no Lado Direito */}
    <div className=\"absolute right-4 bottom-4 w-28 h-28 flex items-center justify-center opacity-85\">
      <Beer className=\"w-20 h-20 text-[#FF9633] stroke-[1.2]\" />
    </div>
  </div>
</div>

{/* Carrossel de Categorias Expandido (Cards Verticais) */}
<div className=\"mb-8 pl-5\">
  <ScrollArea className=\"w-full whitespace-nowrap\">
    <div className=\"flex gap-4 pr-5 pb-4 pt-2\">
      {categories.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`w-[84px] h-[104px] rounded-[24px] flex flex-col items-center justify-center gap-2.5 transition-all duration-200 ${
              isSelected
                ? 'bg-gradient-to-b from-[#EF2A39] to-[#d82230] text-white shadow-[0_10px_20px_rgba(239,42,57,0.3)]'
                : 'bg-white text-[#3C2F2F] shadow-[6px_6px_16px_rgba(163,177,198,0.2),-6px_-6px_16px_rgba(255,255,255,0.8)] border border-gray-50 hover:bg-gray-50'
            }`}
          >
            <div className={`p-2.5 rounded-2xl ${isSelected ? 'bg-white/20' : 'bg-[#F5F6FA]'}`}>
              {cat.icon}
            </div>
            <span className=\"text-[12px] font-semibold tracking-wide\">{cat.label}</span>
          </button>
        );
      })}
    </div>
  </ScrollArea>
</div>
```

---

## 🏁 Conclusão & Recomendação
Para o **GrubGo**, a **Abordagem 1 (Bento Grid)** misturada com elements da **Abordagem 2 (Neumorfismo nas Pílulas)** é a escolha ideal. Ela traz um ar moderno e de aplicativo premium de forma muito inovadora. A Bento Grid posiciona o Happy Hour com a devida importância sem sobrecarregar a experiência de busca rápida.
