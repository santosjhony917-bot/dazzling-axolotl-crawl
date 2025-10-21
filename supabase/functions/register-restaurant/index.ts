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

  // Manual authentication handling (since verify_jwt is false)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized: Missing Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { restaurantName, locations } = await req.json();
    
    // 1. Initialize Supabase client with Service Role Key
    // This client bypasses RLS policies, allowing us to insert data securely from the backend.
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

    // 2. Get the user ID from the JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid token or user not found" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const userId = user.id;
    
    // 3. Prepare restaurant data (using the first location for the main entry)
    const mainLocation = locations[0];
    
    // Geocoding is complex in a simple edge function, so we rely on the frontend to provide coordinates 
    // or we skip them for now, focusing on the core data insertion.
    
    const restaurantData = {
      user_id: userId,
      name: restaurantName,
      address: `${mainLocation.street}, ${mainLocation.number} ${mainLocation.complement}`,
      city: mainLocation.city,
      state: mainLocation.state,
      cep: mainLocation.cep,
      neighborhood: mainLocation.neighborhood,
      phone: mainLocation.phone,
      email: user.email, // Use the user's auth email
      // latitude and longitude are null initially, they will be updated later by the user in the profile menu
    };

    // 4. Insert the main restaurant entry
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

    // 5. Return success
    return new Response(JSON.stringify({ 
      message: "Restaurant registered successfully", 
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