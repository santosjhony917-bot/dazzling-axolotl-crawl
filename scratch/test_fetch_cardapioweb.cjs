// Using native fetch


async function testFetch() {
  const url = 'https://integracao.cardapioweb.com/api/menu/company/categories?only_available_for=delivery&origin=catalogo';
  const headers = {
    'company': 'cabrones_hamburgueria',
    'company-id': '12372',
    'sessionid': 'abc123xyz'
  };

  try {
    const res = await fetch(url, { headers });
    console.log('Status:', res.status);
    console.log('Content-Type:', res.headers.get('content-type'));
    if (res.ok) {
      const data = await res.json();
      console.log('Successfully fetched JSON!');
      console.log('Category Count:', data.length);
      if (data.length > 0) {
        console.log('First Category Name:', data[0].name || data[0].title);
        // Save sample category to file
        const fs = require('fs');
        const path = require('path');
        fs.writeFileSync(path.join(__dirname, 'cardapioweb_sample.json'), JSON.stringify(data.slice(0, 2), null, 2), 'utf-8');
        console.log('Saved cardapioweb_sample.json');
      }
    } else {
      const text = await res.text();
      console.log('Error Body:', text);
    }
  } catch (err) {
    console.error('Fetch Error:', err);
  }
}

testFetch();
