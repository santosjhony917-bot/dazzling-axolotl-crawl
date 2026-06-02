-- Drop unused tables that are no longer part of the application flow
DROP TABLE IF EXISTS "public"."banners" CASCADE;
DROP TABLE IF EXISTS "public"."scheduled_metrics" CASCADE;
