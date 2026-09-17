import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ijeoytltjebnuzckzngi.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''; // I need the anon key.
