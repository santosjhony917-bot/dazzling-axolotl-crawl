import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { xmlContent, aiModel, userApiKey } = await req.json();

    if (!xmlContent) {
      return new Response(JSON.stringify({ error: 'Falta o xmlContent.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const modelType = aiModel || 'gemini';

    // Obter chave da API
    let apiKey = userApiKey || '';
    if (!apiKey) {
      if (modelType === 'gemini') {
        apiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('VITE_GEMINI_API_KEY') || '';
      } else {
        apiKey = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('VITE_OPENAI_API_KEY') || '';
      }
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: `Chave API para ${modelType} não está configurada no servidor e nenhuma chave local foi encontrada.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const prompt = `Você é um assistente de IA especialista em cardápios de restaurantes.
Analise a seguinte estrutura XML contendo elementos de categorias e itens de pratos extraídos do site de um cardápio. Organize tudo em categorias, itens, descrições, preços e imagens dos pratos.

Regras importantes:
1. Identifique as categorias de forma lógica (ex: "Entradas", "Pratos Principais", "Hambúrgueres", "Bebidas", "Sobremesas").
2. Para cada item, extraia o nome, a descrição (ingredientes, detalhes de tamanho, acompanhamentos) e o preço.
3. Se houver tags <image> associadas aos itens de prato, extraia a URL exata da imagem no campo "image_url". Se não houver, deixe como string vazia.
4. Formate o preço estritamente como um número (ex: se for R$ 35,90 ou 35.90, retorne 35.90. Se for 12, retorne 12.00). Não inclua o símbolo "R$".
5. Remova qualquer texto irrelevante ou de rodapé.
6. Retorne a resposta estritamente no formato JSON, seguindo este esquema:
[
  {
    "name": "Nome da Categoria",
    "items": [
      {
        "name": "Nome do Prato",
        "description": "Descrição detalhada ou ingredientes",
        "price": 35.90,
        "image_url": "URL da imagem ou string vazia"
      }
    ]
  }
]

Estrutura XML do cardápio:
${xmlContent}
`;

    let aiResponseText = '';

    if (modelType === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || `Erro HTTP OpenAI: ${response.status}`);
      }

      const result = await response.json();
      aiResponseText = result.choices?.[0]?.message?.content || '';
    } else {
      // Gemini
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || `Erro HTTP Gemini: ${response.status}`);
      }

      const result = await response.json();
      aiResponseText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    if (aiResponseText.includes('```json')) {
      aiResponseText = aiResponseText.split('```json')[1].split('```')[0].trim();
    } else if (aiResponseText.includes('```')) {
      aiResponseText = aiResponseText.split('```')[1].split('```')[0].trim();
    }

    // Tenta validar se é um JSON válido antes de retornar
    const parsed = JSON.parse(aiResponseText);

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Erro no Edge Function parse-menu-with-ai:', error);
    return new Response(JSON.stringify({ error: error.message || 'Erro inesperado.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
