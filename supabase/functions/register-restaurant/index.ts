/// <reference types="https://deno.land/std@0.190.0/http/server.ts" />
/// <reference types="https://esm.sh/@supabase/supabase-js@2.45.0" />

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Service Role Key provided by the user
const SUPABASE_SERVICE_ROLE_KEY = "sb_secret_nSL-typdFzLSpmvTLJyXYA_4xoQGE0W";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { restaurantName, locations, email, password } = await req.json();
    
    // 1. Initialize Supabase client with Service Role Key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    let userId: string;
    
    // 2. Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({
        filter: `email eq '${email}'`,
    });

    if (existingUsers && existingUsers.users.length > 0) {
        // User exists, use their ID
        userId = existingUsers.users[0].id;
    } else {
        // 3. Create the user using the Service Role Key (skips email confirmation)
        const { data: userData, error: userCreateError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // IMPORTANT: Automatically confirms the email
        });

        if (userCreateError) {
            console.error("Supabase User Creation Error:", userCreateError);
            return new Response(JSON.stringify({ error: "Failed to create user account." }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
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
      // latitude and longitude are null initially, they will be updated later by the user in the profile menu
    };

    // 5. Insert the main restaurant entry
    const { data: restaurantInsertData, error: insertError } = await supabaseAdmin
      .from("restaurants")
      .insert([restaurantData])
      .select()
      .single();

    if (insertError) {
      console.error("Supabase Insert Error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to register restaurant in database." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // 6. Sign in the user immediately after successful creation/registration
    const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    
    if (signInError) {
        console.error("Supabase Sign In Error:", signInError);
        // We proceed even if sign-in fails here, as the user is created and restaurant registered.
    }

    // 7. Return success
    return new Response(JSON.stringify({ 
      message: "Restaurant and user registered successfully", 
      restaurantId: restaurantInsertData.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Request processing error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message || "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});