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

// Helper function to process additional phones found in Instagram Bio
function processAdditionalPhones(existingPhone, existingNotes, existingAiLog, additionalPhones) {
  if (!Array.isArray(additionalPhones) || additionalPhones.length === 0) {
    return {
      phone: existingPhone || null,
      visit_notes: existingNotes || null,
      ai_log: existingAiLog || null
    };
  }

  const currentPhone = existingPhone || '';
  const currentNotes = existingNotes || '';
  const currentAiLog = existingAiLog || '';

  const getDigits = (str) => str.replace(/\D/g, '');

  const existingParts = currentPhone.split(' / ').map(p => p.trim()).filter(Boolean);
  const existingDigitsList = existingParts.map(getDigits).filter(Boolean);

  const newValidPhones = [];
  const addedDigits = new Set();

  additionalPhones.forEach(phone => {
    if (!phone || typeof phone !== 'string') return;
    const trimmed = phone.trim();
    const digits = getDigits(trimmed);

    // Filter out invalid numbers (less than 8 digits when digits-only)
    if (digits.length < 8) return;

    // Normalize and compare to avoid duplicates
    const isDuplicateWithExisting = existingDigitsList.some(exDigits => {
      return exDigits.includes(digits) || digits.includes(exDigits);
    });

    const isDuplicateWithNew = Array.from(addedDigits).some(newDigits => {
      return newDigits.includes(digits) || digits.includes(newDigits);
    });

    if (!isDuplicateWithExisting && !isDuplicateWithNew) {
      newValidPhones.push(trimmed);
      addedDigits.add(digits);
    }
  });

  let updatedPhone = currentPhone;
  let updatedNotes = currentNotes;
  let updatedAiLog = currentAiLog;

  if (newValidPhones.length > 0) {
    const extraStr = newValidPhones.join(' / ');
    updatedPhone = currentPhone ? `${currentPhone} / ${extraStr}` : extraStr;
    
    const notesToAppend = `Contatos adicionais: ${extraStr}`;
    updatedNotes = currentNotes ? `${currentNotes}\n${notesToAppend}` : notesToAppend;

    const timestamp = new Date().toISOString();
    const logToAppend = `[${timestamp}] [Enriquecimento] Telefones adicionais encontrados na Bio do Instagram: ${extraStr}`;
    updatedAiLog = currentAiLog ? `${currentAiLog}\n${logToAppend}` : logToAppend;
  }

  return {
    phone: updatedPhone || null,
    visit_notes: updatedNotes || null,
    ai_log: updatedAiLog || null
  };
}

