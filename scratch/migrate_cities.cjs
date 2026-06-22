require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
// Creating an SQL string to guide the user since DDL cannot be run via REST.
const sql = `
CREATE TABLE IF NOT EXISTS public.expansion_cities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    state TEXT NOT NULL,
    status TEXT DEFAULT 'Planejamento',
    manager_name TEXT,
    goals_total INTEGER DEFAULT 1000,
    goals_premium INTEGER DEFAULT 100,
    launch_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilita RLS
ALTER TABLE public.expansion_cities ENABLE ROW LEVEL SECURITY;

-- Politicas basicas (permitir leitura/escrita anonima para teste local)
CREATE POLICY "Enable all for users" ON public.expansion_cities FOR ALL USING (true) WITH CHECK (true);

-- Altera a tabela restaurants para referenciar a nova cidade
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.expansion_cities(id) ON DELETE SET NULL;
`;
console.log(sql);
