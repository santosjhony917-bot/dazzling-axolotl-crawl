// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Service Role Key (JWT COMPLETA)
const SUPABASE_SERVICE_ROLE_KEY_HARDCODED = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzdGZmY29oY2xidHlrYW5nZm50Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDgzOTA0OCwiZXhwIjoyMDc2NDE1MDQ4fQ.kzuLnGuxbL_yBQwZJvezY4a8azmW4P5mvVOgRAsdkbk";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accessCode, email, password } = await req.json();
    
    if (!accessCode || !email || !password) {
        return new Response(JSON.stringify({ error: "Missing required fields." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || SUPABASE_SERVICE_ROLE_KEY_HARDCODED;
    const supabaseAdmin = createClient(SUPABASE_URL, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Verify if the restaurant exists and is unclaimed (user_id is NULL)
    const { data: restaurantData, error: fetchError } = await supabaseAdmin
      .from("restaurants")
      .select("id, user_id")
      .eq("id", accessCode)
      .single();

    if (fetchError || !restaurantData) {
        return new Response(JSON.stringify({ error: "Código de acesso inválido ou restaurante não encontrado." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    
    if (restaurantData.user_id) {
        return new Response(JSON.stringify({ error: "Este restaurante já foi reivindicado por outro usuário." }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Create the new user account
    const { data: userData, error: userCreateError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Skip email confirmation for immediate access
    });

    if (userCreateError) {
        console.error("Supabase User Creation Error:", userCreateError);
        return new Response(JSON.stringify({ error: userCreateError.message || "Falha ao criar conta de usuário." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
    
    const userId = userData.user.id;

    // 3. Link the restaurant to the new user ID
    const { error: updateError } = await supabaseAdmin
      .from("restaurants")
      .update({ user_id: userId })
      .eq("id", accessCode);

    if (updateError) {
      console.error("Supabase Update Error:", updateError);
      // NOTE: If this fails, the user account is created but not linked. 
      // A rollback mechanism or manual cleanup might be needed in a production system.
      return new Response(JSON.stringify({ error: "Falha ao vincular o restaurante ao usuário." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // 4. Return success with credentials for client login
    return new Response(JSON.stringify({ 
      message: "Restaurant claimed successfully", 
      restaurantId: accessCode,
      email: email,
      password: password, 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Request processing error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message || "Erro interno do servidor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});