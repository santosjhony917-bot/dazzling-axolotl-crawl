// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Payload can have estabelecimento_id, claim_code, or whatsapp_numero
    const { estabelecimento_id, claim_code, whatsapp_numero, restaurant_id } = await req.json();

    let lead = null;

    // 1. Resolve Lead/Establishment
    if (estabelecimento_id) {
      const { data } = await supabaseAdmin
        .from("estabelecimentos")
        .select("*")
        .eq("id", estabelecimento_id)
        .single();
      lead = data;
    } else if (whatsapp_numero) {
      const { data } = await supabaseAdmin
        .from("estabelecimentos")
        .select("*")
        .eq("whatsapp_numero", whatsapp_numero)
        .limit(1);
      lead = data?.[0];
    } else if (claim_code) {
      // Find restaurant first
      const { data: rest } = await supabaseAdmin
        .from("restaurants")
        .select("id, name, phone")
        .eq("claim_code", claim_code)
        .single();
      
      if (rest) {
        // Find matching lead
        const { data } = await supabaseAdmin
          .from("estabelecimentos")
          .select("*")
          .or(`restaurant_id.eq.${rest.id},whatsapp_numero.eq.${rest.phone},nome.ilike.%${rest.name}%`)
          .limit(1);
        lead = data?.[0];
      }
    }

    if (!lead) {
      return new Response(JSON.stringify({ error: "Lead/Estabelecimento não encontrado para reivindicação." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Update status to Reivindicado, save timestamp and restaurant_id
    const updatedFields: any = {
      status_reivindicacao: "Reivindicado",
      data_reivindicacao: new Date().toISOString(),
    };
    if (restaurant_id) {
      updatedFields.restaurant_id = restaurant_id;
    }

    const { error: updateLeadError } = await supabaseAdmin
      .from("estabelecimentos")
      .update(updatedFields)
      .eq("id", lead.id);

    if (updateLeadError) throw updateLeadError;

    // 3. Open 23-Hour Scarcity Window
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23 hours in future
    
    const { data: janela, error: janelaError } = await supabaseAdmin
      .from("historico_janelas_24h")
      .insert({
        estabelecimento_id: lead.id,
        data_abertura: now.toISOString(),
        data_fechamento_estimado: expiresAt.toISOString(),
        status_janela: "active",
      })
      .select()
      .single();

    if (janelaError) throw janelaError;

    // 4. Exploration vs. Exploitation AI Strategy Selection
    const { data: strategies, error: stratError } = await supabaseAdmin
      .from("registro_estrategias_ia")
      .select("*")
      .order("taxa_sucesso", { ascending: false });

    if (stratError || !strategies || strategies.length === 0) {
      throw new Error("Nenhuma estratégia comercial cadastrada no banco de dados.");
    }

    let selectedStrategy = strategies[0]; // Exploitation default (best success rate)
    const rand = Math.random();
    const isExploration = rand >= 0.8;

    if (isExploration && strategies.length > 1) {
      // Exploration (20% chance): pick any other strategy at random to test it
      const remainingStrategies = strategies.slice(1);
      const randomIndex = Math.floor(Math.random() * remainingStrategies.length);
      selectedStrategy = remainingStrategies[randomIndex];
    }

    // Associate strategy used and increment attempts count
    await supabaseAdmin
      .from("estabelecimentos")
      .update({ estrategia_utilizada_id: selectedStrategy.id })
      .eq("id", lead.id);

    await supabaseAdmin
      .from("registro_estrategias_ia")
      .update({ total_tentativas: selectedStrategy.total_tentativas + 1 })
      .eq("id", selectedStrategy.id);

    // 5. Generate Personalized Sales Pitch using LLM
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    let generatedPitch = "";

    const userPrompt = `
      Você é a IA Comercial do FilterFood. Escreva uma mensagem de WhatsApp persuasiva para o estabelecimento "${lead.nome}" localizado no bairro "${lead.bairro}".
      O dono acabou de reivindicar a posse do cardápio dele no nosso aplicativo.
      
      Estratégia comercial a ser aplicada: "${selectedStrategy.nome_estrategia}"
      Diretriz do prompt: "${selectedStrategy.pre_prompt_contexto}"
      Gatilho principal: "${selectedStrategy.gatilho_venda_principal}"
      
      Regra de Ouro:
      - Parabenize-o por reivindicar o perfil.
      - Notifique-o de que ele está ativado como "Premium Cortesia" (acesso e visualização ilimitada do cardápio).
      - Advirta-o de que essa cortesia expira exatamente em 23 horas. Após isso, o perfil volta para o plano Gratuito, que tem o limite severo de apenas 5 visualizações de cardápio por dia em toda a cidade (o que impede clientes locais de verem os pratos se a cota estourar).
      - Ofereça uma transição para o plano Premium Pago anual por um valor promocional.
      
      Instruções de Formatação:
      - Tom comercial, simpático, porém focado em urgência e escassez.
      - Use quebras de linha para facilitar a leitura no celular.
      - Adicione emojis de forma profissional.
      - Máximo de 4 parágrafos curtos.
      - Retorne apenas o texto da mensagem a ser enviada no WhatsApp.
    `;

    if (OPENAI_API_KEY) {
      try {
        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [{ role: "user", content: userPrompt }],
            temperature: 0.7,
            max_tokens: 500,
          }),
        });

        if (openaiResponse.ok) {
          const resData = await openaiResponse.json();
          generatedPitch = resData.choices?.[0]?.message?.content || "";
        }
      } catch (e) {
        console.error("OpenAI failed, falling back to template:", e);
      }
    }

    // Fallback template message if LLM is unavailable
    if (!generatedPitch) {
      generatedPitch = `Olá, equipe do *${lead.nome}*! 🎉

Parabéns por reivindicar o seu cardápio no FilterFood! Seu perfil foi ativado no plano *Premium Cortesia*, liberando visualizações ilimitadas para seus clientes.

⚠️ *Aviso Importante:* Este período de testes cortesia expira em exatamente *23 horas*. Após a expiração, seu perfil retornará ao plano gratuito, que limita as visualizações a apenas 5 acessos diários por cliente.

Gostaria de garantir o plano *Premium Anual* por uma condição super especial hoje? Responda a esta mensagem e nossa equipe ajudará a garantir seu destaque definitivo no bairro *${lead.bairro}*! 🚀`;
    }

    // 6. Send the WhatsApp Message via Meta API (or fallback Mock)
    // Fetch region details to get Meta access keys
    const { data: regiao } = await supabaseAdmin
      .from("regioes")
      .select("*")
      .eq("id", lead.regiao_id)
      .single();

    let metaMessageId = `mock-webhook-msg-${crypto.randomUUID()}`;
    let sentViaMeta = false;

    if (regiao && regiao.meta_phone_number_id && regiao.meta_access_token) {
      try {
        const metaUrl = `https://graph.facebook.com/v19.0/${regiao.meta_phone_number_id}/messages`;
        const response = await fetch(metaUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${regiao.meta_access_token}`,
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: lead.whatsapp_numero,
            type: "text",
            text: {
              preview_url: false,
              body: generatedPitch,
            },
          }),
        });

        if (response.ok) {
          const resData = await response.json();
          metaMessageId = resData.messages?.[0]?.id || metaMessageId;
          sentViaMeta = true;
        } else {
          const errBody = await response.text();
          console.error("Meta API webhook claim sending failed:", errBody);
        }
      } catch (e) {
        console.error("Failed to connect to Meta API:", e);
      }
    }

    // Save Meta message ID to lead
    await supabaseAdmin
      .from("estabelecimentos")
      .update({ id_mensagem_meta: metaMessageId })
      .eq("id", lead.id);

    return new Response(
      JSON.stringify({
        message: "Webhook de reivindicação processado com sucesso.",
        lead: lead.nome,
        status: "Reivindicado",
        janela_aberta_id: janela.id,
        janela_expiracao: expiresAt.toISOString(),
        estrategia_escolhida: selectedStrategy.nome_estrategia,
        tipo_abordagem: isExploration ? "Exploração" : "Explotação",
        whatsapp_enviado: sentViaMeta,
        texto_disparado: generatedPitch,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
