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

// Service Role Key (JWT COMPLETA) - Necessária para uploads de servidor
const SUPABASE_SERVICE_ROLE_KEY_HARDCODED = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzdGZmY29oY2xidHlrYW5nZm50Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDgzOTA0OCwiZXhwIjoyMDc2NDE1MDQ4fQ.kzuLnGuxbL_yBQwZJvezY4a8azmW4P5mvVOgRAsdkbk";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

// Função principal de processamento
async function processMetrics(supabaseAdmin: any) {
  const now = new Date();

  // 1. Buscar agendamentos ativos ou pendentes que deveriam ter começado
  const { data: schedules, error: fetchError } = await supabaseAdmin
    .from('scheduled_metrics')
    .select('*')
    .in('status', ['pending', 'active'])
    .lte('start_time', now.toISOString());

  if (fetchError) {
    console.error("Error fetching schedules:", fetchError);
    return;
  }

  console.log(`Found ${schedules.length} schedules to process.`);

  for (const schedule of schedules) {
    const { id, restaurant_id, target_followers, start_time, end_time, initial_followers } = schedule;
    
    const startTime = new Date(start_time).getTime();
    const endTime = new Date(end_time).getTime();
    const currentTime = now.getTime();

    // Se o agendamento já terminou
    if (currentTime >= endTime) {
      // 2. Finalizar: Garantir que o alvo final seja atingido
      const { error: updateError } = await supabaseAdmin
        .from('restaurants')
        .update({ followers_override: target_followers })
        .eq('id', restaurant_id);
        
      if (updateError) console.error(`Error finalizing restaurant ${restaurant_id}:`, updateError);

      // 3. Marcar como concluído
      await supabaseAdmin
        .from('scheduled_metrics')
        .update({ status: 'completed' })
        .eq('id', id);
        
      console.log(`Schedule ${id} completed. Target: ${target_followers}`);
      continue;
    }

    // Se o agendamento estiver ativo (ou começando agora)
    
    const totalDurationMs = endTime - startTime;
    const elapsedDurationMs = currentTime - startTime;
    const progress = elapsedDurationMs / totalDurationMs; // 0.0 a 1.0
    
    const totalIncrease = target_followers - initial_followers;
    
    // Calcular o novo valor de seguidores baseado no progresso
    const newFollowers = Math.round(initial_followers + (totalIncrease * progress));
    
    // 4. Atualizar o contador de seguidores do restaurante
    const { error: updateError } = await supabaseAdmin
      .from('restaurants')
      .update({ followers_override: newFollowers })
      .eq('id', restaurant_id);

    if (updateError) {
      console.error(`Error updating restaurant ${restaurant_id}:`, updateError);
    } else {
      // 5. Marcar como ativo se estava pendente
      if (schedule.status === 'pending') {
        await supabaseAdmin
          .from('scheduled_metrics')
          .update({ status: 'active' })
          .eq('id', id);
      }
      console.log(`Schedule ${id} active. Progress: ${Math.round(progress * 100)}%. New followers: ${newFollowers}`);
    }
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  // 1. Autenticação (Apenas para chamadas internas ou de cron job)
  // Para simular um cron job, não exigimos autenticação JWT, mas verificamos uma chave secreta.
  const secretHeader = req.headers.get('X-Cron-Secret');
  if (secretHeader !== Deno.env.get("CRON_SECRET")) {
    // NOTE: Em produção, você deve configurar CRON_SECRET no Supabase Secrets
    // return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || SUPABASE_SERVICE_ROLE_KEY_HARDCODED;
    const supabaseAdmin = createClient(SUPABASE_URL, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    await processMetrics(supabaseAdmin);

    return new Response(JSON.stringify({ message: "Scheduled metrics processed successfully." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Edge Function Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message || "Internal server error." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});