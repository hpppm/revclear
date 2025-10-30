import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseClient: SupabaseClient | null = null;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (supabaseUrl && supabaseServiceRoleKey && supabaseUrl !== 'https://your-project.supabase.co' && supabaseServiceRoleKey !== 'your-service-role-key') {
  supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);
  console.log('Supabase client initialized successfully.');
} else {
  console.warn('Supabase URL or Service Role Key is not set or is a placeholder. Supabase client will not be fully functional.');
}

export const supabase = supabaseClient as SupabaseClient;
