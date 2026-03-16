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

    const superadmins = [
      { email: 'chandra@pinsar.id', password: 'superadmin123456789', full_name: 'Chandra' },
      { email: 'alda@pinsar.id', password: 'superadmin123456789', full_name: 'Alda' },
    ];

    const results = [];

    for (const sa of superadmins) {
      // Check if already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', sa.email)
        .maybeSingle();

      if (existingProfile) {
        // Update role to superadmin if needed
        await supabase.from('profiles').update({ role: 'superadmin', status: 'approved' }).eq('id', existingProfile.id);
        await supabase.from('user_roles').upsert({ user_id: existingProfile.id, role: 'superadmin' }, { onConflict: 'user_id,role' });
        results.push({ email: sa.email, status: 'updated' });
        continue;
      }

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: sa.email,
        password: sa.password,
        email_confirm: true,
      });

      if (authError) {
        results.push({ email: sa.email, error: authError.message });
        continue;
      }

      await supabase.from('profiles').insert({
        id: authData.user.id,
        full_name: sa.full_name,
        email: sa.email,
        role: 'superadmin',
        status: 'approved',
      });

      // Also insert into user_roles
      await supabase.from('user_roles').insert({
        user_id: authData.user.id,
        role: 'superadmin',
      });

      results.push({ email: sa.email, status: 'created' });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
