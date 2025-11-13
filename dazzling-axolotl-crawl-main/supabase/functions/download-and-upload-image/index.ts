// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Service Role Key (JWT COMPLETA) - Necessária para uploads de servidor
const SUPABASE_SERVICE_ROLE_KEY_HARDCODED = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzdGZmY29oY2xidHlrYW5nZm50Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDgzOTA0OCwiZXhwIjoyMDc2NDE1MDQ4fQ.kzuLnGuxbL_yBQwZJvezY4a8azmW4P5mvVOgRAsdkbk";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, bucketName, folderPath, fileName } = await req.json();

    if (!imageUrl || !bucketName || !folderPath || !fileName) {
      return new Response(JSON.stringify({ error: "Missing required parameters: imageUrl, bucketName, folderPath, fileName." }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 1. Initialize Supabase client with Service Role Key
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || SUPABASE_SERVICE_ROLE_KEY_HARDCODED;
    const supabaseAdmin = createClient(SUPABASE_URL, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 2. Download the image from the external URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image from ${imageUrl}. Status: ${imageResponse.status}`);
    }
    
    // Get content type for upload
    const contentType = imageResponse.headers.get("content-type") || "application/octet-stream";
    
    // Get image data as ArrayBuffer
    const imageBuffer = await imageResponse.arrayBuffer();
    
    // 3. Define the unique path in Supabase Storage
    const uniqueFileName = `${fileName}-${Date.now()}`;
    const fileExt = contentType.split('/').pop() || 'jpg';
    const path = `${folderPath}/${uniqueFileName}.${fileExt}`;

    // 4. Upload the image to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(path, imageBuffer, {
        contentType: contentType,
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase Storage Upload Error:", uploadError);
      throw new Error(`Failed to upload image to storage: ${uploadError.message}`);
    }

    // 5. Get the public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(path);

    return new Response(JSON.stringify({ publicUrl: publicUrlData.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Image processing error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message || "Internal server error." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});