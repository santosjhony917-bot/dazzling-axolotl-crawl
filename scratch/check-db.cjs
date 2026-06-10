const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log('Tentando criar o bucket "restaurant-images"...');
  try {
    const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('restaurant-images', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
    });
    if (bucketError) {
      console.warn('Aviso ao criar bucket:', bucketError.message);
    } else {
      console.log('Bucket "restaurant-images" criado com sucesso!', bucketData);
    }
  } catch (err) {
    console.error('Erro ao tentar criar bucket:', err.message);
  }

  console.log('Fetching restaurants count...');
  const { data, count, error } = await supabase
    .from('restaurants')
    .select('*', { count: 'exact' });

  if (error) {
    console.error('Error fetching restaurants:', error);
  } else {
    console.log(`Successfully fetched. Count: ${count}`);
    if (data && data.length > 0) {
      console.log('Sample restaurant:', {
        id: data[0].id,
        name: data[0].name,
        visit_status: data[0].visit_status
      });
    }
  }
}

run();
