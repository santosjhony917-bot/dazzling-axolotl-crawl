const url = 'https://overpass-api.de/api/interpreter';

async function getSuburbs(cityName) {
  console.log(`🔍 Fetching suburbs for city: ${cityName}`);
  const query = `
    [out:json][timeout:25];
    area["name"="${cityName}"]->.searchArea;
    (
      node["place"~"suburb|quarter|neighbourhood"](area.searchArea);
      way["place"~"suburb|quarter|neighbourhood"](area.searchArea);
      relation["place"~"suburb|quarter|neighbourhood"](area.searchArea);
    );
    out tags;
  `;

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'FilterFoodScraper/1.0 (contact: support@filterfood.com.br)'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const suburbs = new Set();
    
    if (data.elements) {
      for (const element of data.elements) {
        if (element.tags && element.tags.name) {
          suburbs.add(element.tags.name);
        }
      }
    }

    const sortedSuburbs = Array.from(suburbs).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    console.log(`✅ Found ${sortedSuburbs.length} suburbs for ${cityName}:`);
    console.log(sortedSuburbs.slice(0, 15), sortedSuburbs.length > 15 ? `...and ${sortedSuburbs.length - 15} more` : '');
    return sortedSuburbs;
  } catch (error) {
    console.error('❌ Error fetching suburbs:', error);
  }
}

async function test() {
  await getSuburbs('Recife');
  await getSuburbs('Natal');
  await getSuburbs('Campina Grande');
  await getSuburbs('João Pessoa');
}

test();
