const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');
require('dotenv').config({ path: '.env.local' });
if (!process.env.VITE_SUPABASE_URL) {
  require('dotenv').config();
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const MODEL_NAME = process.env.VITE_OPENAI_MODEL || 'gpt-4o-mini';

async function main() {
  const args = process.argv.slice(2);
  const idIndex = args.indexOf('--id');
  const targetId = idIndex !== -1 ? args[idIndex + 1] : null;
  const contextFileIndex = args.indexOf('--browser-context-file');
  let browserContextStr = null;

  if (contextFileIndex !== -1) {
    const file = args[contextFileIndex + 1];
    if (fs.existsSync(file)) {
      browserContextStr = fs.readFileSync(file, 'utf-8');
      try { fs.unlinkSync(file); } catch(e){}
    }
  }

  if (!targetId || !browserContextStr) {
    console.log(`RESULT:${JSON.stringify({ success: false, error: "Missing ID or context" })}`);
    process.exit(0);
  }

  const { data: rest, error } = await supabase.from('restaurants').select('*').eq('id', targetId).single();
  if (error || !rest) {
    console.log(`RESULT:${JSON.stringify({ success: false, error: "Restaurante não encontrado." })}`);
    process.exit(0);
  }

  console.log(`\nExtraindo endereço e horários do Google Maps para: ${rest.name}`);

  const prompt = `Você é um extrator de dados de mapas de alta precisão.
Aqui está o texto bruto copiado da página do Google Maps do restaurante "${rest.name}".
Sua tarefa é extrair o endereço oficial e os horários de funcionamento.

TEXTO DO MAPA:
${browserContextStr.substring(0, 10000)}

Regras de Extração:
1. "address": O endereço completo (rua, número, complemento).
2. "neighborhood": O bairro.
3. "city": A cidade.
4. "state": A sigla do estado (ex: PB, SP, RJ).
5. "opening_hours": Um objeto JSON onde as chaves são: "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo". Os valores devem ser strings com os horários, ex: "11:00–23:00". Se estiver fechado, use "Fechado". Se não houver info, use null.
6. EXTREMAMENTE IMPORTANTE: Se o texto não contiver nenhum endereço ou for irrelevante, retorne os campos de endereço como null. **NÃO INVENTE ENDEREÇOS, BAIRROS OU CIDADES (não invente "Rua das Flores", "Centro", etc)**. Só extraia o que estiver CLARAMENTE no texto. Para os horários, você DEVE extraí-los da seção "HIDDEN TABLES" ou do texto bruto. Se um dia estiver explícito como "Fechado", coloque "Fechado". Se um dia não aparecer na lista e não houver indicação, coloque "Fechado".
7. Retorne APENAS um JSON válido no formato abaixo (substitua os valores pelos dados reais encontrados, ou null/Fechado se não encontrar):

{
  "address": "Av. Sapé, 750",
  "neighborhood": "Manaíra",
  "city": "João Pessoa",
  "state": "PB",
  "opening_hours": {
    "Segunda-feira": "Fechado",
    "Terça-feira": "14:00–20:00",
    "Quarta-feira": "14:00–20:00",
    "Quinta-feira": "14:00–20:00",
    "Sexta-feira": "14:00–20:00",
    "Sábado": "14:00–20:00",
    "Domingo": "Fechado"
  }
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content);
    console.log(`Dados extraídos: Endereço: ${result.address}, Bairro: ${result.neighborhood}, Cidade: ${result.city}`);

    const updates = {};
    if (result.address) updates.address = result.address;
    if (result.neighborhood) updates.neighborhood = result.neighborhood;
    if (result.city) updates.city = result.city;
    if (result.state) updates.state = result.state;
    if (result.opening_hours) updates.opening_hours = result.opening_hours;

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('restaurants')
        .update(updates)
        .eq('id', targetId);
      
      if (updateError) {
        throw updateError;
      }
      console.log(`Dados salvos no Supabase com sucesso.`);
    }

    console.log(`RESULT:${JSON.stringify({ success: true, data: updates })}`);
  } catch (err) {
    console.error("Erro na extração:", err);
    console.log(`RESULT:${JSON.stringify({ success: false, error: err.message })}`);
  }
}

main();
