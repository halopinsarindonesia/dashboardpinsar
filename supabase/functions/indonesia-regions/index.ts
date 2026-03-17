import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const BASE_URL = "https://emsifa.github.io/api-wilayah-indonesia/api";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type"); // provinces, regencies, districts, villages
    const id = url.searchParams.get("id"); // parent id

    let apiUrl: string;
    switch (type) {
      case "provinces":
        apiUrl = `${BASE_URL}/provinces.json`;
        break;
      case "regencies":
        apiUrl = `${BASE_URL}/regencies/${id}.json`;
        break;
      case "districts":
        apiUrl = `${BASE_URL}/districts/${id}.json`;
        break;
      case "villages":
        apiUrl = `${BASE_URL}/villages/${id}.json`;
        break;
      default:
        return new Response(JSON.stringify({ error: "Invalid type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const response = await fetch(apiUrl);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
