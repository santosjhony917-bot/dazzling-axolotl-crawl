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
  const contextFileIndex = args.indexOf('--snapshot-file');
  let snapshotStr = null;

  if (contextFileIndex !== -1) {
    const file = args[contextFileIndex + 1];
    if (fs.existsSync(file)) {
      snapshotStr = fs.readFileSync(file, 'utf-8');
      // try { fs.unlinkSync(file); } catch(e){}
    }
  }

  if (!targetId || !snapshotStr) {
    console.log(`RESULT:${JSON.stringify({ success: false, error: "Missing ID or snapshot" })}`);
    process.exit(0);
  }

  const { data: rest, error } = await supabase.from('restaurants').select('*').eq('id', targetId).single();
  if (error || !rest) {
    console.log(`RESULT:${JSON.stringify({ success: false, error: "Restaurante não encontrado." })}`);
    process.exit(0);
  }

  const prompt = `Você é um Agente de Navegação Web Autônomo extremamente focado.
Seu objetivo é extrair o ENDEREÇO e os HORÁRIOS DE FUNCIONAMENTO (de Segunda a Domingo) para o restaurante "${rest.name}" no Google Maps.

Aqui está um retrato (snapshot) do conteúdo visível na tela e uma lista de botões/elementos com suas respectivas IDs:
${snapshotStr.substring(0, 10000)}

REGRAS DE DECISÃO:
1. Avalie a tela de forma EXTREMAMENTE CRÍTICA: A tabela com os horários de Segunda-feira, Terça-feira, Quarta-feira, Quinta-feira, Sexta-feira, Sábado e Domingo está TOTALMENTE expandida e visível no texto OU apareceu na seção HIDDEN TABLES?
2. Se SIM (você vê claramente a lista de horários dos dias na PÁGINA TEXTO ou em HIDDEN TABLES): Retorne "action": "done" e preencha os dados no objeto "data". Formato do "data":
{
  "address": "endereço aqui",
  "neighborhood": "bairro aqui",
  "city": "cidade aqui",
  "state": "PB",
  "opening_hours": {
    "Segunda-feira": "14:00-20:00 ou Fechado",
    "Terça-feira": "...",
    "Quarta-feira": "...",
    "Quinta-feira": "...",
    "Sexta-feira": "...",
    "Sábado": "...",
    "Domingo": "..."
  }
}
3. Se NÃO (IMPORTANTE: NÃO SE CONFORME EM DEIXAR SEM HORÁRIOS! O Google Maps SEMPRE tem a lista de 7 dias escondida dentro de um botão dropdown. Se você só vê "Fechado ‧ Abre às 14:00", significa que a tabela NÃO ESTÁ EXPANDIDA): Procure na seção "ELEMENTOS INTERATIVOS" o ID do botão que diz "Abre às", "Fechado", "Ocultar horários da semana" ou "Mostrar horários". Identifique o número ID dele e retorne "action": "click", "targetId": "O_ID_ENCONTRADO". Nunca retorne "done" com horários vazios ou apenas um dia; force o clique para expandir!

Retorne APENAS um JSON válido no formato a seguir:
{
  "action": "click" | "done",
  "targetId": "ID_DO_BOTAO_SE_FOR_CLICAR",
  "data": { ...preenchido se action for done... }
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    let resultJsonStr = response.choices[0].message.content.trim();
    const resultObj = JSON.parse(resultJsonStr);
    
    // LOG DECISION
    fs.writeFileSync('scratch/last_ai_decision.json', JSON.stringify({ prompt, resultObj }, null, 2));

    if (resultObj.action === 'done' && resultObj.data) {
       // Save to database
       const updates = {};
       if (resultObj.data.address) updates.address = resultObj.data.address;
       if (resultObj.data.neighborhood) updates.neighborhood = resultObj.data.neighborhood;
       if (resultObj.data.city) updates.city = resultObj.data.city;
       if (resultObj.data.state) updates.state = resultObj.data.state;
       if (resultObj.data.opening_hours) updates.opening_hours = resultObj.data.opening_hours;

       if (Object.keys(updates).length > 0) {
         await supabase.from('restaurants').update(updates).eq('id', targetId);
       }
    }

    console.log(`RESULT:${JSON.stringify({ success: true, aiResponse: resultObj })}`);
  } catch (err) {
    fs.writeFileSync('scratch/last_ai_decision.json', JSON.stringify({ error: err.message }, null, 2));
    console.log(`RESULT:${JSON.stringify({ success: false, error: err.message })}`);
  }
}

main();
