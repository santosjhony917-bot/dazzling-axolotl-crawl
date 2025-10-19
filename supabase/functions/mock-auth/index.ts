import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, role } = await req.json();

    if (!email || !password || !role) {
      return new Response(JSON.stringify({ error: 'Missing email, password, or role' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client with Service Role Key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    let user;

    // 1. Check if user exists
    const { data: { users: existingUsers } } = await supabaseAdmin.auth.admin.listUsers({
        filter: `email eq '${email}'`,
        limit: 1
    });
    
    if (existingUsers && existingUsers.length > 0) {
        user = existingUsers[0];
        // 2. Update user to ensure email is confirmed and password is set
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
            email_confirm: true,
            password: password,
        });
    } else {
        // 3. Create user with confirmed email
        const { data: { user: newUser }, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });

        if (createUserError || !newUser) {
            throw new Error(createUserError?.message || 'Failed to create user.');
        }
        user = newUser;
    }

    // 4. Assign role using RPC
    const { error: roleError } = await supabaseAdmin.rpc('set_user_role', { new_role: role, user_id: user.id });
    
    if (roleError) {
        console.error("Role assignment error:", roleError);
        throw new Error(roleError.message);
    }

    // NEW: If the role is a restaurant role, ensure a restaurant profile exists
    if (role === 'free_restaurant' || role === 'premium_restaurant') {
      const { data: existingRestaurant, error: fetchRestaurantError } = await supabaseAdmin
        .from('restaurants')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (fetchRestaurantError && fetchRestaurantError.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error("Error fetching existing restaurant:", fetchRestaurantError);
        throw new Error(fetchRestaurantError.message);
      }

      if (!existingRestaurant) {
        // Create a new restaurant entry if one doesn't exist
        const { error: insertRestaurantError } = await supabaseAdmin
          .from('restaurants')
          .insert({
            user_id: user.id,
            name: `Restaurante Mock (${role === 'free_restaurant' ? 'Free' : 'Premium'})`,
            address: 'Rua Fictícia, 123',
            city: 'João Pessoa',
            state: 'PB',
            cep: '58039-000',
            neighborhood: 'Tambaú',
            plan: role === 'premium_restaurant' ? 'premium' : 'free', // Map AppRole to restaurant_plan
            category: 'Comida Variada',
            latitude: -7.1195, // Example coordinates for João Pessoa
            longitude: -34.8450,
          });

        if (insertRestaurantError) {
          console.error("Error inserting new restaurant:", insertRestaurantError);
          throw new Error(insertRestaurantError.message);
        }
      } else {
        // If restaurant exists, ensure its plan matches the role
        const { error: updateRestaurantPlanError } = await supabaseAdmin
          .from('restaurants')
          .update({ plan: role === 'premium_restaurant' ? 'premium' : 'free' })
          .eq('user_id', user.id);

        if (updateRestaurantPlanError) {
          console.error("Error updating restaurant plan:", updateRestaurantPlanError);
          throw new Error(updateRestaurantPlanError.message);
        }
      }
    }

    // 5. Return success status. Client will perform signInWithPassword now.
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Edge Function Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});