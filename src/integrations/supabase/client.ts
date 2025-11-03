import { createClient } from '@supabase/supabase-js';

// ATENÇÃO: Estes valores estão hardcoded TEMPORARIAMENTE para resolver o erro.
// Para produção, é ALTAMENTE RECOMENDADO usar variáveis de ambiente.
// Certifique-se de que seu arquivo .env na raiz do projeto contenha:
// VITE_SUPABASE_URL="https://ystffcohclbtykangfnt.supabase.co"
// VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzdGZmY29oY2xidHlrYW5nZm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MzkwNDgsImV4cCI6MjA3NjQxNTA0OH0.IfQ5x2ZvVoA-ABFYL_Q241nV2dPJ81U41idzIhumiK4"

const supabaseUrl = "https://ystffcohclbtykangfnt.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzdGZmY29oY2xidHlrYW5nZm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MzkwNDgsImV4cCI6MjA3NjQxNTA0OH0.IfQ5x2ZvVoA-ABFYL_Q241idzIhumiK4";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);