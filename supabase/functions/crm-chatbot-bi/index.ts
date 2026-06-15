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

    const { question } = await req.json();

    if (!question) {
      return new Response(JSON.stringify({ error: "O parâmetro 'question' é obrigatório." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch CRM statistics from the database to build a complete BI context for the LLM
    // Fetch regions
    const { data: regions } = await supabaseAdmin.from("regioes").select("id, nome_cidade, uf, ddd_oficial");
    
    // Fetch strategies and success rates
    const { data: strategies } = await supabaseAdmin
      .from("registro_estrategias_ia")
      .select("nome_estrategia, gatilho_venda_principal, total_tentativas, total_conversoes_premium, taxa_sucesso")
      .order("taxa_sucesso", { ascending: false });

    // Fetch total prospects count and claim rates
    const { data: statsData, error: statsError } = await supabaseAdmin
      .from("estabelecimentos")
      .select("status_reivindicacao, status_plano, regiao_id, bairro");

    // Fetch recent campaigns log
    const { data: recentCampaigns } = await supabaseAdmin
      .from("campanhas_lotes")
      .select("data_disparo, total_alvo, template_utilizado, logs_sucesso, logs_falha")
      .order("data_disparo", { ascending: false })
      .limit(5);

    // Compute basic statistics locally to feed the model
    const totalLeads = statsData?.length || 0;
    const claimedLeads = statsData?.filter(l => l.status_reivindicacao === 'Reivindicado').length || 0;
    const notifiedLeads = statsData?.filter(l => l.status_reivindicacao === 'Notificado').length || 0;
    const premiumPaidLeads = statsData?.filter(l => l.status_plano === 'Premium_Pago').length || 0;
    
    const neighborhoodStats: Record<string, number> = {};
    statsData?.forEach(l => {
      if (l.bairro) {
        neighborhoodStats[l.bairro] = (neighborhoodStats[l.bairro] || 0) + 1;
      }
    });

    // 2. Build LLM Context
    const crmContext = {
      regioes: regions || [],
      estrategias_ia: strategies || [],
      metricas_globais: {
        total_leads_prospecao: totalLeads,
        total_reivindicados: claimedLeads,
        taxa_reivindicacao: totalLeads > 0 ? (claimedLeads / totalLeads) * 100 : 0,
        total_conversao_premium_paga: premiumPaidLeads,
        taxa_conversao_vendas: claimedLeads > 0 ? (premiumPaidLeads / claimedLeads) * 100 : 0,
        leads_notificados: notifiedLeads,
      },
      campanhas_recentes: recentCampaigns || [],
      principais_bairros: Object.entries(neighborhoodStats)
        .map(([bairro, count]) => ({ bairro, total_leads: count }))
        .sort((a, b) => b.total_leads - a.total_leads)
        .slice(0, 5)
    };

    // 3. Request OpenAI to answer the BI question
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    let aiResponse = "";

    const systemPrompt = `
      Você é o "Gourmet CRM Analyst", um Engenheiro de Software Sênior, Especialista em BI de Vendas e Arquiteto de IA Comercial.
      Seu objetivo é analisar os dados do banco de dados do CRM de prospecção do aplicativo FilterFood e fornecer insights detalhados em linguagem natural para o administrador.
      
      Aqui estão os dados analíticos consolidados do banco em tempo real:
      ${JSON.stringify(crmContext, null, 2)}
      
      Diretrizes de Resposta:
      - Responda em português.
      - Seja analítico, estratégico e comercial. Mostre as taxas e números relevantes.
      - Diga claramente quais abordagens de vendas (da tabela registro_estrategias_ia) estão performando melhor estatisticamente com base no feedback loop.
      - Comente sobre a taxa de sucesso geral de prospecção e conversão de cortesia.
      - Identifique gargalos nos bairros e sugira correções nas abordagens comerciais.
      - Se o administrador perguntar sobre Recife ou João Pessoa, faça correlações com os DDDs oficiais cadastrados.
      - Mantenha um estilo executivo e focado em otimização de lucro (Pix pagos).
    `;

    if (OPENAI_API_KEY) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: question }
          ],
          temperature: 0.5,
          max_tokens: 800,
        }),
      });

      if (response.ok) {
        const resData = await response.json();
        aiResponse = resData.choices?.[0]?.message?.content || "";
      } else {
        const errText = await response.text();
        console.error("OpenAI Chatbot API Error:", errText);
        aiResponse = `Erro na API da OpenAI: ${errText}`;
      }
    } else {
      aiResponse = `Chave OPENAI_API_KEY não configurada. Eis o resumo dos dados em formato JSON para análise:\n\n${JSON.stringify(crmContext, null, 2)}`;
    }

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
