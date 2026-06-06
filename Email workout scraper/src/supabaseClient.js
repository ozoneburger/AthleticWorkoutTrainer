import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const configuredAuthRedirectUrl = import.meta.env.VITE_AUTH_REDIRECT_URL;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const authRedirectUrl = configuredAuthRedirectUrl || "https://jumptrainer.vercel.app";

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
