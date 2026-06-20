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
  const contextFileIndex = args.indexOf('--instagram-context-file');
  let instagramContextStr = null;

  if (contextFileIndex !== -1) {
    const file = args[contextFileIndex + 1];
    if (fs.existsSync(file)) {
      instagramContextStr = fs.readFileSync(file, 'utf-8');
      try { fs.unlinkSync(file); } catch(e){}
    }
  }

  const urlIndex = args.indexOf('--instagram-url');
  const instagramUrl = urlIndex !== -1 ? args[urlIndex + 1] : 'Desconhecido';

  if (!targetId || !instagramContextStr) {
    console.log(`RESULT:${JSON.stringify({ success: false, error: "Missing ID or instagram context" })}`);
    process.exit(0);
  }

  const { data: rest, error } = await supabase.from('restaurants').select('*').eq('id', targetId).single();
  if (error || !rest) {
    console.log(`RESULT:${JSON.stringify({ success: false, error: "Restaurante não encontrado." })}`);
    process.exit(0);
  }

  console.log(`\nValidando Instagram para: ${rest.name} (${instagramUrl})`);

  const prompt = `Você é um validador rigoroso de IA com experiência em auditoria de perfis de Instagram para restaurantes.
Sua tarefa é verificar se o Instagram fornecido pertence EXATAMENTE a este restaurante oficial.

DADOS OFICIAIS DO RESTAURANTE (Verdade Absoluta extraída do Google Maps):
- Nome: ${rest.name}
- Endereço Oficial: ${rest.address || 'Não cadastrado'}
- Bairro Oficial: ${rest.neighborhood || 'Não cadastrado'}
- Cidade Oficial: ${rest.city || 'Não cadastrado'}

DADOS EXTRAÍDOS DA PÁGINA DO INSTAGRAM A SER AVALIADO (${instagramUrl}):
${instagramContextStr.substring(0, 10000)}

INSTRUÇÕES DE AVALIAÇÃO INTELIGENTE:
1. NÃO seja um robô estático que apenas compara textos. É perfeitamente normal e muito comum que a bio do Instagram NÃO contenha o endereço completo ou sequer o bairro.
2. Se o nome do restaurante bater com o perfil, e o perfil parecer ser da mesma marca, VALIDE o perfil, a não ser que haja uma CONTRADIÇÃO CLARA.
3. O que é uma contradição clara? Se a bio citar um bairro/cidade diferente (ex: bio diz "Manaíra" e o endereço oficial é "Bancários") ou o nome indicar outra unidade (ex: "Restaurante X - Unidade Bancários"). Nesses casos, a resposta deve ser INVALID.
4. Se a bio tiver informações genéricas, o mesmo nome, ou mesmo se o endereço estiver ausente na bio, você DEVE considerar como VÁLIDO (isValid: true), assumindo que é o perfil genérico oficial do restaurante.
5. Retorne um JSON.

Formato esperado:
{
  "isValid": true ou false,
  "reason": "Explicação detalhada de por que validou ou invalidou. Se invalidou, destaque a discrepância de endereço ou unidade.",
  "instagram": "${instagramUrl}"
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content);
    console.log(`Decisão: ${result.isValid ? 'VALIDADO' : 'REPROVADO'} - ${result.reason}`);

    if (result.isValid) {
      let social_networks = rest.social_networks || [];
      const idx = social_networks.findIndex(s => s.platform === 'instagram');
      if (idx !== -1) {
        social_networks[idx].url = instagramUrl;
      } else {
        social_networks.push({ platform: 'instagram', url: instagramUrl });
      }
      
      const { error: updateErr } = await supabase.from('restaurants').update({ social_networks, ai_validated: true }).eq('id', targetId);
      if (updateErr) console.error("Erro ao atualizar banco:", updateErr);
      else console.log(`Instagram oficial atualizado no banco.`);
    }

    console.log(`RESULT:${JSON.stringify({ success: true, ...result })}`);
  } catch (err) {
    console.error("Erro na validação:", err);
    console.log(`RESULT:${JSON.stringify({ success: false, error: err.message })}`);
  }
}

main();
