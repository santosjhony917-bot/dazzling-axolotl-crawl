import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with the user's JWT from the request header
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "", // Use anon key for client-side functions
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get the authenticated user from the JWT
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: userError?.message || "Unauthorized." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { restaurantName, location } = await req.json();

    // Prepare restaurant data
    const restaurantData = {
      user_id: user.id,
      name: restaurantName,
      address: location.street,
      number: location.number,
      city: location.city,
      state: location.state,
      cep: location.cep,
      neighborhood: location.neighborhood,
      phone: location.phone,
      email: user.email, // Get email from authenticated user
    };

    // Insert the restaurant entry
    const { data: restaurantInsertData, error: insertError } = await supabaseClient
      .from("restaurants")
      .insert([restaurantData])
      .select()
      .single();

    if (insertError) {
      console.error("Supabase Insert Error:", insertError);
      return new Response(JSON.stringify({ error: "Falha ao registrar restaurante no banco de dados." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return success
    return new Response(JSON.stringify({
      message: "Restaurante registrado com sucesso para o usuário existente",
      restaurantId: restaurantInsertData.id,
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