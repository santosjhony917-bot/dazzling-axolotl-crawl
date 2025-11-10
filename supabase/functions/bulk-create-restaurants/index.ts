// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0/dist/module.mjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";

// Inlining geocodeAddress function to avoid module not found error during deployment
async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = `${NOMINATIM_SEARCH_URL}?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=br`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      };
    }
    return null;
  } catch (error) {
    console.error("Nominatim geocoding failed in edge function:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { csvData } = await req.json();

    if (!csvData) {
      return new Response(JSON.stringify({ error: 'CSV data is required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const lines = csvData.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) {
      return new Response(JSON.stringify({ error: 'CSV data is empty.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    // Check if 'external_url' (or 'external url') header is present
    const hasExternalUrlHeader = headers.includes('external_url') || headers.includes('external url');
    if (!hasExternalUrlHeader) {
      return new Response(JSON.stringify({ error: 'CSV headers must include "external_url" or "external url".' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const records = lines.slice(1).map(line => {
      const values = line.split(',');
      const record: { [key: string]: any } = {};
      headers.forEach((header, index) => {
        // Normalize header names for internal consistency
        let key = header;
        if (header === 'external url') {
          key = 'external_url';
        }
        record[key] = values[index] ? values[index].trim() : null;
      });
      return record;
    });

    // @ts-ignore
    const supabase = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

    let successCount = 0;
    const errors: string[] = [];

    for (const [index, record] of records.entries()) {
      const externalUrl = record.external_url;
      if (!externalUrl) {
        errors.push(`Linha ${index + 2}: external_url ausente ou vazia. Registro ignorado.`);
        continue;
      }

      // Build the data object dynamically to only include fields present in the CSV
      const restaurantData: { [key: string]: any } = {};
      for (const header of headers) {
        const normalizedHeader = header === 'external url' ? 'external_url' : header;
        if (record[normalizedHeader] !== null && record[normalizedHeader] !== undefined) {
          restaurantData[normalizedHeader] = record[normalizedHeader];
        }
      }

      // If 'plan' column exists and is empty, default to 'free'
      if (headers.includes('plan') && !restaurantData.plan) {
        restaurantData.plan = 'free';
      }

      // Initialize latitude and longitude from record, if present and valid
      let initialLatitude = restaurantData.latitude ? parseFloat(restaurantData.latitude) : NaN;
      let initialLongitude = restaurantData.longitude ? parseFloat(restaurantData.longitude) : NaN;

      // Add latitude and longitude to restaurantData if they were explicitly in the CSV and valid
      if (!isNaN(initialLatitude)) {
        restaurantData.latitude = initialLatitude;
      }
      if (!isNaN(initialLongitude)) {
        restaurantData.longitude = initialLongitude;
      }

      // Check if restaurant already exists
      const { data: existingRestaurant, error: selectError } = await supabase
        .from('restaurants')
        .select('id')
        .eq('external_url', externalUrl)
        .maybeSingle(); // Use maybeSingle to get null if no rows found, instead of error

      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 means "no rows found"
        console.error(`Erro ao verificar restaurante existente com external_url ${externalUrl}:`, selectError);
        errors.push(`Linha ${index + 2} (${externalUrl}): Falha ao verificar existência: ${selectError.message}`);
        continue;
      }

      let operationData = { ...restaurantData };

      if (!existingRestaurant) {
        // If restaurant does not exist, we are inserting.
        // For an insert, 'name', 'category', 'image_url' are required (from Phase 1).
        if (!operationData.name || !operationData.category || !operationData.image_url) {
          errors.push(`Linha ${index + 2} (${externalUrl}): Não foi possível criar novo restaurante. Campos obrigatórios (name, category, image_url) ausentes para criação inicial.`);
          continue;
        }
      }

      // If lat/lon are still not valid (either not in CSV or invalid in CSV), try to geocode
      if (isNaN(operationData.latitude) || isNaN(operationData.longitude)) {
        const fullAddress = [operationData.address, operationData.number, operationData.neighborhood, operationData.city, operationData.state, operationData.cep]
          .filter(Boolean)
          .join(', ');
        
        if (fullAddress.length > 10) { // Only geocode if address is substantial
          const coords = await geocodeAddress(fullAddress);
          if (coords) {
            operationData.latitude = coords.lat;
            operationData.longitude = coords.lon;
          } else {
            operationData.latitude = null;
            operationData.longitude = null;
            errors.push(`Linha ${index + 2} (${externalUrl}): Não foi possível geocodificar o endereço: ${fullAddress}`);
          }
        } else {
          operationData.latitude = null;
          operationData.longitude = null;
          errors.push(`Linha ${index + 2} (${externalUrl}): Endereço insuficiente para geocodificação: ${fullAddress}`);
        }
      }

      // Ensure external_url is always present for the upsert operation
      operationData.external_url = externalUrl;

      const { data, error } = await supabase
        .from('restaurants')
        .upsert(operationData, { onConflict: 'external_url' })
        .select();

      if (error) {
        console.error(`Erro ao fazer upsert do restaurante com external_url ${externalUrl}:`, error);
        errors.push(`Linha ${index + 2} (${externalUrl}): Falha no upsert: ${error.message}`);
      } else {
        successCount++;
      }
    }

    const message = `Processamento concluído. ${successCount} registros processados com sucesso. ${errors.length > 0 ? `${errors.length} erros.` : ''}`;

    return new Response(JSON.stringify({ successCount, message, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: errors.length > 0 ? 207 : 200, // 207 Multi-Status if some errors occurred
    });

  } catch (error) {
    console.error('Erro ao processar bulk-create-restaurants:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});