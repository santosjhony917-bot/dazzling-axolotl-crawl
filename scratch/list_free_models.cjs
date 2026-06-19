async function main() {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models');
    if (!res.ok) {
      console.error('Failed to fetch models:', res.statusText);
      return;
    }
    const data = await res.json();
    const freeModels = data.data.filter(m => m.id.includes(':free') || m.name.toLowerCase().includes('free'));
    console.log(`Found ${freeModels.length} free models:`);
    freeModels.forEach(m => {
      console.log(`- ID: ${m.id} | Name: ${m.name}`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
