import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const migration63Path = resolve(root, 'supabase/migrations/0063_harden_catalog_rls_and_eligibility.sql');
const migration64Path = resolve(root, 'supabase/migrations/0064_public_catalog_search_and_coverage.sql');
const structureTestPath = resolve(root, 'supabase/tests/database/0063_0064_catalog_structure.test.sql');
const rolesTestPath = resolve(root, 'supabase/tests/database/0063_0064_catalog_roles.test.sql');

const [migration63, migration64, structureTest, rolesTest] = await Promise.all([
  readFile(migration63Path, 'utf8'),
  readFile(migration64Path, 'utf8'),
  readFile(structureTestPath, 'utf8'),
  readFile(rolesTestPath, 'utf8'),
]);

const failures = [];
const checks = [];

function check(description, condition) {
  checks.push(description);
  if (!condition) failures.push(description);
}

function contains(sql, pattern) {
  return typeof pattern === 'string' ? sql.includes(pattern) : pattern.test(sql);
}

function balancedSql(sql, label) {
  let state = 'normal';
  let dollarTag = '';
  let depth = 0;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (state === 'line-comment') {
      if (char === '\n') state = 'normal';
      continue;
    }
    if (state === 'block-comment') {
      if (char === '*' && next === '/') {
        state = 'normal';
        index += 1;
      }
      continue;
    }
    if (state === 'single-quote') {
      if (char === "'" && next === "'") {
        index += 1;
      } else if (char === "'") {
        state = 'normal';
      }
      continue;
    }
    if (state === 'double-quote') {
      if (char === '"' && next === '"') {
        index += 1;
      } else if (char === '"') {
        state = 'normal';
      }
      continue;
    }
    if (state === 'dollar-quote') {
      if (sql.startsWith(dollarTag, index)) {
        index += dollarTag.length - 1;
        dollarTag = '';
        state = 'normal';
      }
      continue;
    }

    if (char === '-' && next === '-') {
      state = 'line-comment';
      index += 1;
    } else if (char === '/' && next === '*') {
      state = 'block-comment';
      index += 1;
    } else if (char === "'") {
      state = 'single-quote';
    } else if (char === '"') {
      state = 'double-quote';
    } else if (char === '$') {
      const match = sql.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
      if (match) {
        dollarTag = match[0];
        state = 'dollar-quote';
        index += dollarTag.length - 1;
      }
    } else if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
      if (depth < 0) break;
    }
  }

  check(`${label}: parentheses are balanced`, depth === 0);
  check(`${label}: strings/comments/dollar quotes terminate`, state === 'normal' || state === 'line-comment');
}

for (const [label, sql] of [
  ['0063', migration63],
  ['0064', migration64],
  ['structure test', structureTest],
  ['role test', rolesTest],
]) {
  balancedSql(sql, label);
}

for (const [label, sql] of [['0063', migration63], ['0064', migration64]]) {
  check(`${label}: migration begins a transaction`, /^\s*(?:--[^\n]*\n\s*)*BEGIN;/i.test(sql));
  check(`${label}: migration commits`, /COMMIT;\s*$/i.test(sql));
}

const protectedTables = [
  'restaurants',
  'menu_sections',
  'menu_categories',
  'menu_items',
  'menu_option_groups',
  'menu_item_options',
  'restaurant_gallery',
  'catalog_publication_audits',
];

