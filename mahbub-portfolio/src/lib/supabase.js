import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Only the public project URL and the anon/publishable key are used here.
// All security comes from Row Level Security and Storage policies (see supabase/schema.sql).
export const supabase = configured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    })
  : null;

export function publicUrl(bucket, path) {
  if (!supabase || !path) return '';
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export const BUCKETS = {
  images: 'portfolio-images',
  videos: 'portfolio-videos',
  thumbs: 'portfolio-thumbnails',
  profile: 'profile-media'
};
