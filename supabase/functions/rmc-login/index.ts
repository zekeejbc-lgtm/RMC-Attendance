import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const respond = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const { identifier, password } = await req.json();
    if (typeof identifier !== 'string' || typeof password !== 'string' || identifier.length > 254 || password.length > 1024) throw new Error('Invalid credentials');
    const normalized = identifier.trim().toLowerCase();
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).map(b => b.toString(16).padStart(2, '0')).join('');
    const { error: rateError } = await admin.rpc('rmc_login_limit', { identifier_hash: await hash(normalized), ip_hash: await hash(ip) });
    if (rateError) return respond({ error: 'Too many sign-in attempts. Try again in 15 minutes.' }, 429);
    let email = normalized;
    if (!normalized.includes('@')) {
      const { data } = await admin.from('rmc_profiles').select('profile').eq('profile->>username', normalized).maybeSingle();
      email = data?.profile.email || 'nonexistent@invalid.example';
    }
    const client = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.session) throw new Error('Invalid credentials');
    const { data: profile } = await admin.from('rmc_profiles').select('status').eq('id', data.user.id).single();
    if (!profile || !['pending', 'active'].includes(profile.status)) throw new Error('Invalid credentials');
    return respond({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  } catch {
    return respond({ error: 'Unable to sign in. Check your credentials and email verification.' }, 401);
  }
});
