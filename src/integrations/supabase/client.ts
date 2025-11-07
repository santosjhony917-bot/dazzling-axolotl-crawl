import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Adicionando logs para depuração
console.log('DEBUG: VITE_SUPABASE_URL lido:', supabaseUrl);
console.log('DEBUG: VITE_SUPABASE_ANON_KEY lido:', supabaseAnonKey);

// Verificação explícita para garantir que as variáveis de ambiente estão definidas
if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL não está definido. Por favor, verifique seu arquivo .env na raiz do projeto.');
}
if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY não está definido. Por favor, verifique seu arquivo .env na raiz do projeto.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);