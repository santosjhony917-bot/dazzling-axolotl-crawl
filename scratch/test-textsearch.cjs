const fs = require('fs');
const path = require('path');

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

const PLACES_API_KEY = process.env.VITE_GOOGLE_PLACES_API_KEY;

async function test() {
  const query = "A Barca Cabo Branco João Pessoa";
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${PLACES_API_KEY}`;
  
  console.log('Sending request to Google Places Text Search API...');
  const res = await fetch(url);
  const data = await res.json();
  
  console.log('API Status:', data.status);
  if (data.results && data.results.length > 0) {
    const place = data.results[0];
    console.log('Place Name:', place.name);
    console.log('Place Address:', place.formatted_address);
    console.log('Photos count:', place.photos ? place.photos.length : 0);
    if (place.photos && place.photos.length > 0) {
      console.log('Sample Photo Reference:', place.photos[0].photo_reference);
    }
  } else {
    console.log('No results found.');
  }
}

test();
