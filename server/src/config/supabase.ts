import { createClient } from '@supabase/supabase-js';
import config from '../config/config';

if (!config.supabase.url || !config.supabase.serviceKey) {
  console.warn(
    'Supabase configuration is missing. Database features will be disabled.',
  );
}

export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

export default supabase;
