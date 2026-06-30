import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Client } = require('pg');

const migrationFiles = process.argv.slice(2);

if (!process.env.SUPABASE_DB_URL) {
  console.error('SUPABASE_DB_URL is required.');
  process.exit(1);
}

if (!migrationFiles.length) {
  console.error('Pass at least one migration file.');
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();

  for (const file of migrationFiles) {
    const sql = fs.readFileSync(file, 'utf8');
    await client.query(sql);
    console.log(`APPLIED ${file}`);
  }

  const { rows } = await client.query(`
    select column_name, data_type, is_nullable
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'restaurants'
      and column_name in (
        'menu_status',
        'menu_status_reason',
        'menu_last_checked_at',
        'google_maps_url',
        'google_maps_name',
        'ai_normalized_name',
        'name_cleanup_notes',
        'location_source',
        'location_confidence',
        'location_verified_at',
        'location_issue_reason'
      )
    order by column_name
  `);

  console.log(JSON.stringify(rows, null, 2));
} finally {
  await client.end().catch(() => {});
}
