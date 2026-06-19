const fs = require('fs');

async function test() {
  const query = 'A Barca Cabo Branco João Pessoa PB cardapio instagram';
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://duckduckgo.com/'
      }
    });
    
    const html = await response.text();
    fs.writeFileSync('scratch/ddg_raw.html', html);
    
    const isCaptcha = html.includes('captcha') || html.includes('challenge') || html.includes('bots use');
    console.log('Is Captcha page:', isCaptcha);
    console.log('HTML Length:', html.length);
    
    // Find all results using regex
    const linkRegex = /<a class="result__url" href="([^"]+)">/g;
    let match;
    const links = [];
    while ((match = linkRegex.exec(html)) !== null) {
      links.push(match[1]);
    }
    console.log('Links found:', links);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
