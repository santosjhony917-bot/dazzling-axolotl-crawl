import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const supabaseAnonKey = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);