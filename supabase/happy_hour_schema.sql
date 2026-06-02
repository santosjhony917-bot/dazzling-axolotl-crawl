-- Script de Schema para Amigos e Happy Hour (Dyad / FilterFood)
-- Execute este script no SQL Editor do seu Console do Supabase para criar as tabelas necessárias.

-- 1. Tabela de Amizades (Relacionamento de Amigos)
CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id_1 uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user_id_2 uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending'::text NOT NULL,
  action_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL, -- quem enviou o convite
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT friendships_unique_pair UNIQUE (user_id_1, user_id_2)
);

-- 2. Tabela de Grupos/Eventos de Happy Hour
CREATE TABLE IF NOT EXISTS public.happy_hours (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  date_time timestamp with time zone NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. Participantes do Happy Hour
CREATE TABLE IF NOT EXISTS public.happy_hour_participants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  happy_hour_id uuid REFERENCES public.happy_hours(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT participant_unique UNIQUE (happy_hour_id, user_id)
);

-- 4. Chat do Happy Hour (Mensagens)
CREATE TABLE IF NOT EXISTS public.happy_hour_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  happy_hour_id uuid REFERENCES public.happy_hours(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 5. Restaurantes em Votação (Enquete do Happy Hour)
CREATE TABLE IF NOT EXISTS public.happy_hour_restaurants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  happy_hour_id uuid REFERENCES public.happy_hours(id) ON DELETE CASCADE NOT NULL,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  added_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT happy_hour_restaurant_unique UNIQUE (happy_hour_id, restaurant_id)
);

-- 6. Votos dos Participantes nos Restaurantes da Enquete
CREATE TABLE IF NOT EXISTS public.happy_hour_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  happy_hour_id uuid REFERENCES public.happy_hours(id) ON DELETE CASCADE NOT NULL,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT vote_unique UNIQUE (happy_hour_id, restaurant_id, user_id)
);

-- Habilitar RLS nas novas tabelas (Opcional, adote as mesmas políticas básicas dos perfis)
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.happy_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.happy_hour_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.happy_hour_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.happy_hour_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.happy_hour_votes ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS Básicas (Permitir leitura/escrita para usuários autenticados)
CREATE POLICY "Permitir amizades para autenticados" ON public.friendships FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir happy hours para autenticados" ON public.happy_hours FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir participantes para autenticados" ON public.happy_hour_participants FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir mensagens para autenticados" ON public.happy_hour_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir restaurantes da enquete para autenticados" ON public.happy_hour_restaurants FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir votos para autenticados" ON public.happy_hour_votes FOR ALL TO authenticated USING (true) WITH CHECK (true);
