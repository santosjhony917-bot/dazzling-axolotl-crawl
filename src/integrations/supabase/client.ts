import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ystffcohclbtykangfnt.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzdGZmY29oY2xidHlrYW5nZm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MzkwNDgsImV4cCI6MjA3NjQxNTA0OH0.IfQ5x2ZvVoA-ABFYL_Q241nV2dPJ81U41idzIhumiK4";

export const createClient = () => {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
};