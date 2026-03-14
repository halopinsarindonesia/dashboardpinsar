import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const accounts = [
    { email: "dpp@test.com", password: "test1234", full_name: "Admin DPP", role: "dpp", province: null },
    { email: "dpw@test.com", password: "test1234", full_name: "Admin DPW Jawa Barat", role: "dpw", province: "Jawa Barat" },
    { email: "peternak@test.com", password: "test1234", full_name: "Peternak Test", role: "peternak", province: "Jawa Barat" },
  ];

  const results = [];

  for (const acc of accounts) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: acc.email,
      password: acc.password,
      email_confirm: true,
    });

    if (error) {
      results.push({ email: acc.email, error: error.message });
      continue;
    }

    const userId = data.user.id;

    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      full_name: acc.full_name,
      email: acc.email,
      role: acc.role,
      status: "approved",
      province: acc.province,
    });

    results.push({ email: acc.email, success: !profileError, profileError: profileError?.message });
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});
