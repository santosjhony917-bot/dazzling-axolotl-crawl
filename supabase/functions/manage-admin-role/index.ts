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

// Service Role Key (JWT COMPLETA) - Necessária para auth.admin
const SUPABASE_SERVICE_ROLE_KEY_HARDCODED = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzdGZmY29oY2xidHlrYW5nZm50Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDgzOTA0OCwiZXhwIjoyMDc2NDE1MDQ4fQ.kzuLnGuxbL_yBQwZJvezY4a8azmW4P5mvVOgRAsdkbk";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, email, userId } = await req.json();
    
    // 1. Initialize Supabase client with Service Role Key
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || SUPABASE_SERVICE_ROLE_KEY_HARDCODED;
    const supabaseAdmin = createClient(SUPABASE_URL, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let responseData;

    if (action === 'list') {
        // 3. List Admins (Requires fetching all users and filtering by metadata)
        let allUsers: any[] = [];
        let page = 1;
        const pageSize = 1000; // Max page size

        while (true) {
            const { data, error } = await supabaseAdmin.auth.admin.listUsers({
                page: page,
                perPage: pageSize,
            });

            if (error) throw error;
            
            allUsers = allUsers.concat(data.users);
            
            if (data.users.length < pageSize) break;
            page++;
        }
        
        const admins = allUsers
            .filter(u => u.user_metadata?.role === 'admin' || u.email === 'joaoedasilva018@gmail.com') // Incluindo o admin principal
            .map(u => ({
                id: u.id,
                email: u.email,
                role: u.user_metadata?.role || 'user',
            }));
            
        responseData = { admins };

    } else if (action === 'add' && email) {
        // 4. Add Admin Role
        
        // CORREÇÃO: Usar listUsers com filtro para encontrar o usuário por email
        const { data: listData, error: fetchError } = await supabaseAdmin.auth.admin.listUsers({
            filter: `email eq "${email}"`,
            perPage: 1,
        });
        
        if (fetchError) throw fetchError;
        
        const userToPromote = listData.users[0];

        if (!userToPromote) {
            // Se o usuário não for encontrado, retorna um erro 404
            return new Response(JSON.stringify({ error: `Usuário com email ${email} não encontrado. Certifique-se de que a conta existe.` }), { 
                status: 404, 
                headers: { ...corsHeaders, "Content-Type": "application/json" } 
            });
        }
        
        // Se o usuário for encontrado, atualiza o metadado
        const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userToPromote.id,
            { user_metadata: { role: 'admin' } }
        );
        
        if (updateError) throw updateError;
        
        responseData = { message: `User ${email} promoted to admin.`, user: updatedUser.user };

    } else if (action === 'remove' && userId) {
        // 5. Remove Admin Role
        const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { user_metadata: { role: null } } // Remove o papel
        );
        
        if (updateError) throw updateError;
        
        responseData = { message: `Admin role removed from user ID ${userId}.`, user: updatedUser.user };

    } else {
        return new Response(JSON.stringify({ error: "Invalid action or missing parameters." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Admin role management error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message || "Internal server error." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});