import fs from 'node:fs';

const TARGET_PLACE_IDS = new Set([
  'ChIJ2dkU5NAhrQcRMvAetr3sxYA',
  'ChIJB0sqZgLfrAcR9yKy7cQwfhQ',
  'ChIJ2_aBWAAhrQcRP7iv8wg49-U',
]);

const roots = [
  'scratch/serpapi-google-maps-phase1/2026-07-06T19-29-21-567Z',
  'scratch/serpapi-google-maps-phase1/2026-07-06T19-32-09-190Z',
];

for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  for (const entry of fs.readdirSync(root)) {
    if (!/^raw-\d+\.json$/.test(entry)) continue;
    const file = `${root}/${entry}`;
    const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const result of payload.local_results || []) {
      if (!TARGET_PLACE_IDS.has(result.place_id)) continue;
      const compact = {};
      for (const [key, value] of Object.entries(result)) {
        if (['thumbnail', 'photos', 'images', 'links'].includes(key)) continue;
        compact[key] = value;
      }
      console.log(JSON.stringify({
        file,
        keys: Object.keys(result),
        compact,
        thumbnail: result.thumbnail || null,
        photosType: Array.isArray(result.photos) ? `array:${result.photos.length}` : typeof result.photos,
        imagesType: Array.isArray(result.images) ? `array:${result.images.length}` : typeof result.images,
      }, null, 2));
    }
  }
}
