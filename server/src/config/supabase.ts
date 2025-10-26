import { createClient, SupabaseClient } from '@supabase/supabase-js';
import config from '../config/config';

let supabase: SupabaseClient | null = null;

if (!config.supabase.url || !config.supabase.serviceKey) {
  console.warn(
    'Supabase configuration is missing. Database features will be disabled.',
  );
} else {
  supabase = createClient(
    config.supabase.url,
    config.supabase.serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

export { supabase };
export default supabase;
