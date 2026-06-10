const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testMapping() {
  console.log('Fetching all pendente items...');
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('visit_status', 'Pendente')
    .or('is_deleted.eq.false,is_deleted.is.null')
    .order('name');

  if (error) {
    console.error('Error fetching:', error);
    return;
  }

  console.log(`Fetched ${data.length} items.`);

  for (const item of data) {
    try {
      const socialNetworks = item.social_networks || [];
      if (!Array.isArray(socialNetworks)) {
         throw new TypeError(`social_networks is not an array for ${item.name}! It is: ${JSON.stringify(socialNetworks)}`);
      }
      const instagram = socialNetworks.find((sn) => sn && sn.platform === 'instagram')?.url || '';
      const facebook = socialNetworks.find((sn) => sn && sn.platform === 'facebook')?.url || '';
      
      let googleMapsUrl = '';
      const visitNotes = item.visit_notes || '';
      const gmapsMatch = visitNotes.match(/Google Maps:\s*(https?:\/\/[^\s\n\r]+)/);
      if (gmapsMatch) {
        googleMapsUrl = gmapsMatch[1];
      }

      const formatted = {
        id: item.id,
        name: item.name,
        category: item.category || 'Restaurante',
        rating: typeof item.rating === 'number' ? item.rating : 4.0,
        reviewsCount: typeof item.reviews_count === 'number' ? item.reviews_count : 10,
        address: item.address || '',
        phone: item.phone || '',
        city: item.city || 'João Pessoa',
        state: item.state || 'PB',
        instagram,
        facebook,
        coverImage: item.cover_image_url || '',
        galleryImages: [],
        openingHours: item.opening_hours || {},
        website: item.other_url || item.external_url || '',
        googleMapsUrl,
        menuSourceUrl: item.other_url || item.external_url || '',
        isClosed: false
      };
      
      console.log(`✅ Normalized item: "${formatted.name}"`);
    } catch (e) {
      console.error(`❌ ERROR formatting item "${item.name}":`, e.message);
    }
  }
}

testMapping();
