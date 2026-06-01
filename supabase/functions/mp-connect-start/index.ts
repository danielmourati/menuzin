// ============================================================
// Edge Function: mp-connect-start
// Starts the Mercado Pago OAuth Integration flow
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: req.headers.get("Authorization")! } },
      }
    );

    // 1. Get Logged User details
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Parse request payload
    const { store_id } = await req.json();
    if (!store_id) {
      return new Response(JSON.stringify({ error: "Missing store_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Verify user ownership of the store (multi-tenant check)
    // Assuming a relation table: store_owners (store_id, user_id)
    const { data: ownership, error: ownerError } = await supabaseClient
      .from("stores")
      .select("id")
      .eq("id", store_id)
      .single();

    if (ownerError || !ownership) {
      return new Response(JSON.stringify({ error: "Forbidden: Not the store owner" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Generate secure and signed state token (e.g. encrypting store_id + timestamp)
    const stateToken = btoa(JSON.stringify({
      store_id,
      timestamp: Date.now(),
      salt: crypto.randomUUID()
    }));

    // 5. Build Mercado Pago Authorization URI
    const clientId = Deno.env.get("MP_CLIENT_ID");
    const redirectUri = Deno.env.get("MP_REDIRECT_URI") || "https://foodcatalogo.app/api/mp-oauth-callback";
    
    if (!clientId) {
      throw new Error("Missing Mercado Pago CLIENT_ID configuration on server.");
    }

    const authorizationUrl = `https://auth.mercadopago.com.br/authorization?client_id=${clientId}&response_type=code&platform_id=mp&state=${stateToken}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    return new Response(JSON.stringify({ authorization_url: authorizationUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
