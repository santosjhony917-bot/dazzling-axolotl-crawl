-- 1. ENUMS AND CUSTOM TYPES FOR THE CRM SYSTEM
CREATE TYPE public.plano_status_enum AS ENUM ('Premium_Cortesia', 'Premium_Pago', 'Free');
CREATE TYPE public.reivindicacao_status_enum AS ENUM ('Nao_Contatado', 'Notificado', 'Em_Conversa', 'Reivindicado');
CREATE TYPE public.lead_humor_enum AS ENUM ('Interessado', 'Duvida', 'Neutro', 'Irritado', 'Opt-Out');

-- 2. REGIONS TABLE (isolamento regional e chaves oficiais da Meta API)
CREATE TABLE public.regioes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_cidade text NOT NULL,
  uf text NOT NULL,
  ddd_oficial text NOT NULL,
  meta_phone_number_id text,
  meta_access_token text,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. AI STRATEGIES TABLE ( prompts, contextos e contadores estatísticos )
CREATE TABLE public.registro_estrategias_ia (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_estrategia text NOT NULL UNIQUE,
  pre_prompt_contexto text NOT NULL,
  gatilho_venda_principal text NOT NULL,
  total_tentativas integer DEFAULT 0 NOT NULL,
  total_conversoes_premium integer DEFAULT 0 NOT NULL,
  taxa_sucesso double precision DEFAULT 0.0 NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 4. BATCH CAMPAIGNS TABLE ( logs imutáveis e auditoria de disparos )
CREATE TABLE public.campanhas_lotes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  regiao_id uuid REFERENCES public.regioes(id) ON DELETE CASCADE NOT NULL,
  data_disparo timestamp with time zone DEFAULT now() NOT NULL,
  total_alvo integer NOT NULL,
  template_utilizado text NOT NULL,
  bairros_envolvidos jsonb NOT NULL, -- listagem de bairros e quantidades proporcionais
  logs_sucesso integer DEFAULT 0 NOT NULL,
  logs_falha integer DEFAULT 0 NOT NULL
);

-- 5. ESTABELECIMENTOS TABLE ( cadastro de prospects/leads do CRM )
CREATE TABLE public.estabelecimentos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  regiao_id uuid REFERENCES public.regioes(id) ON DELETE CASCADE NOT NULL,
  campanha_id uuid REFERENCES public.campanhas_lotes(id) ON DELETE SET NULL,
  nome text NOT NULL,
  bairro text NOT NULL,
  whatsapp_numero text NOT NULL,
  status_plano public.plano_status_enum DEFAULT 'Premium_Cortesia'::public.plano_status_enum NOT NULL,
  status_reivindicacao public.reivindicacao_status_enum DEFAULT 'Nao_Contatado'::public.reivindicacao_status_enum NOT NULL,
  data_reivindicacao timestamp with time zone,
  id_mensagem_meta text,
  humor_lead public.lead_humor_enum,
  estrategia_utilizada_id uuid REFERENCES public.registro_estrategias_ia(id) ON DELETE SET NULL,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL, -- link direto com o restaurante real
  created_at timestamp with time zone DEFAULT now()
);

-- 6. TIMELINE/WINDOWS TABLE ( janela estrita de escassez de 24 horas )
CREATE TABLE public.historico_janelas_24h (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id uuid REFERENCES public.estabelecimentos(id) ON DELETE CASCADE NOT NULL,
  data_abertura timestamp with time zone DEFAULT now() NOT NULL,
  data_fechamento_estimado timestamp with time zone NOT NULL,
  status_janela text DEFAULT 'active' NOT NULL, -- 'active', 'expired', 'closed_by_sale'
  created_at timestamp with time zone DEFAULT now()
);

-- 7. PERFORMANCE AND REGIONAL INDEXES
CREATE INDEX idx_estabelecimentos_region_status ON public.estabelecimentos(regiao_id, status_reivindicacao);
CREATE INDEX idx_estabelecimentos_bairro ON public.estabelecimentos(bairro);
CREATE INDEX idx_janelas_active_expiration ON public.historico_janelas_24h(status_janela, data_fechamento_estimado);
CREATE INDEX idx_campanhas_regiao ON public.campanhas_lotes(regiao_id);

-- 8. INITIAL AI STRATEGY SEEDS (Abordagens de venda para o algoritmo de Exploração/Explotação)
INSERT INTO public.registro_estrategias_ia (nome_estrategia, pre_prompt_contexto, gatilho_venda_principal, total_tentativas, total_conversoes_premium, taxa_sucesso) VALUES
(
  'Escassez Temporal de 23 Horas',
  'Você é um gerente comercial focado em urgência. Lembre ao restaurante de que a cortesia de visualização ilimitada do cardápio Premium está prestes a expirar. Enfatize que após as 23 horas o cardápio cairá para o modo gratuito com limite de 5 visitas por dia por cliente, o que pode afastar consumidores ativos. Destaque que a renovação para Premium Pago custa muito pouco perto do valor de perder pedidos.',
  'Urgência e Perda de Cota de Visualização',
  0,
  0,
  0.0
),
(
  'Análise de Demanda de Bairro (BI e Tráfego)',
  'Você é um analista de inteligência de negócios do FilterFood. Envie dados reais sobre a quantidade de buscas por comida no bairro onde o restaurante opera. Demonstre que o salão/restaurante dele está recebendo cliques e que a conversão premium garante que ele apareça no topo das buscas do bairro. Use um tom consultivo e amigável, focado em retorno financeiro imediato.',
  'Lucratividade do Bairro e Destaque Local',
  0,
  0,
  0.0
),
(
  'Gourmet Design (Aparência e Credibilidade)',
  'Você é um especialista em design e experiência do usuário. Explique ao dono do restaurante que cardápios em PDF pesados ou links desorganizados na bio fazem o cliente desistir da compra. O FilterFood oferece um cardápio digital elegante, leve, com fotos nítidas dos pratos que geram desejo imediato de compra e facilitam a escolha. Convença-o de que o design premium converte mais clientes que cardápios de texto.',
  'Qualidade Visual do Cardápio Digital',
  0,
  0,
  0.0
),
(
  'Facilidade de Contato e Link Direto',
  'Você é um consultor focado em agilidade operacional. Mostre ao dono do estabelecimento que ao reivindicar seu cardápio, os clientes têm atalhos diretos para WhatsApp e iFood sem fricção de login, o que aumenta em até 30% a conversão direta de pedidos sem taxas adicionais de marketplaces.',
  'Pedidos Diretos sem Taxas',
  0,
  0,
  0.0
);
