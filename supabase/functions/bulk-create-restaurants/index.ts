/// <reference types="https://deno.land/x/deno/cli/types/deno.d.ts" />
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Analisa uma string CSV, lidando com valores entre aspas que podem conter vírgulas.
 * @param csv A string CSV para analisar.
 * @returns Um array de objetos representando as linhas do CSV.
 */
function robustParseCsv(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;

    // Itera sobre cada caractere para construir os valores, respeitando as aspas
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && (i === 0 || line[i - 1] !== '\\')) { // Lida com aspas não escapadas
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current); // Adiciona o último valor

    const obj: Record<string, string> = {};
    header.forEach((key, index) => {
      let value = (values[index] || '').trim();
      // Remove as aspas do início e do fim, se existirem
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      obj[key] = value.replace(/\\"/g, '"'); // Substitui aspas escapadas
    });
    return obj;
  });
  return rows;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { csvData } = await req.json();
    if (!csvData) {
      return new Response(JSON.stringify({ error: "O corpo da requisição precisa conter 'csvData'." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const records = robustParseCsv(csvData);
    if (records.length === 0) {
        return new Response(JSON.stringify({ error: "Nenhum registro válido encontrado nos dados CSV." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const restaurantsToUpsert = records
      .filter(rec => rec.external_url && rec.name) // Validação básica
      .map(rec => ({
        external_url: rec.external_url,
        name: rec.name,
        category: rec.category || null,
        image_url: rec.image_url || null,
        plan: 'free', // Define um plano padrão
      }));

    if (restaurantsToUpsert.length === 0) {
        return new Response(JSON.stringify({ error: "Nenhum registro com os campos obrigatórios (external_url, name) foi encontrado." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Usa 'upsert' para inserir novos restaurantes ou atualizar existentes
    const { count, error } = await supabaseAdmin
      .from("restaurants")
      .upsert(restaurantsToUpsert, { onConflict: 'external_url' });

    if (error) {
      console.error("Erro no upsert do Supabase:", error);
      return new Response(JSON.stringify({ error: "Falha ao salvar restaurantes no banco de dados.", details: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const successCount = count ?? 0;

    return new Response(JSON.stringify({ 
      message: `Foram processados ${successCount} registros com sucesso.`,
      successCount: successCount,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Erro no servidor:", error);
    return new Response(JSON.stringify({ error: (error as Error).message || "Erro interno do servidor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});