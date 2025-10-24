import { createClient } from '@supabase/supabase-js';

const SUPABASE_PROJECT_URL = 'https://ystffcohclbtykangfnt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzdGZmY29oY2xidHlrYW5nZm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MzkwNDgsImV4cCI6MjA3NjQxNTA0OH0.IfQ5x2ZvVoA-ABFYL_Q241nV2dPJ81U41idzIhumiK4';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || SUPABASE_PROJECT_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Esta verificação deve ser redundante agora, mas mantida por segurança
  throw new Error(
    "As variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias. Verifique seu arquivo .env."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);