// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0/dist/module.mjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";

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

serve(async (req: Request) => {
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

    const lines = csvData.split('\n').filter((line: string) => line.trim() !== '');
    if (lines.length === 0) {
      return new Response(JSON.stringify({ error: 'CSV data is empty.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase());

    const hasExternalUrlHeader = headers.includes('external_url') || headers.includes('external url');
    if (!hasExternalUrlHeader) {
      return new Response(JSON.stringify({ error: 'CSV headers must include "external_url" or "external url".' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const records = lines.slice(1).map((line: string) => {
      const values = line.split(',');
      const record: { [key: string]: any } = {};
      headers.forEach((header: string, index: number) => {
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

      // 1. Find the existing restaurant by external_url
      const { data: existingRestaurant, error: selectError } = await supabase
        .from('restaurants')
        .select('id')
        .eq('external_url', externalUrl)
        .maybeSingle();

      if (selectError) {
        console.error(`Erro ao buscar restaurante com external_url ${externalUrl}:`, selectError);
        errors.push(`Linha ${index + 2} (${externalUrl}): Falha ao buscar restaurante: ${selectError.message}`);
        continue;
      }

      if (!existingRestaurant) {
        // If restaurant does NOT exist, this is an error for Phase 2
        errors.push(`Linha ${index + 2} (${externalUrl}): Restaurante não encontrado. Não é possível atualizar o endereço.`);
        continue; // Skip this record
      }

      // 2. Prepare update data (only address/location related fields)
      const updateData: { [key: string]: any } = {};
      const addressFields = ['address', 'number', 'neighborhood', 'city', 'state', 'cep', 'latitude', 'longitude'];
      for (const field of addressFields) {
        if (record[field] !== undefined) { // Only include if present in CSV
          updateData[field] = record[field];
        }
      }

      // Geocoding logic
      let currentLatitude = updateData.latitude ? parseFloat(updateData.latitude) : NaN;
      let currentLongitude = updateData.longitude ? parseFloat(updateData.longitude) : NaN;

      if (isNaN(currentLatitude) || isNaN(currentLongitude)) {
        const fullAddress = [record.address, record.number, record.neighborhood, record.city, record.state, record.cep]
          .filter(Boolean)
          .join(', ');
        
        if (fullAddress.length > 10) { // Only geocode if address is substantial
          const coords = await geocodeAddress(fullAddress);
          if (coords) {
            updateData.latitude = coords.lat;
            updateData.longitude = coords.lon;
          } else {
            updateData.latitude = null;
            updateData.longitude = null;
            errors.push(`Linha ${index + 2} (${externalUrl}): Não foi possível geocodificar o endereço: ${fullAddress}`);
          }
        } else {
          updateData.latitude = null;
          updateData.longitude = null;
          errors.push(`Linha ${index + 2} (${externalUrl}): Endereço insuficiente para geocodificação: ${fullAddress}`);
        }
      } else {
        // If lat/lon were provided and valid in CSV, ensure they are numbers
        updateData.latitude = currentLatitude;
        updateData.longitude = currentLongitude;
      }

      // 3. Perform the update operation
      const { error: updateError } = await supabase
        .from('restaurants')
        .update(updateData)
        .eq('id', existingRestaurant.id); // Update by ID

      if (updateError) {
        console.error(`Erro ao atualizar endereço do restaurante com external_url ${externalUrl}:`, updateError);
        errors.push(`Linha ${index + 2} (${externalUrl}): Falha na atualização do endereço: ${updateError.message}`);
      } else {
        successCount++;
      }
    }

    const message = `Processamento de endereços concluído. ${successCount} registros atualizados com sucesso. ${errors.length > 0 ? `${errors.length} erros.` : ''}`;

    return new Response(JSON.stringify({ successCount, message, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: errors.length > 0 ? 207 : 200,
    });

  } catch (error) {
    console.error('Erro ao processar bulk-update-restaurant-address:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});