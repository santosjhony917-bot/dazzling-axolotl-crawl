// Use global fetch


async function resolveUrl(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return res.url;
  } catch (err) {
    return 'Error: ' + err.message;
  }
}

async function run() {
  const contateMe = 'https://contate.me/acai83jp';
  const mapsGooGl = 'https://maps.app.goo.gl/VqBqSU6szAraRaaE7';

  console.log('Resolving links...');
  const resolvedContate = await resolveUrl(contateMe);
  const resolvedMaps = await resolveUrl(mapsGooGl);

  console.log(`\nOriginal: ${contateMe}`);
  console.log(`Resolved: ${resolvedContate}`);

  console.log(`\nOriginal: ${mapsGooGl}`);
  console.log(`Resolved: ${resolvedMaps}`);
}

run();
