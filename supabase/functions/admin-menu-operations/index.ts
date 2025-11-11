import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Edge Function received request.');

    // Initialize Supabase client with the user's JWT for RLS and admin check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('Authorization header missing.');
      return new Response(JSON.stringify({ error: 'Unauthorized: Authorization header missing.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('User authentication failed:', userError?.message);
      return new Response(JSON.stringify({ error: `Unauthorized: User not found or token invalid. Details: ${userError?.message || 'Unknown error'}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    console.log('User authenticated:', user.id);

    // Check if the user is an admin using a database function
    const { data: isAdminData, error: adminError } = await supabaseClient.rpc('is_admin');
    if (adminError || !isAdminData) {
      console.error('Error checking admin status or user is not admin:', adminError?.message);
      return new Response(JSON.stringify({ error: `Forbidden: User is not an admin. Details: ${adminError?.message || 'Unknown error'}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }
    console.log('User is admin:', isAdminData);

    const { external_url, category_name, item_name, price, description, image_url } = await req.json();
    console.log('Received payload:', { external_url, category_name, item_name, price });

    const trimmedCategoryName = category_name?.trim();
    const trimmedItemName = item_name?.trim();

    if (!external_url || !trimmedCategoryName || !trimmedItemName || price === undefined || price === null) {
      console.error('Missing or empty required fields:', { external_url, trimmedCategoryName, trimmedItemName, price });
      return new Response(JSON.stringify({ error: 'Missing or empty required fields: external_url, category_name, item_name, price.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Parse price, handling comma as decimal separator
    let parsedPrice = parseFloat(String(price).replace(',', '.'));
    if (isNaN(parsedPrice)) {
      console.error(`Invalid price format for item '${trimmedItemName}': '${price}'.`);
      return new Response(JSON.stringify({ error: `Invalid price format for item '${trimmedItemName}': '${price}'. Price must be a number.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    console.log('Parsed price:', parsedPrice);

    // Create a Supabase client with the service role key for privileged operations
    // This client bypasses RLS and is only used within the secure Edge Function environment
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    console.log('Supabase admin client created.');

    // Find restaurant ID
    const { data: restaurantData, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id')
      .eq('external_url', external_url)
      .single();

    if (restaurantError || !restaurantData) {
      console.error('Error finding restaurant:', restaurantError?.message);
      return new Response(JSON.stringify({ error: `Restaurant not found for external_url: ${external_url}. Details: ${restaurantError?.message || 'Unknown error'}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }
    const restaurantId = restaurantData.id;
    console.log('Restaurant found with ID:', restaurantId);

    // Find or create menu category
    let categoryId: string | null = null;
    const { data: existingCategory, error: findCategoryError } = await supabaseAdmin
      .from('menu_categories')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('name', trimmedCategoryName)
      .single();

    if (existingCategory) {
      categoryId = existingCategory.id;
      console.log('Existing category found with ID:', categoryId);
    } else {
      console.log('Category not found, creating new category:', trimmedCategoryName);
      const { data: newCategory, error: insertCategoryError } = await supabaseAdmin
        .from('menu_categories')
        .insert({ restaurant_id: restaurantId, name: trimmedCategoryName })
        .select('id')
        .single();

      if (insertCategoryError || !newCategory) {
        console.error('Error creating menu category:', insertCategoryError?.message);
        return new Response(JSON.stringify({ error: `Failed to find or create category '${trimmedCategoryName}' for restaurant ${external_url}. Details: ${insertCategoryError?.message || 'Unknown error'}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }
      categoryId = newCategory.id;
      console.log('New category created with ID:', categoryId);
    }

    // Insert menu item
    const menuItem = {
      category_id: categoryId,
      name: trimmedItemName,
      price: parsedPrice,
      description: description || null,
      image_url: image_url || null,
      order_index: 0,
      is_active: true,
    };
    console.log('Attempting to insert menu item:', menuItem);

    const { data: insertedItem, error: insertItemError } = await supabaseAdmin
      .from('menu_items')
      .insert(menuItem)
      .select()
      .single();

    if (insertItemError || !insertedItem) {
      console.error('Error inserting menu item:', insertItemError?.message);
      return new Response(JSON.stringify({ error: `Failed to insert item '${trimmedItemName}' for category ${trimmedCategoryName} of restaurant ${external_url}. Details: ${insertItemError?.message || 'Unknown error'}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    console.log('Menu item inserted successfully:', insertedItem.id);

    return new Response(JSON.stringify({ success: true, item: insertedItem }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Unhandled Edge Function error:', error);
    return new Response(JSON.stringify({ error: `An unexpected error occurred in the Edge Function: ${(error as Error).message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});