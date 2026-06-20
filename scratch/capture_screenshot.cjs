const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    lines.forEach(line => {
      const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    });
  }
}
loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Supabase credentials missing in .env file.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function captureProfile() {
  const args = process.argv.slice(2);
  const idIndex = args.indexOf('--id');
  const originIndex = args.indexOf('--origin');
  
  const restaurantId = idIndex !== -1 ? args[idIndex + 1] : null;
  const origin = originIndex !== -1 ? args[originIndex + 1] : 'http://localhost:8080';

  if (!restaurantId) {
    console.error("Restaurant ID is required. Use: node scratch/capture_screenshot.cjs --id <restaurantId> [--origin <baseUrl>]");
    process.exit(1);
  }

  const profileUrl = `${origin}/restaurant/${restaurantId}`;
  console.log(`📸 Accessing public profile to take screenshot: ${profileUrl}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });
    
    const page = await browser.newPage();
    
    // Set a premium viewport size (resembling a nice mobile app screen)
    await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

    // Bypass paywall before navigation
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('acesso_vitalicio', 'true');
      localStorage.setItem('has_unlocked_limit', 'true');
    });

    console.log("Navigating to profile...");
    await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    console.log("Waiting 4 seconds for images and elements to load...");
    await new Promise(r => setTimeout(r, 4000));
    
    console.log("Removing sticky header for clean screenshot...");
    await page.evaluate(() => {
      const header = document.querySelector('header');
      if (header) header.style.display = 'none';
    });

    // Let's scroll to the bottom of the page to trigger any lazy loading or rendering
    console.log("Scrolling to bottom...");
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

    console.log("Capturing full page screenshot...");
    const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 95, fullPage: true });
    
    const storagePath = `profile_screenshots/${restaurantId}.jpg`;
    console.log(`Uploading to Supabase Storage: restaurant-images / ${storagePath}`);
    
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
      
    console.log(`Upload complete. Public URL: ${publicUrl}`);
    
    // Update commercial_leads table
    console.log("Updating commercial_leads table in Supabase...");
    const { error: dbError } = await supabase
      .from('commercial_leads')
      .update({ public_profile_screenshot_url: publicUrl })
      .eq('restaurant_id', restaurantId);
      
    if (dbError) {
      throw new Error(`Database update failed: ${dbError.message}`);
    }
    
    console.log(`RESULT:{"success":true,"publicUrl":"${publicUrl}"}`);
  } catch (err) {
    console.error("Error capturing screenshot:", err);
    console.log(`RESULT:{"success":false,"error":"${err.message}"}`);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

captureProfile();
