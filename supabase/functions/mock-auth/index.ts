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

    // 1. Check if user exists
    const { data: { users: existingUsers } } = await supabaseAdmin.auth.admin.listUsers({
        filter: `email eq '${email}'`,
        limit: 1
    });
    
    let user;

    if (existingUsers && existingUsers.length > 0) {
        user = existingUsers[0];
        // 2. Update user to ensure email is confirmed (if needed)
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
            email_confirm: true,
            password: password, // Ensure password is set correctly
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

    // 4. Assign role using RPC (must be called by the admin client)
    const { error: roleError } = await supabaseAdmin.rpc('set_user_role', { new_role: role, user_id: user.id });
    
    if (roleError) {
        console.error("Role assignment error:", roleError);
        throw new Error(roleError.message);
    }

    // 5. Return the user's JWT token for client-side login
    const { data: { session }, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({ email, password });

    if (sessionError || !session) {
        throw new Error(sessionError?.message || 'Failed to create session.');
    }

    return new Response(JSON.stringify({ token: session.access_token }), {
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