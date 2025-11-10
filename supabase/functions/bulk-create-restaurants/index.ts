// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { geocodeAddress } from './geocoding.ts'; // Import the new geocoding helper

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

      let latitude = parseFloat(record.latitude);
      let longitude = parseFloat(record.longitude);

      // If lat/lon are not provided, try to geocode the address
      if (isNaN(latitude) || isNaN(longitude)) {
        const fullAddress = [record.address, record.number, record.neighborhood, record.city, record.state, record.cep]
          .filter(Boolean)
          .join(', ');
        
        if (fullAddress.length > 10) { // Only geocode if address is substantial
          console.log(`Attempting to geocode: ${fullAddress}`);
          const coords = await geocodeAddress(fullAddress);
          if (coords) {
            latitude = coords.lat;
            longitude = coords.lon;
            console.log(`Geocoded ${fullAddress} to lat: ${latitude}, lon: ${longitude}`);
          } else {
            console.warn(`Could not geocode address for external_url: ${externalUrl}. Address: ${fullAddress}`);
            errors.push(`Could not geocode address for external_url: ${externalUrl}. Address: ${fullAddress}`);
          }
        } else {
          console.warn(`Insufficient address details for geocoding for external_url: ${externalUrl}. Address: ${fullAddress}`);
          errors.push(`Insufficient address details for geocoding for external_url: ${externalUrl}. Address: ${fullAddress}`);
        }
      }

      const restaurantData = {
        external_url: externalUrl,
        name: record.name,
        category: record.category,
        image_url: record.image_url,
        plan: record.plan || 'free', // Default to 'free' if not provided
        // Address and location fields
        cep: record.cep,
        address: record.address,
        number: record.number,
        neighborhood: record.neighborhood,
        city: record.city,
        state: record.state,
        latitude: isNaN(latitude) ? null : latitude,
        longitude: isNaN(longitude) ? null : longitude,
      };

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