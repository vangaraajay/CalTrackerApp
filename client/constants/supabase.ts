import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_DB_API_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_API_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);