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
    const records = lines.slice(1).map(line => {
      const values = line.split(',');
      return headers.reduce((obj, header, index) => {
        obj[header] = values[index] ? values[index].trim() : null;
        return obj;
      }, {});
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

    for (const record of records) {
      const externalUrl = record.external_url;
      if (!externalUrl) {
        errors.push(`Skipping record due to missing external_url: ${JSON.stringify(record)}`);
        continue;
      }

      // Build the data object dynamically to only include fields present in the CSV
      const restaurantData: { [key: string]: any } = {};
      for (const header of headers) {
        // Only add the field if it's not null/undefined in the record
        if (record[header] !== null && record[header] !== undefined) {
          restaurantData[header] = record[header];
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

      // If lat/lon are still not valid (either not in CSV or invalid in CSV), try to geocode
      if (isNaN(restaurantData.latitude) || isNaN(restaurantData.longitude)) {
        const fullAddress = [restaurantData.address, restaurantData.number, restaurantData.neighborhood, restaurantData.city, restaurantData.state, restaurantData.cep]
          .filter(Boolean)
          .join(', ');
        
        if (fullAddress.length > 10) { // Only geocode if address is substantial
          console.log(`Attempting to geocode: ${fullAddress}`);
          const coords = await geocodeAddress(fullAddress);
          if (coords) {
            restaurantData.latitude = coords.lat;
            restaurantData.longitude = coords.lon;
            console.log(`Geocoded ${fullAddress} to lat: ${coords.lat}, lon: ${coords.lon}`);
          } else {
            // Geocoding failed, explicitly set to null to indicate failure for this record
            restaurantData.latitude = null;
            restaurantData.longitude = null;
            console.warn(`Could not geocode address for external_url: ${externalUrl}. Address: ${fullAddress}`);
            errors.push(`Could not geocode address for external_url: ${externalUrl}. Address: ${fullAddress}`);
          }
        } else {
          // Address insufficient for geocoding, explicitly set to null
          restaurantData.latitude = null;
          restaurantData.longitude = null;
          console.warn(`Address insufficient for geocoding for external_url: ${externalUrl}. Address: ${fullAddress}`);
          errors.push(`Address insufficient for geocoding for external_url: ${externalUrl}. Address: ${fullAddress}`);
        }
      }

      // Ensure external_url is always present for the upsert operation
      restaurantData.external_url = externalUrl;

      const { data, error } = await supabase
        .from('restaurants')
        .upsert(restaurantData, { onConflict: 'external_url' })
        .select();

      if (error) {
        console.error(`Error upserting restaurant with external_url ${externalUrl}:`, error);
        errors.push(`Failed to upsert ${externalUrl}: ${error.message}`);
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
    console.error('Error processing bulk-create-restaurants:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});