// ═══════════════════════════════════════════════════════════════
// Função de retry com espera automática para rate limits (429)
// ═══════════════════════════════════════════════════════════════
async function callOpenAIWithRetry(params, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await openai.chat.completions.create(params);
      return response;
    } catch (err) {
      if (err.status === 429) {
        // Extrai o tempo de espera do header ou usa exponential backoff
        const retryAfterMs = err.headers?.get?.('retry-after-ms') || null;
        const retryAfterSec = err.headers?.get?.('retry-after') || null;
        let waitMs = 2000 * attempt; // Default: exponential backoff (2s, 4s, 6s, 8s, 10s)
        
        if (retryAfterMs) {
          waitMs = parseInt(retryAfterMs) + 500; // Adiciona 500ms de margem
        } else if (retryAfterSec) {
          waitMs = (parseInt(retryAfterSec) * 1000) + 500;
        }
        
        // Cap máximo de 60 segundos
        waitMs = Math.min(waitMs, 60000);
        
        console.log(`⏳ Rate limit atingido (tentativa ${attempt}/${maxRetries}). Aguardando ${(waitMs/1000).toFixed(1)}s antes de tentar novamente...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      } else {
        // Erro não é rate limit, propaga imediatamente
        throw err;
      }
    }
  }
  throw new Error(`Rate limit persistente após ${maxRetries} tentativas. Tente novamente em alguns minutos.`);
}

async function handleMultipleCandidates(targetId, candidatesFile) {
  const data = JSON.parse(fs.readFileSync(candidatesFile, 'utf-8'));
  try { fs.unlinkSync(candidatesFile); } catch(e) {}
  
  const { candidates, restaurantName, restaurantCity, restaurantAddress } = data;
  
  if (!targetId) {
    console.log(`RESULT:${JSON.stringify({ success: false, error: "Missing restaurant ID" })}`);
    process.exit(0);
  }

  const { data: rest, error } = await supabase.from('restaurants').select('*').eq('id', targetId).single();
  if (error || !rest) {
    console.log(`RESULT:${JSON.stringify({ success: false, error: "Restaurante não encontrado." })}`);
    process.exit(0);
  }

  const name = restaurantName || rest.name;
  const city = restaurantCity || rest.city || 'Não informado';
  const address = restaurantAddress || rest.address || 'Não informado';

  console.log(`\nValidando ${candidates.length} candidato(s) de Instagram para: ${name}`);
  console.log(`Endereço: ${address}`);
  console.log(`Cidade: ${city}`);

  const candidatesList = candidates.map((c, i) => 
    `CANDIDATO ${i+1}:\n  - URL: ${c.url}\n  - Bio: ${c.bio || 'Sem bio'}\n  - Seguidores: ${c.followers || 0}`
  ).join('\n\n');

  const prompt = `Você é um validador rigoroso de IA especializado em identificar perfis oficiais de Instagram de restaurantes.
Sua tarefa é analisar os candidatos abaixo e decidir qual (se algum) é o perfil oficial do restaurante.

DADOS OFICIAIS DO RESTAURANTE:
- Nome: ${name}
- Endereço: ${address}
- Cidade: ${city}

CANDIDATOS ENCONTRADOS NO GOOGLE:
${candidatesList}

REGRAS DE VALIDAÇÃO:
1. O nome do perfil deve corresponder ao restaurante (pode ter variações como abreviações, sem espaços, etc.)
2. Se a bio mencionar uma cidade/bairro DIFERENTE do endereço oficial, REJEITE esse candidato
3. Se a bio for genérica ou não mencionar localização, mas o nome bater, ACEITE
4. Perfis com muitos seguidores e nome correspondente têm mais chance de ser o oficial
5. Se nenhum candidato parecer correto, retorne selectedIndex: -1
6. NÃO aceite perfis de outras unidades/franquias em outras cidades
7. Prefira perfis que mencionem a cidade correta na bio
8. Identifique e extraia em uma lista de strings todos os telefones de contato adicionais ou contatos de WhatsApp secundários descritos na bio do candidato selecionado.

Retorne um JSON:
{
  "selectedIndex": número (0-based) do candidato correto, ou -1 se nenhum for válido,
  "reason": "Explicação detalhada da escolha",
  "confidence": "alta" | "media" | "baixa",
  "additional_phones": ["lista", "de", "telefones/whatsapp", "adicionais", "encontrados", "na", "bio"]
}`;

  try {
    const response = await callOpenAIWithRetry({
      model: MODEL_NAME,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content);
    console.log(`\nDecisão da IA:`);
    console.log(`  Índice selecionado: ${result.selectedIndex}`);
    console.log(`  Confiança: ${result.confidence}`);
    console.log(`  Razão: ${result.reason}`);

    if (result.selectedIndex >= 0 && result.selectedIndex < candidates.length) {
      const selected = candidates[result.selectedIndex];
      console.log(`\n✅ Instagram selecionado: ${selected.url}`);
      
      // Atualiza no Supabase
      let social_networks = rest.social_networks || [];
      const idx = social_networks.findIndex(s => s && s.platform === 'instagram');
      if (idx !== -1) {
        social_networks[idx].url = selected.url;
        social_networks[idx].followers = selected.followers || 0;
      } else {
        social_networks.push({ platform: 'instagram', url: selected.url, followers: selected.followers || 0 });
      }
      
      const processed = processAdditionalPhones(rest.phone, rest.visit_notes, rest.ai_log, result.additional_phones);
      
      const updateData = { 
        social_networks, 
        instagram: selected.url, 
        ai_validated: true,
        phone: processed.phone,
        visit_notes: processed.visit_notes,
        ai_log: processed.ai_log
      };
      const { error: updateErr } = await supabase.from('restaurants').update(updateData).eq('id', targetId);
      if (updateErr) console.error("Erro ao atualizar banco:", updateErr);
      else console.log(`Instagram oficial atualizado no banco.`);

      console.log(`RESULT:${JSON.stringify({ success: true, isValid: true, selectedUrl: selected.url, reason: result.reason, confidence: result.confidence })}`);
    } else {
      console.log(`\n❌ Nenhum candidato foi aceito pela IA.`);
      console.log(`RESULT:${JSON.stringify({ success: true, isValid: false, selectedUrl: null, reason: result.reason })}`);
    }
  } catch (err) {
    console.error("Erro na validação:", err);
    console.log(`RESULT:${JSON.stringify({ success: false, error: err.message })}`);
  }
}

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

  // Novo modo: múltiplos candidatos
  const candidatesFileIndex = args.indexOf('--candidates-file');
  if (candidatesFileIndex !== -1) {
    const candidatesFile = args[candidatesFileIndex + 1];
    if (fs.existsSync(candidatesFile)) {
      await handleMultipleCandidates(targetId, candidatesFile);
      return;
    }
  }

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
5. Identifique e extraia em uma lista de strings todos os telefones de contato adicionais ou contatos de WhatsApp secundários descritos na bio do Instagram que está sendo analisado.

Formato esperado:
{
  "isValid": true ou false,
  "reason": "Explicação detalhada de por que validou ou invalidou. Se invalidou, destaque a discrepância de endereço ou unidade.",
  "instagram": "${instagramUrl}",
  "additional_phones": ["lista", "de", "telefones/whatsapp", "adicionais", "encontrados", "na", "bio"]
}
`;

  try {
    const response = await callOpenAIWithRetry({
      model: MODEL_NAME,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content);
    console.log(`Decisão: ${result.isValid ? 'VALIDADO' : 'REPROVADO'} - ${result.reason}`);

    if (result.isValid) {
      // Se validou, atualiza o instagram oficial no supabase e marca como validado
      let social_networks = rest.social_networks || [];
      const idx = social_networks.findIndex(s => s && s.platform === 'instagram');
      if (idx !== -1) {
        social_networks[idx].url = instagramUrl;
      } else {
        social_networks.push({ platform: 'instagram', url: instagramUrl });
      }
      
      const processed = processAdditionalPhones(rest.phone, rest.visit_notes, rest.ai_log, result.additional_phones);
      
      const updateData = { 
        social_networks, 
        instagram: instagramUrl, 
        ai_validated: true,
        phone: processed.phone,
        visit_notes: processed.visit_notes,
        ai_log: processed.ai_log
      };
      
      const { error: updateErr } = await supabase.from('restaurants').update(updateData).eq('id', targetId);
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
