const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log('--- Fetching all expansion projects ---');
  const { data: projects, error: projError } = await supabase
    .from('expansion_projects')
    .select('*');
  
  if (projError) {
    console.error('Error fetching projects:', projError);
    return;
  }
  console.log('Current projects:', projects);

  console.log('\n--- Cleaning up restaurants table ---');
  const { data: restaurants, error: restError } = await supabase
    .from('restaurants')
    .select('id, name, city, state');

  if (restError) {
    console.error('Error fetching restaurants:', restError);
    return;
  }

  let updatedCount = 0;
  for (const r of restaurants) {
    let newCity = r.city;
    let newState = r.state;
    let needsUpdate = false;

    if (r.city) {
      const trimmed = r.city.trim();
      if (trimmed !== r.city) {
        newCity = trimmed;
        needsUpdate = true;
      }
    }
    if (r.state) {
      const trimmed = r.state.trim().toUpperCase();
      if (trimmed !== r.state) {
        newState = trimmed;
        needsUpdate = true;
      }
    }

    if (newCity === 'PB' && newState === 'PB') {
      newCity = 'João Pessoa';
      needsUpdate = true;
    } else if (newCity === 'João Pessoa - PB') {
      newCity = 'João Pessoa';
      needsUpdate = true;
    }

    if (needsUpdate) {
      console.log(`Updating restaurant "${r.name}" (${r.id}): "${r.city}" | "${r.state}" -> "${newCity}" | "${newState}"`);
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ city: newCity, state: newState })
        .eq('id', r.id);

      if (updateError) {
        console.error(`Failed to update ${r.id}:`, updateError.message);
      } else {
        updatedCount++;
      }
    }
  }
  console.log(`Successfully updated ${updatedCount} restaurants.`);

  console.log('\n--- Cleaning up expansion_projects table ---');
  // We need to delete projects with invalid names/slugs
  const invalidProjectIds = [];
  for (const p of projects) {
    const trimmedName = p.name.trim();
    if (trimmedName === 'PB' || trimmedName === 'João Pessoa - PB' || trimmedName !== p.name) {
      invalidProjectIds.push(p.id);
    }
  }

  if (invalidProjectIds.length > 0) {
    console.log(`Deleting ${invalidProjectIds.length} invalid projects...`);
    const { error: deleteError } = await supabase
      .from('expansion_projects')
      .delete()
      .in('id', invalidProjectIds);

    if (deleteError) {
      console.error('Error deleting projects:', deleteError.message);
    } else {
      console.log('Successfully deleted invalid projects.');
    }
  } else {
    console.log('No invalid projects found to delete.');
  }
}

run();
