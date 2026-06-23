import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalize(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function localFallbacks(rawQuery: string, dbQuery: string) {
  const normalizedRaw = normalize(rawQuery);
  const normalizedDb = normalize(dbQuery);
  const stopWords = new Set(["de", "do", "da", "dos", "das", "com", "sem", "para", "por", "uma", "um", "o", "a", "os", "as"]);
  const genericWords = new Set([
    "pizza",
    "pizzaria",
    "lanche",
    "comida",
    "cardapio",
    "restaurante",
    "pequena",
    "pequeno",
    "media",
    "medio",
    "grande",
    "familia",
    "familiares",
    "g",
    "m",
    "p",
  ]);
  const rawTokens = normalizedRaw.split(" ").filter(Boolean);
  const meaningfulTokens = rawTokens.filter((token) => !stopWords.has(token));
  const flavorTokens = meaningfulTokens.filter((token) => !genericWords.has(token));
  const variants = [normalizedDb, meaningfulTokens.join(" ")];

  if (rawTokens.some((token) => token === "pizza" || token === "pizzaria") && flavorTokens.length) {
    variants.push(`pizza ${flavorTokens.join(" ")}`);
  }

  variants.push(flavorTokens.join(" "));

  return [...new Set(variants.map((value) => value.trim()).filter((value) => value.length >= 3))];
}

function prioritizeFallbackQueries(rawQuery: string, queries: string[]) {
  const rawTokens = normalize(rawQuery).split(" ").filter(Boolean);
  const categoryHints = ["pizza", "hamburguer", "burger", "sushi", "acai", "açaí", "sorvete", "marmita", "esfiha"]
    .map(normalize)
    .filter((hint) => rawTokens.includes(hint));

  if (!categoryHints.length) return queries;

  return [...queries].sort((a, b) => {
    const aTokens = normalize(a).split(" ");
    const bTokens = normalize(b).split(" ");
    const aScore = categoryHints.some((hint) => aTokens.includes(hint)) ? 0 : 1;
    const bScore = categoryHints.some((hint) => bTokens.includes(hint)) ? 0 : 1;
    return aScore - bScore;
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawQuery = String(body.rawQuery || "");
    const dbQuery = String(body.dbQuery || rawQuery);
    const providedFallbacks = Array.isArray(body.localFallbacks)
      ? body.localFallbacks.map(normalize).filter((value: string) => value.length >= 3)
      : [];
    const fallbackQueries = [...new Set([...providedFallbacks, ...localFallbacks(rawQuery, dbQuery)])];

    const apiKey = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("VITE_OPENAI_API_KEY");
    if (!apiKey || normalize(rawQuery).length < 4) {
      return new Response(JSON.stringify({ expandedQueries: prioritizeFallbackQueries(rawQuery, fallbackQueries), usedAI: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: Deno.env.get("SEARCH_REWRITE_MODEL") || "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Você reescreve buscas de comida em português para maximizar matching em cardápios. Responda apenas JSON: {\"expandedQueries\":[...]} com até 5 strings curtas. Preserve sabores, pratos e ingredientes; remova tamanho, bairro, frases e ruído quando atrapalharem. Exemplos: 'pizza pequena de calabresa' -> ['calabresa','pizza calabresa']; 'marmita com frango' -> ['frango','marmita frango']; 'esfiha carne seca na nata' -> ['carne seca nata','esfiha carne seca'].",
          },
          {
            role: "user",
            content: JSON.stringify({
              rawQuery,
              currentDbQuery: dbQuery,
              existingResultCount: Number(body.existingResultCount || 0),
              localFallbacks: fallbackQueries,
            }),
          },
        ],
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return new Response(JSON.stringify({ expandedQueries: prioritizeFallbackQueries(rawQuery, fallbackQueries), usedAI: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const content = result?.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    const aiQueries = Array.isArray(parsed.expandedQueries)
      ? parsed.expandedQueries.map(normalize).filter((value: string) => value.length >= 3)
      : [];

    return new Response(JSON.stringify({ expandedQueries: prioritizeFallbackQueries(rawQuery, [...new Set([...aiQueries, ...fallbackQueries])]).slice(0, 6), usedAI: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_error) {
    return new Response(JSON.stringify({ expandedQueries: [], usedAI: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
