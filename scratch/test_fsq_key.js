const key = 'G1HEFQGPVW1CEXZ5GDZNH4RZH2YYWJYAIVZX021US1TAMOLS';
const url = 'https://api.foursquare.com/v3/places/search?near=Tambau,JoaoPessoa,PB&limit=1';

const headersConfigs = [
  { 'Authorization': key },
  { 'Authorization': `Bearer ${key}` },
  { 'Authorization': `fsq3_${key}` },
  { 'fsq3-key': key },
  { 'fsq3_key': key },
  { 'x-fsq3-key': key },
  { 'Authorization': `Bearer fsq3_${key}` }
];

async function test() {
  for (const headers of headersConfigs) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...headers,
          'Accept': 'application/json'
        }
      });
      const data = await response.json();
      console.log(`Header: ${JSON.stringify(headers)} => Status: ${response.status}, Response: ${JSON.stringify(data)}`);
    } catch (e) {
      console.log(`Header: ${JSON.stringify(headers)} => Error: ${e.message}`);
    }
  }
}

test();
