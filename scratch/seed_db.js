import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const supabaseAnonKey = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const strategies = [
  {
    nome_estrategia: 'Escassez Temporal de 23 Horas',
    pre_prompt_contexto: 'Você é um gerente comercial focado em urgência. Lembre ao restaurante de que a cortesia de visualização ilimitada do cardápio Premium está prestes a expirar. Enfatize que após as 23 horas o cardápio cairá para o modo gratuito com limite de 5 visitas por dia por cliente, o que pode afastar consumidores ativos. Destaque que a renovação para Premium Pago custa muito pouco perto do valor de perder pedidos.',
    gatilho_venda_principal: 'Urgência e Perda de Cota de Visualização',
    total_tentativas: 0,
    total_conversoes_premium: 0,
    taxa_sucesso: 0.0
  },
  {
    nome_estrategia: 'Análise de Demanda de Bairro (BI e Tráfego)',
    pre_prompt_contexto: 'Você é um analista de inteligência de negócios do FilterFood. Envie dados reais sobre a quantidade de buscas por comida no bairro onde o restaurante opera. Demonstre que o salão/restaurante dele está recebendo cliques e que a conversão premium garante que ele apareça no topo das buscas do bairro. Use um tom consultivo e amigável, focado em retorno financeiro imediato.',
    gatilho_venda_principal: 'Lucratividade do Bairro e Destaque Local',
    total_tentativas: 0,
    total_conversoes_premium: 0,
    taxa_sucesso: 0.0
  },
  {
    nome_estrategia: 'Gourmet Design (Aparência e Credibilidade)',
    pre_prompt_contexto: 'Você é um especialista em design e experiência do usuário. Explique ao dono do restaurante que cardápios em PDF pesados ou links desorganizados na bio fazem o cliente desistir da compra. O FilterFood oferece um cardápio digital elegante, leve, com fotos nítidas dos pratos que geram desejo imediato de compra e facilitam a escolha. Convença-o de que o design premium converte mais clientes que cardápios de texto.',
    gatilho_venda_principal: 'Qualidade Visual do Cardápio Digital',
    total_tentativas: 0,
    total_conversoes_premium: 0,
    taxa_sucesso: 0.0
  },
  {
    nome_estrategia: 'Facilidade de Contato e Link Direto',
    pre_prompt_contexto: 'Você é um consultor focado em agilidade operacional. Mostre ao dono do estabelecimento que ao reivindicar seu cardápio, os clientes têm atalhos diretos para WhatsApp e iFood sem fricção de login, o que aumenta em até 30% a conversão direta de pedidos sem taxas adicionais de marketplaces.',
    gatilho_venda_principal: 'Pedidos Diretos sem Taxas',
    total_tentativas: 0,
    total_conversoes_premium: 0,
    taxa_sucesso: 0.0
  }
];

async function seed() {
  console.log("Seeding Supabase strategies...");
  
  // Check if already seeded
  const { data: existing } = await supabase.from('registro_estrategias_ia').select('id');
  if (existing && existing.length > 0) {
    console.log("Already seeded. Count:", existing.length);
    return;
  }
  
  const { data, error } = await supabase.from('registro_estrategias_ia').insert(strategies).select();
  if (error) {
    console.error("❌ Error seeding strategies:", error.message);
  } else {
    console.log("✅ Seeded strategies successfully! Rows inserted:", data?.length);
  }
}

seed();
