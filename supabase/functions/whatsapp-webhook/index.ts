import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const openAiKey = Deno.env.get('OPENAI_API_KEY') ?? ''

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
      // Inbound (Z-API)
      if (payload?.fromMe || payload?.isGroup) {
        return new Response(JSON.stringify({ status: 'ignored', reason: 'outbound or group' }), { headers: corsHeaders })
      }
      fromNumber = payload?.phone;
      if (!fromNumber) {
        return new Response(JSON.stringify({ status: 'ignored', reason: 'missing phone' }), { headers: corsHeaders })
      }
      textMessage = payload?.buttonsResponseMessage?.message || payload?.message?.text?.message || payload?.text;
      if (!textMessage) {
        return new Response(JSON.stringify({ status: 'ignored', reason: 'missing text message' }), { headers: corsHeaders })
      }
    }

    // 2. Buscar dados do Lead
    let lead, restaurant;
    if (isOutboundTrigger) {
      const { data: l } = await supabase.from('commercial_leads').select('*, restaurants(*)').eq('id', targetLeadId).single();
      if (!l || !l.restaurants) return new Response(JSON.stringify({ error: 'Lead não encontrado' }), { headers: corsHeaders, status: 400 });
      lead = l;
      restaurant = l.restaurants;
      
      fromNumber = restaurant.phone ? restaurant.phone.replace(/\D/g, '') : null;
      
      if (!fromNumber) {
        console.log("Sem telefone para prospecção outbound.");
        return new Response(JSON.stringify({ error: 'Sem telefone' }), { headers: corsHeaders, status: 400 });
      }
    } else {
      // Encontrar restaurante por telefone (últimos 8 dígitos)
      const cleanPhone = fromNumber.replace(/\D/g, '');
      const phoneSuffix = cleanPhone.slice(-8);
      const { data: r } = await supabase.from('restaurants').select('id, name').ilike('phone', `%${phoneSuffix}%`).limit(1).single();
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

    // 4. Prompt Engineering Dinâmico (Vendedor de IA + Regras Gerais)
    let agentSystemPrompt = `Você é um Consultor SDR B2B (Representante de Vendas) da FilterFood.
Restaurante alvo: ${restaurant.name}.
Sua missão: Entrar em contato com esse restaurante. 

DIRETRIZES CRÍTICAS:
1. SEMPRE peça gentilmente um contato ou pergunte se pode falar com o responsável/proprietário do estabelecimento.
2. Explique o motivo do contato (mostrar uma tecnologia nova de cardápio digital sem taxas do FilterFood).
3. NUNCA pareça uma propaganda, robô ou telemarketing. Seja extremamente humano, use linguagem casual mas profissional (ex: "Oi pessoal do ${restaurant.name}, tudo bem?").
4. Se o dono falar que tem dois números (um pessoal e um empresarial), anote e mantenha a conversa fluindo.
5. NUNCA conceda descontos. Seu objetivo é apenas qualificar o interesse e explicar o benefício primário.
6. Mantenha as mensagens muito curtas (1 ou 2 parágrafos no máximo).

Se for a sua primeira mensagem (Início da Prospecção), seja sutil: "Oi! Aqui é da equipe FilterFood, tudo bem? Queria falar com o proprietário do ${restaurant.name} rapidinho sobre uma melhoria pro delivery de vocês, com quem eu falo?"`;

    // Carregar prompt do vendedor associado
    if (lead?.ai_agent_id) {
      const { data: agentData } = await supabase.from('crm_ai_agents').select('name, system_prompt').eq('id', lead.ai_agent_id).single();
      if (agentData?.system_prompt) {
        agentSystemPrompt = `${agentData.system_prompt}
Restaurante alvo: ${restaurant.name}.
Sua missão: Entrar em contato com esse restaurante.`;
      }
    }

    // Carregar regras gerais de negócio
    const { data: rules } = await supabase.from('crm_business_rules').select('rule_name, rule_content').eq('is_active', true);
    let rulesContext = "";
    if (rules && rules.length > 0) {
      rulesContext = "\n\nREGRAS GERAIS E INFORMAÇÕES DO NEGÓCIO:\n" + rules.map(r => `[${r.rule_name}]: ${r.rule_content}`).join('\n');
    }

    const systemPrompt = agentSystemPrompt + rulesContext;

    // 5. Chamada LLM
    const aiResponseReq = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: textMessage }
        ],
        temperature: 0.7, max_tokens: 150
      })
    })

    const aiData = await aiResponseReq.json()
    const aiReply = aiData.choices?.[0]?.message?.content?.trim()

    if (aiReply && fromNumber) {
      // 6. Enviar Mensagem via Z-API carregando credenciais dinamicamente
      const { data: zapiConfig } = await supabase.from('crm_settings').select('*').eq('id', 1).single();
      const instanceId = zapiConfig?.zapi_instance_id;
      const token = zapiConfig?.zapi_instance_token;
      const clientToken = zapiConfig?.zapi_client_token;

      if (instanceId && token) {
        let formattedPhone = fromNumber.replace(/\D/g, '');
        if (formattedPhone && !formattedPhone.startsWith('55')) {
          formattedPhone = '55' + formattedPhone;
        }

        const zapiUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;
        const headers: any = { 'Content-Type': 'application/json' };
        if (clientToken) {
          headers['client-token'] = clientToken;
        }

        const zapiRes = await fetch(zapiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            phone: formattedPhone,
            message: aiReply
          })
        });

        if (zapiRes.ok) {
          // 7. Gravar resposta
          await supabase.from('commercial_events').insert({
            lead_id: lead.id,
            event_type: 'WhatsAppMessageSent',
            actor_type: 'AI',
            payload: { text: aiReply, numberSentTo: formattedPhone }
          });

          // ---- ENVIO DO PRINT DO PERFIL PÚBLICO ----
          if (lead?.public_profile_screenshot_url) {
            // Verificar se já enviamos o print nesta conversa para evitar redundância
            const { data: sentImages } = await supabase.from('commercial_events')
              .select('id')
              .eq('lead_id', lead.id)
              .eq('event_type', 'WhatsAppImageSent')
              .limit(1);

            if (!sentImages || sentImages.length === 0) {
              console.log("Enviando print do perfil público para o cliente...");
              const zapiImgUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-image`;
              const imgRes = await fetch(zapiImgUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  phone: formattedPhone,
                  image: lead.public_profile_screenshot_url,
                  caption: `Veja como ficou o perfil do seu restaurante no FilterFood! Já criamos a base para você.`
                })
              });

              if (imgRes.ok) {
                // Registrar o evento de imagem enviada
                await supabase.from('commercial_events').insert({
                  lead_id: lead.id,
                  event_type: 'WhatsAppImageSent',
                  actor_type: 'AI',
                  payload: { image_url: lead.public_profile_screenshot_url, numberSentTo: formattedPhone }
                });
              } else {
                console.error("Z-API send image failed status:", imgRes.status, await imgRes.text());
              }
            }
          }
        } else {
          console.error("Z-API send text failed status:", zapiRes.status, await zapiRes.text());
        }
      } else {
        console.error("Z-API credentials not configured in crm_settings");
      }
    }

    return new Response(JSON.stringify({ status: 'success' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('Erro no Webhook:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})
