export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Se você tiver um arquivo database.types.ts gerado pelo Supabase CLI,
// você pode importar o tipo Database de lá e estender aqui, se necessário.
// Por exemplo:
// import { Database as SupabaseGeneratedDatabase } from '../../supabase/database.types';
// export type Database = SupabaseGeneratedDatabase;