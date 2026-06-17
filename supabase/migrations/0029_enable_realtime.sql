-- Ativa a replicação de WebSockets para as tabelas do CRM
alter publication supabase_realtime add table commercial_leads;
alter publication supabase_realtime add table commercial_events;