for (const table of protectedTables) {
  check(`0063: RLS enabled on ${table}`,
    contains(migration63, new RegExp(`ALTER\\s+TABLE\\s+public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, 'i')));
}

const definerFunctions = [
  'is_admin',
  'can_manage_restaurant',
  'can_manage_menu_category',
  'can_manage_menu_item',
  'protect_restaurant_system_fields',
  'invalidate_catalog_publication_audit',
  'find_public_catalog_restaurants',
  'search_public_catalog',
  'get_public_catalog_coverage',
];

const combinedMigrations = `${migration63}\n${migration64}`;
for (const functionName of definerFunctions) {
  const definitionPattern = new RegExp(
    `CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+public\\.${functionName}\\s*\\([\\s\\S]*?SECURITY\\s+DEFINER[\\s\\S]*?SET\\s+search_path\\s*=\\s*pg_catalog[\\s\\S]*?AS\\s+\\$\\$`,
    'i',
  );
  check(`${functionName}: SECURITY DEFINER pins pg_catalog search_path`, definitionPattern.test(combinedMigrations));
}

check('0063: admin trusts app_metadata', /auth\.jwt\(\)\s*->\s*'app_metadata'\s*->>\s*'role'/i.test(migration63));
check('0063: admin does not trust user_metadata', !/auth\.jwt\(\)\s*->\s*'user_metadata'/i.test(migration63));
check('0063: browser roles lose table-level privileges before scoped grants',
  /REVOKE\s+ALL\s+PRIVILEGES\s+ON\s+TABLE[\s\S]*?FROM\s+PUBLIC,\s*anon,\s*authenticated;/i.test(migration63));
check('0063: readiness is not granted to browser roles',
  /REVOKE\s+ALL\s+PRIVILEGES\s+ON\s+TABLE\s+public\.catalog_restaurant_readiness\s+FROM\s+PUBLIC,\s*anon,\s*authenticated;/i.test(migration63));
check('0063: reparenting resolves both OLD and NEW restaurant IDs',
  /old_restaurant_id\s*:=\s*OLD\./i.test(migration63)
  && /new_restaurant_id\s*:=\s*NEW\./i.test(migration63)
  && /restaurant_id\s*=\s*ANY\(target_restaurant_ids\)/i.test(migration63));

const publicViews = [
  'public_catalog_restaurants',
  'public_catalog_menu_items',
  'public_catalog_menu_sections',
  'public_catalog_menu_categories',
  'public_catalog_menu_entries',
  'public_catalog_menu_option_groups',
  'public_catalog_menu_item_options',
  'public_catalog_gallery',
];

const hardenedViewRevokeBlocks = [...combinedMigrations.matchAll(
  /REVOKE\s+ALL\s+PRIVILEGES\s+ON\s+TABLE([\s\S]*?)FROM\s+PUBLIC,\s*anon,\s*authenticated,\s*service_role;/gi,
)].map((match) => match[1]);

for (const view of publicViews) {
  check(`${view}: view is defined`, contains(combinedMigrations,
    new RegExp(`CREATE\\s+OR\\s+REPLACE\\s+VIEW\\s+public\\.${view}\\b`, 'i')));
  check(`${view}: security barrier is enabled`, contains(combinedMigrations,
    new RegExp(`VIEW\\s+public\\.${view}[\\s\\S]{0,160}security_barrier\\s*=\\s*true`, 'i')));
  check(`${view}: caller RLS is not used`, contains(combinedMigrations,
    new RegExp(`VIEW\\s+public\\.${view}[\\s\\S]{0,180}security_invoker\\s*=\\s*false`, 'i')));
  check(`${view}: legacy/default ACL is cleared from every API role`,
    hardenedViewRevokeBlocks.some((block) =>
      new RegExp(`\\bpublic\\.${view}\\b`, 'i').test(block)));
}

check('0064: safe public views are granted SELECT to both browser roles',
  /GRANT\s+SELECT\s+ON\s+TABLE[\s\S]*?TO\s+anon,\s*authenticated,\s*service_role;/i.test(migration64));
check('0064: public search has an explicit bound', /p_limit\s*>\s*50/i.test(migration64));
check('0064: nearby search has an explicit bound', /p_limit\s*>\s*100/i.test(migration64));
check('0064: query variants are bounded', /cardinality\(p_queries\)[\s\S]{0,80}>\s*5/i.test(migration64));
check('0064: category arrays are bounded', /cardinality\(p_included_categories\)[\s\S]{0,80}>\s*20/i.test(migration64));
check('0064: no hard-coded PostGIS schema remains',
  !/public\.ST_(?:Distance|SetSRID|MakePoint)|::public\.geography/i.test(migration64));
check('0064: distance uses schema-independent Haversine',
  /6371\.0088[\s\S]{0,160}asin\s*\(/i.test(migration64));
check('0064: coverage ordering cannot collide with its OUT parameter',
  !/ORDER\s+BY\s+restaurant_count\b/i.test(migration64));
check('0064: coverage ordering is expressed by an unambiguous aggregate',
  /ORDER\s+BY\s+count\s*\(\s*DISTINCT\s+pcr\.id\s*\)\s+DESC/i.test(migration64));
check('0064: legacy search execution is revoked from browsers',
  /REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+public\.search_menu_items[\s\S]*?FROM\s+PUBLIC,\s*anon,\s*authenticated;/i.test(migration64));
check('0064: legacy nearby execution is revoked from browsers',
  /REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+public\.find_nearby_restaurants[\s\S]*?FROM\s+PUBLIC,\s*anon,\s*authenticated;/i.test(migration64));
check('0064: no ALL privilege is granted to a browser role',
  !/GRANT\s+ALL(?:\s+PRIVILEGES)?[\s\S]{0,300}?TO\s+(?:anon|authenticated)\b/i.test(migration64));

for (const [label, sql] of [['structure test', structureTest], ['role test', rolesTest]]) {
  check(`${label}: test is transactional`, /^\s*BEGIN;/i.test(sql) && /ROLLBACK;\s*$/i.test(sql));
  check(`${label}: pgTAP finish is present`, /SELECT\s+\*\s+FROM\s+finish\(\);/i.test(sql));
}

check('role test: all five access personas are covered',
  ['anon', 'customer', 'owner', 'admin', 'service role'].every((persona) =>
    rolesTest.toLowerCase().includes(persona)));
check('role test: publication invalidation is exercised',
  /material owner edit invalidates the publication audit/i.test(rolesTest));
check('role test: source and destination invalidation is exercised',
  /reparenting catalog data invalidates both source and destination audits/i.test(rolesTest));
check('role test: public RPCs execute instead of only checking grants',
  /FROM\s+public\.search_public_catalog/i.test(rolesTest)
  && /FROM\s+public\.find_public_catalog_restaurants/i.test(rolesTest)
  && /FROM\s+public\.get_public_catalog_coverage/i.test(rolesTest));

assert.ok(checks.length >= 60, 'validator itself must retain broad contract coverage');

if (failures.length > 0) {
  console.error(`Catalog access-contract static validation failed (${failures.length}/${checks.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Catalog access-contract static validation passed (${checks.length} checks).`);
  console.log('This is not a PostgreSQL execution test; run the pgTAP files in a disposable database before promotion.');
}
