import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL_FALLBACK = "https://ystffcohclbtykangfnt.supabase.co";
const SUPABASE_ANON_KEY_FALLBACK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzdGZmY29oY2xidHlrYW5nZm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MzkwNDgsImV4cCI6MjA3NjQxNTA0OH0.IfQ5x2ZvVoA-ABFYL_Q241nV2dPJ81U41idzIhumiK4";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL_FALLBACK;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY_FALLBACK;

console.log('VITE_SUPABASE_URL:', supabaseUrl);
console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);