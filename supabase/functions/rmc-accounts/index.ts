import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const respond = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
  const token = req.headers.get('Authorization')?.replace(/^Bearer /i, '');
  if (!token) return respond({ error: 'Sign in first.' }, 401);
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return respond({ error: 'Invalid session.' }, 401);
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
  const created: string[] = [];
  try {
    const { action, data } = await req.json();
    if (action === 'deactivate') {
      // Deactivation immediately revokes database access, including unexpired JWTs.
      const { error } = await caller.rpc('rmc_deactivate_account', { target: data.uid });
      if (error) throw error;
      const { error: banError } = await admin.auth.admin.updateUserById(data.uid, { ban_duration: '876000h' });
      if (banError) throw banError;
      return respond({ ok: true });
    }
    if (action !== 'create' || !Array.isArray(data?.members) || data.members.length < 1 || data.members.length > 100) throw new Error('Provide between 1 and 100 accounts.');
    const members = [];
    for (const member of data.members) {
      if (member.password && member.password.length < 12) throw new Error('Temporary passwords must contain at least 12 characters.');
      const { data: profile, error } = await caller.rpc('rmc_reserve_account', { person: member.profile });
      if (error) throw error;
      members.push({ ...member, profile });
    }
    const accounts = [];
    for (const member of members) {
      // CSV imports use an unguessable password. A password recovery email can be
      // requested by the account owner; provisioning itself never sends email.
      const password = member.password || crypto.randomUUID() + crypto.randomUUID();
      const { data: account, error } = await admin.auth.admin.createUser({
        email: member.profile.email.trim().toLowerCase(), password, email_confirm: true,
        user_metadata: { profile: member.profile },
        app_metadata: { rmc_provisioned: true, provisioned_by: user.id },
      });
      if (error || !account.user) throw error || new Error('Account creation failed.');
      created.push(account.user.id);
      accounts.push({ uid: account.user.id, profile: member.profile });
    }
    const { error } = await caller.rpc('rmc_provision_complete', { accounts });
    if (error) throw error;
    return respond({ ids: created });
  } catch (error) {
    // Profiles are committed as a single transaction. Remove only Auth users
    // created by this request if any stage before that commit fails.
    for (const id of created) {
      const { error: cleanupError } = await admin.auth.admin.deleteUser(id);
      if (cleanupError) console.error('Provisioning cleanup required', id, cleanupError.message);
    }
    return respond({ error: error instanceof Error ? error.message : (error as { message?: string })?.message || 'Account operation failed.' }, 400);
  }
});
