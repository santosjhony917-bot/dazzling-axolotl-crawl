const fs = require('fs');

async function test() {
  const query = 'A Barca Cabo Branco João Pessoa PB cardapio instagram';
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.bing.com/'
      }
    });
    
    const html = await response.text();
    fs.writeFileSync('scratch/bing_raw.html', html);
    
    console.log('HTML Length:', html.length);
    console.log('Contains instagram.com:', html.includes('instagram.com'));
    console.log('Contains quiosque_abarca_jp:', html.includes('quiosque_abarca_jp'));
    
    // Find all links matching http/https URLs using a very simple regex
    const urlRegex = /href="([^"]+)"/g;
    let match;
    const links = [];
    while ((match = urlRegex.exec(html)) !== null) {
      const href = match[1];
      if (href.startsWith('http') && 
          !href.includes('r.bing.com') && 
          !href.includes('th.bing.com') && 
          !href.endsWith('.css') && 
          !href.endsWith('.js') &&
          !links.includes(href)) {
        links.push(href);
      }
    }
    
    console.log('Total non-asset http/https links found:', links.length);
    console.log('Filtered links:', links.slice(0, 30));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
