import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller } } = await supabase.auth.getUser(token);
    if (!caller) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: callerProfile } = await supabase.from('profiles').select('role, full_name').eq('id', caller.id).single();
    if (!callerProfile || !['dpp', 'dpw'].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const { email, password, full_name, phone, role, province, house_address, work_address, status: userStatus } = body;

    if (callerProfile.role === 'dpw' && role === 'dpp') {
      return new Response(JSON.stringify({ error: 'DPW cannot create DPP users' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authError) return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      full_name,
      email,
      phone: phone || null,
      role,
      status: userStatus || 'approved',
      province: province || null,
      house_address: house_address || null,
      work_address: work_address || null,
    });
    if (profileError) return new Response(JSON.stringify({ error: profileError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Audit log
    await supabase.from('audit_logs').insert({
      action: 'create',
      module: 'User',
      user_id: caller.id,
      user_name: callerProfile.full_name,
      new_value: { full_name, email, role, province },
    });

    return new Response(JSON.stringify({ success: true, user_id: authData.user.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
