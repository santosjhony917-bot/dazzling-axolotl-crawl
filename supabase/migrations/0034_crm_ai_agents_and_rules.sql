-- Migration 0034: Create CRM AI Agents and Business Rules tables

-- 1. Create crm_ai_agents table
CREATE TABLE public.crm_ai_agents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    tone text DEFAULT 'Descontraído' NOT NULL,
    system_prompt text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Create crm_business_rules table
CREATE TABLE public.crm_business_rules (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    rule_name text NOT NULL,
    rule_content text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. Add ai_agent_id column to commercial_leads
ALTER TABLE public.commercial_leads 
ADD COLUMN ai_agent_id uuid REFERENCES public.crm_ai_agents(id) ON DELETE SET NULL;

-- 4. Disable RLS for simple dashboard integration
ALTER TABLE public.crm_ai_agents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_business_rules DISABLE ROW LEVEL SECURITY;

-- 5. Seed default AI Agent
INSERT INTO public.crm_ai_agents (name, tone, system_prompt) VALUES (
    'Consultor SDR Padrão',
    'Amigável',
    'Você é um Consultor SDR B2B (Representante de Vendas) da FilterFood. Explique o motivo do contato (mostrar uma tecnologia nova de cardápio digital sem taxas do FilterFood). NUNCA pareça uma propaganda ou robô. Seja extremamente humano e amigável.'
);

-- 6. Seed default Business Rule
INSERT INTO public.crm_business_rules (rule_name, rule_content, is_active) VALUES (
    'Preços e Planos',
    'O FilterFood é um cardápio digital gratuito sem taxas sobre as vendas. O plano premium custa R$ 97 por mês e inclui IA integrada e automações WhatsApp.',
    true
);
