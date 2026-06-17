import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const openAiKey = Deno.env.get('OPENAI_API_KEY') ?? ''
const whatsappApiUrl = Deno.env.get('WHATSAPP_API_URL') ?? '' 
const whatsappInstance = Deno.env.get('WHATSAPP_INSTANCE_ID') ?? ''
const whatsappApiKey = Deno.env.get('WHATSAPP_API_KEY') ?? ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }) }

  try {
    const payload = await req.json()
    console.log("Webhook Recebido:", JSON.stringify(payload, null, 2))

    let isOutboundTrigger = false;
    let targetLeadId = null;
    let textMessage = "";
    let fromNumber = "";

    // 1. Identificar se é um gatilho de Saída (Outbound - QRCodeScanned) ou Entrada (Inbound - Resposta do Lead)
    if (payload?.event === 'QRCodeScanned' && payload?.lead_id) {
      isOutboundTrigger = true;
      targetLeadId = payload.lead_id;
      textMessage = "[SISTEMA]: O cliente acabou de escanear o QR Code da carta. Inicie o contato agora de forma natural e amigável.";
    } else {
      // Inbound (Evolutio API)
      const messageData = payload?.data?.message
      if (!messageData || messageData.fromMe) {
        return new Response(JSON.stringify({ status: 'ignored' }), { headers: corsHeaders })
      }
      fromNumber = messageData.remoteJid?.split('@')[0]
      textMessage = messageData.conversation || messageData.extendedTextMessage?.text
      if (!textMessage) return new Response(JSON.stringify({ status: 'ignored' }), { headers: corsHeaders })
    }

    // 2. Buscar dados do Lead
    let lead, restaurant;
    if (isOutboundTrigger) {
      const { data: l } = await supabase.from('commercial_leads').select('*, restaurants(*)').eq('id', targetLeadId).single();
      if (!l || !l.restaurants) return new Response(JSON.stringify({ error: 'Lead não encontrado' }), { headers: corsHeaders, status: 400 });
      lead = l;
      restaurant = l.restaurants;
      
      // A IA primeiro deve tentar o celular pessoal (se houver no profile), senão vai no empresarial
      // Como não cruzamos com profile ainda nesta versão, usamos o restaurante
      fromNumber = restaurant.phone ? restaurant.phone.replace(/\D/g, '') : null;
      
      if (!fromNumber) {
        console.log("Sem telefone para prospecção outbound.");
        return new Response(JSON.stringify({ error: 'Sem telefone' }), { headers: corsHeaders, status: 400 });
      }
    } else {
      const { data: r } = await supabase.from('restaurants').select('id, name').ilike('phone', `%${fromNumber.slice(-8)}%`).limit(1).single();
      if (!r) return new Response(JSON.stringify({ status: 'ignored', reason: 'Not a lead' }), { headers: corsHeaders });
      restaurant = r;
      const { data: l } = await supabase.from('commercial_leads').select('*').eq('restaurant_id', restaurant.id).single();
      if (!l || !l.is_ai_active) return new Response(JSON.stringify({ status: 'ignored', reason: 'AI disabled' }), { headers: corsHeaders });
      lead = l;

      // Event Sourcing Inbound
      await supabase.from('commercial_events').insert({
        lead_id: lead.id, event_type: 'WhatsAppMessageReceived', actor_type: 'Lead', payload: { text: textMessage }
      })
    }

    // 3. Recuperar histórico RAG
    const { data: pastEvents } = await supabase.from('commercial_events')
      .select('event_type, actor_type, payload, created_at')
      .eq('lead_id', lead.id)
      .in('event_type', ['WhatsAppMessageReceived', 'WhatsAppMessageSent'])
      .order('created_at', { ascending: false })
      .limit(10)

    const conversationHistory = (pastEvents || []).reverse().map(e => ({
      role: e.actor_type === 'AI' ? 'assistant' : 'user',
      content: e.payload?.text || ''
    })).filter(e => e.content)

    // 4. Prompt Engineering Avançado (A "Coleira" da IA)
    const systemPrompt = `Você é um Consultor SDR B2B (Representante de Vendas) da FilterFood.
Restaurante alvo: ${restaurant.name}.
Sua missão: Entrar em contato com esse restaurante. 

DIRETRIZES CRÍTICAS:
1. SEMPRE peça gentilmente um contato ou pergunte se pode falar com o responsável/proprietário do estabelecimento.
2. Explique o motivo do contato (mostrar uma tecnologia nova de cardápio digital sem taxas do FilterFood).
3. NUNCA pareça uma propaganda, robô ou telemarketing. Seja extremamente humano, use linguagem casual mas profissional (ex: "Oi pessoal do ${restaurant.name}, tudo bem?").
4. Se o dono falar que tem dois números (um pessoal e um empresarial), anote e mantenha a conversa fluindo.
5. NUNCA conceda descontos. Seu objetivo é apenas qualificar o interesse e explicar o benefício primário.
6. Mantenha as mensagens muito curtas (1 ou 2 parágrafos no máximo).

Se for a sua primeira mensagem (Início da Prospecção), seja sutil: "Oi! Aqui é da equipe FilterFood, tudo bem? Queria falar com o proprietário do ${restaurant.name} rapidinho sobre uma melhoria pro delivery de vocês, com quem eu falo?"`

    // 5. Chamada LLM
    const aiResponseReq = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: textMessage } // O textMessage aqui pode ser o [SISTEMA] no caso de outbound
        ],
        temperature: 0.7, max_tokens: 150
      })
    })

    const aiData = await aiResponseReq.json()
    const aiReply = aiData.choices?.[0]?.message?.content?.trim()

    if (aiReply && whatsappApiUrl && whatsappApiKey && fromNumber) {
      // 6. Enviar Mensagem Evolution API
      // Nota para a V2: Lógica para enviar para o "Número Pessoal" (profiles.phone) caso o dono já tenha se registrado.
      await fetch(`${whatsappApiUrl}/message/sendText/${whatsappInstance}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': whatsappApiKey },
        body: JSON.stringify({
          number: fromNumber, // Envia pro WhatsApp
          options: { delay: 1500, presence: 'composing' },
          textMessage: { text: aiReply }
        })
      })

      // 7. Gravar resposta
      await supabase.from('commercial_events').insert({
        lead_id: lead.id, event_type: 'WhatsAppMessageSent', actor_type: 'AI', payload: { text: aiReply, numberSentTo: fromNumber }
      })
    }

    return new Response(JSON.stringify({ status: 'success' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('Erro no Webhook:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})
