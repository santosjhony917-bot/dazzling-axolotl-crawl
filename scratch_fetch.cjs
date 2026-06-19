const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const supabaseAnonKey = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAndGetLead() {
  console.log("Inserindo restaurante teste...");
  const { data: restaurant, error: rError } = await supabase
    .from('restaurants')
    .insert({
      name: 'Pizzaria do Zé Teste',
      phone: '11999999999',
      address: 'Rua Teste, 123'
    })
    .select('id, name')
    .single();

  if (rError) {
    console.error('Error inserting restaurant:', rError.message);
    return;
  }

  console.log("Restaurante criado com ID:", restaurant.id);
  
  // A trigger auto_create_commercial_lead já deve ter criado o lead,
  // mas vamos buscar o lead recém-criado.
  const { data: lead, error: lError } = await supabase
    .from('commercial_leads')
    .select('id')
    .eq('restaurant_id', restaurant.id)
    .single();

  if (lError) {
    console.error('Error fetching auto-created lead:', lError.message);
    return;
  }

  console.log('--- NOVO LEAD DE TESTE CRIADO ---');
  console.log(`URL para Teste da Proposta: http://localhost:5173/proposal/${lead.id}`);
}

createAndGetLead();
