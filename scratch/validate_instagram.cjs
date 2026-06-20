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
- Telefone: ${rest.phone || 'Não cadastrado'}

DADOS EXTRAÍDOS DA PÁGINA DO INSTAGRAM A SER AVALIADO (${instagramUrl}):
${instagramContextStr.substring(0, 10000)}

INSTRUÇÕES DE AVALIAÇÃO INTELIGENTE (Busca Multi-Sinais):
1. **AIA (Avaliação Integrada de Âncora)**: Compare o bairro e a cidade da Bio com o Endereço Oficial do Maps. Se bater, o match é de 100% (confidenceScore = 1.0).
2. **Fallback por Telefone**: Se o endereço na Bio for divergente (ex: mudou de bairro) ou não existir, mas o telefone na Bio bater com o Telefone Oficial, a chance do perfil ser correto é altíssima. Nesse caso, defina \`hasDivergentAddress\` como \`true\` e aprove o perfil.
3. Se houver contradição EXPLICITA de cidade ou estado (ex: Bio diz "Recife" e o restaurante é em "João Pessoa") e o telefone NÃO bater, a confiança cai drasticamente e o perfil deve ser reprovado.
4. Se a bio for genérica, mas o nome e o estilo baterem e não houver contradição, atribua uma confiança moderada-alta (ex: 0.7 a 0.8).
5. Retorne obrigatoriamente um "confidenceScore" de 0.0 a 1.0. Consideramos >= 0.7 como válido.
6. Retorne um JSON estrito.

Formato esperado:
{
  "isValid": true ou false (true se confidenceScore >= 0.7),
  "confidenceScore": número decimal entre 0.0 e 1.0,
  "hasDivergentAddress": true ou false (true se o telefone validou o perfil mas o endereço está diferente/desatualizado),
  "reason": "Explicação detalhada dos sinais que levaram ao score (match de bairro, telefone, etc.)",
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
      
      const updates: any = { social_networks, ai_validated: true };
      
      if (result.hasDivergentAddress) {
        updates.coleta_logs = (rest.coleta_logs ? rest.coleta_logs + ' | ' : '') + 'Endereço Divergente, mas Perfil Confirmado';
      }

      const { error: updateErr } = await supabase.from('restaurants').update(updates).eq('id', targetId);
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
