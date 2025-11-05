// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { restaurantId } = await req.json()
    if (!restaurantId) {
      throw new Error('ID do restaurante é obrigatório.')
    }

    // Crie um cliente Supabase para interagir com o seu banco de dados.
    // Importante: use o SERVICE_ROLE_KEY para ter permissões de administrador.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Obtenha o usuário a partir do token de autorização.
    const authHeader = req.headers.get('Authorization')!
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))

    if (!user) {
      return new Response(JSON.stringify({ error: 'Usuário não autenticado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verificação de segurança no lado do servidor:
    // 1. Verifique se o restaurante existe.
    // 2. Verifique se o restaurante ainda não foi reivindicado (user_id é nulo).
    const { data: restaurant, error: fetchError } = await supabaseAdmin
      .from('restaurants')
      .select('user_id')
      .eq('id', restaurantId)
      .single()

    if (fetchError || !restaurant) {
      return new Response(JSON.stringify({ error: 'Restaurante não encontrado ou código inválido.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (restaurant.user_id) {
      return new Response(JSON.stringify({ error: 'Este restaurante já foi reivindicado.' }), {
        status: 409, // Conflict
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Se tudo estiver correto, atualize o restaurante com o ID do novo usuário.
    const { error: updateError } = await supabaseAdmin
      .from('restaurants')
      .update({ user_id: user.id })
      .eq('id', restaurantId)

    if (updateError) {
      throw updateError
    }

    return new Response(JSON.stringify({ message: 'Restaurante reivindicado com sucesso!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})