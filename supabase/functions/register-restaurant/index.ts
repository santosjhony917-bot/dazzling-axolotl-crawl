declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Service Role Key (JWT COMPLETA)
// Usamos a variável de ambiente SUPABASE_SERVICE_ROLE_KEY se disponível, caso contrário, usamos a chave hardcoded.
const SUPABASE_SERVICE_ROLE_KEY_HARDCODED = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzdGZmY29oY2xidHlrYW5nZm50Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDgzOTA0OCwiZXhwIjoyMDc2NDE1MDQ4fQ.2111111111111111111111111111111111111111111111111111111111111111";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { restaurantName, locations, email, password } = await req.json();
    
    // Prioriza a chave da variável de ambiente, se configurada no Supabase Console
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || SUPABASE_SERVICE_ROLE_KEY_HARDCODED;

    // 1. Initialize Supabase client with Service Role Key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    let userId: string;
    
    // 2. Tenta criar o usuário (email_confirm: true para pular o e-mail de confirmação)
    const { data: userData, error: userCreateError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, 
    });

    if (userCreateError) {
        // Se o erro for 'User already exists', tentamos fazer login para obter o ID
        if (userCreateError.message.includes('User already exists')) {
            
            // Tenta fazer login para obter a sessão e o ID do usuário existente
            const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({ email, password });

            if (signInError) {
                console.error("Supabase Sign In Error (Existing User):", signInError);
                return new Response(JSON.stringify({ error: "Usuário já existe, mas as credenciais fornecidas estão incorretas." }), {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
            
            userId = signInData.user!.id;
            
        } else {
            // Outro erro de criação de usuário
            console.error("Supabase User Creation Error:", userCreateError);
            return new Response(JSON.stringify({ error: userCreateError.message || "Falha ao criar conta de usuário." }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
    } else {
        // Usuário criado com sucesso
        userId = userData.user.id;
    }
    
    // 4. Prepare restaurant data (using the first location for the main entry)
    const mainLocation = locations[0];
    
    const restaurantData = {
      user_id: userId,
      name: restaurantName,
      address: `${mainLocation.street}, ${mainLocation.number} ${mainLocation.complement}`,
      city: mainLocation.city,
      state: mainLocation.state,
      cep: mainLocation.cep,
      neighborhood: mainLocation.neighborhood,
      phone: mainLocation.phone,
      email: email,
    };

    // 5. Insert the main restaurant entry
    const { data: restaurantInsertData, error: insertError } = await supabaseAdmin
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
    
    // 6. Return success
    return new Response(JSON.stringify({ 
      message: "Restaurant registered successfully", 
      restaurantId: restaurantInsertData.id,
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