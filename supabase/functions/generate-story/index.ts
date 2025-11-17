// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Obter a chave de API de forma segura (deve ser configurada como um segredo)
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OpenAI API Key not configured." }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { prompt } = await req.json();

    // 2. Chamar a API da OpenAI usando fetch
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o", // Modelo atual mais avançado
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error("OpenAI API Error:", errorData);
      return new Response(JSON.stringify({ error: errorData.error?.message || "Failed to generate story." }), {
        status: openaiResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await openaiResponse.json();
    const story = data.choices[0].message.content;

    // 3. Retornar a história gerada
    return new Response(JSON.stringify({ story }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Request processing error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message || "Internal server error." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});