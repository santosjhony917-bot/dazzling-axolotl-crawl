const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function captureAllProfiles() {
  console.log("🔍 Fetching active imported commercial leads from Supabase...");
  
  const { data: leads, error } = await supabase
    .from('commercial_leads')
    .select(`
      id, 
      restaurant_id, 
      restaurant:restaurants!inner(name, is_published, is_deleted)
    `)
    .eq('restaurant.is_published', true)
    .or('is_deleted.eq.false,is_deleted.is.null', { foreignTable: 'restaurant' });

  if (error) {
    console.error("Error fetching leads:", error.message);
    process.exit(1);
  }

  if (!leads || leads.length === 0) {
    console.log("No imported leads found in commercial_leads table.");
    process.exit(0);
  }

  console.log(`🚀 Found ${leads.length} imported restaurants. Starting Puppeteer screenshot generation...`);
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

    // Bypass paywall before navigation
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('acesso_vitalicio', 'true');
      localStorage.setItem('has_unlocked_limit', 'true');
    });

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const restaurantId = lead.restaurant_id;
      const restaurantName = lead.restaurant?.name || 'Desconhecido';
      
      console.log(`\n--------------------------------------------`);
      console.log(`⏳ [${i + 1}/${leads.length}] Processing: ${restaurantName} (ID: ${restaurantId})`);

      const profileUrl = `http://localhost:8081/restaurant/${restaurantId}`;
      const storagePath = `profile_screenshots/${restaurantId}.jpg`;

      try {
        console.log(`👉 Navigating to: ${profileUrl}`);
        await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 25000 });
        
        // Wait 4 seconds for images and menu items to render
        await new Promise(r => setTimeout(r, 4500));
        
        console.log(`Removing sticky header for clean screenshot...`);
        await page.evaluate(() => {
          const header = document.querySelector('header');
          if (header) header.style.display = 'none';
        });

        // Let's scroll to the bottom of the page to trigger any lazy loading or rendering
        console.log(`Scrolling to bottom...`);
        await page.evaluate(async () => {
          await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
              const scrollHeight = document.documentElement.scrollHeight;
              window.scrollBy(0, distance);
              totalHeight += distance;

              if (totalHeight >= scrollHeight - window.innerHeight) {
                clearInterval(timer);
                resolve();
              }
            }, 100);
          });
        });

        // Scroll back to top
        await page.evaluate(() => window.scrollTo(0, 0));
        await new Promise(r => setTimeout(r, 1000));

        console.log(`📸 Taking full page screenshot...`);
        const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 95, fullPage: true });
        
        console.log(`📤 Uploading to Supabase Storage...`);
        const { error: uploadError } = await supabase.storage
          .from('restaurant-images')
          .upload(storagePath, screenshotBuffer, {
            contentType: 'image/jpeg',
            upsert: true
          });
          
        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('restaurant-images')
          .getPublicUrl(storagePath);
          
        console.log(`✅ Uploaded. Public URL: ${publicUrl}`);
        
        // Update database
        const { error: dbError } = await supabase
          .from('commercial_leads')
          .update({ public_profile_screenshot_url: publicUrl })
          .eq('restaurant_id', restaurantId);
          
        if (dbError) {
          throw new Error(`DB Update failed: ${dbError.message}`);
        }
        console.log(`🎉 DB updated for ${restaurantName}.`);
      } catch (leadError) {
        console.error(`❌ Failed to process ${restaurantName}:`, leadError.message);
      }
    }
    
    console.log(`\n🏁 Done! Processed all ${leads.length} leads.`);
  } catch (err) {
    console.error("General error during screenshot run:", err);
  } finally {
    if (browser) await browser.close();
  }
}

captureAllProfiles();
